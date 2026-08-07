// scripts/ops-resonde-gardes.mjs — RE-SONDAGE DES REFUS SUSPECTS (07/08/2026, soir).
//
// POURQUOI. Le tri des piles du 07/08 a sorti 7 691 tentatives de « pending » et en a marqué
// 3 302 « refus SUSPECT — NE PAS remettre en file avant correction de la garde ». Les gardes ont
// été réparées dans la foulée, puis deux contre-vérificateurs ont trouvé, dans la réparation
// elle-même, un trou qui laissait produire une fiche sur la page d'un AUTRE personnage. Ce trou
// est colmaté (voir titrePlusRiche et l'essai des voyelles longues dans lib/fandom.mjs).
// Ce script fait la suite : rejouer la garde RÉPARÉE sur chaque couple suspect, et trancher.
//
// MÉTHODE, et c'est le point qui compte le plus :
//   · les couples se lisent DEPUIS LE FICHIER de triage (177 couples nommés), jamais depuis un
//     prompt — un lot dicté est un lot qu'on ne peut ni recompter ni rejouer ;
//   · la charge utile est celle du WORKER, pas une charge utile de test : mêmes champs, mêmes
//     sources. La leçon du matin (une batterie qui ne transmet pas `summary` désarme la garde
//     qu'elle croit tester) vaut dans les deux sens, et elle a resservi ce soir ;
//   · on ne juge pas seulement « passe / ne passe pas » : on relève le TITRE retenu. Une garde
//     qui dit oui sur la mauvaise page coûte plus cher qu'une garde qui dit non.
//
// Usage :
//   node --env-file=.env.local scripts/ops-resonde-gardes.mjs --sonder [--limit=N]
//   node --env-file=.env.local scripts/ops-resonde-gardes.mjs --appliquer [--max-file=400] [--dry]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { clientOps } from '../lib/ops/db.mjs';
import { fetchFandomProse, citeLeNom, titrePlusRiche, titreStrictementEgal } from './lib/fandom.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');
const F_TRIAGE = join(RACINE, 'data', 'audits', 'piles-triage.json');
const F_TRACE = join(RACINE, 'data', 'audits', 'resonde-gardes-trace.json');
const F_BILAN = join(RACINE, 'data', 'audits', 'resonde-gardes.json');

const ops = clientOps();
const DRY = process.argv.includes('--dry');
const arg = (n, d) => Number(process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d);

/** La garde EXTRAITE du source du worker — jamais recopiée : une copie finit périmée et le
 *  test se met alors à juger une garde qui n'existe plus. (Même procédé que ops-tester-gardes.) */
function gardeDuWorker() {
  const src = readFileSync(join(RACINE, 'scripts', 'agent-worker.mjs'), 'utf8');
  const debut = src.indexOf('guard: (p) => {', src.indexOf('fandom_descfr:'));
  if (debut < 0) throw new Error('garde fandom_descfr introuvable dans agent-worker.mjs');
  let i = src.indexOf('{', debut + 'guard: (p) =>'.length), n = 0, fin = -1;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') n++;
    else if (src[k] === '}') { n--; if (!n) { fin = k + 1; break; } }
  }
  return new Function('citeLeNom', 'titrePlusRiche', 'titreStrictementEgal',
    `return (p) => ${src.slice(i, fin)};`)(citeLeNom, titrePlusRiche, titreStrictementEgal);
}
const guard = gardeDuWorker();

/** Les six types de tâche concernés partagent TOUS la garde fandom_descfr (akasha_relations et
 *  les fiche_* la délèguent explicitement). Vérifié dans agent-worker.mjs avant d'écrire ceci. */
const TYPES_ATTENDUS = ['akasha_relations', 'fandom_descfr', 'fiche_artefact', 'fiche_lexique', 'fiche_technique', 'fiche_lieu'];

/** Charge utile PROPRE pour la remise en file : on ne renvoie que ce qui vient de NOUS
 *  (identité, type, résumé). Tout le reste — `fandom`, `fandomTitle`, `sameEntity`,
 *  `pageOeuvre` — est du DÉRIVÉ, recalculé par l'étape `fetch` du worker. Le renvoyer tel quel
 *  ferait survivre l'ancienne résolution dans le cas où la page n'est pas servie : le worker
 *  garde alors `...p`, donc l'ancien texte, et la garde jugerait une matière périmée. */
