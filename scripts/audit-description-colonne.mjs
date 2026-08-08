// scripts/audit-description-colonne.mjs — LECTURE SEULE.
//
// Mesure ce que porte réellement la colonne akasha_entries.description aujourd'hui :
// combien de fiches, combien dupliquent summary, combien dupliquent attributes.descFr,
// combien de contenu propre (ni l'un ni l'autre). Écrit une trace JSON avant toute
// conclusion — chantier "audit-description-colonne", lot 6 (back/données).
//
// Usage : node --env-file=.env.local scripts/audit-description-colonne.mjs

import { clientSite } from '../lib/ops/db.mjs';
import { writeFileSync } from 'node:fs';

const PAGE = 1000; // le head PostgREST plafonne à 1000 lignes — toujours range()

function norm(s) {
  if (s == null) return '';
  return String(s).trim().replace(/\s+/g, ' ');
}

async function fetchAll() {
  const supabase = clientSite();
  let rows = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE - 1;
    const { data, error } = await supabase
      .from('akasha_entries')
      .select('id, slug, name, universe, type, summary, description, attributes')
      .range(from, to)
      .order('id', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

// Gabarit générique fossile (catégorie B) — texte-placeholder figé au seed, historique dans
// scripts/build-akasha-universes.mjs:492, akasha-db-cure.mjs:10, akasha-db-places.mjs:27,
// build-akasha-naruto.mjs:684 (`description: summary` au moment de la création). Repéré le
// 08/08/2026 : 23 fiches, aucune ne porte de fait vérifiable au-delà du gabarit (lu une par une,
// voir data/audits/description-colonne-trace.json).
const GABARIT_GENERIQUE = /^(Personnage secondaire de|Organisation de l'univers)\s+.+\.$/;

// Anomalies connues catégorie C (bug de contenu : description décrit une AUTRE entité que le
// summary) — documentées par data/audits/sources-doubles-rapport.json §point2_description, non
// corrigées depuis. Liste figée, pas une heuristique : un futur cas similaire n'y tombera PAS
// automatiquement et doit être lu à la main (règle de la maison : sous 20 cas, on lit).
const ANOMALIES_CONNUES = new Set(['inner-former', 'zerhogie']);

function classify(row) {
  const desc = norm(row.description);
  const summary = norm(row.summary);
  const descFr = norm(row.attributes?.descFr);

  if (desc === '') return { classe: 'vide', desc_len: 0 };

  if (ANOMALIES_CONNUES.has(row.slug)) {
    return { classe: 'C_anomalie_entite_differente', desc_len: desc.length };
  }

  if (desc === summary) {
    return { classe: 'A_doublon_exact_summary', desc_len: desc.length };
  }

  if (GABARIT_GENERIQUE.test(desc)) {
    return { classe: 'B_gabarit_generique_fossile', desc_len: desc.length };
  }

  if (descFr && desc === descFr) {
    return { classe: 'doublon_exact_descFr', desc_len: desc.length };
  }

  return { classe: 'D_contenu_reel_distinct', desc_len: desc.length };
}

// NOTE : ce script écrit un SCAN BRUT reproductible (description-colonne-scan-brut.json), pas la
// trace définitive du chantier. La trace définitive (data/audits/description-colonne-trace.json)
// contient en plus la lecture manuelle fiche par fiche, les sources croisées (sources-doubles,
// parents-manquants, grep du rendu front) et le verdict — elle n'est PAS régénérée automatiquement
// pour ne jamais écraser ce travail de lecture. Si ce script est relancé plus tard (dérive de
// l'usine), comparer son scan brut à la trace définitive avant d'agir : si les 4 catégories ne
// totalisent plus 33, une nouvelle lecture manuelle sous le seuil de 20 cas est due, pas un nouveau
// seuillage automatique.
async function main() {
  const rows = await fetchAll();
  const total = rows.length;

  const byClass = {};
  const parUnivers = {};
  const detailNonVide = [];

  for (const row of rows) {
    const c = classify(row);
    byClass[c.classe] = (byClass[c.classe] || 0) + 1;

    const u = row.universe || '(sans univers)';
    parUnivers[u] = parUnivers[u] || {};
    parUnivers[u][c.classe] = (parUnivers[u][c.classe] || 0) + 1;

    if (c.classe !== 'vide') {
      detailNonVide.push({
        slug: row.slug,
        name: row.name,
        universe: row.universe,
        type: row.type,
        classe: c.classe,
        desc_len: c.desc_len,
        summary_len: norm(row.summary).length,
        descFr_len: norm(row.attributes?.descFr).length,
        description_extrait: norm(row.description).slice(0, 200),
        summary_extrait: norm(row.summary).slice(0, 200),
      });
    }
  }

  const nonVide = total - (byClass['vide'] || 0);

  const result = {
    chantier: 'audit-description-colonne (scan brut, reproductible)',
    fait_le: new Date().toISOString(),
    voir_aussi: 'data/audits/description-colonne-trace.json — trace définitive avec lecture manuelle et verdict',
    source: 'clientSite() → akasha_entries, scan paginé complet (range), lecture seule',
    comptes: {
      total_fiches: total,
      description_vide_ou_null: byClass['vide'] || 0,
      description_non_vide: nonVide,
      A_doublon_exact_summary: byClass['A_doublon_exact_summary'] || 0,
      B_gabarit_generique_fossile: byClass['B_gabarit_generique_fossile'] || 0,
      C_anomalie_entite_differente: byClass['C_anomalie_entite_differente'] || 0,
      D_contenu_reel_distinct: byClass['D_contenu_reel_distinct'] || 0,
      doublon_exact_descFr: byClass['doublon_exact_descFr'] || 0,
    },
    pourcentages_sur_total: Object.fromEntries(
      Object.entries(byClass).map(([k, v]) => [k, +(100 * v / total).toFixed(2)])
    ),
    par_univers: parUnivers,
    detail_non_vide: detailNonVide,
  };

  writeFileSync(
    new URL('../data/audits/description-colonne-scan-brut.json', import.meta.url),
    JSON.stringify(result, null, 2)
  );

  console.log(JSON.stringify(result.comptes, null, 2));
  console.log('Scan brut écrit dans data/audits/description-colonne-scan-brut.json');
  console.log('(la trace définitive avec verdict reste data/audits/description-colonne-trace.json)');
}

main().catch((e) => {
  console.error('ERREUR:', e);
  process.exit(1);
});
