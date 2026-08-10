// scripts/lib/resume-forme.mjs — LA FORME D'UN RÉSUMÉ D'UNE PHRASE, source unique.
//
// POURQUOI CE FICHIER (10/08/2026, vague 2 du chantier « résumés de remplissage »)
// La vague 1 (`resumes-creux-proposer.mjs`) portait ces règles en dur dans son corps. La vague 2
// devait les reprendre en changeant DEUX réglages ; les recopier aurait donné deux jeux de règles
// qui divergent en silence — le défaut exact relevé le 10/08 entre `scripts/lib/akasha-axes.mjs` et
// la taxonomie du site (six écarts d'un coup, dont trois axes absents). Les deux vagues lisent donc
// le même fichier, et la vague 1 garde ses réglages d'origine par défaut : relancée, elle rend le
// MÊME histogramme de refus qu'au 10/08 10:09 — c'est le test de fidélité de cette extraction.
//
// CE QUE CE MODULE DÉCIDE : la FORME. Est-ce une définition ? A-t-elle un sujet nommé ? Est-ce que
// ce sujet est bien la fiche ? La LONGUEUR n'est qu'un garde-fou : un plancher de longueur mesure la
// taille et jamais la valeur — il a fait écrire à la vague 1 des résumés PIRES là où mieux existait
// (la phrase de tête de Shenron, 80 caractères, disait ce qu'il est ; celle retenue parlait d'un
// AUTRE dragon). D'où `min` très bas en vague 2 et un seuil DISTINCT, plus haut, pour les coupes :
// accepter une phrase courte est sans risque, couper une phrase longue trop tôt en fabrique une fausse.
//
// CE MODULE N'ÉCRIT RIEN et n'invente rien : il ne rend que des sous-chaînes du texte reçu.

