// scripts/akasha-db-race-saga-extraction.mjs — LOT 6, « extraire race ET saga depuis descFr » (Dragon Ball).
//
// CONTEXTE : Dragon Ball a deux axes DÉCLARÉS dans lib/akasha/universe-taxonomy.ts (race : 7
// valeurs canon · saga : 5 valeurs canon) mais peu peuplés (8,1 % / 8,7 % sur l'ensemble des 1137
// entrées Dragon Ball — 19,5 % / 20,9 % rapportés aux 473 PERSONNAGES, le seul type concerné).
// L'information est SOUVENT écrite en toutes lettres dans `attributes.descFr` (biographie FR déjà
// rédigée) : c'est de l'EXTRACTION, zéro appel de modèle, zéro invention.
//
// GARDE DE PRÉCISION (mesurée, cf. data/audits/dragon-ball-race-saga-trace.json → `mesure`) :
//   Un premier passage « mot-clé n'importe où dans le texte » est catastrophique — sur les
//   personnages SANS race déjà posée, "Saiyan" apparaît 14 fois dans descFr et ZÉRO fois n'est le
//   personnage lui-même (toujours un adversaire ou un événement cité : « il affronte les Saiyans »,
//   « vaincu par le jeune Saiyan » [= Goku, pas le sujet]). Même chose pour "Majin" (29 hits, 0 net :
//   presque toujours le NOM d'un autre personnage, « Majin Buu », jamais la race du sujet).
//   → RACE : le terme canon doit apparaître dans la PREMIÈRE PHRASE de descFr (celle qui introduit
//     le sujet), immédiatement après une copule « est un/une/le/la/l' » (0-2 mots de filler). Ce
//     positionnement structurel élimine mécaniquement les mentions d'un AUTRE personnage cité en
//     aposition plus loin dans la phrase (vérifié sur le cas « Tambourine est le [...] fils de
//     Piccolo Daimaô, un Namek humanoïde... » — le Namek de l'aposition est Piccolo Daimaô, pas
//     Tambourine, et le pattern structurel l'exclut sans logique ad-hoc).
//   → SAGA : le terme canon doit apparaître dans une phrase où AUCUN signal de désattribution
//     n'est présent — mesuré à la main sur les 37 candidats bruts (§3 ci-dessous) : 7 auraient été
//     FAUX (18,9 %, bien au-dessus du seuil de 5 %) sans cette garde :
//       · marqueur temporel de BORNE, pas de PRÉSENCE : « née AVANT la saga Majin Buu » (Marron),
//         « APRÈS la saga Buu, on ignore... » (Erasa) — le sujet est situé hors de la saga, pas dedans.
//       · réapparition / caméo, signal explicite de rôle SECONDAIRE et non de la saga qui définit
//         le personnage (cohérent avec les 10 fiches déjà curées « Saga Cell » : Trunks, Cell,
//         Dr Gero... — toujours le rôle PRINCIPAL, jamais une réapparition) : « réapparaît »,
//         « fait une AUTRE apparition », « ne fait qu'une UNIQUE apparition », « brève apparition-
//         caméo » (Paikuhan, Tao Pai Pai, Maron, Piiza).
//       · aparté parenthétique sur le statut canonique, jamais une attribution directe :
//         « (sauf dans la saga Buu) » (Suno, double négation sur la non-canonicité de ses
//         apparitions ultérieures dans l'anime).
//     Après ajout de cette garde : 0 faux sur les 29 candidats retenus (relecture manuelle
//     exhaustive des 37 candidats, PAS un échantillon — voir §3). Le 37ᵉ est Mezu, écarté par une
//     branche ENTIÈREMENT AUTRE — deux sagas propres dans la même fiche, donc `cleanFound.size > 1`
//     — et non par la garde : il n'est pas « faux », il est indécidable. La note d'origine annonçait
//     « 36 candidats, 8 faux » en n'en nommant que 7 ; les deux chiffres étaient décalés d'un cran
//     parce que ce rejet-là n'appartenait pas à la même famille. Recompté le 09/08 par
//     scripts/audit-race-saga-preuves.mjs, qui rejoue ces extracteurs sans les recopier.
//
// PRÉCISION RÉELLE, PLUS LARGE QUE LA MESURE (constat du 09/08) : le taux « 13 candidats race, 13
// corrects, 0 % d'erreur » ne portait que sur les fiches SANS race — donc jamais sur C-18, qui en
// avait déjà une. Or son texte dit « C-18 est une humaine cybernétique » : l'extracteur aurait
// posé `Human` là où la taxonomie dit `Android`. La règle AJOUT-SEULEMENT est ce qui a évité
// l'erreur, pas la garde. Un taux d'erreur mesuré sur les seules fiches candidates surestime la
// précision de l'extracteur — le vrai témoin est la population déjà renseignée.
//
// AJOUT-SEULEMENT : ne touche que les fiches SANS race / SANS saga existante. Idempotent (colonne
// déjà à la valeur décidée → noop). TRACE AVANT ÉCRITURE : le plan complet est TOUJOURS écrit sur
// disque avant la moindre requête d'écriture.
//
// Usage :
//   node --env-file=.env.local scripts/akasha-db-race-saga-extraction.mjs             # dry-run + trace
//   node --env-file=.env.local scripts/akasha-db-race-saga-extraction.mjs --write     # applique
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const db = clientSite();

