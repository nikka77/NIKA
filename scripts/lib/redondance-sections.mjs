// Critère de redondance — module partagé (analyse ET application).
//
// Principe : une section n'est retirable QUE si tout ce qu'elle dit est déjà dit par les sections
// qui RESTENT. On ne compare donc pas deux à deux « qui ressemble à qui », on mesure ce que chaque
// section apporte au dossier une fois les autres en place. L'invariant est vérifiable : après
// retrait, l'union des sections conservées couvre l'union des sections d'origine.
//
// Trois mesures, de la plus grossière à la plus fine :
//  · recouvrement en trigrammes de mots — filtre de candidature, jamais une décision ;
//  · jetons NOUVEAUX : mots pleins absents de tout le reste du dossier ;
//  · APPORTS RÉELS : parmi les jetons nouveaux, ceux qui ne se ramènent pas à une variante
//    morphologique d'un mot déjà présent (destructrice/destructive, vaincre/vaincu — signature
//    d'une reformulation). Un fait neuf laisse presque toujours un nom propre, un nombre ou un
//    mot plein sans parent dans le reste du dossier.
//
// PIÈGE CORRIGÉ (07/08) : découper les mots sur [A-Za-zÀ-ÖØ-öø-ÿ] casse les macrons — « Hyūga »
// devient « Hy » + « ga », « Chōjūrō » devient « Ch » + « j » + « r ». Le fragment « hy », trop
// court pour entrer dans les mots pleins mais assez long pour compter comme nom propre, faisait
// croire à un témoin neuf sur TOUTE fiche Naruto à macron (171 fiches à recouvrement ≥ 0,88, dont
// des textes rigoureusement identiques). On tokenise en \p{L}\p{N}.

export const OUTILS = new Set(`a à au aux avec ce ces dans de des du elle en et eux il ils je la le
les leur lui ma mais me même mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses
son sur ta te tes toi ton tu un une vos votre vous c d j l m n s t y été étée étées étés étant étante
étants étantes suis es est sommes êtes sont serai seras sera serons serez seront serais serait
serions seriez seraient étais était étions étiez étaient fus fut fûmes fûtes furent sois soit soyons
soyez soient fusse fusses fût fussions fussiez fussent ayant eu eue eues eus ai as avons avez ont
aurai auras aura aurons aurez auront aurais aurait aurions auriez auraient avais avait avions aviez
avaient eut eûmes eûtes eurent aie aies ait ayons ayez aient eusse eusses eût eussions eussiez
eussent plus très aussi bien alors ainsi donc car lors lorsque quand comme cette cet celui celle
ceux celles dont où si non oui tout toute tous toutes autre autres après avant pendant
depuis entre chez sans sous jusqu jusque encore déjà toujours jamais puis ensuite enfin
également leurs notamment cela ceci`.split(/\s+/).filter(Boolean)
  .map((m) => m.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase()));

export const normMot = (m) => m.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

const MOT = /[\p{L}\p{N}]+/gu;

/** Mots pleins normalisés d'un texte (hors mots-outils, hors mots de moins de 3 lettres). */
export function jetons(texte) {
  const out = new Set();
  for (const m of String(texte).match(MOT) ?? []) {
    const n = normMot(m);
    if (n.length < 3 && !/^\d+$/.test(n)) continue;
    if (OUTILS.has(n)) continue;
    out.add(n);
  }
  return out;
}

/** Noms propres et nombres — les témoins d'un fait. Un mot capitalisé en TÊTE DE PHRASE ne compte
 *  pas (c'est la ponctuation qui le capitalise) ; un mot capitalisé qui SUIT un autre mot
 *  capitalisé compte (« Jotaro Kujo » : sans cela le second membre d'un nom composé s'échappe). */
