// scripts/audit-chantier5-carnet.mjs — CHANTIER 5 : le CARNET consolidé « donnée · combien · lue
// par · visible où ». Assemble les quatre mesures de la soirée en UN tableau trié par nombre de
// fiches concernées, pour servir de point de départ aux chantiers suivants.
//
// Il ne mesure rien lui-même : il ne fait que joindre des fichiers déjà écrits (et donc déjà
// horodatés). Aucune écriture en base.
//
// Usage : node scripts/audit-chantier5-carnet.mjs <visibilite.json> <liensPerdus.json> <inventaire.json> <sortie.json>
import fs from 'node:fs';

const [fVis, fLiens, fInv, sortie] = process.argv.slice(2);
const vis = JSON.parse(fs.readFileSync(fVis, 'utf8'));
const liens = JSON.parse(fs.readFileSync(fLiens, 'utf8'));
const inv = JSON.parse(fs.readFileSync(fInv, 'utf8'));

// Classement à la main des clés muettes : « plomberie » (provenance, notes d'ops, clés de
// jointure) vs « matière » (du contenu écrit pour un lecteur, qu'aucune page ne sert).
const PLOMBERIE = new Set([
  'descFrSource', 'descLang', 'descRaw', 'source', 'import_source', 'sourceUrl',
  'villageSlug', 'clanSlug', 'sectionsSource', 'purgeAudit',
  'descFrPurgee', 'descFrRetiree', 'descFrImpossible', 'resumeCorrige',
]);
// Clés dont la valeur est en ANGLAIS BRUT : les publier violerait « textes en français toujours »
// (CLAUDE.md) — elles demandent une traduction avant, pas un branchement.
const ANGLAIS_BRUT = new Set(['sex', 'natureType', 'team', 'tools']);

const parCle = new Map(inv.clesAttributes.map((c) => [c.cle, c]));
const tableau = vis.clesMuettes.map((c) => ({
  donnee: `attributes.${c.cle}`,
  combien: c.peuplees,
  muettes: c.muettes,
  gabaritsMuets: c.muettesParGabarit,
  parType: parCle.get(c.cle)?.parType ?? null,
  nature: PLOMBERIE.has(c.cle) ? 'plomberie légitime' : ANGLAIS_BRUT.has(c.cle) ? 'matière, mais en anglais brut' : 'matière',
  exemples: c.exemples,
}));

fs.writeFileSync(sortie, JSON.stringify({
  chantier: 'chantier 5 — inventaire base vs site',
  quand: new Date().toISOString(),
  nature: 'DIAGNOSTIC. Aucune écriture en base. Lectures Supabase paginées par 1000 avec .order(id).',
  sources: { visibilite: fVis, liensPerdus: fLiens, inventaire: fInv },
  socle: inv.socle,
  colonnes: inv.colonnes,
  colonnesRemplissage: inv.colonnesRemplissage,
  gabarits: inv.parGabarit,
  imageUrlParGabarit: vis.imageUrlParGabarit,
  clesAttributesMuettes: tableau,
  naturesAretes: inv.naturesAretes.map((n) => ({ relation: n.relation, total: n.total, paires: n.paires })),
  aretesPerdues: { total: liens.total, fiches: liens.fichesUniques, tableau: liens.tableau },
}, null, 1));
console.log(`carnet écrit → ${sortie}`);
console.log(`clés muettes: ${tableau.length} · dont matière: ${tableau.filter((t) => t.nature !== 'plomberie légitime').length}`);
