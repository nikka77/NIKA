// scripts/ops-reparer-curation-0708.mjs — RÉPARATION des défauts que les contre-vérificateurs ont
// trouvés dans la vague de curation du 07/08. Un passage, tracé, réversible.
//
// POURQUOI
// Les trois chantiers parallèles (piles, images, re-typage) ont livré de vrais gains — 2 508 images
// posées, 36 fiches re-typées, 7 691 tentatives sorties de la pile — mais leurs contre-vérificateurs
// les ont réfutés sur des points précis, chacun démontré sur pièces. Ce script règle les six défauts
// CONFIRMÉS et vérifiables, et lui seul écrit : les exécutants d'origine ne repassent pas derrière.
//
// Ce qu'il fait, et pourquoi c'est la bonne réponse dans chaque cas :
//  1. 22 images « NoPicAvailable.png » — le carton « pas d'image disponible » du wiki, compté comme
//     un succès. Une case vide est honnête, un faux visuel ne l'est pas : on remet à NULL.
//  2. 29 résumés qui contredisent leur propre fiche — les fiches re-typées status→place gardent
//     « Organisation de l'univers Naruto — réunit X, Y et 15 autres ». Le badge dit « Lieu », le
//     texte dit « Organisation » : le re-typage n'était fait qu'à moitié. On retire la phrase
//     fautive plutôt que d'en inventer une (le résumé sera re-généré par l'usine, à sa main).
//  3. `ace` — fiche artifact (un sabre) dont les 8 sections et l'image racontent Portgas D. Ace, le
//     PERSONNAGE, qui a déjà sa propre fiche `portgas-d-ace`. On retire les sections et l'image
//     usurpées ; le descFr, lui, parle bien du sabre : il reste.
//  4. 10 fiches ont perdu leur attribut `organization` — /sora ne mentionne plus le Temple du Feu
//     alors que l'arête existe. La valeur d'avant est restaurée depuis la trace du chantier.
//  5. 3 régions posées sans attestation (Ishigakure, Kusagakure, Takigakure : aucun champ « Country »
//     dans l'infobox) — retirées. Une donnée non sourcée vaut moins qu'une donnée absente.
//  6. `shuku-village` re-typée sur la seule preuve de son nom (page MISSING sur le wiki) — remise à
//     son type d'avant, tel que la trace le donne.
//
// Usage : node --env-file=.env.local scripts/ops-reparer-curation-0708.mjs [--dry]
import { readFile, writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const DRY = process.argv.includes('--dry');
const s = clientSite();
const REPO = new URL('..', import.meta.url).pathname;
const trace = { chantier: 'reparation-curation-0708', dry: DRY, avant: {}, apres: {}, comptes: {} };
const dire = (...a) => console.log(...a);

/** Lecture fraîche + écriture d'attributes par fusion — jamais d'écrasement en aveugle. */
async function majAttributs(slug, transformer) {
  const { data: e, error } = await s.from('akasha_entries')
    .select('id, slug, type, name, summary, image_url, attributes').eq('slug', slug).single();
  if (error || !e) return { slug, erreur: error?.message ?? 'introuvable' };
  const patch = transformer(e);
  if (!patch) return { slug, saute: 'rien à changer' };
  if (DRY) return { slug, simule: patch };
  const { error: errU } = await s.from('akasha_entries').update(patch).eq('id', e.id);
  if (errU) return { slug, erreur: errU.message };
  return { slug, applique: Object.keys(patch) };
}

// ── 1. images placeholder ────────────────────────────────────────────────────
const { data: placeholders } = await s.from('akasha_entries')
  .select('id, slug, name, image_url').ilike('image_url', '%NoPicAvailable%');
trace.avant.placeholders = placeholders ?? [];
if (!DRY && placeholders?.length) {
  for (const p of placeholders) await s.from('akasha_entries').update({ image_url: null }).eq('id', p.id);
}
trace.comptes.placeholders = placeholders?.length ?? 0;
dire(`1. images placeholder remises à vide : ${placeholders?.length ?? 0}`);

// ── 2. résumés qui contredisent le type ──────────────────────────────────────
const { data: contradictoires } = await s.from('akasha_entries')
  .select('id, slug, summary').eq('type', 'place').ilike('summary', '%Organisation de l%');
trace.avant.resumes = contradictoires ?? [];
for (const c of contradictoires ?? []) {
  // On RETIRE la phrase fautive, on n'en fabrique pas une autre : ce résumé est du texte généré,
  // pas du canon — l'usine le repose proprement quand elle repasse sur la fiche.
  if (!DRY) await s.from('akasha_entries').update({ summary: null }).eq('id', c.id);
}
trace.comptes.resumes = contradictoires?.length ?? 0;
dire(`2. résumés contradictoires retirés : ${contradictoires?.length ?? 0}`);

// ── 2 bis. la MÊME phrase vit aussi dans `description` ───────────────────────
// Piège découvert en vérifiant la page : /kusagakure affichait encore « Organisation de l'univers
// Naruto — réunit Karin, Mui, Benga et 15 autres » alors que `summary` était propre. Deux colonnes
// portent ce texte généré (summary ET description) et le gabarit de page lit la seconde en repli.
// Nettoyer l'une sans l'autre ne change rien à l'écran — c'est la vérification par la PAGE, et non
// par la base, qui l'a montré.
const { data: descContra } = await s.from('akasha_entries')
  .select('id, slug, description').eq('type', 'place').ilike('description', '%Organisation de l%');
trace.avant.descriptions = descContra ?? [];
for (const c of descContra ?? []) {
  if (!DRY) await s.from('akasha_entries').update({ description: null }).eq('id', c.id);
}
trace.comptes.descriptions = descContra?.length ?? 0;
dire(`2 bis. descriptions contradictoires retirées : ${descContra?.length ?? 0}`);

// ── 3. ace : sections et image d'une autre entité ────────────────────────────
const { data: ace } = await s.from('akasha_entries')
  .select('id, slug, name, image_url, attributes').eq('slug', 'ace').maybeSingle();
if (ace) {
  const { data: sec } = await s.from('akasha_sections').select('id, idx, titre, texte').eq('entry_id', ace.id);
  trace.avant.ace = { image_url: ace.image_url, sections: sec ?? [] };
  if (!DRY) {
    await s.from('akasha_sections').delete().eq('entry_id', ace.id);
    await s.from('akasha_entries').update({ image_url: null }).eq('id', ace.id);
  }
  trace.comptes.aceSections = sec?.length ?? 0;
  dire(`3. ace : ${sec?.length ?? 0} section(s) d'une autre entité retirée(s) + image usurpée`);
}

// ── 4. attribut `organization` perdu ─────────────────────────────────────────
const retypage = JSON.parse(await readFile(`${REPO}data/audits/retypage-trace.json`, 'utf8'));
const restaures = [];
for (const f of retypage.axe_organization_faux ?? []) {
  const orgAvant = f.attributes_avant?.organization;
  if (!orgAvant) continue;
  restaures.push(await majAttributs(f.slug, (e) => (e.attributes?.organization
    ? null                                              // déjà là : on ne touche pas
    : { attributes: { ...e.attributes, organization: orgAvant } })));
}
trace.apres.organization = restaures;
trace.comptes.organization = restaures.filter((r) => r.applique || r.simule).length;
dire(`4. attribut organization restauré : ${trace.comptes.organization}/${retypage.axe_organization_faux?.length ?? 0}`);

// ── 5. régions non attestées ─────────────────────────────────────────────────
const REGIONS_NON_ATTESTEES = ['ishigakure', 'kusagakure', 'takigakure'];
const regions = [];
for (const slug of REGIONS_NON_ATTESTEES) {
  regions.push(await majAttributs(slug, (e) => {
    if (!e.attributes?.region) return null;
    const { region, ...reste } = e.attributes;
    trace.avant[`region:${slug}`] = region;
    return { attributes: reste };
  }));
}
trace.apres.regions = regions;
trace.comptes.regions = regions.filter((r) => r.applique || r.simule).length;
dire(`5. régions non attestées retirées : ${trace.comptes.regions}/3`);

// ── 6. shuku-village : re-typée sans preuve externe ──────────────────────────
const avantShuku = (retypage.fiches ?? []).find((f) => f.slug === 'shuku-village');
let shuku = { slug: 'shuku-village', saute: 'absente de la trace' };
if (avantShuku) {
  shuku = await majAttributs('shuku-village', (e) => (e.type === avantShuku.type_avant
    ? null
    : { type: avantShuku.type_avant, attributes: avantShuku.attributes_avant }));
}
trace.apres.shuku = shuku;
dire(`6. shuku-village : ${JSON.stringify(shuku)}`);

await writeFile(`${REPO}data/audits/reparation-curation-0708-trace.json`, JSON.stringify(trace, null, 1));
dire(`\n${DRY ? '(à blanc) ' : ''}trace : data/audits/reparation-curation-0708-trace.json`);
