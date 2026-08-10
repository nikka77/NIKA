// scripts/recensement-og-servables.mjs — COMBIEN DE FICHES, EXACTEMENT, RETROUVENT LEUR VISUEL.
//
// Le rendu prouvé sur 142 images dit « plus aucun cadre vide ». Il ne dit pas COMBIEN de fiches
// montrent désormais leur visuel plutôt que l'icône de repli — et un pourcentage extrapolé d'un
// échantillon n'est pas un compte. Ce script pose donc la question à TOUT le corpus (paginé), en
// appliquant la même réécriture d'adresse que `lib/akasha/og-visuel.ts` et en lisant les 16
// premiers octets de la réponse (`Range`), pas son extension ni son `content-type`.
//
// Lecture seule. N'écrit que sa trace horodatée dans data/audits/.
import { clientSite } from '../lib/ops/db.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const HORODATAGE = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = `data/audits/og-servables-${HORODATAGE}.json`;
const ORIGINE = process.env.OG_BASE ?? 'http://localhost:3000';
const ACCEPTES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']); // GIF exclu : resvg n'en peint rien
const PLAFOND_OCTETS = Math.floor(6.5 * 1024 * 1024);
const PARALLELE = 12;

function magie(buf) {
  const A = new Uint8Array(buf);
  if ([255, 216, 255].every((e, t) => A[t] === e)) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((e, t) => A[t] === e)) return 'image/png';
  if ([71, 73, 70, 56].every((e, t) => A[t] === e)) return 'image/gif';
  if ([82, 73, 70, 70].every((e, t) => A[t] === e) && [87, 69, 66, 80].every((e, t) => A[t + 8] === e)) return 'image/webp';
  if ([60, 63, 120, 109, 108].every((e, t) => A[t] === e)) return 'image/svg+xml';
  return null;
}

/** Même règle que `candidatsOg` de lib/akasha/og-visuel.ts — recopiée ici parce qu'un .mjs ne lit
 *  pas un .ts ; toute divergence future se verrait au premier écart entre les deux chiffres. */
function candidats(brut) {
  if (!brut.startsWith('http')) {
    const c = brut.startsWith('/') ? brut : `/${brut}`;
    return [`${ORIGINE}/_next/image?url=${encodeURIComponent(c)}&w=1080&q=75`, ORIGINE + c];
  }
  let u;
  try { u = new URL(brut); } catch { return []; }
  const out = [];
  if (u.host === 'wikia.nocookie.net' || u.host.endsWith('.wikia.nocookie.net')) {
    const p = new URL(u.toString()); p.searchParams.set('format', 'png'); out.push(p.toString());
  } else if (u.host === 'cdn.myanimelist.net' && /\.webp$/i.test(u.pathname)) {
    const j = new URL(u.toString()); j.pathname = j.pathname.replace(/\.webp$/i, '.jpg'); out.push(j.toString());
  }
  out.push(u.toString());
  return out;
}

async function juger(l) {
  for (const adresse of candidats(l.image_url)) {
    try {
      const r = await fetch(adresse, { headers: { Range: 'bytes=0-15', Accept: 'image/png,image/jpeg,image/svg+xml' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok && r.status !== 206) continue;
      const taille = Number(r.headers.get('content-range')?.split('/')?.[1] ?? r.headers.get('content-length') ?? 0);
      const buf = await r.arrayBuffer();
      const type = magie(buf);
      if (!type || !ACCEPTES.has(type)) continue;
      // Le plafond ne mord que si le serveur a bien annoncé une taille ; sinon on ne tranche pas
      // dessus — mieux vaut compter servable et se tromper d'un cas que de plafonner à l'aveugle.
      if (taille && taille > PLAFOND_OCTETS) return { verdict: 'trop lourd', type, taille };
      return { verdict: 'servable', type, taille, adresse };
    } catch { /* candidat suivant */ }
  }
  return { verdict: 'aucun format accepté' };
}

const sb = clientSite();
const lignes = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await sb.from('akasha_entries').select('id,slug,universe,type,image_url').order('id').range(d, d + 999);
  if (error) throw error;
  lignes.push(...data);
  if (data.length < 1000) break;
}
const avec = lignes.filter((l) => l.image_url && String(l.image_url).trim());

const resultats = [];
let fait = 0;
const file = [...avec];
await Promise.all(Array.from({ length: PARALLELE }, async () => {
  for (;;) {
    const l = file.shift();
    if (!l) return;
    const j = await juger(l);
    resultats.push({ slug: l.slug, universe: l.universe, image_url: l.image_url, ...j });
    if (++fait % 250 === 0) process.stderr.write(`  ${fait}/${avec.length}\n`);
  }
}));

const parVerdict = resultats.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
const servablesParUnivers = {};
for (const r of resultats) {
  (servablesParUnivers[r.universe] ||= { servable: 0, total: 0 }).total++;
  if (r.verdict === 'servable') servablesParUnivers[r.universe].servable++;
}
mkdirSync('data/audits', { recursive: true });
writeFileSync(TRACE, JSON.stringify({
  horodatage: new Date().toISOString(), origine: ORIGINE, acceptes: [...ACCEPTES], plafondOctets: PLAFOND_OCTETS,
  totalFiches: lignes.length, fichesAvecVisuel: avec.length, fichesSansVisuel: lignes.length - avec.length,
  parVerdict, servablesParUnivers,
  nonServables: resultats.filter((r) => r.verdict !== 'servable'),
}, null, 2));

console.log(`\n=== ${lignes.length} fiches · ${avec.length} portent un visuel ===`);
for (const [v, n] of Object.entries(parVerdict).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${v}`);
console.log('\n  par univers (servables / à visuel) :');
for (const [u, v] of Object.entries(servablesParUnivers).sort((a, b) => b[1].total - a[1].total))
  console.log(`    ${u.padEnd(28)} ${String(v.servable).padStart(5)} / ${v.total}`);
console.log(`\ntrace : ${TRACE}`);