const payloadPropre = (p) => {
  const out = {};
  for (const k of ['name', 'slug', 'type', 'universe', 'summary', 'category', 'import_source'])
    if (p?.[k] !== undefined) out[k] = p[k];
  return out;
};

// ════════════════════════════════════════════════════════════════════════════════════════
// PHASE 1 — SONDER
// ════════════════════════════════════════════════════════════════════════════════════════
async function sonder() {
  const triage = JSON.parse(readFileSync(F_TRIAGE, 'utf8'));
  const familles = triage.a_refusees.familles;
  const suspectes = Object.entries(familles).filter(([, f]) => f.classe === 'suspect');

  // Couples nommés, lus DU FICHIER. Format : « task_type|slug|Univers|Nom ».
  const couples = [];
  for (const [nomFamille, f] of suspectes)
    for (const ligne of f.paires_a_resonder ?? []) {
      const [task_type, slug, universe, name] = String(ligne).split('|');
      couples.push({ famille: nomFamille, ligne, task_type, slug, universe, name });
    }
  const LIMIT = arg('limit', couples.length);
  console.log(`${couples.length} couples nommés dans ${suspectes.length} familles suspectes (${suspectes.map(([k, f]) => `${k}=${f.paires_a_resonder.length}`).join(', ')})`);
  console.log(`tentatives couvertes : ${suspectes.reduce((s, [, f]) => s + f.tentatives, 0)}`);

  // Motifs d'AVANT, ligne à ligne : le tri a écrasé agent_results.error par le motif de
  // famille, mais il avait conservé l'état antérieur dans la trace. On le relit pour que
  // « avant » soit le vrai motif de garde et non le motif de fermeture.
  const fTrace = join(RACINE, 'data', 'audits', 'piles-triage-trace.json');
  const avantParId = new Map();
  if (existsSync(fTrace)) {
    const t = JSON.parse(readFileSync(fTrace, 'utf8'));
    const bloc = t.avant_colonne_error?.refusees;
    const dico = bloc?.dictionnaire ?? [];
    for (const [id, idx] of Object.entries(bloc?.id_vers_index ?? {})) avantParId.set(Number(id), dico[idx] ?? null);
  }

  // Toutes les lignes refusées des couples visés, en UNE passe paginée (pas 177 requêtes).
  const slugs = [...new Set(couples.map((c) => c.slug))];
  const parCouple = new Map();
  for (let i = 0; i < slugs.length; i += 60) {
    const { data, error } = await ops.from('agent_results')
      .select('id, task_type, target_slug, payload, error')
      .in('target_slug', slugs.slice(i, i + 60))
      .eq('status', 'refused').order('id', { ascending: false });
    if (error) throw new Error(`agent_results : ${error.message}`);
    for (const r of data ?? []) {
      const cle = `${r.task_type}|${r.target_slug}`;
      const e = parCouple.get(cle) ?? { ids: [], payload: null, avant: null };
      e.ids.push(r.id);
      if (!e.payload && r.payload?.name) e.payload = r.payload;
      if (!e.avant) e.avant = avantParId.get(r.id) ?? null;
      parCouple.set(cle, e);
    }
  }

  const trace = [];
  let n = 0;
  for (const c of couples.slice(0, LIMIT)) {
    n++;
    const cle = `${c.task_type}|${c.slug}`;
    const dossier = parCouple.get(cle);
    if (!dossier?.payload) {
      trace.push({ ...c, verdict: 'INTROUVABLE', motif_apres: 'aucune ligne refusée retrouvée en base pour ce couple', lignes: dossier?.ids.length ?? 0 });
      continue;
    }
    const p0 = dossier.payload;
    let page = null, panne = null;
    try { page = await fetchFandomProse(p0.universe ?? c.universe, p0.name ?? c.name, { slug: p0.slug ?? c.slug }); }
    catch (e) { panne = e.message; }

    // LA CHARGE UTILE DU WORKER, à l'identique (agent-worker.mjs, étape `fetch`).
    const p = page
      ? { ...payloadPropre(p0), fandom: page.text, fandomTitle: page.title, fandomUrl: page.url,
          sameEntity: page.sameEntity, aliasCure: page.aliasCure, identiteAttestee: page.identiteAttestee,
          pageOeuvre: page.pageOeuvre, resolutionPartielle: page.resolutionPartielle }
      : payloadPropre(p0);
    const refus = panne ? `PANNE RÉSEAU : ${panne}` : guard(p);

    trace.push({
      famille: c.famille, task_type: c.task_type, slug: c.slug, universe: p0.universe ?? c.universe,
      name: p0.name ?? c.name, type_entite: p0.type ?? null,
      lignes_refusees: dossier.ids.length, ids: dossier.ids,
      motif_avant: dossier.avant ?? '(non conservé)',
      titre_trouve: page?.title ?? null, resolu_par: page?.resolvedBy ?? null,
      taille: (page?.text ?? '').length,
      titre_a_change: Boolean(page?.title) && page.title !== (p0.fandomTitle ?? null),
      titre_precedent: p0.fandomTitle ?? null,
      motif_apres: refus,
      verdict: panne ? 'PANNE' : refus ? 'ENCORE REFUSÉ' : 'PASSE',
      payload_relance: payloadPropre(p0),
    });
    if (n % 20 === 0) console.log(`  … ${n}/${Math.min(LIMIT, couples.length)}`);
  }

  const passe = trace.filter((t) => t.verdict === 'PASSE');
  const refus = trace.filter((t) => t.verdict === 'ENCORE REFUSÉ');
  const pannes = trace.filter((t) => t.verdict === 'PANNE' || t.verdict === 'INTROUVABLE');
  console.log(`\n→ ${passe.length} passent · ${refus.length} refusés · ${pannes.length} panne/introuvable`);
  console.log(`→ titres CHANGÉS par la nouvelle résolution : ${trace.filter((t) => t.titre_a_change).length}`);

  writeFileSync(F_TRACE, JSON.stringify({
    chantier: 'resonde-gardes', fait_le: new Date().toISOString(),
    base: 'ops (PostgREST) — agent_results',
    source_des_couples: 'data/audits/piles-triage.json → a_refusees.familles[classe=suspect].paires_a_resonder',
    garde: 'agent-worker.mjs → TASK_TYPES.fandom_descfr.guard, EXTRAITE du source',
    couples_attendus: couples.length, couples_sondes: trace.length,
    compte_croise: { attendus: couples.length, sondes: trace.length, egal: couples.length === trace.length },
    comptes: { passe: passe.length, encore_refuses: refus.length, panne_ou_introuvable: pannes.length },
    trace,
  }, null, 2) + '\n');
  console.log('→ trace écrite :', F_TRACE);
}