export const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
export const sansAccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Le motif de remplissage, repéré par sa FORME et non par une liste recopiée. */
export const REMPLISSAGE = /^(personnage|lieu|objet|technique)\s+(secondaire|mineur|de l'univers)[^.]{0,60}\.?$/i;

// ── Découpe en phrases ────────────────────────────────────────────────────────────────────────
// TITRES : toujours suivis d'un nom propre (« Mr. Satan ») → masqués d'office.
// SUFFIXES : peuvent finir une phrase (« la saga Garlic Jr. Il est… ») → masqués seulement si le
// mot suivant commence en minuscule.
const TITRES = /\b(Dr|Pr|M|MM|Mme|Mlle|Mr|Mrs|Ms|St|Ste|Mgr)\.(?=\s)/g;
const SUFFIXES = /\b(Jr|Sr|vol|cf|env|etc|ap|av|no)\.(?=\s+[a-zà-ÿ0-9])/g;
const SENT = String.fromCharCode(0xe000); // sentinelle de masquage, jamais écrite en base
/** UN POINT DANS UNE PARENTHÈSE NE FINIT JAMAIS UNE PHRASE (mesuré le 10/08 sur les trois Kaïô).
 *  « Le Kaïô de l'Ouest (Nishi no Kaiô ; litt. « Kaïô de l'Ouest »…) est le maître de la Galaxie de
 *  l'Ouest » : le point de « litt. » est suivi d'un guillemet ouvrant, donc ni les titres ni les
 *  suffixes ne le masquaient, et le découpeur rendait un fragment à parenthèse ouverte. La règle
 *  générale vaut mieux qu'une abréviation de plus dans la liste — sauf si les parenthèses du texte
 *  ne s'équilibrent pas, auquel cas la profondeur ne veut rien dire et on ne masque rien. */
const masquerParentheses = (t) => {
  if ((t.match(/\(/g) || []).length !== (t.match(/\)/g) || []).length) return t;
  let d = 0;
  let out = '';
  for (const c of t) {
    if (c === '(') d += 1;
    else if (c === ')') d = Math.max(0, d - 1);
    out += d > 0 && c === '.' ? SENT : c;
  }
  return out;
};
// `parentheses` reste optionnel pour que la vague 1 puisse rejouer son découpage d'origine et
// reproduire, au refus près, l'histogramme de sa trace du 10/08 — c'est ce qui prouve que
// l'extraction de ces règles dans un module n'a rien changé sous la vague 2.
export const masquer = (t, parentheses = true) => (parentheses ? masquerParentheses(t) : t)
  .replace(TITRES, (m) => m.replace('.', SENT))
  .replace(SUFFIXES, (m) => m.replace('.', SENT));
export const phrases = (t, parentheses = true) => masquer(norm(t), parentheses)
  .split(/(?<=[.!?…])\s+/)
  .map((s) => norm(s.replaceAll(SENT, '.')))
  .filter(Boolean);

/** Le résumé doit être UNE phrase : une rupture interne en trahit deux. */
export const deuxPhrases = (s, parentheses = true) => /[.!?…]\s+\S/.test(masquer(s, parentheses));

/** Segment « fiche technique » : « Taille : 172 cm », « Biographie : », listes de champs. */
export const estFiche = (s) => /^[\wÀ-ÿ'’ ()\-\/]{1,32}\s*:/.test(s) || (s.match(/:/g) || []).length >= 2;

/** DÉFINITOIRE : la phrase dit ce que le sujet EST (verbe d'état, rôle, appartenance).
 *  « porte le nom » en a été RETIRÉ : dans ce corpus il n'introduit que de l'étymologie. */
export const DEFINITOIRE = /\b(est|était|fut|sont|étaient|reste|demeure|devient|devint|s'agit|constitue|incarne|désigne|se distingue|se présente|appartient|appartenait|fait partie|compte parmi|occupe|exerce|dirige|dirigeait|règne|possède|possédait|connu sous|surnommé|surnommée)\b/i;

/** Ouverture NOMINALE : « Élève de l'école secondaire Orange Star, Angela se distingue… ».
 *  Admise en PHRASE DE TÊTE uniquement : ailleurs dans le texte, c'est une anecdote. */
export const NOMINALE = /^(un|une|l'|le|la|les|premier|première|ancien|ancienne|[A-ZÀ-Ý][\wÀ-ÿ'’-]+ (de|du|des|d'))\b/;

/** MÉTA : la phrase parle de l'œuvre, de l'édition, du doublage, de l'étymologie — pas du sujet. */
export const META = /\b(de fiction|personnage de fiction|cr[ée]{2} par|bas[ée]e? sur le manga|d'apr[èe]s le manga|dans le manga [A-Z]|adapt[ée]e? de|voix (japonaise|française)|doubl[ée] par|seiy[uū]|[ée]pisode filler|non nomm[ée] dans|aussi romanis[ée]|porte le nom d|tire son nom|jeu de mots|est inspir[ée] de|s'inspire d|son nom (vient|d[ée]rive|est (un|une) )|le mot .{0,24} est le|signifie « )/i;

/** Sujets sans référent : interdits en tête d'un résumé autonome. */
export const PRONOM_TETE = /^(il|elle|ils|elles|on|lui|celui|celle|ceux|celles|ce|cet|cette|c'est|son|sa|ses|leur|leurs|comme|cependant|toutefois|ensuite|puis|par la suite|plus tard|au d[ée]but|lors|lorsqu|apr[èe]s|dans l'anime|dans le manga|dans la version|bien qu|quoiqu|alors qu|tandis qu|pendant qu|malgr[ée]|selon|contrairement|si )\b/i;

/** Renversements de sens : on ne coupe jamais devant eux, ni dans une phrase niée. */
const RENVERSANT = /^(mais|sauf|hormis|bien qu|quoique|contrairement|alors qu|tandis qu|sans|ni |pourtant|cependant|n[ée]anmoins|toutefois)/i;
const NIEE = /\b(ne |n'|pas |jamais|aucun|aucune|nul )\b/i;

// ── Garde d'identité ──────────────────────────────────────────────────────────────────────────
const VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'the', 'of', 'no', 'san', 'kun', 'sama', 'chan', 'gou']);
const echap = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const jetons = (nom) => sansAccent(String(nom ?? '').toLowerCase())
  .split(/[^a-z0-9]+/).filter((j) => j.length >= 2 && !VIDES.has(j) && !/^\d+$/.test(j));
export const nomme = (phrase, nom) => {
  const js = jetons(nom);
  if (!js.length) return false;
  const p = sansAccent(phrase.toLowerCase());
  return js.some((j) => new RegExp(`\\b${echap(j)}`).test(p));
};
/** Le sujet de la phrase doit être la fiche, pas un de ses compléments : on ne sait pas analyser
 *  une syntaxe, mais on sait où le nom TOMBE. « Bien que ses origines soient inconnues, la planète
 *  natale de Yakon est appelée Dark Star » parle de la planète, et « Yakon » n'y arrive qu'au 68e
 *  caractère. Exiger le nom dans l'amorce écarte ces phrases dont le sujet est autre chose. */
export const nommeTot = (phrase, nom, dans = 60) => nomme(phrase.slice(0, dans), nom);

/** Le premier mot de la phrase EST un mot du nom de la fiche. Sert à désarmer `PRONOM_TETE` sur
 *  les noms qui commencent par un mot-outil français : « Si Xing Long est l'un des sept Dragons
 *  maléfiques » se faisait écarter pour le « si » conditionnel, « Son Goku Jr. est l'arrière-
 *  arrière-petit-fils de Son Goku » pour le possessif « son ». Le sujet y est on ne peut plus
 *  propre — c'est la garde qui lisait un pronom là où il y a un nom. */
export const amorceEstLeNom = (phrase, nom) => {
  const premier = sansAccent(String(phrase).toLowerCase()).match(/^[a-z0-9]+/)?.[0];
  return Boolean(premier) && jetons(nom).includes(premier);
};

// ── Coupes ────────────────────────────────────────────────────────────────────────────────────
const equilibre = (s) => {
  const par = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
  const gui = (s.match(/«/g) || []).length - (s.match(/»/g) || []).length;
  return par === 0 && gui === 0;
};
const finirPoint = (s) => (/[.!?…]$/.test(s) ? s : `${s}.`);
const nettoyerFin = (s) => `${norm(s).replace(/[,;:—\s]+$/, '')}.`;

/** GLOSE PARENTHÉTIQUE (vague 2) : « Le Kaïô de l'Est (Higashi no Kaiô ; litt. « Kaïô de l'Est »)
 *  est un Kaïô petit et trapu… ». La parenthèse ne dit rien du sujet — c'est de la romanisation,
 *  du kanji ou une note de doublage — et elle poussait la phrase hors de la bande de longueur ou
 *  faisait échouer l'équilibre des guillemets après coupe. On RETRANCHE, jamais plus : le résultat
 *  reste une sous-chaîne du texte en base. Seules les parenthèses PORTANT une marque de glose
 *  partent ; « (alias Full Metal Jacket) » reste, c'est une information sur le sujet. */
const MARQUE_GLOSE = /[\u3000-\u30ff\u4e00-\u9fff]|litt\.|lit\.|romanis|doublage|FUNimation|Funimation|\bViz\b|version (japonaise|originale)/i;
export const retirerGlose = (s) => norm(
  s.replace(/\s*\(([^()]{0,160})\)/g, (m, inner) => (MARQUE_GLOSE.test(inner) ? '' : m)),
).replace(/\s+([,;.])/g, '$1');

/** Les `*` d'emphase Markdown des textes rédigés par l'usine (« abriter *Le Gouffre* ») partiraient
 *  tels quels dans une colonne rendue en texte brut : on les retranche. Aucun autre caractère. */
const sansMarkdown = (s) => s.replace(/\*/g, '');

/** AUTONOMIE : « Guldo est le membre le plus petit et le moins puissant physiquement de l'équipe. »
 *  Quelle équipe ? La phrase définit par rapport à un ensemble que le résumé ne nomme pas — hors de
 *  son paragraphe elle ne dit plus rien. On refuse le groupe anaphorique NU (non suivi d'un nom
 *  propre) quand la phrase ne nomme, par ailleurs, aucun autre nom propre que la fiche elle-même :
 *  « L'orphelinat de Konoha est un établissement situé en périphérie du village, dirigé notamment
 *  par Nonō Yakushi » garde le sien, parce que Konoha et Yakushi y sont, eux, nommés. */
const ANAPHORE_NUE = /\b(de l'équipe|du groupe|de la série|de l'organisation|de la famille|de l'équipage|de la bande|de l'anime|du manga|de l'univers)\b(?!\s+[«"A-ZÀ-Ý0-9])/i;
function sansAppui(phrase, nom) {
  if (!ANAPHORE_NUE.test(phrase)) return false;
  const mien = new Set(jetons(nom));
  const propres = (phrase.match(/[A-ZÀ-Ý][\wÀ-ÿ'’-]+/g) || [])
    .filter((w, i) => !(i === 0 && phrase.startsWith(w)))
    .filter((w) => !mien.has(sansAccent(w.toLowerCase())));
  return propres.length === 0;
}

/** Retire une apposition de tête (« Créature infernale appelée Spike, Akkuman est … »)
 *  UNIQUEMENT si ce qui suit la virgule commence par le nom de la fiche. On retranche, jamais plus. */
function couperTeteApposition(s, nom, max) {
  if (s.length <= max) return s;
  const i = s.indexOf(', ');
  if (i < 0 || i > 90) return s;
  const suite = s.slice(i + 2);
  const j0 = jetons(nom)[0];
  if (!j0) return s;
  if (!new RegExp(`^${echap(j0)}`, 'i').test(sansAccent(suite))) return s;
  return suite.charAt(0).toUpperCase() + suite.slice(1);
}

/** Retire une queue d'apposition méta (« , basé sur le manga … »). */
const couperQueueMeta = (s, seuilCoupe) => {
  const m = s.match(/^(.*?),\s+(bas[ée]e? sur|cr[ée]{2} par|d'apr[èe]s|adapt[ée]e? d|aussi romanis[ée])/i);
  return m && m[1].length >= seuilCoupe ? nettoyerFin(m[1]) : s;
};

/** Coupe une phrase trop longue à la dernière frontière franche tombant dans la bande de COUPE.
 *  Cette bande est plus haute que le garde-fou d'acceptation : une phrase courte trouvée telle
 *  quelle est sans risque, une phrase longue coupée trop tôt fabrique une définition tronquée. */
function couperFort(s, seuilCoupe, max) {
  if (s.length <= max) return s;
  if (NIEE.test(s)) return s;                      // « X n'est pas un guerrier, mais un marchand »
  const bornes = [];
  for (const re of [/\s;\s/g, /\s—\s/g, /,\s/g, /\sen \w+ant\b/g, /\savant de\s/g, /\sapr[èe]s avoir\s/g, /\safin de\s/g, /\stout en\s/g]) {
    for (const m of s.matchAll(re)) bornes.push(m.index);
  }
  const candidates = [...new Set(bornes)].filter((i) => i >= seuilCoupe && i <= max).sort((a, b) => b - a);
  for (const i of candidates) {
    const queue = s.slice(i).replace(/^[,;—]\s*/, '');
    if (RENVERSANT.test(queue)) continue;
    // Une queue qui commence par un article nu est presque toujours une APPOSITION du dernier nom
    // de la tête (« … sous son supérieur, le Daï Kaïoshin »). Couper là laisse le nom en suspens.
    if (/^(le|la|les|l'|un|une|des)\s/i.test(queue)) continue;
    const tete = nettoyerFin(s.slice(0, i));
    if (!equilibre(tete)) continue;
    if (tete.length < seuilCoupe || tete.length > max) continue;
    return tete;
  }
  return s;
}

/** Met une phrase brute en forme de résumé, ou rend { ko } si elle ne peut pas l'être proprement. */
export function faconner(brute, nom, o) {
  let t = finirPoint(brute);
  if (o.glose) t = finirPoint(retirerGlose(sansMarkdown(t)));
  t = couperTeteApposition(t, nom, o.max);
  t = couperQueueMeta(t, o.seuilCoupe);
  t = couperFort(t, o.seuilCoupe, o.max);
  if (!equilibre(t)) return { ko: 'parenthèse ou guillemet non refermé' };
  if (t.includes(':')) return { ko: 'deux-points : la coupe laisserait une queue en l\'air' };
  if (deuxPhrases(t, o.parentheses)) return { ko: 'deux phrases, pas une' };
  if (!/^[«A-ZÀ-Ý0-9]/.test(t)) return { ko: 'commence en minuscule (phrase amputée de son sujet)' };
  if (new RegExp(`[\\u0000-\\u001F${SENT}]`).test(t)) return { ko: 'caractère invisible' };
  if (REMPLISSAGE.test(t)) return { ko: 'la phrase extraite est elle-même de remplissage' };
  // Le mot « personnage » est le mot du résumé creux qu'on remplace : dans ce corpus il n'introduit
  // jamais une définition mais une note de production ou la formule creuse elle-même.
  if (/\bpersonnages?\b/i.test(t)) return { ko: 'contient « personnage » (note de production ou formule creuse)' };
  if (o.autonomie && sansAppui(t, nom)) return { ko: 'groupe anaphorique nu (« de l\'équipe » — laquelle ?)' };
  return { t };
}

/** Réglages par vague. `min` est un GARDE-FOU d'acceptation ; `seuilCoupe` est le seuil, plus
 *  exigeant, en dessous duquel on refuse de COUPER une phrase trop longue. */
export const VAGUE1 = { min: 90, max: 160, seuilCoupe: 90, planchierDescFr: 80, glose: false, rangMax: 2, autonomie: false, parentheses: false, amorceNom: false };
/** `rangMax: 0` — LE RÉSUMÉ EST LA PHRASE DE TÊTE, OU RIEN. La vague 1 autorisait deux rangs de
 *  repli ; sur cette population le repli a produit 5 propositions dont 3 fautives, toutes du même
 *  vice : hors de son paragraphe, une phrase de rang 2 pend à un antécédent absent (« Ancienne
 *  résidence du daimyō…, IL fut incendié », « Temujin et Haido Y sont originaires »). 15 % de
 *  défauts sur les vingt cas relus, très au-dessus du seuil de 5 % : on resserre plutôt qu'écrire.
 *  Coût mesuré : 2 bonnes propositions perdues (tagoma, upa). */
export const VAGUE2 = { min: 30, max: 190, seuilCoupe: 90, planchierDescFr: 0, glose: true, rangMax: 0, autonomie: true, parentheses: true, amorceNom: true };

/** Construit la proposition depuis le descFr d'une fiche.
 *  Rend { resume, preuve, rang } ou { refus, quasi? }. N'invente rien : le résumé est une
 *  sous-chaîne de `descFr`, et `preuve` est la phrase source mot pour mot. */
export function proposer(entry, opts = VAGUE2) {
  const o = { ...VAGUE2, ...opts };
  const descFr = norm(entry.attributes?.descFr);
  if (!descFr) return { refus: 'descFr absent' };
  if (o.planchierDescFr && descFr.length < o.planchierDescFr) return { refus: `descFr trop court (${descFr.length} car.)` };
  if (REMPLISSAGE.test(descFr)) return { refus: 'descFr lui-même de remplissage' };

  const ps = phrases(descFr, o.parentheses).filter((s) => !estFiche(s) && s.length >= 30);
  if (!ps.length) return { refus: 'descFr sans prose (que des champs de fiche)' };
  if (!ps.some((s) => nomme(s, entry.name))) return { refus: 'aucune phrase ne nomme la fiche (identité non confirmée)' };

  // RÈGLE DE RANG : c'est la phrase de TÊTE qui définit. On l'essaie d'abord ; si elle est méta ou
  // sans sujet nommé, on descend d'un ou deux rangs mais en exigeant alors une phrase DÉFINITOIRE.
  // On ne descend jamais plus bas : au-delà ce sont des anecdotes, et une anecdote promue en résumé
  // est un contresens (« Le Kaïô de l'Est adore sa moto volante »).
  const quasi = [];
  let motif = null;
  for (let i = 0; i < ps.length && i <= o.rangMax; i += 1) {
    const brute = ps[i];
    if (!nomme(brute, entry.name)) { motif ??= 'phrase de tête ne nommant pas la fiche'; continue; }
    if (!nommeTot(brute, entry.name)) { motif ??= 'le nom n\'arrive qu\'après l\'amorce (sujet probablement autre)'; continue; }
    if (META.test(brute)) { motif ??= 'phrase de tête méta (œuvre, doublage, étymologie)'; continue; }
    if (PRONOM_TETE.test(brute) && !(o.amorceNom && amorceEstLeNom(brute, entry.name))) { motif ??= 'phrase de tête sans sujet propre'; continue; }
    const def = DEFINITOIRE.test(brute);
    if (!def && i > 0) { motif ??= 'seules des phrases non définitoires après la tête'; continue; }
    if (!def && !NOMINALE.test(brute)) { motif ??= 'phrase de tête ni définitoire ni nominale'; continue; }

    const f = faconner(brute, entry.name, o);
    if (f.ko) { motif ??= f.ko; continue; }
    if (f.t.length < o.min || f.t.length > o.max) { quasi.push({ len: f.t.length, def, rang: i, texte: f.t }); continue; }
    return { resume: f.t, preuve: brute, rang: i };
  }
  if (quasi.length) {
    quasi.sort((a, b) => (b.def - a.def) || a.rang - b.rang);
    return { refus: `phrase utilisable hors bande ${o.min}–${o.max} (${quasi[0].len} car.)`, quasi: quasi.slice(0, 2) };
  }
  return { refus: motif ?? 'aucune phrase exploitable' };
}
