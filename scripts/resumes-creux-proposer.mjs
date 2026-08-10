// scripts/resumes-creux-proposer.mjs — CONDENSER descFr EN UN RÉSUMÉ D'UNE PHRASE.
//
// POURQUOI (10/08/2026, chantier 2 du carnet AKASHA)
// 420 fiches portent en `summary` une phrase de remplissage — « Personnage secondaire de Dragon
// Ball. », 410 fois à l'identique. Or le résumé est le seul texte que la recherche du registre
// indexe (lib/akasha/queries.ts:134 le met dans le `or(...ilike...)`), le repli de la méta
// description de la fiche, et le repli du texte de rangée quand descFr n'a pas de prose narrative.
//
// CE QUE FAIT CE SCRIPT : il EXTRAIT UNE phrase de `attributes.descFr`, déjà en base, et la borne
// à 90–160 caractères. Il n'écrit aucun fait que descFr ne contient pas ; chaque proposition sort
// dans la trace avec sa phrase-preuve — le texte source mot pour mot — pour comparaison.
//
// CE QU'IL NE FAIT PAS : quand descFr est absent, trop court, méta-encyclopédique (il parle de
// l'ŒUVRE, du doublage ou de l'étymologie et pas du personnage), ou qu'aucune phrase ne NOMME la
// fiche, il ne propose rien. Un résumé inventé est pire que le résumé creux qu'il remplace.
//
// ── CE QUE LE CONTRÔLE À LA MAIN DE 20 CAS A CORRIGÉ (avant toute écriture) ───────────────────
// Première version : 4 défauts sur 20 (20 %, très au-dessus du seuil de 5 %). Les quatre :
//  1. « Jimmy Firecracker est présenté comme un intervieweur biaisé et partial : au début du Cell
//     Game. » — coupe après un deux-points, la queue reste en l'air → AUCUN deux-points admis.
//  2. « Le Kaïô de l'Est adore sa moto volante et défie même Goku dans une course. » — anecdote de
//     4e phrase promue faute de mieux → la phrase de tête est la seule qui définisse ; si elle
//     n'est pas exploitable, on REFUSE plutôt que descendre dans le texte (règles de rang).
//  3. « Comme ses camarades Oolong et Jasmine, Oonaan porte le nom d'un type de thé. » — étymologie
//     déguisée en définition → « porte le nom » sort du définitoire et entre dans le méta.
//  4. « … la saga Garlic Jr. Il est décrit comme un être humainoïde … » — DEUX phrases, parce que
//     « Jr. » était masqué d'office au découpage → masquage distinct titres / suffixes, plus une
//     garde finale qui refuse toute rupture de phrase interne.
//
// GARDE D'IDENTITÉ : leçon du 25/07 — sur 12 fiches enrichies, 3 décrivaient la MAUVAISE entité.
// Le texte est déjà en base mais il peut avoir été contaminé (fiche « Mira-kun » dont le descFr
// parle de « Bandages »). On exige donc qu'un jeton du NOM de la fiche apparaisse dans la phrase
// retenue. Une romanisation différente fait échouer la garde : c'est voulu — le tiroir par défaut
// est celui qui existait.
//
// Lecture seule par défaut. `--ecrire` écrit la SEULE colonne `summary` ; `attributes` n'est
// jamais réécrit (d'autres chantiers tournent en parallèle).
//
// Usage :
//   node --env-file=.env.local scripts/resumes-creux-proposer.mjs --trace=<chemin.json>
//   node --env-file=.env.local scripts/resumes-creux-proposer.mjs --trace=<chemin-NEUF.json> --ecrire
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const args = process.argv.slice(2);
const ECRIRE = args.includes('--ecrire');
const TRACE = (args.find((a) => a.startsWith('--trace=')) ?? '').slice(8);
const SEULEMENT = (args.find((a) => a.startsWith('--seulement=')) ?? '').slice(12); // slugs, virgules
if (!TRACE) throw new Error('--trace=<chemin> obligatoire : la trace se pose AVANT toute écriture');
if (ECRIRE && fs.existsSync(TRACE)) throw new Error(`trace déjà présente (${TRACE}) : un chemin NEUF par exécution qui écrit`);