export function temoins(texte) {
  const t = String(texte);
  const out = new Set();
  const re = /[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu;
  let m, finDePhrase = true, precedentCapitale = false;
  while ((m = re.exec(t))) {
    const jeton = m[0];
    if (!/^[\p{L}\p{N}]/u.test(jeton)) {
      if (/[.!?\n]/.test(jeton)) { finDePhrase = true; precedentCapitale = false; }
      else if (/[:;»"“”—–()]/.test(jeton)) precedentCapitale = false;
      continue;
    }
    if (/^\d/.test(jeton)) {
      if (/^\d+$/.test(jeton)) out.add(jeton);
      finDePhrase = false; precedentCapitale = false; continue;
    }
    const capitale = jeton[0] !== jeton[0].toLowerCase();
    const n = normMot(jeton);
    if (capitale && n.length >= 3 && !OUTILS.has(n) && (!finDePhrase || precedentCapitale)) out.add(n);
    finDePhrase = false;
    precedentCapitale = capitale;
  }
  return out;
}

export function trigrammes(texte, n = 3) {
  const mots = (normMot(String(texte)).match(MOT) ?? []);
  const s = new Set();
  if (mots.length < n) { s.add(mots.join(' ')); return s; }
  for (let i = 0; i + n <= mots.length; i++) s.add(mots.slice(i, i + n).join(' '));
  return s;
}

export const contenu = (petit, grand) => {
  if (!petit.size) return 1;
  let k = 0; for (const x of petit) if (grand.has(x)) k++;
  return k / petit.size;
};

/** Index des mots du reste du dossier par préfixe de 5 lettres — pour reconnaître les variantes. */
export function indexPrefixes(ensemble) {
  const m = new Map();
  for (const x of ensemble) {
    if (x.length < 5) continue;
    const p = x.slice(0, 5);
    if (!m.has(p)) m.set(p, []);
    m.get(p).push(x);
  }
  return m;
}

/** `mot` n'est-il qu'une flexion/dérivation d'un mot déjà présent ailleurs ? */
export function estVariante(mot, prefixes) {
  if (mot.length < 5) return false;
  const fam = prefixes.get(mot.slice(0, 5));
  if (!fam) return false;
  for (const o of fam) {
    const court = Math.min(o.length, mot.length);
    if (Math.max(o.length, mot.length) - court <= 4 && o.slice(0, court) === mot.slice(0, court)) return true;
  }
  return false;
}

/** Ce que la section `s` apporte face à l'union `autres`. */
export function apport(s, autresJetons, autresTri, autresPrefixes) {
  const j = jetons(s.texte), t = temoins(s.texte), tri = trigrammes(s.texte);
  const nouveaux = [...j].filter((x) => !autresJetons.has(x));
  const reels = nouveaux.filter((x) => !estVariante(x, autresPrefixes));
  // Sur un TÉMOIN (nom propre, nombre) on n'admet PAS la tolérance morphologique : « Senjutsu »
  // se rabattrait sur « Senju » (préfixe commun de 5, écart de 3) et un nom de technique passerait
  // pour une flexion du nom de clan. Un nom propre se retrouve à l'identique ou pas du tout.
  const temoinsNeufs = [...t].filter((x) => !autresJetons.has(x));
  return {
    recouvrement: +contenu(tri, autresTri).toFixed(4),
    partNouvelle: j.size ? +(nouveaux.length / j.size).toFixed(4) : 0,
    nouveaux, reels, temoinsNeufs, nbJetons: j.size,
  };
}

// Titres génériques : ceux que l'export du wiki pose comme SECTION PARENTE. À contenu égal, c'est
// l'enfant, plus spécifique, qui informe le lecteur — le parent qui part.
export const TITRES_GENERIQUES = new Set([
  'histoire', 'history', 'biographie', 'biography', 'plot', 'intrigue', 'resume', 'synopsis',
  'partie i', 'partie ii', 'part i', 'part ii', 'premiere partie', 'deuxieme partie',
  'background', 'passe', 'past', 'contexte', 'recit', 'parcours',
  'vue d ensemble', 'overview', 'nouvelle ere', 'ere nouvelle', 'new era',
  'capacites', 'capacites et pouvoirs', 'pouvoirs et capacites', 'abilities', 'pouvoirs',
  'powers and abilities', 'autres medias', 'apparitions dans d autres medias', 'in other media',
]);
export const estGenerique = (titre) => TITRES_GENERIQUES.has(
  normMot(String(titre ?? '')).replace(/[^a-z0-9]+/g, ' ').trim());

// Couverture PHRASE PAR PHRASE — le lexique global rate les paraphrases (« tuer » / « mettre fin
// aux jours »), qui sont pourtant le cas le plus courant du doublon parent/enfant. On regarde
// donc si CHAQUE phrase de la section candidate a un répondant ailleurs dans le dossier.
//
// DEUX mesures, et il faut les deux :
//  · sac de mots pleins contre la MEILLEURE phrase d'en face (≥ 0,6) — insensible à l'ordre,
//    donc tolérante à la reformulation ;
//  · bigrammes de mots contre TOUT ce qui reste (≥ 0,3) — sensible à l'ordre, donc capable de
//    refuser une phrase dont les mots existent ailleurs mais dispersés, c'est-à-dire un ÉNONCÉ
//    neuf construit avec du vocabulaire connu (« Koitsukai est un guerrier créé par Paparoni »
//    quand le reste ne nomme Paparoni que dans la fusion finale).

// « Monkey D. Luffy », « Dr. Slump », « M. Satan » : le point d'une INITIALE ou d'une abréviation
// n'est pas une fin de phrase. Sans cette garde, la découpe fabrique des fragments (« Après le
// début du raid et la révélation de la présence de Monkey D. ») que rien ne peut apparier.
const ABREV = /(?:^|\s)(?:[A-ZÀ-Ö]|Dr|Mr|Mme|Mlle|St|Ste|M|Jr|Sr|No|vol|cf|env)$/;
export function decouperPhrases(texte) {
  const morceaux = String(texte).split(/(?<=[.!?…])["»]?\s+(?=[A-ZÀ-Ö«"0-9])/);
  const out = [];
  for (const m of morceaux) {
    const prec = out.length ? out[out.length - 1] : null;
    if (prec !== null && ABREV.test(prec.replace(/[.!?…"»]+$/, ''))) out[out.length - 1] = prec + ' ' + m;
    else out.push(m);
  }
  return out.map((p) => p.trim()).filter(Boolean);
}

export function bigrammes(texte) {
  const m = normMot(String(texte)).match(/[\p{L}\p{N}]+/gu) ?? [];
  const s = new Set();
  for (let i = 0; i + 2 <= m.length; i++) s.add(m[i] + ' ' + m[i + 1]);
  return s;
}

/** La section est-elle une paraphrase de ce qui reste ? */
export function estParaphrase(section, autresSections, opts = {}) {
  const { seuilPhrase = 0.6, seuilBigrammes = 0.30, minMots = 6, minBigrammes = 6 } = opts;
  const phrasesAutres = [];
  const bigAutres = new Set();
  for (const o of autresSections) {
    for (const b of bigrammes(o.texte)) bigAutres.add(b);
    for (const p of decouperPhrases(o.texte)) {
      const j = jetons(p);
      phrasesAutres.push({ jetons: j, prefixes: indexPrefixes(j) });
    }
  }
  const nonCouvertes = [];
  let carCouverts = 0, carTotal = 0;
  for (const p of decouperPhrases(section.texte)) {
    const mots = [...jetons(p)];
    const bg = bigrammes(p);
    carTotal += p.length;
    // Une phrase n'échappe aux deux tests que si elle est trop courte pour les DEUX : une
    // formule de clôture (« On ignore ce qui lui est arrivé après. ») n'a que deux mots pleins
    // mais sept bigrammes — c'est le test d'ordre qui doit alors décider, pas une dispense.
    if (mots.length < minMots && bg.size < minBigrammes) { carCouverts += p.length; continue; }
    let best = 1;
    if (mots.length >= minMots) {
      best = 0;
      for (const pa of phrasesAutres) {
        let k = 0;
        for (const x of mots) if (pa.jetons.has(x) || estVariante(x, pa.prefixes)) k++;
        const c = k / mots.length;
        if (c > best) best = c;
      }
    }
    let cb = 1;
    if (bg.size >= minBigrammes) { let kb = 0; for (const b of bg) if (bigAutres.has(b)) kb++; cb = kb / bg.size; }
    if (best >= seuilPhrase && cb >= seuilBigrammes) carCouverts += p.length;
    else nonCouvertes.push({ phrase: p, couverture: +best.toFixed(3), bigrammes: +cb.toFixed(3) });
  }
  return { nonCouvertes, partCouverte: carTotal ? +(carCouverts / carTotal).toFixed(4) : 1 };
}

// Glouton par fiche — ne retire QUE ce que le reste du dossier dit déjà.
//
// Deux voies de retrait, toutes deux gardées par « zéro témoin neuf » (aucun nom propre ni nombre
// que le reste du dossier ignore) :
//   A. LEXICALE  — au plus `maxApportsReels` mots pleins sans parent ailleurs. Attrape la copie
//      quasi conforme et la condensation.
//   B. PARAPHRASE — chaque phrase de la section a un répondant ailleurs (≥ 60 % de ses mots
//      pleins, variantes admises). Attrape la réécriture par synonymes, que A rate par
//      construction (« tuer » / « mettre fin aux jours »).
//
// Référence = texte ET TITRES des sections qui restent : « Lors de la saga de Water 7, … » ouvre
// une section intitulée « Water 7 Saga » — le nom d'arc n'est pas un fait neuf, c'est l'étiquette.
//
// Départage, quand plusieurs sections sont retirables : d'abord le TITRE GÉNÉRIQUE (« Histoire »,
// « Partie II ») que l'export a posé comme parent — l'enfant, plus spécifique, informe mieux ;
// à titres de même nature, la section la plus COURTE part et la plus riche reste.

export function traiterFiche(lignes, opts = {}) {
  const { maxApportsReels = 2, seuilRec = 0.30, seuilRecParaphrase = 0.45 } = opts;
  const cache = new Map(lignes.map((l) => [l.id, { j: jetons(l.texte), t: trigrammes(l.texte), jt: jetons(l.titre ?? '') }]));
  let restants = [...lignes].sort((a, b) => Number(a.idx) - Number(b.idx));
  const retraits = [];
  const frontiere = [];
  for (let tour = 0; tour < 12; tour++) {
    const cands = [];
    for (const l of restants) {
      const autres = restants.filter((x) => x.id !== l.id);
      if (!autres.length) continue;
      const aj = new Set(), at = new Set();
      for (const o of autres) {
        for (const x of cache.get(o.id).j) aj.add(x);
        for (const x of cache.get(o.id).jt) aj.add(x);
        for (const x of cache.get(o.id).t) at.add(x);
      }
      const a = apport(l, aj, at, indexPrefixes(aj));
      if (a.recouvrement < seuilRec) continue;
      if (a.temoinsNeufs.length) { if (a.recouvrement >= 0.55) frontiere.push({ l, a, motif: 'témoin neuf' }); continue; }
      const lexicale = a.reels.length <= maxApportsReels;
      if (!lexicale && a.recouvrement < seuilRecParaphrase) {
        if (a.recouvrement >= 0.60) frontiere.push({ l, a, motif: 'lexique divergent' });
        continue;
      }
      // Garde commune aux deux voies : AUCUNE phrase de la section ne doit rester sans
      // répondant. Le compte de mots seul ne le garantit pas — une phrase entière peut être
      // neuve alors que tous ses mots existent ailleurs, dispersés.
      const p = estParaphrase(l, autres);
      if (!p.nonCouvertes.length) { cands.push({ l, a, voie: lexicale ? 'lexicale' : 'paraphrase', p, autres }); continue; }
      if (p.nonCouvertes.length <= 2 && p.partCouverte >= 0.75) frontiere.push({ l, a, p, motif: 'phrases non couvertes' });
    }
    if (!cands.length) break;
    cands.sort((x, y) =>
      (estGenerique(y.l.titre) ? 1 : 0) - (estGenerique(x.l.titre) ? 1 : 0)
      || x.l.texte.length - y.l.texte.length
      || Number(y.l.idx) - Number(x.l.idx));
    const pris = cands[0];
    retraits.push(pris);
    restants = restants.filter((x) => x.id !== pris.l.id);
  }

  // REPRISE — le glouton juge chaque retrait contre l'état du moment ; une section retirée au
  // premier tour a pu être couverte par une section retirée au second. On revérifie donc tout
  // contre l'état FINAL et on remet ce qui n'y tient plus. Remettre ne peut qu'améliorer la
  // couverture des autres : la boucle converge.
  const remis = [];
  for (let garde = 0; garde < 12; garde++) {
    const echecs = retraits.filter((x) => estParaphrase(x.l, restants).nonCouvertes.length);
    if (!echecs.length) break;
    for (const e of echecs) {
      retraits.splice(retraits.indexOf(e), 1);
      restants.push(e.l);
      remis.push({ ...e, motif: 'couverture perdue après les retraits suivants' });
    }
    restants.sort((a, b) => Number(a.idx) - Number(b.idx));
  }
  return { retraits, restants, frontiere, remis };
}
