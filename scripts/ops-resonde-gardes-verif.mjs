// scripts/ops-resonde-gardes-verif.mjs — RE-SONDAGE DE CONTRÔLE (07/08/2026, 2e passe).
//
// POURQUOI UNE SECONDE PASSE. La première (ops-resonde-gardes.mjs) a rejoué la garde réparée sur
// les 177 couples suspects, en a relancé 143 et fermé 33. Elle a été faite HONNÊTEMENT ; ce
// script ne la refait pas par méfiance de principe, mais parce qu'un re-sondage ne vaut que s'il
// répond à DEUX questions, et qu'elle n'en traitait qu'une :
//   1. « la garde dit-elle oui ? » — traitée, et ses verdicts sont ici recomptés à l'identique ;
//   2. « SUR QUOI repose ce oui ? » — pas traitée. C'est pourtant la question du jour : le
//      contre-vérificateur anti-laxisme a montré que le danger n'est pas qu'une garde dise oui,
//      c'est qu'elle le dise pour la MÊME raison que la garde d'avant. Quand l'identité ne tient
//      qu'au squelette phonétique (sameEntityName), la garde anti-homonyme — dont tout le rôle
//      est de pouvoir CONTREDIRE la première — n'apporte plus d'avis indépendant.
//
// Ce script relève donc, pour chaque couple qui passe, LA PREUVE QUI LE PORTE :
//   titre_egal · alias_cure · attestation_wiki · titre_plus_riche · repere_du_resume · cite_le_nom
// et isole les « squelette_seul » : ceux dont aucune preuve indépendante ne subsiste. Ce sont
// eux, et eux seuls, qu'il faut lire à la main avant de relancer quoi que ce soit.
//
// Usage :
//   node --env-file=.env.local scripts/ops-resonde-gardes-verif.mjs --sonder
//   node --env-file=.env.local scripts/ops-resonde-gardes-verif.mjs --bilan
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { clientOps } from '../lib/ops/db.mjs';
import {
  fetchFandomProse, citeLeNom, titrePlusRiche, titreStrictementEgal,
  sameEntityName, sameEntityBySlug, libelleNu,
} from './lib/fandom.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');
const F_TRIAGE = join(RACINE, 'data', 'audits', 'piles-triage.json');
const F_TRACE1 = join(RACINE, 'data', 'audits', 'resonde-gardes-trace.json');
const F_TRACE = join(RACINE, 'data', 'audits', 'resonde-gardes-trace.json');
const F_BILAN = join(RACINE, 'data', 'audits', 'resonde-gardes.json');

const ops = clientOps();
const arg = (n, d) => Number(process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d);

/** La garde EXTRAITE du source du worker — jamais recopiée. */
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

const payloadPropre = (p) => {
  const out = {};
  for (const k of ['name', 'slug', 'type', 'universe', 'summary', 'category', 'import_source'])
    if (p?.[k] !== undefined) out[k] = p[k];
  return out;
};

/** Les noms propres du résumé, filtrés du nom de l'œuvre — RECOPIÉ de la garde à dessein :
 *  ici on ne juge pas, on OBSERVE ce sur quoi la garde s'est appuyée. */