// ════════════════════════════════════════════════════════════════════════════════════════
// PHASE 2 — APPLIQUER
//
// CLASSEMENT DES REFUS QUI TIENNENT. Le motif de garde dit POURQUOI on refuse ; il ne dit pas
// si la matière existe ailleurs. Les 33 restants ont donc été ouverts un par un — wikitext BRUT
// relu à la source pour les 17 « trop maigres », page lue pour les autres — et rangés en deux
// tas, parce que ces deux tas n'appellent pas le même travail :
//   · PLAFOND VRAI  : le wiki n'a pas de page propre à cette entité, ou sa page renvoie hors
//                     wiki. Aucun réglage de garde n'y changera rien ; c'est un plafond de
//                     SOURCE, à documenter et à laisser fermé.
//   · À REVOIR      : la matière existe, quelque part, mais notre chaîne ne l'atteint pas —
//                     alias à curer, plancher à revoir sur une ébauche, glose française dans
//                     notre propre nom. Chacun est nommé avec sa piste, pour que la reprise
//                     soit mécanique et non une nouvelle enquête.
// ════════════════════════════════════════════════════════════════════════════════════════
const PLAFOND = {
  // 12 outils Naruto : la page EXISTE mais n'est qu'un {{Soft redirect}} vers WIKIPÉDIA. Le
  // wiki dit lui-même qu'il n'a rien à en dire — 14 caractères une fois le modèle nettoyé.
  ...Object.fromEntries(['Axe', 'Flail', 'Jō', 'Katar', 'Kuwa', 'Nunchaku', 'Scalpel', 'Shakujō',
    'Shield', 'Tessen', 'Three-Section Staff', 'Whip'].map((n) => [n,
    'page réduite à un renvoi hors wiki ({{Soft redirect}} vers Wikipédia) : le wiki canon n\'a aucune matière propre'])),
  // 7 sous-variantes : notre entrée est une DÉCLINAISON d'une technique générale, et le wiki ne
  // lui consacre pas de page. La garde « page plus générale » fait exactement son travail.
  ...Object.fromEntries(['Summoning Technique (Doki)', 'Summoning Technique (Giant Eagle)',
    "Summoning Technique (Hōzuki Castle's Ninken)", 'Summoning Technique (Nuiba)',
    'Summoning Technique (Shinigami, Snake)', 'Wood Release: Underground Roots Technique',
    "Katasuke Tōno's Assistant"].map((n) => [n,
    'aucune page propre sur le wiki : seule existe la page générale, qui décrit un autre sujet que notre déclinaison'])),
};
const A_REVOIR = {
  'Daidai Village': 'ébauche RÉELLE de 309 c bruts (« a small village inhabited by the members of the Yoimura Clan ») ramenée à 116 c par le nettoyeur : c\'est le nettoyage du modèle {{translation}} qu\'il faut revoir, pas la source',
  'Hidden Kunai Mechanism': 'ébauche RÉELLE de 588 c bruts ramenée à 123 c par le nettoyeur : même défaut que Daidai Village, sous le plancher de 150 à cause de l\'infobox',
  'Campacino Achino': 'le wiki titre les membres de la famille par leur seul prénom (« Campacino ») ; « Achino » est notre romanisation d\'« Accino ». Candidat au registre d\'alias curé : Campacino Achino → Campacino',
  'Hockera Achino': 'même famille : candidat au registre d\'alias curé, Hockera Achino → Hockera',
  'Lil Achino': 'même famille : candidat au registre d\'alias curé, Lil Achino → Lil',
  'Koala Zombie': 'notre nom qualifie l\'état du personnage (zombie) ; le wiki titre « Koala ». Candidat au registre, à vérifier : le Koala de Thriller Bark n\'est pas la Koala de l\'Armée Révolutionnaire',
  'Pirate Captain (500 Hostages)': 'notre glose entre parenthèses ne correspond à aucune page ; « Pirate Captain » est un rôle générique. À vérifier à la main avant tout alias',
  'Snake Way Guide': 'le wiki décrit le lieu (« Snake Way »), pas son gardien. Vérifier s\'il a une page propre sous un autre nom avant de curer',
  'Z-Sword (Épée Zeta)': 'défaut de NOTRE côté : notre nom porte une glose française entre parenthèses qui empoisonne la requête. La page « Z Sword » est la bonne — à curer, ou à nettoyer dans le nom de l\'entrée',
  'Gentle Step Spiralling Twin Lion Fists': 'le wiki sert « Gentle Step Twin Lion Fists » : à établir si notre entrée est la même technique sous une autre traduction ou une variante distincte',
  'Ed': 'le wiki redirige « Ed » vers « Ed (Actor) », mais la parenthèse est une désambiguïsation : rien ne dit que notre Ed est cet acteur. Nom trop court pour que l\'attestation joue (mots de 2 lettres écartés)',
  'Masshikaku': 'seule page servie : « Mashikaku (Non-Canon) ». La parenthèse distingue une version NON CANON — à trancher avant de produire',
  'Mother': 'notre entrée s\'appelle « Mother » avec un résumé entièrement générique ; la page servie est « Chi-Chi\'s mother » (l\'Ox-Queen). Rien n\'établit que ce soit la même : entrée à renommer ou à documenter à la source',
};

