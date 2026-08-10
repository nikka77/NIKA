// scripts/verifier-images-candidates.mjs — LES DEUX ÉPREUVES QUE LE CONNECTEUR NE PASSE PAS.
//
// Lecture seule : ce script n'écrit RIEN en base. Il prend le rapport à blanc d'un connecteur
// d'images et soumet chaque candidat à deux contrôles que le connecteur ne fait pas :
//
//  1. COLLISION AVEC L'EXISTANT. Le connecteur ne détecte que les collisions INTERNES à sa passe.
//     Il ne sait pas qu'une fiche DÉJÀ illustrée porte le même fichier de wiki — or c'est
//     exactement la signature des quatre portraits usurpés du 09/08 (Trafalgar Law affichait sa
//     petite sœur). On compare donc chaque URL candidate à l'intégralité des `image_url` en base,
//     à l'identifiant de FICHIER près (le suffixe `?cb=` varie pour un même fichier).
//
//  2. L'IMAGE SE CHARGE-T-ELLE VRAIMENT ? Un CDN d'images sert son carton d'erreur en HTTP 200
//     avec des pixels dedans (leçon du 09/08). Le code HTTP ne dit rien, la DIMENSION si : on
//     télécharge les premiers octets et on lit l'en-tête du fichier (PNG/JPEG/WEBP/GIF).
//
// Usage : node --env-file=.env.local scripts/verifier-images-candidates.mjs <rapport.json>
import { readFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { dimensions, idFichier } from './lib/image-octets.mjs';

const CHEMIN = process.argv[2];
if (!CHEMIN) { console.error('usage : … verifier-images-candidates.mjs <data/audits/xxx.json>'); process.exit(1); }
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };

// La lecture des octets et l'identifiant de fichier vivent dans scripts/lib/image-octets.mjs :
// ce script et le connecteur francophone doivent juger avec EXACTEMENT la même mesure.

async function charge(url) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25_000) });
    if (!r.ok) return { ok: false, motif: `HTTP ${r.status}` };
    const buf = await r.arrayBuffer();
    const d = dimensions(buf);
    if (!d) return { ok: false, motif: `octets illisibles (${buf.byteLength} o)` };
    // Le carton d'erreur du CDN mesure 300×171 ; toute image utile dépasse largement ce format.
    if (d.w < 80 || d.h < 80) return { ok: false, motif: `trop petite : ${d.w}×${d.h} (${d.type})`, dim: d, octets: buf.byteLength };
    return { ok: true, dim: d, octets: buf.byteLength };
  } catch (e) { return { ok: false, motif: String(e?.name ?? e).slice(0, 60) }; }
}

/* ── 1. L'existant, paginé (un select nu s'arrête à 1000 lignes sans erreur). ────────────────── */
const db = clientSite();
const dejaIllustrees = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await db.from('akasha_entries').select('slug,name,universe,image_url')
    .not('image_url', 'is', null).order('slug').range(d, d + 999);
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  dejaIllustrees.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const parFichier = new Map();
for (const e of dejaIllustrees) {
  const k = idFichier(e.image_url);
  if (!parFichier.has(k)) parFichier.set(k, []);
  parFichier.get(k).push(e);
}
console.log(`${dejaIllustrees.length} fiches déjà illustrées, ${parFichier.size} fichiers distincts\n`);

/* ── 2. Les candidats du rapport ────────────────────────────────────────────────────────────── */
const rapport = JSON.parse(await readFile(CHEMIN, 'utf8'));
const cands = rapport.posees_detail ?? rapport.candidats ?? [];
console.log(`${cands.length} candidat(s) à éprouver\n`);

const verdicts = [];
for (const c of cands) {
  const url = c.image_url;
  const occupants = (parFichier.get(idFichier(url)) ?? []).filter((e) => e.slug !== c.slug);
  const img = await charge(url);
  const v = {
    slug: c.slug, name: c.name, universe: c.universe, type: c.type,
    titre_wiki: c.titre_wiki, preuve: c.preuve, via: c.via, image_url: url,
    charge: img.ok, dimensions_reelles: img.dim ? `${img.dim.w}×${img.dim.h} ${img.dim.type}` : null,
    octets: img.octets ?? null, motif_charge: img.ok ? null : img.motif,
    collision_existant: occupants.map((o) => `${o.slug} (${o.name}, ${o.universe})`),
  };
  v.verdict = !img.ok ? 'REJET · ne se charge pas'
    : occupants.length ? 'ALERTE · fichier déjà porté par une autre fiche'
    : 'OK';
  verdicts.push(v);
  const marque = v.verdict === 'OK' ? '✓' : v.verdict.startsWith('ALERTE') ? '⚠' : '✗';
  console.log(`${marque} ${c.universe} | ${c.name} → « ${c.titre_wiki} » [${c.preuve}]`);
  console.log(`    ${v.dimensions_reelles ?? v.motif_charge}${v.collision_existant.length ? `  ⚠ déjà porté par : ${v.collision_existant.join(', ')}` : ''}`);
  await new Promise((s) => setTimeout(s, 150));
}

const ok = verdicts.filter((v) => v.verdict === 'OK').length;
const alerte = verdicts.filter((v) => v.verdict.startsWith('ALERTE')).length;
const rejet = verdicts.filter((v) => v.verdict.startsWith('REJET')).length;
console.log(`\n${ok} OK · ${alerte} alerte(s) de collision · ${rejet} rejet(s) de chargement`);
console.log(`taux d'erreur mesuré : ${((alerte + rejet) / Math.max(1, verdicts.length) * 100).toFixed(1)} % sur ${verdicts.length} cas`);

const sortie = CHEMIN.replace(/\.json$/, '-epreuve.json');
await (await import('node:fs/promises')).writeFile(sortie, JSON.stringify({
  chantier: 'épreuve des candidats images (collision avec l’existant + chargement réel)',
  quand: new Date().toISOString(), source: CHEMIN,
  fiches_deja_illustrees: dejaIllustrees.length, fichiers_distincts: parFichier.size,
  candidats: verdicts.length, ok, alertes: alerte, rejets: rejet,
  taux_erreur_pourcent: Number(((alerte + rejet) / Math.max(1, verdicts.length) * 100).toFixed(1)),
  detail: verdicts,
}, null, 1));
console.log(`épreuve : ${sortie}`);
