// scripts/audit-akasha-sans-dossier-recoupe.mjs — CHANTIER 6, second temps : DEUX CONTRÔLES.
//
// POURQUOI. Le premier audit dit qu'il n'y a pas de gisement (177 fiches sur 2 856 dépassent
// 600 c, aucune ne porte d'intertitre). Avant de refermer un chantier, deux contrôles qui
// pourraient me contredire :
//
//  A. LE DOUBLON. `descFr` est affiché EN ENTIER comme bio sur tous les gabarits (CharacterZone
//     l.379, EntityZone l.391, gabarit Attaque l.148), et `DossierSections` rend les sections
//     JUSTE EN DESSOUS. Si les 4 619 fiches qui ont dossier ET descFr ont deux textes DISTINCTS,
//     alors découper descFr en sections ne remplirait pas un dossier : ça afficherait le même
//     texte deux fois sur la même page. Mesure : recouvrement lexical (trigrammes de mots) entre
//     descFr et la concaténation des sections, sur toute la population.
//     Tokenisation en \p{L}\p{N} — leçon du 07/08 : les plages Latin-1 cassent « Hyūga » en deux.
//
//  B. LES VINGT CAS. Règle 4 : mesurer son taux d'erreur sur vingt cas avant d'écrire les mille.
//     Ici la « règle » testée est la règle de découpe elle-même. On sort 20 des 177 textes riches
//     EN ENTIER, pour lecture humaine : combien portent un thème qui change, un intertitre, une
//     articulation qui donnerait un titre issu DU TEXTE ? Le script ne juge pas — il expose.
//
// N'écrit RIEN en base.
// Usage : node --env-file=.env.local scripts/audit-akasha-sans-dossier-recoupe.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();

const page = async (table, sel, tri = 'id') => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).order(tri).range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const secs = await page('akasha_sections', 'entry_id, idx, titre, texte');

const parFiche = new Map();
for (const s of secs) {
  if (!parFiche.has(s.entry_id)) parFiche.set(s.entry_id, []);
  parFiche.get(s.entry_id).push(s);
}
const descFr = (e) => (typeof e.attributes?.descFr === 'string' ? e.attributes.descFr.trim() : '');

// ── A. Recouvrement descFr × sections, en trigrammes de mots ────────────────────────────────
const mots = (t) => (t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
const trigrammes = (t) => {
  const m = mots(t);
  const s = new Set();
  for (let i = 0; i + 2 < m.length; i++) s.add(`${m[i]} ${m[i + 1]} ${m[i + 2]}`);
  return s;
};
// Part du descFr qui se retrouve DÉJÀ dans les sections : |A ∩ B| / |A|. C'est le sens utile —
// « ce texte est-il déjà raconté par le dossier ? », pas « les deux se ressemblent-ils ? ».
const recouvrements = [];
for (const e of entries) {
  const d = descFr(e);
  const ss = parFiche.get(e.id);
  if (!ss || d.length < 120) continue;
  const A = trigrammes(d);
  if (A.size < 5) continue;
  const B = trigrammes(ss.map((s) => s.texte ?? '').join('\n'));
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  recouvrements.push({ slug: e.slug, type: e.type, universe: e.universe, r: inter / A.size });
}
recouvrements.sort((a, b) => a.r - b.r);
const rs = recouvrements.map((x) => x.r);
const qt = (p) => rs[Math.floor(rs.length * p)] ?? 0;
const seuil = (s) => recouvrements.filter((x) => x.r >= s).length;

// ── B. Les vingt cas, tirés régulièrement dans les 177 riches (pas les 20 premiers : un tri par
// id ferait un échantillon d'un seul univers). Pas d'aléatoire non graine : un pas régulier est
// reproductible à l'identique par qui relance le script.
const riches = entries
  .filter((e) => !parFiche.has(e.id) && descFr(e).length > 600)
  .sort((a, b) => a.slug.localeCompare(b.slug));
const pas = riches.length / 20;
const vingt = Array.from({ length: 20 }, (_, k) => riches[Math.floor(k * pas)]).filter(Boolean);

const rapport = {
  chantier: 'CHANTIER 6 — contrôles A (doublon) et B (vingt cas)',
  quand: new Date().toISOString(),
  ecritEnBase: 'RIEN — audit en lecture seule',
  A_recouvrementDescFrEtSections: {
    fichesMesurees: recouvrements.length,
    commentaire: 'part des trigrammes de descFr déjà présents dans les sections de la MÊME fiche',
    p10: qt(0.1), mediane: qt(0.5), p90: qt(0.9),
    auDessusDe_0_5: seuil(0.5), auDessusDe_0_3: seuil(0.3), auDessusDe_0_1: seuil(0.1),
    dixPlusRecouvrantes: recouvrements.slice(-10).reverse(),
    dixMoinsRecouvrantes: recouvrements.slice(0, 10),
  },
  B_vingtCas: {
    populationRiche: riches.length,
    pasDEchantillonnage: Number(pas.toFixed(2)),
    cas: vingt.map((e) => ({
      slug: e.slug, name: e.name, type: e.type, universe: e.universe,
      longueur: descFr(e).length,
      texteEntier: descFr(e),
    })),
  },
};

const sortie = path.join(ROOT, `data/audits/sans-dossier-recoupe-${rapport.quand.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));

const A = rapport.A_recouvrementDescFrEtSections;
console.log(`A — recouvrement descFr × sections sur ${A.fichesMesurees} fiches`);
console.log(`   p10 ${A.p10.toFixed(3)} · médiane ${A.mediane.toFixed(3)} · p90 ${A.p90.toFixed(3)}`);
console.log(`   ≥0,5 : ${A.auDessusDe_0_5} · ≥0,3 : ${A.auDessusDe_0_3} · ≥0,1 : ${A.auDessusDe_0_1}`);
console.log(`\nB — ${vingt.length} cas tirés sur ${riches.length} riches (pas ${pas.toFixed(2)}) :`);
for (const c of rapport.B_vingtCas.cas) console.log(`   ${c.slug.padEnd(34)} ${String(c.longueur).padStart(5)} c · ${c.universe} · ${c.type}`);
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