async function appliquer() {
  const t = JSON.parse(readFileSync(F_TRACE, 'utf8'));
  const MAX_FILE = arg('max-file', 400);
  // DÉDOUBLONNAGE par (type de tâche, slug) : la liste des 177 couples de l'audit contient un
  // doublon (fandom_descfr|carol-masterson, 177 lignes à lui seul). Sans ça, on posterait deux
  // fois la même production et on compterait ses lignes deux fois — 3 479 au lieu de 3 302.
  const uniq = [...new Map(t.trace.map((x) => [`${x.task_type}|${x.slug}`, x])).values()];
  const passe = uniq.filter((x) => x.verdict === 'PASSE');
  const refus = uniq.filter((x) => x.verdict !== 'PASSE');

  // Classement, et VÉRIFICATION que le classement couvre tout le monde : un refus non rangé
  // est un refus qu'on s'apprête à fermer sans savoir quoi en dire.
  const nonRanges = refus.filter((x) => !PLAFOND[x.name] && !A_REVOIR[x.name]);
  if (nonRanges.length) throw new Error(`${nonRanges.length} refus non classés : ${nonRanges.map((x) => x.name).join(', ')}`);

  // Les lignes à fermer sont CELLES DU TRI DU 07/08, reconnues à leur motif « ⚠ clos 07/08 ».
  // Sans ce filtre, on écraserait des fermetures antérieures parfaitement légitimes portées par
  // les mêmes slugs (5 457 lignes retrouvées pour 3 302 tentatives visées : l'écart, c'est elles).
  const idsSuspects = new Set();
  const slugs = [...new Set(t.trace.map((x) => x.slug))];
  for (let i = 0; i < slugs.length; i += 60) {
    const { data, error } = await ops.from('agent_results').select('id, task_type, target_slug, error')
      .in('target_slug', slugs.slice(i, i + 60)).eq('status', 'refused').like('error', '⚠ clos 07/08%');
    if (error) throw new Error(`relecture : ${error.message}`);
    for (const r of data ?? []) idsSuspects.add(`${r.task_type}|${r.target_slug}|${r.id}`);
  }
  const idsDe = (x) => [...idsSuspects].filter((k) => k.startsWith(`${x.task_type}|${x.slug}|`)).map((k) => Number(k.split('|')[2]));

  const lignesPasse = passe.flatMap(idsDe);
  const lignesRefus = refus.flatMap(idsDe);
  console.log(`lignes « ⚠ clos 07/08 » retrouvées : ${idsSuspects.size} (passe ${lignesPasse.length} · refus ${lignesRefus.length})`);
  console.log(`couples : ${passe.length} à relancer · ${refus.length} à fermer (${refus.filter((x) => PLAFOND[x.name]).length} plafond vrai, ${refus.filter((x) => A_REVOIR[x.name]).length} à revoir)`);

  // Une SEULE production par couple, jamais une par tentative : les 3 302 lignes sont pour
  // l'essentiel le même travail réessayé. C'est la règle du 02/08 (ops-realias-requeue).
  const messages = [];
  for (const x of passe.slice(0, MAX_FILE)) {
    const p = x.payload_relance;
    if (p) messages.push({ type: x.task_type, payload: p });
  }
  console.log(`→ ${messages.length} message(s) à poster (plafond --max-file=${MAX_FILE})`);
  if (DRY) { console.log('— DRY, rien n\'est écrit'); return; }

  for (let i = 0; i < messages.length; i += 100)
    await ops.rpc('ops_queue_send_batch', { messages: messages.slice(i, i + 100) });

  const maj = async (ids, err) => {
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await ops.from('agent_results')
        .update({ error: err, reviewed_at: new Date().toISOString() }).in('id', ids.slice(i, i + 200));
      if (error) throw new Error(`maj : ${error.message}`);
    }
  };
  for (const x of passe) {
    const ids = idsDe(x); if (!ids.length) continue;
    await maj(ids, `✅ re-sondée 07/08 (gardes réparées) — passe désormais : « ${x.titre_trouve} » (${x.taille} c, ${x.resolu_par})${x.titre_a_change ? ` — TITRE CORRIGÉ, servait « ${x.titre_precedent} »` : ''} — relancée en production`);
  }
  for (const x of refus) {
    const ids = idsDe(x); if (!ids.length) continue;
    const plafond = Boolean(PLAFOND[x.name]);
    await maj(ids, `${plafond ? '⛔ PLAFOND VRAI' : '🔎 À REVOIR'} 07/08 (re-sondage gardes réparées) — ${x.motif_apres} · ${PLAFOND[x.name] ?? A_REVOIR[x.name]}`);
  }
  console.log('✓ file alimentée, lignes fermées');
  return { messages: messages.length, lignesPasse: lignesPasse.length, lignesRefus: lignesRefus.length };
}

if (process.argv.includes('--sonder')) await sonder();
if (process.argv.includes('--appliquer')) await appliquer();