export async function allRows(table, sel, filterFn) {
  let rows = [];
  let from = 0;
  const step = 1000;
  for (;;) {
    let q = db.from(table).select(sel).range(from, from + step - 1);
    if (filterFn) q = filterFn(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message || JSON.stringify(error)}`);
    rows = rows.concat(data);
    if (data.length < step) break;
    from += step;
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────
// Valeurs canon — copiées de lib/akasha/universe-taxonomy.ts (Dragon Ball, axes race/saga).
// Ne JAMAIS diverger de ces libellés : une valeur posée qui ne correspond pas mot pour mot à la
// taxonomie n'est filtrable par aucune page d'axe (leçon lot 3 : « écrire une donnée n'est pas la
// livrer »).
// ─────────────────────────────────────────────────────────────────────────
const RACE_CANON = ['Saiyan', 'Human', 'Namekian', 'Android', 'Majin', 'Frieza Race', 'Angel'];
const SAGA_CANON = ['Saga Saiyan', 'Saga Namek', 'Saga Cell', 'Saga Buu', 'Saga Super'];

function firstSentence(text) {
  const parts = text.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ü« ])/);
  return parts[0] || text;
}

// RACE : ancré juste après la copule, première phrase seulement.
const RACE_PATTERNS = {
  Saiyan: [/\best\s+(?:l['’]|un\s+|une\s+|le\s+|la\s+)?(?:demi-)?Saiyan(?:ne)?s?\b/i],
  Human: [/\best\s+(?:un\s+|une\s+|l['’])?humain(?:e)?s?\b/i],
  Namekian: [/\best\s+(?:un\s+|une\s+|le\s+|la\s+|l['’])?Namek(?:ien(?:ne)?)?s?\b/i],
  Android: [/\best\s+(?:un\s+|une\s+|l['’])?androïde\b/i, /\best\s+(?:un\s+|une\s+|l['’])?android\b/i],
  Majin: [/\best\s+(?:un\s+|une\s+|l['’])?Majin\b/i],
  'Frieza Race': [/\best\s+(?:un\s+|une\s+|l['’])?(?:extraterrestre\s+)?de\s+(?:la\s+)?race\s+de\s+Fr[ie]e?zer\b/i],
  Angel: [/\best\s+l['’]Ange\b/i],
};

export function extractRace(descFr) {
  const sent = firstSentence(descFr);
  const found = [];
  for (const canon of RACE_CANON) {
    for (const re of RACE_PATTERNS[canon]) {
      if (re.test(sent)) { found.push(canon); break; }
    }
  }
  if (found.length === 1) return { value: found[0], evidence: sent.trim() };
  if (found.length > 1) return { value: null, reason: `ambigu (${found.join('+')} tous deux dans la 1re phrase)`, evidence: sent.trim() };
  return { value: null, reason: null, evidence: null };
}

// SAGA : le terme canon peut apparaître n'importe où dans descFr, mais SEULEMENT si la phrase qui
// le porte ne contient aucun signal de désattribution (borne temporelle « avant/après », rôle
// secondaire « réapparaît/autre/unique/brève apparition-caméo ») et si l'occurrence n'est pas à
// l'intérieur d'une parenthèse (aparté, jamais une attribution directe — cf. cas Suno).
const SAGA_PATTERNS = {
  'Saga Saiyan': [/\bsaga\s+(?:des\s+)?Saiyans?\b/gi],
  'Saga Namek': [/\bsaga\s+Namek\b/gi],
  'Saga Cell': [/\bsaga\s+(?:du\s+)?Cell\b(?!\s*Max)/gi, /\bsaga\s+des\s+Cell\s+Games\b/gi],
  'Saga Buu': [/\bsaga\s+(?:de\s+)?Majin\s+Bu[uo]\b/gi, /\bsaga\s+Bu[uo]\b/gi],
  'Saga Super': [
    /\bsaga\s+(?:de\s+)?la\s+Survie\s+des\s+Univers\b/gi,
    /\bsaga\s+(?:de\s+)?la\s+Survie\s+de\s+l['’]Univers\b/gi,
    /\bsaga\s+Super\b(?!\s*\d)(?!\s*17)/gi,
  ],
};

const NEGATIVE_SIGNALS = [
  /\bavant\s+la\s+saga\b/i,
  /\bapr[eè]s\s+la\s+saga\b/i,
  /réappara/i,
  /\bautre\s+apparition\b/i,
  /unique\s+apparition|une\s+seule\s+apparition|br[eè]ve\s+apparition|apparition[\s-]cam[ée]o/i,
];

// Découpe descFr en phrases avec leurs offsets [start, end) dans le texte d'origine.
function sentencesWithOffsets(text) {
  const out = [];
  const re = /[^.!?]*[.!?]+(?=\s|$)|[^.!?]+$/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[0].trim()) out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}

function insideParens(sentence, matchStartInSentence) {
  const before = sentence.slice(0, matchStartInSentence);
  const opens = (before.match(/\(/g) || []).length;
  const closes = (before.match(/\)/g) || []).length;
  return opens > closes;
}

export function extractSaga(descFr) {
  const sents = sentencesWithOffsets(descFr);
  const cleanFound = new Set();
  const rejectedFound = new Set();
  const evidenceByCanon = {};
  for (const canon of SAGA_CANON) {
    for (const re of SAGA_PATTERNS[canon]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(descFr))) {
        const sIdx = sents.findIndex((s) => m.index >= s.start && m.index < s.end);
        const sentence = sIdx >= 0 ? sents[sIdx].text : descFr;
        const localIdx = sIdx >= 0 ? m.index - sents[sIdx].start : 0;
        const negHit = NEGATIVE_SIGNALS.find((n) => n.test(sentence));
        const paren = insideParens(sentence, localIdx);
        if (!negHit && !paren) {
          cleanFound.add(canon);
          evidenceByCanon[canon] = sentence.trim();
        } else {
          rejectedFound.add(`${canon} (${negHit ? 'signal:' + negHit.source.slice(0, 30) : 'parenthèse'})`);
        }
      }
    }
  }
  if (cleanFound.size === 1) {
    const value = [...cleanFound][0];
    return { value, evidence: evidenceByCanon[value], rejected: [...rejectedFound] };
  }
  if (cleanFound.size > 1) {
    return { value: null, reason: `ambigu (${[...cleanFound].join('+')} tous deux propres)`, rejected: [...rejectedFound] };
  }
  if (rejectedFound.size > 0) {
    return { value: null, reason: `tous les candidats rejetés par la garde (${[...rejectedFound].join('; ')})`, rejected: [...rejectedFound] };
  }
  return { value: null, reason: null, rejected: [] };
}

// ─────────────────────────────────────────────────────────────────────────
async function planExtraction() {
  const chars = await allRows(
    'akasha_entries',
    'id, slug, name, type, universe, attributes',
    (q) => q.eq('universe', 'Dragon Ball').eq('type', 'character'),
  );

  const raceRows = [];
  const sagaRows = [];
  let raceAlready = 0, sagaAlready = 0, noDescFr = 0;

  for (const c of chars) {
    // Compte croisé « déjà posé » sur TOUTE la population (indépendant de la présence de descFr —
    // sinon une fiche déjà taguée sans descFr fausse le total, cf. anton-the-great : race=Human,
    // descFr absent).
    if (c.attributes?.race) raceAlready++;
    if (c.attributes?.saga) sagaAlready++;

    const descFr = c.attributes?.descFr;
    if (!descFr || !String(descFr).trim()) { noDescFr++; continue; }

    if (!c.attributes?.race) {
      const r = extractRace(descFr);
      if (r.value) raceRows.push({ id: c.id, slug: c.slug, name: c.name, value: r.value, evidence: r.evidence });
    }

    if (!c.attributes?.saga) {
      const s = extractSaga(descFr);
      if (s.value) sagaRows.push({ id: c.id, slug: c.slug, name: c.name, value: s.value, evidence: s.evidence, rejectedAlternatives: s.rejected });
    }
  }

  const raceByValue = {};
  for (const r of raceRows) raceByValue[r.value] = (raceByValue[r.value] || 0) + 1;
  const sagaByValue = {};
  for (const r of sagaRows) sagaByValue[r.value] = (sagaByValue[r.value] || 0) + 1;

  // Compte croisé : les valeurs posées doivent toutes exister dans la taxonomie (sinon = bug de
  // frappe, jamais filtrable).
  const raceOffTaxonomy = Object.keys(raceByValue).filter((v) => !RACE_CANON.includes(v));
  const sagaOffTaxonomy = Object.keys(sagaByValue).filter((v) => !SAGA_CANON.includes(v));

  return {
    totalCharacters: chars.length,
    noDescFr,
    race: { already: raceAlready, extracted: raceRows.length, byValue: raceByValue, offTaxonomy: raceOffTaxonomy, rows: raceRows },
    saga: { already: sagaAlready, extracted: sagaRows.length, byValue: sagaByValue, offTaxonomy: sagaOffTaxonomy, rows: sagaRows },
  };
}

async function executePlan(plan) {
  let raceUpdated = 0, sagaUpdated = 0, errors = 0;
  const byId = new Map();
  for (const r of plan.race.rows) byId.set(r.id, { ...(byId.get(r.id) || {}), race: r.value });
  for (const r of plan.saga.rows) byId.set(r.id, { ...(byId.get(r.id) || {}), saga: r.value });

  for (const [id, patch] of byId) {
    const { data: cur, error: e1 } = await db.from('akasha_entries').select('attributes').eq('id', id).single();
    if (e1) { console.error('  ✗ lecture', id, e1.message); errors++; continue; }
    const nextAttrs = { ...(cur.attributes || {}) };
    let changed = false;
    if (patch.race && !nextAttrs.race) { nextAttrs.race = patch.race; changed = true; raceUpdated++; }
    if (patch.saga && !nextAttrs.saga) { nextAttrs.saga = patch.saga; changed = true; sagaUpdated++; }
    if (!changed) continue; // idempotent : déjà posé entre-temps
    const { error: e2 } = await db.from('akasha_entries').update({ attributes: nextAttrs }).eq('id', id);
    if (e2) { console.error('  ✗ écriture', id, e2.message); errors++; continue; }
  }
  return { raceUpdated, sagaUpdated, errors, totalRowsTouched: byId.size };
}

async function main() {
  console.log(WRITE ? '=== Dragon Ball race/saga — EXÉCUTION (--write) ===' : '=== Dragon Ball race/saga — DRY-RUN (trace only) ===');

  const plan = await planExtraction();
  console.log(`\n${plan.totalCharacters} personnages Dragon Ball · ${plan.noDescFr} sans descFr`);
  console.log(`race  : ${plan.race.already} déjà posées · +${plan.race.extracted} extraites →`, plan.race.byValue);
  console.log(`saga  : ${plan.saga.already} déjà posées · +${plan.saga.extracted} extraites →`, plan.saga.byValue);
  if (plan.race.offTaxonomy.length) console.error('⚠ race hors taxonomie :', plan.race.offTaxonomy);
  if (plan.saga.offTaxonomy.length) console.error('⚠ saga hors taxonomie :', plan.saga.offTaxonomy);

  const trace = {
    started_at: new Date().toISOString(),
    write: WRITE,
    mesure: {
      note: 'Mesuré sur measure-run avant garde (raw, mot-clé + première-phrase seule, sans garde saga) : ' +
        '37 candidats saga bruts — 29 retenus, 7 vérifiés manuellement FAUX (18,9 %) et 1 indécidable. ' +
        'Marron, Erasa, Paikuhan, Maron, Piiza, Suno, Tao Pai Pai ont été FAUSSEMENT retenus (désattribution : ' +
        'borne temporelle avant/après, réapparition/caméo secondaire, ou aparté parenthétique sur la ' +
        'non-canonicité) ; Mezu, lui, porte DEUX sagas propres et tombe sur la branche d\'ambiguïté, pas sur ' +
        'la garde. Après ajout de la garde : 0 faux sur les 29 retenus, relecture manuelle EXHAUSTIVE des 37 ' +
        'candidats (pas un échantillon). Race : 13 candidats bruts, 13 vérifiés corrects à la main (0 %) — mais ' +
        'ce taux ne porte que sur les fiches SANS race, et C-18, déjà renseignée, aurait été mal extraite ' +
        '(« humaine cybernétique » → Human au lieu d\'Android). Chiffres recomptés le 09/08 par ' +
        'scripts/audit-race-saga-preuves.mjs ; preuves ligne-à-ligne dans dragon-ball-race-saga-preuves.json.',
    },
    plan,
  };
  // UN RUN D'ÉCRITURE NE DOIT JAMAIS POUVOIR ÊTRE EFFACÉ PAR UNE VÉRIFICATION (08/08).
  // La version d'origine écrivait toujours au même chemin : le dry-run de contrôle lancé APRÈS
  // l'application a écrasé la trace des 42 écritures — plus une seule phrase-preuve sur disque, et
  // le fichier n'était pas versionné. Un run `--write` a désormais son propre fichier horodaté,
  // que rien ne réécrit ; les dry-runs se partagent le chemin stable, qui est jetable par nature.
  const tracePath = path.join(ROOT, WRITE
    ? `data/audits/dragon-ball-race-saga-trace--ecriture-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    : 'data/audits/dragon-ball-race-saga-trace.json');
  fs.mkdirSync(path.dirname(tracePath), { recursive: true });
  fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2));
  console.log(`\nTrace écrite → ${path.relative(ROOT, tracePath)}`);

  if (WRITE) {
    console.log('\nApplication…');
    const result = await executePlan(plan);
    console.log(`  race : ${result.raceUpdated} écrites · saga : ${result.sagaUpdated} écrites · ${result.errors} erreurs · ${result.totalRowsTouched} fiches touchées`);
    trace.execution = { ...result, finished_at: new Date().toISOString() };
    fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2));
  } else {
    console.log('\nDry-run seul — relancer avec --write pour appliquer.');
  }
}

// Exécuté DIRECTEMENT → on applique ; IMPORTÉ → on n'expose que les extracteurs (l'audit de
// preuves les rejoue sans relancer un plan ni toucher la base).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
