// scripts/ops-blitz-export.mjs — prépare un BLITZ FENÊTRE : découpe les pages canon des entités
// SANS dossier et les écrit en chargeurs JSON que des agents Claude Code traduisent en masse.
//
// POURQUOI CE CHEMIN EXISTE À CÔTÉ DE L'USINE (03/08/2026)
// L'usine (production → double jury → publication) est la voie normale, mais elle avance à la
// vitesse des guichets gratuits : ~1 000 sections/nuit. Quand Dan veut un univers ENTIER en une
// journée (JoJo, HxH, Bleach l'ont été), la fenêtre Claude Code traite 1 200 sections en 50 min
// avec un vérificateur indépendant par chargeur — mesuré à qualité ÉGALE à l'usine (audit du
// 03/08 : 7,8/10 contre 7,9/10, échantillons stratifiés contre sources fraîches).
//
// Vivait dans le scratchpad jusqu'à ce qu'une purge de session l'efface en pleine mission. Sa
// place est ici : un outil qu'on relance à chaque univers n'est pas un brouillon.
//
// Usage : node --env-file=.env.local scripts/ops-blitz-export.mjs --universe="Naruto" \
//           [--prefixe=naruto] [--dir=<scratchpad>] [--max-sections=8] [--limit=2000] [--persos-seuls]
import fs from 'node:fs';
import { fetchFandomSections } from './lib/fandom.mjs';
import { clientSite } from '../lib/ops/db.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const UNIVERSE = arg('universe');
const PREFIXE = arg('prefixe', (UNIVERSE ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 12));
const DIR = arg('dir', '/tmp');
const MAX_SECTIONS = Number(arg('max-sections', 8));
const LIMIT = Number(arg('limit', 2000));
const PERSOS_SEULS = process.argv.includes('--persos-seuls');
// --autres-seuls : les personnages passent TOUJOURS en premier (c'est la jauge de Dan), donc un
// lot limité ne descend jamais jusqu'aux jutsu/lieux tant qu'il reste un perso à faire. Ce flag
// saute l'étage des personnages pour attaquer directement le reste (03/08).
const AUTRES_SEULS = process.argv.includes('--autres-seuls');
if (!UNIVERSE) { console.error('--universe obligatoire'); process.exit(1); }

const s = clientSite();
// « Sans dossier » se lit dans akasha_sections depuis la migration du 05/08 : le JSONB
// attributes.sections est purgé, donc .is('attributes->sections', null) était devenu
// TOUJOURS-VRAI — le blitz aurait re-découpé l'univers entier. On tire UNE FOIS le Set
// des entry_id déjà pourvus (paginé : .select() plafonne à 1 000 lignes en silence).
const dejaDossier = new Set();
for (let d = 0; ; d += 1000) {
  const { data, error } = await s.from('akasha_sections').select('entry_id').order('id').range(d, d + 999);
  if (error) { console.error('✗ lecture akasha_sections :', error.message); process.exit(1); }
  for (const r of data ?? []) dejaDossier.add(r.entry_id);
  if ((data ?? []).length < 1000) break;
}
// Personnages d'abord (c'est la jauge de Dan), puis le reste — chacun sans dossier.
// Pagination complète AVANT le filtre JS : un .limit() côté SQL pouvait ne ramener que des
// fiches déjà pourvues et rendre un lot vide alors qu'il restait du travail plus loin.
const lot = async (persos) => {
  const rows = [];
  for (let d = 0; ; d += 1000) {
    const { data } = await s.from('akasha_entries').select('id,slug,name,summary,type')
      .eq('universe', UNIVERSE)[persos ? 'eq' : 'neq']('type', 'character')
      .order('slug').range(d, d + 999);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return rows.filter((e) => !dejaDossier.has(e.id));
};
const cibles = [...(AUTRES_SEULS ? [] : await lot(true)), ...(PERSOS_SEULS ? [] : await lot(false))].slice(0, LIMIT);
console.log(`cibles : ${cibles.length} entité(s) sans dossier [${UNIVERSE}]`);

const entites = []; let sansPage = 0;
for (const e of cibles) {
  try {
    const page = await fetchFandomSections(UNIVERSE, e.name, { maxSections: MAX_SECTIONS, slug: e.slug });
    // Une section trop courte ne porte pas de matière : elle coûterait un aller-retour d'agent
    // pour trois mots. Le seuil de 250 caractères vient des blitz JoJo/HxH/Bleach.
    const sections = (page?.sections ?? [])
      .filter((x) => (x.texte ?? '').length > 250)
      .map((x) => ({ i: String(x.index ?? x.i), titre: x.titre, source: String(x.texte).slice(0, 2400) }));
    if (!sections.length) { sansPage++; continue; }
    entites.push({ slug: e.slug, name: e.name, type: e.type, resume: String(e.summary ?? '').slice(0, 200), sections });
  } catch { sansPage++; }
  if (entites.length % 50 === 0 && entites.length) console.log(`  … ${entites.length} entités préparées`);
}

// ~18 sections par chargeur : au-delà, la sortie d'un agent devient longue et le taux d'omission
// monte ; en deçà, on paie trop d'allers-retours pour rien.
const chargeurs = []; let courant = [], poids = 0;
for (const e of entites) {
  courant.push(e); poids += e.sections.length;
  if (poids >= 18) { chargeurs.push(courant); courant = []; poids = 0; }
}
if (courant.length) chargeurs.push(courant);
chargeurs.forEach((c, n) => fs.writeFileSync(`${DIR}/${PREFIXE}_${n}.json`, JSON.stringify(c)));
const meta = { universe: UNIVERSE, entites: entites.length,
  sections: entites.reduce((a, e) => a + e.sections.length, 0), chargeurs: chargeurs.length, sansPage };
fs.writeFileSync(`${DIR}/${PREFIXE}-meta.json`, JSON.stringify(meta));
console.log(`FINAL — ${JSON.stringify(meta)}`);
