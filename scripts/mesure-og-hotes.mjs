// scripts/mesure-og-hotes.mjs — LE FORMAT SERVI, PAR HÔTE (lecture seule).
//
// Suite de mesure-og-formats.mjs. Constat de la première passe : l'extension de l'URL ne dit
// RIEN du format servi — static.wikia.nocookie.net rend du WebP pour un fichier .png, .jpg
// ET .gif, quel que soit l'en-tête Accept ou l'User-Agent. Ce script mesure donc par HÔTE,
// avec un échantillon assez large pour donner un taux d'erreur (règle des 20 cas).
import { clientSite } from '../lib/ops/db.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const HORODATAGE = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = `data/audits/og-hotes-${HORODATAGE}.json`;
const ACCEPTES = new Set(['image/png', 'image/apng', 'image/jpeg', 'image/gif', 'image/svg+xml']);

function magie(buf) {
  const A = new Uint8Array(buf);
  if ([255, 216, 255].every((e, t) => A[t] === e)) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((e, t) => A[t] === e)) return 'image/png';
  if ([71, 73, 70, 56].every((e, t) => A[t] === e)) return 'image/gif';
  if ([82, 73, 70, 70].every((e, t) => A[t] === e) && [87, 69, 66, 80].every((e, t) => A[t + 8] === e)) return 'image/webp';
  if ([60, 63, 120, 109, 108].every((e, t) => A[t] === e)) return 'image/svg+xml';
  if ([102, 116, 121, 112, 97, 118, 105, 102].every((e, t) => A[t + 4] === e)) return 'image/avif';
  return null;
}
function hoteDe(u) {
  if (!u.startsWith('http')) return '(chemin relatif — pas une URL absolue)';
  try { return new URL(u).host; } catch { return '(url illisible)'; }
}
function extDe(u) {
  const m = String(u).match(/\.([a-z0-9]{2,5})(?=$|\/|\?)/gi);
  return m ? m[m.length - 1].slice(1).toLowerCase() : '(aucune)';
}

const sb = clientSite();
const lignes = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await sb.from('akasha_entries').select('id,slug,name,universe,type,image_url').order('id').range(d, d + 999);
  if (error) throw error;
  lignes.push(...data);
  if (data.length < 1000) break;
}
const avec = lignes.filter((l) => l.image_url && String(l.image_url).trim());

const parHote = {};
for (const l of avec) (parHote[hoteDe(l.image_url)] ||= []).push(l);

const N = 25;
const resultats = {};
for (const [hote, tab] of Object.entries(parHote)) {
  const pas = Math.max(1, Math.floor(tab.length / N));
  const ech = [];
  for (let i = 0; i < tab.length && ech.length < N; i += pas) ech.push(tab[i]);
  const sondes = [];
  for (const l of ech) {
    if (!l.image_url.startsWith('http')) { sondes.push({ slug: l.slug, url: l.image_url, note: 'chemin relatif : satori jette « Image source must be an absolute URL »' }); continue; }
    try {
      const r = await fetch(l.image_url, { signal: AbortSignal.timeout(20000) });
      const b = await r.arrayBuffer();
      sondes.push({ slug: l.slug, url: l.image_url, ext: extDe(l.image_url), statut: r.status, contentType: r.headers.get('content-type'), magie: magie(b), octets: b.byteLength });
    } catch (e) { sondes.push({ slug: l.slug, url: l.image_url, erreur: String(e).slice(0, 140) }); }
    process.stderr.write('.');
  }
  const mags = sondes.map((s) => s.magie).filter(Boolean);
  resultats[hote] = {
    fiches: tab.length,
    sondes: sondes.length,
    formatsServis: [...new Set(mags)],
    accepte: mags.filter((m) => ACCEPTES.has(m)).length,
    refuse: mags.filter((m) => !ACCEPTES.has(m)).length,
    extensionsDeclarees: [...new Set(ech.map((l) => extDe(l.image_url)))],
    universes: Object.entries(tab.reduce((a, l) => ((a[l.universe] = (a[l.universe] || 0) + 1), a), {})).sort((x, y) => y[1] - x[1]),
    detail: sondes,
  };
  process.stderr.write(`\n  ${hote} : ${tab.length} fiches, ${resultats[hote].refuse}/${sondes.length} sondes refusées\n`);
}

// Les .svg servis tels quels sont la seule exception connue — les compter exactement.
const svgFandom = avec.filter((l) => /static\.wikia\.nocookie\.net/.test(l.image_url) && /\.svg(?=$|\/|\?)/i.test(l.image_url));

mkdirSync('data/audits', { recursive: true });
writeFileSync(TRACE, JSON.stringify({ horodatage: new Date().toISOString(), listeFermee: [...ACCEPTES], totalFiches: lignes.length, fichesAvecVisuel: avec.length, parHote: resultats, svgFandom: svgFandom.map((l) => ({ slug: l.slug, url: l.image_url })) }, null, 2));

console.log(`\n=== ${lignes.length} fiches · ${avec.length} avec visuel ===`);
for (const [h, v] of Object.entries(resultats).sort((a, b) => b[1].fiches - a[1].fiches))
  console.log(`  ${h.padEnd(46)} ${String(v.fiches).padStart(5)} fiches · servis: ${v.formatsServis.join(', ') || '—'} · refusés ${v.refuse}/${v.sondes}`);
console.log(`\n  .svg sur Fandom (seul format non transcodé mesuré) : ${svgFandom.length} fiches`);
console.log(`trace : ${TRACE}`);