// Bande de longueur. Le plancher est un réglage, pas une loi : beaucoup de bios courtes tiennent
// une phrase définitoire parfaite de 60–89 caractères que ce plancher écarte volontairement
// (chiffre exact dans la trace, clé `sousLePlancher`).
const MIN = Number((args.find((a) => a.startsWith('--min=')) ?? '').slice(6)) || 90;
const MAX = Number((args.find((a) => a.startsWith('--max=')) ?? '').slice(6)) || 160;

// ── Lecture paginée (un select nu s'arrête à 1000 lignes SANS erreur) ─────────────────────────
const page = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

// ── Repérage par la FORME, pas par une liste recopiée ─────────────────────────────────────────
const REMPLISSAGE = /^(personnage|lieu|objet|technique)\s+(secondaire|mineur|de l'univers)[^.]{0,60}\.?$/i;

// ── Découpe en phrases ────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const sansAccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// TITRES : toujours suivis d'un nom propre (« Mr. Satan ») → masqués d'office.
// SUFFIXES : peuvent finir une phrase (« la saga Garlic Jr. Il est… ») → masqués seulement si le
// mot suivant commence en minuscule.
const TITRES = /\b(Dr|Pr|M|MM|Mme|Mlle|Mr|Mrs|Ms|St|Ste|Mgr)\.(?=\s)/g;
const SUFFIXES = /\b(Jr|Sr|vol|cf|env|etc|ap|av|no)\.(?=\s+[a-zà-ÿ0-9])/g;
const SENT = '\uE000';   // sentinelle de masquage, jamais écrite en base
const masquer = (t) => t.replace(TITRES, (m) => m.replace('.', SENT)).replace(SUFFIXES, (m) => m.replace('.', SENT));
const phrases = (t) => masquer(norm(t))
  .split(/(?<=[.!?…])\s+/)
  .map((s) => norm(s.replaceAll(SENT, '.')))
  .filter(Boolean);

/** Le résumé doit être UNE phrase : une rupture interne en trahit deux. */
const deuxPhrases = (s) => /[.!?…]\s+\S/.test(masquer(s));

/** Segment « fiche technique » : « Taille : 172 cm », « Biographie : », listes de champs. */
const estFiche = (s) => /^[\wÀ-ÿ'’ ()\-\/]{1,32}\s*:/.test(s) || (s.match(/:/g) || []).length >= 2;

/** DÉFINITOIRE : la phrase dit ce que le sujet EST (verbe d'état, rôle, appartenance).
 *  « porte le nom » en a été RETIRÉ : dans ce corpus il n'introduit que de l'étymologie. */
const DEFINITOIRE = /\b(est|était|fut|sont|étaient|reste|demeure|devient|devint|s'agit|constitue|incarne|désigne|se distingue|se présente|appartient|appartenait|fait partie|compte parmi|occupe|exerce|dirige|dirigeait|règne|possède|possédait|connu sous|surnommé|surnommée)\b/i;

/** Ouverture NOMINALE : « Élève de l'école secondaire Orange Star, Angela se distingue… ».
 *  Admise en PHRASE DE TÊTE uniquement : ailleurs dans le texte, c'est une anecdote. */
const NOMINALE = /^(un|une|l'|le|la|les|premier|première|ancien|ancienne|[A-ZÀ-Ý][\wÀ-ÿ'’-]+ (de|du|des|d'))\b/;

/** MÉTA : la phrase parle de l'œuvre, de l'édition, du doublage, de l'étymologie — pas du sujet. */
const META = /\b(de fiction|personnage de fiction|cr[ée]{2} par|bas[ée]e? sur le manga|d'apr[èe]s le manga|dans le manga [A-Z]|adapt[ée]e? de|voix (japonaise|française)|doubl[ée] par|seiy[uū]|[ée]pisode filler|non nomm[ée] dans|aussi romanis[ée]|porte le nom d|tire son nom|jeu de mots|est inspir[ée] de|s'inspire d|son nom (vient|d[ée]rive|est (un|une) )|le mot .{0,24} est le|signifie « )/i;

/** Sujets sans référent : interdits en tête d'un résumé autonome. */
const PRONOM_TETE = /^(il|elle|ils|elles|on|lui|celui|celle|ceux|celles|ce|cet|cette|c'est|son|sa|ses|leur|leurs|comme|cependant|toutefois|ensuite|puis|par la suite|plus tard|au d[ée]but|lors|lorsqu|apr[èe]s|dans l'anime|dans le manga|dans la version|bien qu|quoiqu|alors qu|tandis qu|pendant qu|malgr[ée]|selon|contrairement|si )\b/i;

/** Renversements de sens : on ne coupe jamais devant eux, ni dans une phrase niée. */
const RENVERSANT = /^(mais|sauf|hormis|bien qu|quoique|contrairement|alors qu|tandis qu|sans|ni |pourtant|cependant|n[ée]anmoins|toutefois)/i;
const NIEE = /\b(ne |n'|pas |jamais|aucun|aucune|nul )\b/i;

// ── Garde d'identité ──────────────────────────────────────────────────────────────────────────
const VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'the', 'of', 'no', 'san', 'kun', 'sama', 'chan', 'gou']);
const echap = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const jetons = (nom) => sansAccent(String(nom ?? '').toLowerCase())
  .split(/[^a-z0-9]+/).filter((j) => j.length >= 2 && !VIDES.has(j) && !/^\d+$/.test(j));
const nomme = (phrase, nom) => {
  const js = jetons(nom);
  if (!js.length) return false;
  const p = sansAccent(phrase.toLowerCase());
  return js.some((j) => new RegExp(`\\b${echap(j)}`).test(p));
};

/** Le sujet de la phrase doit être la fiche, pas un de ses compléments. On ne sait pas analyser
 *  une syntaxe, mais on sait où le nom TOMBE : « Bien que ses origines soient inconnues, la planète
 *  natale de Yakon est appelée Dark Star » parle de la planète, et « Yakon » n'y arrive qu'au 68e
 *  caractère. Exiger le nom dans l'amorce écarte ces phrases dont le sujet est autre chose. */
const nommeTot = (phrase, nom, dans = 60) => nomme(phrase.slice(0, dans), nom);

// ── Coupes ────────────────────────────────────────────────────────────────────────────────────
const equilibre = (s) => {
  const par = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
  const gui = (s.match(/«/g) || []).length - (s.match(/»/g) || []).length;
  return par === 0 && gui === 0;
};
const finirPoint = (s) => (/[.!?…]$/.test(s) ? s : `${s}.`);
const nettoyerFin = (s) => `${norm(s).replace(/[,;:—\s]+$/, '')}.`;

/** Retire une apposition de tête (« Créature infernale appelée Spike, Akkuman est … »)
 *  UNIQUEMENT si ce qui suit la virgule commence par le nom de la fiche. On retranche, jamais plus. */
function couperTeteApposition(s, nom) {
  if (s.length <= MAX) return s;
  const i = s.indexOf(', ');
  if (i < 0 || i > 90) return s;
  const suite = s.slice(i + 2);
  const j0 = jetons(nom)[0];
  if (!j0) return s;
  if (!new RegExp(`^${echap(j0)}`, 'i').test(sansAccent(suite))) return s;
  return suite.charAt(0).toUpperCase() + suite.slice(1);
}

/** Retire une queue d'apposition méta (« , basé sur le manga … »). */
const couperQueueMeta = (s) => {
  const m = s.match(/^(.*?),\s+(bas[ée]e? sur|cr[ée]{2} par|d'apr[èe]s|adapt[ée]e? d|aussi romanis[ée])/i);
  return m && m[1].length >= MIN ? nettoyerFin(m[1]) : s;
};

/** Coupe une phrase trop longue à la dernière frontière franche tombant dans la bande. */
function couperFort(s) {
  if (s.length <= MAX) return s;
  if (NIEE.test(s)) return s;                      // « X n'est pas un guerrier, mais un marchand »
  const bornes = [];
  for (const re of [/\s;\s/g, /\s—\s/g, /,\s/g, /\sen \w+ant\b/g, /\savant de\s/g, /\sapr[èe]s avoir\s/g, /\safin de\s/g, /\stout en\s/g]) {
    for (const m of s.matchAll(re)) bornes.push(m.index);
  }
  const candidates = [...new Set(bornes)].filter((i) => i >= MIN && i <= MAX).sort((a, b) => b - a);
  for (const i of candidates) {
    const queue = s.slice(i).replace(/^[,;—]\s*/, '');
    if (RENVERSANT.test(queue)) continue;
    // Une queue qui commence par un article nu est presque toujours une APPOSITION du dernier nom
    // de la tête (« … sous son supérieur, le Daï Kaïoshin »). Couper là laisse le nom en suspens :
    // « … et sous son supérieur. » On refuse cette frontière et on en cherche une plus haute.
    if (/^(le|la|les|l'|un|une|des)\s/i.test(queue)) continue;
    const tete = nettoyerFin(s.slice(0, i));
    if (!equilibre(tete)) continue;
    if (tete.length < MIN || tete.length > MAX) continue;
    return tete;
  }
  return s;
}

/** Met une phrase brute en forme de résumé, ou rend null si elle ne peut pas l'être proprement. */
function faconner(brute, nom) {
  let t = finirPoint(brute);
  t = couperTeteApposition(t, nom);
  t = couperQueueMeta(t);
  t = couperFort(t);
  if (!equilibre(t)) return { ko: 'parenthèse ou guillemet non refermé' };
  if (t.includes(':')) return { ko: 'deux-points : la coupe laisserait une queue en l\'air' };
  if (deuxPhrases(t)) return { ko: 'deux phrases, pas une' };
  if (!/^[«A-ZÀ-Ý0-9]/.test(t)) return { ko: 'commence en minuscule (phrase amputée de son sujet)' };
  if (/[\u0000-\u001F\uE000]/.test(t)) return { ko: 'caractère invisible' };
  if (REMPLISSAGE.test(t)) return { ko: 'la phrase extraite est elle-même de remplissage' };
  // Le mot « personnage » est le mot du résumé creux qu'on remplace. Dans ce corpus il n'introduit
  // jamais une définition mais toujours une note de production (« personnage de remplissage »,
  // « personnage exclusif à l'anime ») ou la formule creuse elle-même (« personnage de l'univers
  // Dragon Ball »). Cinq propositions sur 143 en contenaient : on les rend plutôt que de les servir.
  if (/\bpersonnages?\b/i.test(t)) return { ko: 'contient « personnage » (note de production ou formule creuse)' };
  return { t };
}

/** Construit la proposition. Rend { resume, preuve, rang } ou { refus }. */
function proposer(entry) {
  const descFr = norm(entry.attributes?.descFr);
  if (!descFr) return { refus: 'descFr absent' };
  if (descFr.length < 80) return { refus: `descFr trop court (${descFr.length} car.)` };
  if (REMPLISSAGE.test(descFr)) return { refus: 'descFr lui-même de remplissage' };

  const ps = phrases(descFr).filter((s) => !estFiche(s) && s.length >= 30);
  if (!ps.length) return { refus: 'descFr sans prose (que des champs de fiche)' };
  if (!ps.some((s) => nomme(s, entry.name))) return { refus: 'aucune phrase ne nomme la fiche (identité non confirmée)' };

  // RÈGLE DE RANG (défaut nº2 du contrôle à la main) : c'est la phrase de TÊTE qui définit.
  // On l'essaie d'abord ; si elle est méta ou sans sujet nommé, on descend d'un ou deux rangs mais
  // en exigeant alors une phrase DÉFINITOIRE. On ne descend jamais plus bas : au-delà, ce sont des
  // anecdotes (« adore sa moto volante »), et une anecdote promue en résumé est un contresens.
  const RANG_MAX = 2;
  const quasi = [];
  let motif = null;
  for (let i = 0; i < ps.length && i <= RANG_MAX; i += 1) {
    const brute = ps[i];
    if (!nomme(brute, entry.name)) { motif ??= 'phrase de tête ne nommant pas la fiche'; continue; }
    if (!nommeTot(brute, entry.name)) { motif ??= 'le nom n\'arrive qu\'après l\'amorce (sujet probablement autre)'; continue; }
    if (META.test(brute)) { motif ??= 'phrase de tête méta (œuvre, doublage, étymologie)'; continue; }
    if (PRONOM_TETE.test(brute)) { motif ??= 'phrase de tête sans sujet propre'; continue; }
    const def = DEFINITOIRE.test(brute);
    if (!def && i > 0) { motif ??= 'seules des phrases non définitoires après la tête'; continue; }
    if (!def && !NOMINALE.test(brute)) { motif ??= 'phrase de tête ni définitoire ni nominale'; continue; }

    const f = faconner(brute, entry.name);
    if (f.ko) { motif ??= f.ko; continue; }
    if (f.t.length < MIN || f.t.length > MAX) { quasi.push({ len: f.t.length, def, rang: i, texte: f.t }); continue; }
    return { resume: f.t, preuve: brute, rang: i };
  }
  if (quasi.length) {
    quasi.sort((a, b) => (b.def - a.def) || a.rang - b.rang);
    return { refus: `phrase utilisable hors bande ${MIN}–${MAX} (${quasi[0].len} car.)`, quasi: quasi.slice(0, 2) };
  }
  return { refus: motif ?? 'aucune phrase exploitable' };
}

// ── Exécution ─────────────────────────────────────────────────────────────────────────────────
const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, description, attributes');
const cibles = entries.filter((e) => REMPLISSAGE.test(norm(e.summary)));
console.log(`corpus ${entries.length} fiches · cibles ${cibles.length}`);

const propositions = [];
const refuses = [];
for (const e of cibles) {
  const r = proposer(e);
  const base = {
    id: e.id, slug: e.slug, name: e.name, universe: e.universe, type: e.type,
    avant: e.summary,
    descriptionNonVide: Boolean(norm(e.description)),
  };
  if (r.refus) refuses.push({ ...base, refus: r.refus, descFrLen: norm(e.attributes?.descFr).length, quasi: r.quasi ?? null });
  else propositions.push({ ...base, apres: r.resume, longueur: r.resume.length, rangPhrase: r.rang, preuve: r.preuve });
}

const clef = (s) => s.replace(/\(\d+[^)]*\)/, '(…)');
const parRefus = refuses.reduce((a, r) => ((a[clef(r.refus)] = (a[clef(r.refus)] ?? 0) + 1), a), {});

// Prix exact du plancher : combien de fiches ont une phrase définitoire parfaite mais trop courte.
const sousLePlancher = refuses.filter((r) => r.quasi?.length && r.quasi[0].len < MIN && r.quasi[0].def);
const parPalier = { '70-89': 0, '50-69': 0, '<50': 0 };
for (const r of sousLePlancher) {
  const l = r.quasi[0].len;
  parPalier[l >= 70 ? '70-89' : l >= 50 ? '50-69' : '<50'] += 1;
}

console.log(`propositions ${propositions.length} · refus ${refuses.length}`);
console.log('motifs de refus :', parRefus);
console.log(`sous le plancher (phrase définitoire < ${MIN} car.) : ${sousLePlancher.length}`, parPalier);

const lot = SEULEMENT ? propositions.filter((p) => SEULEMENT.split(',').includes(p.slug)) : propositions;

const trace = {
  chantier: 'chantier 2 — résumés de remplissage → condensation d\'UNE phrase de descFr',
  quand: new Date().toISOString(),
  mode: ECRIRE ? 'ECRITURE' : 'lecture seule (proposition)',
  colonneEcrite: 'summary',
  corpus: entries.length,
  cibles: cibles.length,
  bornes: { min: MIN, max: MAX },
  motifCible: String(REMPLISSAGE),
  propositions: propositions.length,
  aEcrire: lot.length,
  refus: refuses.length,
  parRefus,
  sousLePlancher: { n: sousLePlancher.length, parPalier, exemples: sousLePlancher.slice(0, 25).map((r) => ({ name: r.name, len: r.quasi[0].len, texte: r.quasi[0].texte })) },
  parUnivers: propositions.reduce((a, p) => ((a[p.universe] = (a[p.universe] ?? 0) + 1), a), {}),
  lot,
  refuses,
  ecritures: [],
};
fs.writeFileSync(TRACE, JSON.stringify(trace, null, 1));
console.log(`trace posée : ${TRACE}`);

if (!ECRIRE) {
  console.log('\n— lecture seule, rien écrit —');
  process.exit(0);
}

// ── Écriture : UNE SEULE COLONNE (`summary`). ─────────────────────────────────────────────────
let ok = 0;
let ko = 0;
for (const p of lot) {
  const { error } = await db.from('akasha_entries').update({ summary: p.apres }).eq('id', p.id);
  if (error) { ko += 1; trace.ecritures.push({ id: p.id, slug: p.slug, ok: false, erreur: error.message }); }
  else { ok += 1; trace.ecritures.push({ id: p.id, slug: p.slug, ok: true }); }
  if ((ok + ko) % 50 === 0) console.log(`  ${ok + ko}/${lot.length}…`);
}
trace.bilan = { ecrites: ok, echecs: ko };
fs.writeFileSync(TRACE, JSON.stringify(trace, null, 1));
console.log(`écrites ${ok} · échecs ${ko} · trace ${TRACE}`);