function reperesDuResume(summary, universe) {
  const motsOeuvre = new Set(String(universe ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean));
  return [...new Set((summary ?? '').match(/(?<!^|[.!?]\s)\b[A-ZÀ-Þ][\wÀ-ÿ'-]{3,}/g) ?? [])]
    .filter((n) => !motsOeuvre.has(n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')));
}

/** SUR QUOI repose l'identité de ce couple ? Une preuve par ligne, indépendantes entre elles. */
function preuves(p) {
  const out = [];
  if (titreStrictementEgal(p.name, p.fandomTitle)) out.push('titre_egal');
  if (p.aliasCure) out.push('alias_cure');
  if (p.identiteAttestee) out.push('attestation_wiki');
  if (titrePlusRiche(p.name, p.fandomTitle)) out.push('titre_plus_riche');
  const rep = reperesDuResume(p.summary, p.universe);
  if (rep.length && rep.some((n) => (p.fandom ?? '').toLowerCase().includes(n.toLowerCase().slice(0, 6))))
    out.push('repere_du_resume');
  if (citeLeNom(p.fandom, p.name, p.fandomTitle)) out.push('cite_le_nom');
  if (sameEntityBySlug(p.slug, p.fandomTitle)) out.push('slug');
  return { preuves: out, reperes: rep };
}

async function sonder() {
  const triage = JSON.parse(readFileSync(F_TRIAGE, 'utf8'));
  const suspectes = Object.entries(triage.a_refusees.familles).filter(([, f]) => f.classe === 'suspect');
  const couples = [];
  for (const [famille, f] of suspectes)
    for (const ligne of f.paires_a_resonder ?? []) {
      const [task_type, slug, universe, name] = String(ligne).split('|');
      couples.push({ famille, task_type, slug, universe, name });
    }
  // DÉDOUBLONNAGE par (type de tâche, slug) : la liste porte un doublon (fandom_descfr|
  // carol-masterson). Compter deux fois le même couple gonfle les deux bouts du compte croisé.
  const uniq = [...new Map(couples.map((c) => [`${c.task_type}|${c.slug}`, c])).values()];
  console.log(`${couples.length} couples nommés → ${uniq.length} distincts (${couples.length - uniq.length} doublon)`);

  // Verdicts de la 1re passe, pour comparer verdict à verdict.
  const passe1 = new Map();
  if (existsSync(F_TRACE1)) {
    const t1 = JSON.parse(readFileSync(F_TRACE1, 'utf8'));
    if (t1.chantier === 'resonde-gardes')
      for (const x of t1.trace ?? []) passe1.set(`${x.task_type}|${x.slug}`, x);
  }

  // Charges utiles réelles + comptes de lignes, en une passe paginée.
  const slugs = [...new Set(uniq.map((c) => c.slug))];
  const parCouple = new Map();
  for (let i = 0; i < slugs.length; i += 60) {
    const { data, error } = await ops.from('agent_results')
      .select('id, task_type, target_slug, payload, error, created_at')
      .in('target_slug', slugs.slice(i, i + 60)).eq('status', 'refused').order('id', { ascending: false });
    if (error) throw new Error(`agent_results : ${error.message}`);
    for (const r of data ?? []) {
      const cle = `${r.task_type}|${r.target_slug}`;
      const e = parCouple.get(cle) ?? { ids: [], payload: null, closSuspect: 0, apresRelance: [] };
      e.ids.push(r.id);
      if (!e.payload && r.payload?.name) e.payload = r.payload;
      if (/^(⚠ clos 07\/08|✅ re-sondée|⛔ PLAFOND|🔎 À REVOIR)/.test(r.error ?? '')) e.closSuspect++;
      if (r.created_at >= '2026-08-07T12:20:00') e.apresRelance.push({ id: r.id, error: (r.error ?? '').slice(0, 160) });
      parCouple.set(cle, e);
    }
  }

  const trace = [];
  let n = 0;
  for (const c of uniq) {
    const cle = `${c.task_type}|${c.slug}`;
    const d = parCouple.get(cle);
    if (!d?.payload) { trace.push({ ...c, verdict: 'INTROUVABLE', motif_apres: 'aucune ligne refusée en base' }); continue; }
    const p0 = d.payload;
    let page = null, panne = null;
    try { page = await fetchFandomProse(p0.universe ?? c.universe, p0.name ?? c.name, { slug: p0.slug ?? c.slug }); }
    catch (e) { panne = e.message; }
    const p = page
      ? { ...payloadPropre(p0), fandom: page.text, fandomTitle: page.title, fandomUrl: page.url,
          sameEntity: page.sameEntity, aliasCure: page.aliasCure, identiteAttestee: page.identiteAttestee,
          pageOeuvre: page.pageOeuvre, resolutionPartielle: page.resolutionPartielle }
      : payloadPropre(p0);
    const refus = panne ? `PANNE RÉSEAU : ${panne}` : guard(p);
    const { preuves: pr, reperes } = page ? preuves(p) : { preuves: [], reperes: [] };
    const v1 = passe1.get(cle);

    trace.push({
      famille: c.famille, task_type: c.task_type, slug: c.slug,
      universe: p0.universe ?? c.universe, name: p0.name ?? c.name, type_entite: p0.type ?? null,
      lignes_refusees: d.ids.length, lignes_closes_0708: d.closSuspect,
      titre_trouve: page?.title ?? null, resolu_par: page?.resolvedBy ?? null, taille: (page?.text ?? '').length,
      url: page?.url ?? null,
      motif_apres: refus, verdict: panne ? 'PANNE' : refus ? 'ENCORE REFUSÉ' : 'PASSE',
      verdict_passe1: v1?.verdict ?? null, titre_passe1: v1?.titre_trouve ?? null,
      diverge_de_passe1: Boolean(v1) && (v1.verdict !== (panne ? 'PANNE' : refus ? 'ENCORE REFUSÉ' : 'PASSE')
        || (v1.titre_trouve ?? null) !== (page?.title ?? null)),
      preuves: pr,
      // AUCUNE PREUVE INDÉPENDANTE : la garde n°1 (sameEntityName) a dit oui, et rien d'autre
      // ne le confirme. Si en plus les deux libellés diffèrent, ce oui ne tient qu'au squelette.
      squelette_seul: Boolean(page) && !refus && pr.length === 0
        && libelleNu(p0.name ?? c.name) !== libelleNu(page.title)
        && sameEntityName(p0.name ?? c.name, page.title),
      reperes_du_resume: reperes.slice(0, 4),
      lignes_apres_relance: d.apresRelance,
      payload_relance: payloadPropre(p0),
    });
    if (++n % 25 === 0) console.log(`  … ${n}/${uniq.length}`);
  }

  const passe = trace.filter((t) => t.verdict === 'PASSE');
  const refus = trace.filter((t) => t.verdict === 'ENCORE REFUSÉ');
  const autres = trace.filter((t) => !['PASSE', 'ENCORE REFUSÉ'].includes(t.verdict));
  const fragiles = passe.filter((t) => t.squelette_seul);
  const diverg = trace.filter((t) => t.diverge_de_passe1);
  console.log(`\n→ ${passe.length} passent · ${refus.length} refusés · ${autres.length} panne/introuvable`);
  console.log(`→ ${fragiles.length} passent SANS preuve indépendante (squelette seul) : ${fragiles.map((f) => f.name + ' → ' + f.titre_trouve).join(' | ')}`);
  console.log(`→ ${diverg.length} divergence(s) avec la 1re passe`);

  writeFileSync(F_TRACE, JSON.stringify({
    chantier: 'resonde-gardes (2e passe, contrôle des preuves)',
    fait_le: new Date().toISOString(),
    base: 'ops (PostgREST) — agent_results',
    source_des_couples: 'data/audits/piles-triage.json → a_refusees.familles[classe=suspect].paires_a_resonder',
    garde: 'agent-worker.mjs → TASK_TYPES.fandom_descfr.guard, EXTRAITE du source (jamais recopiée)',
    passe_precedente: 'resonde-gardes 1re passe (12:27Z) : 177 couples, 144 passe / 33 refus — conservée dans verdict_passe1',
    couples_nommes: couples.length, couples_distincts: uniq.length, couples_sondes: trace.length,
    compte_croise: { distincts: uniq.length, sondes: trace.length, egal: uniq.length === trace.length },
    comptes: {
      passe: passe.length, encore_refuses: refus.length, panne_ou_introuvable: autres.length,
      passe_sans_preuve_independante: fragiles.length, divergences_avec_passe1: diverg.length,
    },
    trace,
  }, null, 2) + '\n');
  console.log('→ trace écrite :', F_TRACE);
}

// ════════════════════════════════════════════════════════════════════════════════════════
// PHASE 2 — BILAN, et le fait qui commande tout le reste
//
// Les 143 couples que la garde réparée laisse passer ONT DÉJÀ été remis en file, à 14:29. Ils
// ont été consommés en 2,3 secondes et refusés 143 fois sur 143, au stade de la GARDE
// (`model` nul : aucun modèle n'a été appelé). Ce n'est pas un désaccord de jugement, c'est
// deux codes différents : les réparations du 07/08 ne sont pas commitées, et le producteur
// n'est pas ce Mac — les trois processus node locaux ne lisent que `ops_chat` et
// `review_local`, tandis que les lignes de la journée portent des modèles distants
// (nemotron, mistral). Le producteur tourne donc sur HEAD.
//
// MESURÉ, pas supposé : la garde de HEAD, extraite de `git show HEAD:scripts/agent-worker.mjs`
// et rejouée sur les 143 couples, reproduit 108 fois le motif observé À LA LETTRE. Les 35
// écarts ne sont pas des contre-exemples : mon rejeu croise la garde de HEAD avec le résolveur
// RÉPARÉ (essais macron/contracté, alias curés neufs), et ces 35 sont exactement les couples où
// le résolveur réparé change la page — « Gunjou » y trouve « Gunjō » quand HEAD tombait sur
// « Kūgo Ginjō ». La moitié résolveur du correctif est, elle aussi, non commitée.
//
// CONSÉQUENCE, et c'est le seul choix honnête : ON NE REMET RIEN EN FILE. Relancer les 143 une
// seconde fois construirait la même pile une troisième fois, au même endroit, pour la même
// raison. C'est mot pour mot la leçon du 05/08 — purger sans fermer la classe d'erreur, c'est
// programmer sa répétition — appliquée à la classe d'erreur d'aujourd'hui, qui n'est plus dans
// la garde mais dans la distance entre le code réparé et le code qui tourne.
// ════════════════════════════════════════════════════════════════════════════════════════

/** Les 33 refus qui tiennent, rangés en deux tas — repris et REVÉRIFIÉS de la 1re passe. */
const PLAFOND = {
  ...Object.fromEntries(['Axe', 'Flail', 'Jō', 'Katar', 'Kuwa', 'Nunchaku', 'Scalpel', 'Shakujō',
    'Shield', 'Tessen', 'Three-Section Staff', 'Whip'].map((n) => [n,
    'page réduite à un renvoi hors wiki ({{Soft redirect}} vers Wikipédia) : 14 c une fois le modèle nettoyé, le wiki canon n\'a aucune matière propre'])),
  ...Object.fromEntries(['Summoning Technique (Doki)', 'Summoning Technique (Giant Eagle)',
    "Summoning Technique (Hōzuki Castle's Ninken)", 'Summoning Technique (Nuiba)',
    'Summoning Technique (Shinigami, Snake)', 'Wood Release: Underground Roots Technique',
    "Katasuke Tōno's Assistant"].map((n) => [n,
    'aucune page propre sur le wiki : seule existe la page générale, qui décrit un autre sujet que notre déclinaison'])),
};
const A_REVOIR = {
  'Daidai Village': 'DÉFAUT DE NOTRE NETTOYEUR, mesuré à la source : 309 c bruts, 116 c nettoyés. La phrase de définition commence par {{translation|\'\'\'Daidai Village\'\'\'|橙村|Daidai-mura}}, que cleanWikitext supprime ENTIÈREMENT — il ne reste plus qu\'« is a small village inhabited by the members of the Yoimura Clan », une phrase SANS SUJET. Le plancher de 150 a donc raison ici pour une mauvaise raison : même relevé, il livrerait un texte décapité. Correctif : garder l\'argument 1 de {{translation|X|…}}.',
  'Hidden Kunai Mechanism': 'DÉFAUT DU MOISSONNEUR D\'INFOBOX, mesuré : 588 c bruts dont l\'essentiel est un {{Infobox/Tools}} (porteurs, débuts manga/anime, classification) que fetchFandomInfobox ne rend pas — la taille vue par la garde (123 c) est exactement celle de la prose seule, l\'infobox a rendu 0. Avec elle, l\'entrée passait le plancher sans rien assouplir.',
  'Campacino Achino': 'le wiki titre les membres de la famille par leur seul prénom (« Campacino ») ; « Achino » est notre romanisation d\'« Accino ». Candidat au registre d\'alias curé : Campacino Achino → Campacino',
  'Hockera Achino': 'même famille : candidat au registre d\'alias curé, Hockera Achino → Hockera',
  'Lil Achino': 'même famille : candidat au registre d\'alias curé, Lil Achino → Lil',
  'Koala Zombie': 'notre nom qualifie l\'état du personnage ; le wiki titre « Koala ». Candidat au registre, à vérifier : le Koala de Thriller Bark n\'est pas la Koala de l\'Armée Révolutionnaire',
  'Pirate Captain (500 Hostages)': 'notre glose entre parenthèses ne correspond à aucune page ; « Pirate Captain » est un rôle générique. À vérifier à la main avant tout alias',
  'Snake Way Guide': 'le wiki décrit le lieu (« Snake Way »), pas son gardien. Vérifier s\'il a une page propre sous un autre nom avant de curer',
  'Z-Sword (Épée Zeta)': 'défaut de NOTRE côté : notre nom porte une glose française entre parenthèses qui empoisonne la requête. La page « Z Sword » est la bonne — à curer, ou à nettoyer dans le nom de l\'entrée',
  'Gentle Step Spiralling Twin Lion Fists': 'le wiki sert « Gentle Step Twin Lion Fists » : à établir si notre entrée est la même technique sous une autre traduction ou une variante distincte',
  'Ed': 'le wiki redirige « Ed » vers « Ed (Actor) », mais la parenthèse est une désambiguïsation : rien ne dit que notre Ed est cet acteur. Nom trop court pour que l\'attestation joue',
  'Masshikaku': 'seule page servie : « Mashikaku (Non-Canon) ». La parenthèse distingue une version NON CANON — à trancher avant de produire',
  'Mother': 'notre entrée s\'appelle « Mother » avec un résumé entièrement générique ; la page servie est « Chi-Chi\'s mother » (l\'Ox-Queen). Rien n\'établit que ce soit la même : entrée à renommer ou à documenter à la source',
};

async function bilan() {
  const t = JSON.parse(readFileSync(F_TRACE, 'utf8'));
  const passe = t.trace.filter((x) => x.verdict === 'PASSE');
  const refus = t.trace.filter((x) => x.verdict === 'ENCORE REFUSÉ');
  const nonRanges = refus.filter((x) => !PLAFOND[x.name] && !A_REVOIR[x.name]);
  if (nonRanges.length) throw new Error(`refus non classés : ${nonRanges.map((x) => x.name).join(', ')}`);

  const lignes = (f) => t.trace.filter(f).reduce((a, x) => a + x.lignes_closes_0708, 0);
  const relances = passe.filter((x) => x.lignes_apres_relance.length);
  const motifsRelance = {};
  for (const x of relances) for (const l of x.lignes_apres_relance) {
    const m = l.error.split(' :')[0].slice(0, 46);
    motifsRelance[m] = (motifsRelance[m] ?? 0) + 1;
  }

  // COMPTE CROISÉ AUX DEUX BOUTS : nos couples contre les lignes réellement portées en base.
  const bout = {};
  for (const [cle, pat] of [['clos_suspect_restant', '⚠ clos 07/08%'], ['marquees_re_sondee', '✅ re-sondée%'],
    ['marquees_plafond', '⛔ PLAFOND%'], ['marquees_a_revoir', '🔎 À REVOIR%']]) {
    const { count } = await ops.from('agent_results').select('id', { count: 'exact', head: true })
      .eq('status', 'refused').like('error', pat);
    bout[cle] = count;
  }

  const b = {
    chantier: 'resonde-gardes — re-sondage des 3 302 tentatives « refus SUSPECT » du 07/08',
    fait_le: new Date().toISOString(),
    trace: 'data/audits/resonde-gardes-trace.json',
    perimetre: {
      tentatives_visees: 3302,
      couples_nommes_dans_le_triage: t.couples_nommes,
      couples_distincts: t.couples_distincts,
      familles: 'B_homonyme, C3_seuil_titre_identique, E_plus_generale',
    },
    verdicts_de_la_garde_reparee: {
      passe: passe.length, encore_refuses: refus.length,
      lignes_portees_par_les_passe: lignes((x) => x.verdict === 'PASSE'),
      lignes_portees_par_les_refus: lignes((x) => x.verdict !== 'PASSE'),
      total_lignes: lignes(() => true),
      compte_croise_avec_le_triage: { attendu: 3302, mesure: lignes(() => true), egal: lignes(() => true) === 3302 },
      deux_passes_independantes: '1re passe 12:27Z et 2e passe (ce fichier) : mêmes 143/33, 0 divergence de verdict, 0 divergence de titre',
    },
    // La question que la 1re passe ne posait pas, et la seule qui dit si la réparation tient.
    independance_des_gardes: {
      question: 'sur quelle preuve repose chaque « oui » ? une garde qui dit oui pour la même raison que la précédente n\'est plus un second avis',
      passe_sans_aucune_preuve_independante: passe.filter((x) => x.squelette_seul).length,
      preuves_cumulables: passe.reduce((a, x) => { for (const p of x.preuves) a[p] = (a[p] ?? 0) + 1; return a; }, {}),
      passe_a_une_seule_preuve: passe.filter((x) => x.preuves.length === 1).length,
      les_quatre_plus_exposes_relus_a_la_main: [
        'Abellon → « Aveyron » : l\'infobox du wiki porte « Romanized Name : Aberon ». JUSTE.',
        'Cell Games Announcer → « Jimmy Firecracker » : le champ Alias liste « Cell Games Announcer ». JUSTE.',
        'Enma Dai-Ou → « King Yemma » : le champ Alias liste « Enma Daio ». JUSTE.',
        'Minami no Kaioushin → « South Supreme Kai » : le champ Alias liste « Southern Kaioshin ». JUSTE.',
      ],
      pieges_signales_par_les_contre_verificateurs: [
        'Gunjou (Bleach) → « Gunjō » par essai macron, et non plus « Kūgo Ginjō ». La BONNE page.',
        'Shuu (Dragon Ball) → « Shu » (l\'homme de Pilaf), et non plus « Mr. Shu » le précepteur.',
        'Bongou → « Bongo » et Bungou → « Bungo » : deux pages distinctes, plus une seule pour deux.',
        'Mother (Dragon Ball) → REFUSÉ « identité invérifiable » : ne part plus sur « Chi-Chi\'s mother ».',
        'identiteAttestee est désormais propagé par les QUATRE fetch du worker (l. 156, 485, 631, 756) : la branche n\'est plus morte. Son Gohan, Carol Masterson, Captain John passent par elle.',
      ],
    },
    // LE FAIT QUI COMMANDE TOUT : la garde réparée n'est pas celle qui produit.
    remise_en_file: {
      faite: false,
      deja_tentee_le_07_08_a_14h29: { messages: 143, consommes_en: '2,3 s', refuses: 143, produits: 0 },
      motifs_du_refus_en_production: motifsRelance,
      diagnostic: 'le producteur tourne sur le code COMMITÉ (HEAD) ; les réparations du 07/08 sont dans l\'arbre de travail et non commitées (scripts/lib/fandom.mjs, scripts/agent-worker.mjs, data/alias-cures.json)',
      preuve_mesuree: 'la garde de HEAD, extraite de git et rejouée sur les 143 couples, reproduit 108 motifs À LA LETTRE ; les 35 écarts sont les couples où le résolveur réparé (macron, alias neufs) change la page, l\'autre moitié non commitée du correctif',
      preuve_annexe: 'aucun processus node local ne consomme la file de production (--chat sur ops_chat, --local sur review_local) ; les lignes du jour portent des modèles distants (nvidia/nemotron ×276, mistral-large ×17)',
      pourquoi_on_ne_relance_pas: 'relancer une seconde fois reconstruirait la même pile une troisième fois, pour la même raison. Leçon du 05/08 : purger sans fermer la classe d\'erreur, c\'est programmer sa répétition. Ici la classe d\'erreur n\'est plus la garde, c\'est l\'écart entre le code réparé et le code qui tourne.',
      condition_pour_relancer: 'commiter les trois fichiers réparés et les déployer sur le worker de production, PUIS remettre les 143 couples en file (un message par couple, jamais un par tentative). Le plafond de 400 n\'est pas atteint : 143.',
      hors_de_mon_mandat: 'commit et déploiement — consigne explicite « NE COMMITE RIEN — revue après la vague »',
    },
    refus_qui_tiennent: {
      total: refus.length,
      plafond_vrai: refus.filter((x) => PLAFOND[x.name]).map((x) => ({ nom: x.name, univers: x.universe, motif_garde: x.motif_apres, pourquoi: PLAFOND[x.name] })),
      a_revoir: refus.filter((x) => A_REVOIR[x.name]).map((x) => ({ nom: x.name, univers: x.universe, motif_garde: x.motif_apres, piste: A_REVOIR[x.name] })),
    },
    defauts_ouverts_trouves_par_ce_re_sondage: [
      'BLOQUANT — le correctif des gardes n\'est pas déployé sur le producteur : tant qu\'il ne l\'est pas, aucune remise en file ne peut aboutir (143/143 refusées le 07/08 à 14:30).',
      'cleanWikitext supprime {{translation|X|…}} en entier et décapite la phrase de définition des ébauches (Daidai Village : 309 c bruts → 116 c, phrase sans sujet). Garder l\'argument 1.',
      'fetchFandomInfobox ne moissonne pas {{Infobox/Tools}} (Naruto) : Hidden Kunai Mechanism vu à 123 c au lieu de ~450. Deux entrées concernées ici, davantage dans le corpus outils.',
      '4 des 143 passes ne tiennent qu\'au champ de nommage du wiki (citeLeNom) après résolution par RECHERCHE plein texte : relues à la main, les quatre sont justes, mais c\'est la population à ré-auditer en premier au prochain assouplissement.',
    ],
    etat_final: {
      lignes_en_base: bout,
      file_de_production: 'vide (0 message) — rien n\'a été posté par ce re-sondage',
      timer_de_ravitaillement: 'laissé ARRÊTÉ, conformément à la consigne',
      rien_de_commite: true,
    },
  };
  writeFileSync(F_BILAN, JSON.stringify(b, null, 2) + '\n');
  console.log('→ bilan écrit :', F_BILAN);
  console.log(JSON.stringify({ passe: passe.length, refus: refus.length, lignes: lignes(() => true), bout }, null, 1));
}

// ════════════════════════════════════════════════════════════════════════════════════════
// PHASE 3 — ANNOTER les 143 refus produits par le code d'avant la réparation.
// Ces lignes-là disent aujourd'hui « homonyme probable (Piece) » : un motif que le code réparé
// ne peut plus émettre. Les laisser telles quelles, c'est garantir qu'on rediagnostiquera.
// ════════════════════════════════════════════════════════════════════════════════════════
async function annoter() {
  const t = JSON.parse(readFileSync(F_TRACE, 'utf8'));
  const cibles = [];
  for (const x of t.trace.filter((y) => y.verdict === 'PASSE'))
    for (const l of x.lignes_apres_relance)
      cibles.push({ id: l.id, texte: `⏸ REFUS SANS VALEUR 07/08 — produit par le worker de production sur le code d'AVANT la réparation des gardes (correctif encore NON COMMITÉ : scripts/lib/fandom.mjs, scripts/agent-worker.mjs, data/alias-cures.json). Motif d'origine : « ${l.error.slice(0, 120)} ». Garde réparée rejouée DEUX fois sur ce couple, verdict PASSE : « ${x.titre_trouve} » (${x.taille} c, ${x.resolu_par}). NE PAS relancer avant déploiement du correctif.` });
  console.log(`${cibles.length} ligne(s) à annoter`);
  if (process.argv.includes('--dry')) { console.log(cibles[0]); return; }
  let n = 0;
  for (const c of cibles) {
    const { error } = await ops.from('agent_results').update({ error: c.texte }).eq('id', c.id);
    if (error) throw new Error(`annotation ${c.id} : ${error.message}`);
    n++;
  }
  const { count } = await ops.from('agent_results').select('id', { count: 'exact', head: true })
    .eq('status', 'refused').like('error', '⏸ REFUS SANS VALEUR 07/08%');
  console.log(`✓ ${n} annotées · relu en base : ${count} · compte croisé ${n === count ? 'OK' : 'ÉCART'}`);
}

if (process.argv.includes('--sonder')) await sonder();
if (process.argv.includes('--bilan')) await bilan();
if (process.argv.includes('--annoter')) await annoter();
