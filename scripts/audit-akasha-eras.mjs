// scripts/audit-akasha-eras.mjs — RECENSEMENT des fiches détournées vers EraZone, et de ce que le
// chemin EntityZone leur donnerait à la place. Lecture seule : aucune écriture en base.
//
// POURQUOI ce script existe plutôt qu'une requête à la main : la branche `eras` de
// app/learn/akasha/[slug]/page.tsx court-circuite `deriveShape`, donc « quelles fiches perdent
// quoi » ne se lit nulle part — il faut rejouer la VRAIE fonction (lib/akasha/shape.ts) sur les
// VRAIES relations de chaque fiche. Le recensement se fait par SCAN PAGINÉ complet et non par un
// filtre serveur : un `select` nu plafonne à 1 000 lignes sans le dire, et ce plafond a déjà
// produit quatre chiffres faux cette semaine (tasks/lessons.md, 07/08).
//
// Lancer : node --import tsx --env-file=.env.local scripts/audit-akasha-eras.mjs
import { writeFileSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';
import { deriveShape } from '../lib/akasha/shape.ts';

const db = clientSite();
const PAGE = 1000;

/** Lecture d'ensemble TOUJOURS paginée — cf. en-tête. */
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

/** Même garde que shape.ts (`aDesElementsObjets`) et que le filtre de EraZone.tsx : un tableau ne
 *  compte que s'il porte au moins un ÉLÉMENT-OBJET. La branche de page.tsx, elle, se contente de
 *  `Array.isArray && length > 0` — l'écart est justement une des choses à mesurer. */
const objets = (v) => Array.isArray(v) && v.some((x) => x !== null && typeof x === 'object');

const toutes = await scan('akasha_entries', 'slug, name, type, universe, eras:attributes->eras');
const brancheePage = toutes.filter((e) => Array.isArray(e.eras) && e.eras.length > 0);
const capaciteTimeline = toutes.filter((e) => objets(e.eras));

console.log(`corpus scanné (paginé) : ${toutes.length} fiches`);
console.log(`branche EraZone de page.tsx (Array && length>0) : ${brancheePage.length}`);
console.log(`capacité timeline au sens de shape.ts (>=1 élément-objet) : ${capaciteTimeline.length}`);

// Détail fiche par fiche : relations réelles (paginées), sections réelles, shape recalculé.
const detail = [];
for (const e of brancheePage) {
  const { data: full } = await db
    .from('akasha_entries')
    .select('id, slug, name, type, universe, image_url, summary, attributes')
    .eq('slug', e.slug)
    .maybeSingle();
  if (!full) continue;

  const out = await scan(
    'akasha_relations',
    'id, relation, target:akasha_entries!akasha_relations_to_entry_fkey(slug, name, type, image_url)',
    (q) => q.eq('from_entry', full.id),
  );
  const inn = await scan(
    'akasha_relations',
    'id, relation, target:akasha_entries!akasha_relations_from_entry_fkey(slug, name, type, image_url, favorites:attributes->>favorites)',
    (q) => q.eq('to_entry', full.id),
  );
  const norm = (rows) =>
    rows.map((r) => ({ ...r, target: Array.isArray(r.target) ? r.target[0] : r.target })).filter((r) => r.target);
  const relationsOut = norm(out);
  const relationsIn = norm(inn);

  const sections = await scan('akasha_sections', 'titre, texte', (q) => q.eq('entry_id', full.id));

  const attributes = { ...full.attributes, sections };
  const shape = deriveShape({ universe: full.universe, attributes, relationsOut, relationsIn });

  // Ce que la surface EraZone montre aujourd'hui : « Figures du lieu » = `habite` entrant seulement.
  const figuresEraZone = relationsIn.filter((r) => r.relation === 'habite' && r.target.type === 'character').length;
  // Ce que le module orbit d'EntityZone compterait : habite + appartient entrants de personnage.
  const membresOrbit = relationsIn.filter(
    (r) => (r.relation === 'habite' || r.relation === 'appartient') && r.target.type === 'character',
  ).length;

  detail.push({
    slug: full.slug,
    name: full.name,
    type: full.type,
    universe: full.universe,
    eras: Array.isArray(full.attributes.eras) ? full.attributes.eras.length : 0,
    erasObjets: Array.isArray(full.attributes.eras)
      ? full.attributes.eras.filter((x) => x !== null && typeof x === 'object').length
      : 0,
    erasImages: Array.isArray(full.attributes.eras)
      ? full.attributes.eras.filter((x) => x && typeof x === 'object' && typeof x.img === 'string' && x.img.trim()).length
      : 0,
    quote: full.attributes.quote && typeof full.attributes.quote === 'object' ? Boolean(full.attributes.quote.text) : false,
    imageUrl: Boolean(full.image_url),
    relIn: relationsIn.length,
    relOut: relationsOut.length,
    figuresEraZone,
    membresOrbit,
    sections: sections.length,
    shape,
    // Ce que la branche EraZone ne montre PAS aujourd'hui, alors que shape.ts l'autorise.
    perdu: shape.filter((m) => m !== 'identity' && m !== 'timeline'),
  });
}

detail.sort((a, b) => b.membresOrbit - a.membresOrbit);
const horodate = new Date().toISOString().replace(/[:.]/g, '-');
const chemin = `data/audits/erazone-recensement-${horodate}.json`;
writeFileSync(
  chemin,
  JSON.stringify(
    { mesureLe: new Date().toISOString(), corpus: toutes.length, brancheePage: brancheePage.length, capaciteTimeline: capaciteTimeline.length, detail },
    null,
    2,
  ),
);
console.log(`\ntrace : ${chemin}\n`);
console.table(
  detail.map((d) => ({
    slug: d.slug, type: d.type, univers: d.universe, eras: d.eras, img: d.erasImages,
    cit: d.quote ? '✓' : '', relIn: d.relIn, relOut: d.relOut, figures: d.figuresEraZone,
    orbit: d.membresOrbit, sec: d.sections, perdu: d.perdu.join('+') || '—',
  })),
);
