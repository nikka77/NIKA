// scripts/mesure-og-formats.mjs — COMBIEN DE FICHES PORTENT UN VISUEL QUE @vercel/og REFUSE ?
//
// Lecture seule. Ne touche à aucune ligne. Écrit une trace horodatée dans data/audits/.
//
// La liste fermée est lue dans le bundle installé (next 16.2.6 →
// node_modules/next/dist/compiled/@vercel/og/index.node.js, symbole `qI`) :
//   qI = [image/png, image/apng, image/jpeg, image/gif, image/svg+xml]
// image/webp et image/avif sont RECONNUS par le détecteur de magie (`Al`) mais absents de la
// liste → `Ts()` jette « Unsupported image type: image/webp ».
//
// L'extension d'une URL n'est PAS le format servi (leçon du 10/08 : une adresse ne prouve rien).
// Ce script mesure donc DEUX choses séparément :
//   1. le classement par extension d'URL, sur tout le corpus (paginé) ;
//   2. le format RÉEL des octets, sur un échantillon tiré au sort de chaque classe — on demande
//      les 32 premiers octets (Range) et on applique la même détection de magie que satori.
import { clientSite } from '../lib/ops/db.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const HORODATAGE = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = `data/audits/og-formats-${HORODATAGE}.json`;

// --- détection de magie, transcrite de `Al()` du bundle @vercel/og -------------------------
function detecter(buf) {
  const A = new Uint8Array(buf);
  const eq = (sig) => sig.every((e, t) => !e || A[t] === e);
  if ([255, 216, 255].every((e, t) => A[t] === e)) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((e, t) => A[t] === e)) return 'image/png'; // (apng non distingué ici)
  if ([71, 73, 70, 56].every((e, t) => A[t] === e)) return 'image/gif';
  if (eq([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])) return 'image/webp';
  if ([60, 63, 120, 109, 108].every((e, t) => A[t] === e)) return 'image/svg+xml';
  if (eq([0, 0, 0, 0, 102, 116, 121, 112, 97, 118, 105, 102])) return 'image/avif';
  return null;
}
const ACCEPTES = new Set(['image/png', 'image/apng', 'image/jpeg', 'image/gif', 'image/svg+xml']);

function extensionDe(url) {
  try {
    const u = new URL(url);
    // Fandom : /images/x/xx/Nom.gif/revision/latest/scale-to-width-down/190
    const m = u.pathname.match(/\.([a-z0-9]{2,5})(?=$|\/)/gi);
    if (!m) return '(aucune)';
    return m[m.length - 1].slice(1).toLowerCase();
  } catch { return '(url invalide)'; }
}

const sb = clientSite();

// --- 1. corpus complet, PAGINÉ ------------------------------------------------------------
const lignes = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await sb
    .from('akasha_entries')
    .select('id,slug,name,universe,type,image_url')
    .order('id')
    .range(d, d + 999);
  if (error) throw error;
  lignes.push(...data);
  process.stderr.write(`  lu ${lignes.length}\n`);
  if (data.length < 1000) break;
}

const avecVisuel = lignes.filter((l) => l.image_url && String(l.image_url).trim());
const parExt = {};
for (const l of avecVisuel) {
  const e = extensionDe(l.image_url);
  (parExt[e] ||= []).push(l);
}

// --- 2. format réel des octets, sur échantillon ---------------------------------------------
function tirer(tab, n) {
  const c = [...tab];
  const out = [];
  // tirage déterministe (pas de hasard non reproductible) : pas régulier dans la liste triée
  const pas = Math.max(1, Math.floor(c.length / n));
  for (let i = 0; i < c.length && out.length < n; i += pas) out.push(c[i]);
  return out;
}

async function magie(url) {
  try {
    const r = await fetch(url, {
      headers: { Range: 'bytes=0-63', 'User-Agent': 'NIKA-AKASHA-audit/1.0 (contact tulbured06@gmail.com)' },
      signal: AbortSignal.timeout(20000),
    });
    const ct = r.headers.get('content-type');
    if (!r.ok && r.status !== 206) return { statut: r.status, contentType: ct, magie: null };
    const buf = await r.arrayBuffer();
    return { statut: r.status, contentType: ct, magie: detecter(buf) };
  } catch (e) { return { statut: null, contentType: null, magie: null, erreur: String(e).slice(0, 120) }; }
}

const sondes = {};
for (const [ext, tab] of Object.entries(parExt)) {
  const ech = tirer(tab, Math.min(8, tab.length));
  sondes[ext] = [];
  for (const l of ech) {
    const s = await magie(l.image_url);
    sondes[ext].push({ slug: l.slug, universe: l.universe, url: l.image_url, ...s });
    process.stderr.write(`  sonde ${ext} ${l.slug} → ${s.magie ?? s.statut}\n`);
  }
}

// --- 3. verdict ---------------------------------------------------------------------------
// Une extension est dite « refusée » quand TOUTES ses sondes rendent un format hors liste.
const verdictExt = {};
for (const [ext, tab] of Object.entries(parExt)) {
  const mags = sondes[ext].map((s) => s.magie).filter(Boolean);
  const refuses = mags.filter((m) => !ACCEPTES.has(m));
  verdictExt[ext] = {
    fiches: tab.length,
    sondes: sondes[ext].length,
    formatsVus: [...new Set(mags)],
    sondesRefusees: refuses.length,
    universes: Object.entries(tab.reduce((a, l) => ((a[l.universe] = (a[l.universe] || 0) + 1), a), {})).sort((x, y) => y[1] - x[1]),
    exemples: tab.slice(0, 5).map((l) => ({ slug: l.slug, url: l.image_url })),
  };
}

const trace = {
  horodatage: new Date().toISOString(),
  bundle: 'next@16.2.6 → node_modules/next/dist/compiled/@vercel/og/index.node.js',
  listeFermee: [...ACCEPTES],
  totalFiches: lignes.length,
  fichesAvecVisuel: avecVisuel.length,
  fichesSansVisuel: lignes.length - avecVisuel.length,
  parExtension: verdictExt,
  sondes,
};
mkdirSync('data/audits', { recursive: true });
writeFileSync(TRACE, JSON.stringify(trace, null, 2));

console.log(`\n=== ${lignes.length} fiches lues · ${avecVisuel.length} avec visuel ===`);
for (const [ext, v] of Object.entries(verdictExt).sort((a, b) => b[1].fiches - a[1].fiches)) {
  console.log(`  .${ext.padEnd(12)} ${String(v.fiches).padStart(5)} fiches · sondes → ${v.formatsVus.join(', ') || '(rien)'} · refusées ${v.sondesRefusees}/${v.sondes}`);
}
console.log(`\ntrace : ${TRACE}`);
