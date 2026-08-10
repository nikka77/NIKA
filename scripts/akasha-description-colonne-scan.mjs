// scripts/akasha-description-colonne-scan.mjs — CHANTIER 5, LECTURE SEULE.
//
// Mesure ce que porte réellement akasha_entries.description, et le compare à summary et à
// attributes->>descFr (la source du vrai texte long). Aucune écriture.
//
// PAGINATION OBLIGATOIRE : un select nu s'arrête à 1000 lignes SANS ERREUR (leçon payée
// trois fois cette semaine). Toute lecture passe par .range(d, d+999) en boucle.
//
// Lancement : node --env-file=.env.local scripts/akasha-description-colonne-scan.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const PAGE = 1000;

async function lireTout(table, cols, tri = 'slug') {
  const lignes = [];
  for (let d = 0; ; d += PAGE) {
    const { data, error } = await db.from(table).select(cols).order(tri, { ascending: true }).range(d, d + PAGE - 1);
    if (error) throw new Error(`${table} @${d} : ${error.message}`);
    lignes.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return lignes;
}

const entries = await lireTout('akasha_entries', 'id, slug, name, type, universe, summary, description, attributes');
const secs = await lireTout('akasha_sections', 'entry_id', 'entry_id');
const avecDossier = new Set(secs.map((s) => s.entry_id));

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const nonNulles = entries.filter((e) => norm(e.description) !== '');

// Gabarit générique figé au seed : « <Type> de <Univers>. » sans information distinctive.
const GABARIT = /^(personnage|personnage secondaire|lieu|artefact|objet|pouvoir|compétence|technique|statut|métier)[^.]{0,40}\s+(de|du|d'|des)\s+.{2,40}\.?$/i;

const classees = nonNulles.map((e) => {
  const d = norm(e.description);
  const s = norm(e.summary);
  const descFr = norm(e.attributes?.descFr);
  let categorie;
  if (d === s) categorie = 'A_doublon_exact_de_summary';
  else if (GABARIT.test(d)) categorie = 'B_gabarit_generique_fossile';
  else if (descFr && (d === descFr || descFr.includes(d))) categorie = 'E_deja_present_dans_descFr';
  else categorie = 'D_texte_distinct_a_juger';
  return {
    slug: e.slug, name: e.name, type: e.type, universe: e.universe,
    categorie,
    description: d,
    summary: s,
    descFr_present: descFr !== '',
    descFr_extrait: descFr ? descFr.slice(0, 220) : null,
    a_un_dossier_sections: avecDossier.has(e.id),
    // Phrase-preuve : le nom de la fiche apparaît-il dans son propre texte de description ?
    nom_cite_dans_sa_description: d.toLowerCase().includes(norm(e.name).toLowerCase().split(' ')[0] ?? ''),
  };
});

const parCategorie = {};
for (const c of classees) (parCategorie[c.categorie] ??= []).push(c.slug);

const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
const rapport = {
  chantier: 'chantier-5-colonne-description',
  quand: new Date().toISOString(),
  mode: 'LECTURE SEULE — aucune écriture DB dans ce script',
  pagination: `range(d, d+${PAGE - 1}) en boucle jusqu'à page incomplète`,
  comptes: {
    total_fiches: entries.length,
    description_vide_ou_nulle: entries.length - nonNulles.length,
    description_non_nulle: nonNulles.length,
    pourcentage_non_nulle: +((nonNulles.length / entries.length) * 100).toFixed(2),
    fiches_avec_descFr: entries.filter((e) => norm(e.attributes?.descFr) !== '').length,
    fiches_avec_dossier_sections: entries.filter((e) => avecDossier.has(e.id)).length,
  },
  repartition: Object.fromEntries(Object.entries(parCategorie).map(([k, v]) => [k, v.length])),
  par_categorie: parCategorie,
  lignes: classees,
};

mkdirSync('data/audits', { recursive: true });
const chemin = `data/audits/description-colonne-scan-${horodatage}.json`;
writeFileSync(chemin, JSON.stringify(rapport, null, 2));
console.log(chemin);
console.log(JSON.stringify(rapport.comptes, null, 2));
console.log(JSON.stringify(rapport.repartition, null, 2));
