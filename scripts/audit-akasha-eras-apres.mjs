// scripts/audit-akasha-eras-apres.mjs — CONTRÔLE APRÈS la fusion d'EraZone en module `timeline`.
// Lecture seule. Rejoue le routage de `app/learn/akasha/[slug]/page.tsx` TEL QU'IL EST MAINTENANT
// (branche `eras` supprimée) et confronte, pour les 14 fiches concernées, ce qu'EraZone rendait à
// ce que `deriveShape` autorise désormais. Le but n'est pas de compter : c'est de nommer, fiche par
// fiche, ce qui est GAGNÉ et ce qui serait PERDU — la fusion ne se livre pas si elle retire.
//
// Lancer : node --import tsx --env-file=.env.local scripts/audit-akasha-eras-apres.mjs
import { writeFileSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';
import { deriveShape } from '../lib/akasha/shape.ts';

const db = clientSite();
const PAGE = 1000;

async function scan(table, cols, tune = (q) => q) {
  const out = [];
  for (let d = 0; ; d += PAGE) {
    const { data, error } = await tune(db.from(table).select(cols)).range(d, d + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

const LES_14 = [
  'konohagakure', 'grand-line', 'soul-society', 'ninja-medical', 'hueco-mundo', 'morioh',
  'mont-akina', 'marineford', 'sharingan', 'rasengan', 'samehada', 'namek', 'ae86-trueno',
  'cahier-de-la-mort',
];

// Réplique de l'ordre des branches de page.tsx APRÈS la fusion — plus aucun test sur `eras`.
const routage = (e) =>
  e.type === 'character' ? 'CharacterZone'
  : e.type === 'status' ? 'OrganizationZone'
  : (e.type === 'power' || e.type === 'skill') && e.cat === 'Attaque' ? 'Attaque'
  : 'EntityZone';

const corpus = await scan('akasha_entries', 'slug, type, cat:attributes->>category, eras:attributes->eras');
const parZone = {};
for (const e of corpus) parZone[routage(e)] = (parZone[routage(e)] ?? 0) + 1;
const aEres = corpus.filter((e) => Array.isArray(e.eras) && e.eras.length > 0);
const eresEnEntityZone = aEres.filter((e) => routage(e) === 'EntityZone');

console.log(`corpus paginé : ${corpus.length}`);
console.log('routage APRÈS fusion :', parZone);
console.log(`fiches à ères : ${aEres.length} — dont ${eresEnEntityZone.length} en EntityZone, ${aEres.length - eresEnEntityZone.length} interceptées plus haut (status → OrganizationZone)`);
console.log(`les 14 attendues sont-elles exactement celles-là ? ${JSON.stringify(eresEnEntityZone.map((e) => e.slug).sort()) === JSON.stringify([...LES_14].sort()) ? 'OUI' : 'NON — écart à examiner'}`);

const detail = [];
for (const slug of LES_14) {
  const { data: full } = await db
    .from('akasha_entries')
    .select('id, slug, name, type, universe, image_url, attributes')
    .eq('slug', slug)
    .maybeSingle();

  const relationsOut = (await scan(
    'akasha_relations',
    'id, relation, target:akasha_entries!akasha_relations_to_entry_fkey(slug, type)',
    (q) => q.eq('from_entry', full.id),
  )).map((r) => ({ ...r, target: Array.isArray(r.target) ? r.target[0] : r.target })).filter((r) => r.target);
  const relationsIn = (await scan(
    'akasha_relations',
    'id, relation, target:akasha_entries!akasha_relations_from_entry_fkey(slug, type)',
    (q) => q.eq('to_entry', full.id),
  )).map((r) => ({ ...r, target: Array.isArray(r.target) ? r.target[0] : r.target })).filter((r) => r.target);
  const sections = await scan('akasha_sections', 'titre', (q) => q.eq('entry_id', full.id));

  const shape = deriveShape({
    universe: full.universe,
    attributes: { ...full.attributes, sections },
    relationsOut,
    relationsIn,
  });

  // AVANT : EraZone ne rendait qu'une grappe, « habite » entrant de personnage, plafonnée à 18.
  const avantFigures = Math.min(
    18,
    relationsIn.filter((r) => r.relation === 'habite' && r.target.type === 'character').length,
  );
  // APRÈS : la grappe primaire du type, ou le puits `orbit` (place seulement) + son repli de 12.
  const PRIM = { power: ['maitrise'], skill: ['maitrise'], artifact: ['possede'], profession: ['exerce'], place: ['habite', 'appartient'] };
  const primaires = relationsIn.filter((r) => (PRIM[full.type] ?? []).includes(r.relation) && r.target.type === 'character').length;
  const orbite = shape.includes('orbit') && full.type === 'place';
  const apresFigures = orbite
    ? 1 + Math.min(8, Math.max(0, primaires - 1)) + Math.min(12, Math.max(0, primaires - 9)) // puits + anneau + repli
    : Math.min(12, primaires);
  // Les « Autres liens » sont eux aussi cliquables : ils n'existaient pas du tout avant.
  const autresLiens = relationsOut.length
    + relationsIn.filter((r) => !((PRIM[full.type] ?? []).includes(r.relation) && r.target.type === 'character')).length;

  detail.push({
    slug, type: full.type, universe: full.universe,
    eres: full.attributes.eras?.length ?? 0,
    shape,
    avant: { modules: ['identity', 'timeline'], figuresCliquables: avantFigures, dossier: sections.length > 0, attributs: false, voirAussi: false },
    apres: { modules: shape, figuresCliquables: apresFigures, autresLiensCliquables: Math.min(12, autresLiens), dossier: sections.length > 0, attributs: true, voirAussi: true },
    gagne: shape.filter((m) => m !== 'identity' && m !== 'timeline'),
    perdu: apresFigures < avantFigures ? `${avantFigures - apresFigures} figure(s) cliquable(s)` : null,
  });
}

const horodate = new Date().toISOString().replace(/[:.]/g, '-');
const chemin = `data/audits/erazone-fusion-apres-${horodate}.json`;
writeFileSync(chemin, JSON.stringify({ mesureLe: new Date().toISOString(), corpus: corpus.length, parZone, detail }, null, 2));
console.log(`\ntrace : ${chemin}\n`);
console.table(detail.map((d) => ({
  slug: d.slug, type: d.type, eres: d.eres,
  'figures AVANT': d.avant.figuresCliquables, 'figures APRÈS': d.apres.figuresCliquables,
  'autres liens': d.apres.autresLiensCliquables,
  gagne: d.gagne.join('+') || '—', perdu: d.perdu ?? '—',
})));
