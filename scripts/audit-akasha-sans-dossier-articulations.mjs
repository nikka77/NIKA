// scripts/audit-akasha-sans-dossier-articulations.mjs — CHANTIER 4, quatrième temps : LES AUTRES
// FORMES D'ARTICULATION.
//
// POURQUOI (10/08/2026). La vague 2 a conclu « pas de gisement » et son contre-vérificateur a
// nuancé : la règle resserrée ne testait que la NUMÉROTATION (« I. » « II. » « 1. » « 2. » suivis
// d'une majuscule). Un texte peut s'articuler autrement — un paragraphe qui s'ouvre sur « Ses
// capacités », un changement de temps verbal, une double ligne vide. Ces formes n'ont pas été
// comptées ; elles ont été supposées absentes. Ce script les COMPTE.
//
// Trois principes de mesure, pour ne pas refaire la faute d'en face (supposer une liste de titres) :
//   · Le vocabulaire des marqueurs n'est pas inventé : il est EXTRAIT des 19 099 titres de sections
//     déjà écrites. Si « Apparence » articule un dossier AKASHA, c'est parce qu'AKASHA l'écrit déjà.
//   · Tout marqueur cherché dans un texte l'est sur un invariant de forme vérifiable (le libellé
//     suivi d'une majuscule ou de deux-points, hors début de texte), et chaque comptage garde la
//     PHRASE-PREUVE — un compte sans extrait n'est pas auditable.
//   · Tokenisation Unicode `\p{L}\p{N}` partout (leçon du 07/08 : les plages Latin-1 cassent
//     « Hyūga » en deux et fabriquent de faux mots).
//
// N'ÉCRIT RIEN EN BASE. Sortie : data/audits/sans-dossier-articulations-<horodatage>.json
// Usage : node --env-file=.env.local scripts/audit-akasha-sans-dossier-articulations.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();

// PAGINATION + `.order('id')` : un select nu s'arrête à 1000 lignes sans erreur, et une pagination
// sans tri laisse le moteur répéter des lignes d'une page à l'autre (mesuré le 10/08 : 4 772
// entry_id distincts sans tri contre 4 778 avec, pour un total juste des deux côtés).
const page = async (table, sel, tri = 'id') => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).order(tri).range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const secs = await page('akasha_sections', 'entry_id, idx, titre, texte, source');

// Comptes serveur, en contrôle croisé de la pagination (deux instruments valent mieux qu'un).
const compte = async (table) => (await db.from(table).select('id', { count: 'exact', head: true })).count;
const nEntriesServeur = await compte('akasha_entries');
const nSecsServeur = await compte('akasha_sections');

const parFiche = new Map();
for (const s of secs) {
  if (!parFiche.has(s.entry_id)) parFiche.set(s.entry_id, []);
  parFiche.get(s.entry_id).push(s);
}
const avecDossier = new Set(parFiche.keys());
const descFr = (e) => (typeof e.attributes?.descFr === 'string' ? e.attributes.descFr.trim() : '');

const sansDossier = entries.filter((e) => !avecDossier.has(e.id));
const avecDossierFiches = entries.filter((e) => avecDossier.has(e.id));

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 1. LA MATIÈRE : combien de fiches sans dossier ont plus de 900 caractères de texte français ?
// ─────────────────────────────────────────────────────────────────────────────────────────────
const longueurs = sansDossier.map((e) => ({ e, n: descFr(e).length }));
const tranches = { vide: 0, '1-300': 0, '301-600': 0, '601-900': 0, '901-1200': 0, '1201-1600': 0, '1601+': 0 };
for (const { n } of longueurs) {
  if (!n) tranches.vide++;
  else if (n <= 300) tranches['1-300']++;
  else if (n <= 600) tranches['301-600']++;
  else if (n <= 900) tranches['601-900']++;
  else if (n <= 1200) tranches['901-1200']++;
  else if (n <= 1600) tranches['1201-1600']++;
  else tranches['1601+']++;
}
const riches = longueurs.filter((x) => x.n > 900).map((x) => x.e);
const mediane = (t) => { const s = [...t].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 2. LA FORME DES 19 099 SECTIONS EXISTANTES — à regarder AVANT d'en écrire une seule.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const titresFreq = new Map();
for (const s of secs) {
  const t = String(s.titre ?? '').trim();
  if (t) titresFreq.set(t, (titresFreq.get(t) ?? 0) + 1);
}
const titresTop = [...titresFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
const sourcesFreq = new Map();
for (const s of secs) sourcesFreq.set(s.source ?? '(null)', (sourcesFreq.get(s.source ?? '(null)') ?? 0) + 1);
const idxFormes = new Map();
for (const s of secs) {
  const f = /^\d+$/.test(String(s.idx)) ? 'entier' : /^\d+\.\d+$/.test(String(s.idx)) ? 'n.m' : /^\d+(\.\d+){2,}$/.test(String(s.idx)) ? 'n.m.p' : 'autre';
  idxFormes.set(f, (idxFormes.get(f) ?? 0) + 1);
}
const anatomie = {
  lignes: secs.length,
  fichesDotees: avecDossier.size,
  sectionsParDossierMediane: mediane([...parFiche.values()].map((v) => v.length)),
  longueurTexteMediane: mediane(secs.map((s) => String(s.texte ?? '').length)),
  longueurDossierMediane: mediane([...parFiche.values()].map((v) => v.reduce((a, s) => a + String(s.texte ?? '').length, 0))),
  sansTitre: secs.filter((s) => !String(s.titre ?? '').trim()).length,
  formesDIdx: Object.fromEntries(idxFormes),
  sources: Object.fromEntries([...sourcesFreq.entries()].sort((a, b) => b[1] - a[1])),
  titresDistincts: titresFreq.size,
  titresLesPlusFrequents: titresTop.map(([t, n]) => ({ titre: t, n })),
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 3. LES MARQUEURS D'ARTICULATION — vocabulaire EXTRAIT du corpus, jamais supposé.
//    On retient les titres de section employés au moins 20 fois : ce sont les charnières qu'AKASHA
//    utilise vraiment. Un texte qui s'articule « comme un dossier » devrait les porter inline.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const echappe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const vocabulaire = titresTop.filter(([, n]) => n >= 20).map(([t]) => t);
// Formes inline plausibles d'un même thème, telles que la vague 2 en a vu une (« I. Histoire ») :
// le libellé, seul, suivi d'une majuscule ou d'un deux-points, et PAS en tout début de texte.
const motifsInline = vocabulaire.map((t) => ({
  libelle: t,
  re: new RegExp(`(?<=[.!?»)]\\s|\\n)${echappe(t)}\\s*(?::|(?=\\p{Lu}))`, 'gu'),
}));
// Les trois formulations nommées par la consigne, testées séparément pour répondre au mot près.
const motifsConsigne = [
  { libelle: 'Ses capacités', re: /(?<=[.!?»)]\s|\n)Ses\s+(?:capacités|pouvoirs|techniques)\b/gu },
  { libelle: 'Son histoire', re: /(?<=[.!?»)]\s|\n)Son\s+(?:histoire|passé|parcours)\b/gu },
  { libelle: 'Apparence', re: /(?<=[.!?»)]\s|\n)(?:Apparence|Son\s+apparence|Personnalité|Sa\s+personnalité)\b/gu },
];

// Temps verbal : on ne devine pas, on compte des terminaisons. Passé simple 3e pers. (-a/-it/-ut
// précédés d'une consonne + verbes irréguliers fréquents) contre présent (est/sont/a/ont/peut).
// Le comptage se fait PHRASE PAR PHRASE ; une « rupture » = une phrase dont le temps dominant
// diffère de la précédente. La mesure est grossière — elle sert à savoir s'il y a quelque chose à
// regarder, pas à trancher.
const PASSE = /\b(?:fut|furent|eut|eurent|devint|devinrent|fit|firent|prit|prirent|vint|vinrent|reçut|parvint|mourut|naquit|décida|rejoignit|affronta|réussit|échoua|était|étaient|avait|avaient)\b/iu;
const PRESENT = /\b(?:est|sont|a|ont|peut|peuvent|possède|possèdent|dispose|se\s+caractérise|apparaît|reste|demeure)\b/iu;
const phrases = (t) => t.split(/(?<=[.!?])\s+(?=\p{Lu})/u).map((p) => p.trim()).filter((p) => p.length > 25);
const rupturesDeTemps = (t) => {
  let precedent = null, n = 0; const preuves = [];
  for (const p of phrases(t)) {
    const passe = PASSE.test(p), present = PRESENT.test(p);
    const temps = passe && !present ? 'passé' : present && !passe ? 'présent' : null;
    if (!temps) continue;
    if (precedent && temps !== precedent) { n++; if (preuves.length < 2) preuves.push(p.slice(0, 160)); }
    precedent = temps;
  }
  return { n, preuves };
};

const analyse = (e) => {
  const t = descFr(e);
  const trouves = [];
  for (const m of [...motifsInline, ...motifsConsigne]) {
    m.re.lastIndex = 0;
    let x;
    while ((x = m.re.exec(t)) !== null) {
      trouves.push({ libelle: m.libelle, position: x.index, preuve: t.slice(Math.max(0, x.index - 60), x.index + 90) });
      if (trouves.length > 6) break;
    }
  }
  const sautsSimples = (t.match(/\n/g) ?? []).length;
  const sautsDoubles = (t.match(/\n\s*\n/g) ?? []).length;
  const numerotation = [...t.matchAll(/(?<=[.!?»)]\s|^|\n)(?:[IVX]{1,4}|\d{1,2})[.)]\s*(?=\p{Lu})/gu)].length;
  const temps = rupturesDeTemps(t);
  return {
    slug: e.slug, name: e.name, type: e.type, universe: e.universe, longueur: t.length,
    marqueursInline: trouves, sautsSimples, sautsDoubles, numerotation,
    rupturesDeTemps: temps.n, preuvesDeTemps: temps.preuves,
  };
};

const surRiches = riches.map(analyse);
const surTous = sansDossier.filter((e) => descFr(e).length > 0).map(analyse);

const cumul = (lot) => ({
  fiches: lot.length,
  avecMarqueurInline: lot.filter((a) => a.marqueursInline.length).length,
  avecSautDeLigne: lot.filter((a) => a.sautsSimples > 0).length,
  avecDoubleSaut: lot.filter((a) => a.sautsDoubles > 0).length,
  avecNumerotation: lot.filter((a) => a.numerotation >= 2).length,
  avecRuptureDeTemps: lot.filter((a) => a.rupturesDeTemps >= 1).length,
  avecDeuxRupturesOuPlus: lot.filter((a) => a.rupturesDeTemps >= 2).length,
});

// TÉMOIN : la même mesure sur les fiches qui ONT un dossier. Si un marqueur ne distingue pas les
// deux populations, il ne mesure rien d'utile (c'est le contrôle que la vague 2 n'avait fait que
// pour la numérotation).
const temoinRiches = avecDossierFiches.filter((e) => descFr(e).length > 900).map(analyse);

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 4. LES VINGT CAS — tirés à pas régulier dans les fiches où un marqueur a été TROUVÉ, pour
//    lecture humaine. C'est là que se mesure le taux d'erreur avant toute écriture.
// ─────────────────────────────────────────────────────────────────────────────────────────────
// On tire dans TOUTE la population sans dossier, pas seulement les riches : un texte de 700 c qui
// porte « Apparence : … Histoire : … » est un candidat autant qu'un texte de 1 200 c, et se limiter
// au seuil de longueur reviendrait à mesurer la taille au lieu de l'articulation (leçon du 10/08).
const candidats = surTous.filter((a) => a.marqueursInline.length || a.sautsDoubles || a.numerotation >= 2);
const pas = Math.max(1, Math.floor(candidats.length / 20));
const vingt = candidats.filter((_, i) => i % pas === 0).slice(0, 20).map((a) => ({
  ...a, texteEntier: descFr(entries.find((e) => e.slug === a.slug)),
}));

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 5. LA RÈGLE RESSERRÉE, après lecture des vingt cas. Sur 20, quinze marqueurs sont une PHRASE
//    ORDINAIRE (« Son apparence se distingue par… ») et non un titre : le motif large mesure la
//    tournure française, pas l'articulation. Ne survit que la forme TITRE — un libellé du
//    vocabulaire suivi de deux-points ou d'un numéro romain, jamais d'un verbe. Et il en faut DEUX
//    pour qu'un dossier existe : un seul titre ne coupe pas un texte, il l'introduit.
//
//    Contre-mesure indispensable : ce même motif attrape l'INFOBOX APLATIE (« Zanpakutō :
//    Suzumebachi. », « Famille : Iruka Umino (fils) »), défaut déjà consigné le 02/08. On la compte
//    donc à part, pour savoir ce que le motif trouve VRAIMENT.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const formeTitre = new RegExp(`(?<=[.!?»)]\\s|^|\\n)(?:[IVX]{1,3}\\.\\s*)?(?:${vocabulaire.map(echappe).join('|')})\\s*(?::\\s*|\\s+(?=\\p{Lu}))`, 'gu');
const titresDansTexte = (t) => { formeTitre.lastIndex = 0; return [...t.matchAll(formeTitre)].map((m) => m[0].trim()); };
// Infobox aplatie : au moins trois couples « Libellé : valeur » dans les 400 premiers caractères.
const INFOBOX = /(?:^|[.;»)]\s)[\p{Lu}][\p{L}\s'’-]{2,28}\s:\s/gu;
const infoboxAplatie = (t) => { INFOBOX.lastIndex = 0; return [...t.slice(0, 400).matchAll(INFOBOX)].length >= 3; };

const gisementProuve = sansDossier
  .map((e) => ({ e, t: descFr(e) }))
  .filter((x) => x.t)
  .map((x) => ({ slug: x.e.slug, universe: x.e.universe, longueur: x.t.length, titres: titresDansTexte(x.t), infobox: infoboxAplatie(x.t) }))
  .filter((x) => x.titres.length >= 2);

const infoboxSurSansDossier = sansDossier.filter((e) => { const t = descFr(e); return t && infoboxAplatie(t); }).length;

// TROUVAILLE LATÉRALE, vue à l'écran avant d'être comptée : le canal de soi-fon se termine sur
// « …ce qui explique. » — une phrase coupée. Deux détecteurs, chacun ne mesurant que ce qu'il voit :
// l'absence pure et simple de ponctuation finale, et la fin sur un mot subordonnant (grammaticale,
// donc plus fragile — elle est comptée à part et jamais fusionnée avec l'autre).
const SUBORDONNANT = /\b(?:et|ou|de|du|des|au|aux|qui|que|dont|car|mais|dans|pour|par|sur|avec|à|explique|comprend)\s*\.$/iu;
const finSansPonctuation = sansDossier.filter((e) => { const t = descFr(e); return t && !/[.!?»…)]$/u.test(t); }).length;
const finSurSubordonnant = sansDossier.filter((e) => { const t = descFr(e); return t && SUBORDONNANT.test(t); }).length;

const rapport = {
  chantier: 'CHANTIER 4 — les fiches sans dossier, par les articulations AUTRES que la numérotation',
  quand: new Date().toISOString(),
  ecritEnBase: 'RIEN.',
  recompte: {
    fichesPaginees: entries.length, fichesServeur: nEntriesServeur,
    sectionsPaginees: secs.length, sectionsServeur: nSecsServeur,
    fichesAvecDossier: avecDossier.size, fichesSansDossier: sansDossier.length,
  },
  matiere: {
    distributionDesLongueursDescFr: tranches,
    medianeDesLongueurs: mediane(longueurs.map((x) => x.n)),
    sansDossierEtDescFrSup900: riches.length,
    parUnivers: Object.fromEntries(
      [...new Set(riches.map((e) => e.universe))].map((u) => [u, riches.filter((e) => e.universe === u).length]),
    ),
  },
  anatomieDesSectionsExistantes: anatomie,
  vocabulaireExtraitDuCorpus: vocabulaire,
  articulations: {
    surLesSansDossierRiches: cumul(surRiches),
    surTousLesSansDossierAvecTexte: cumul(surTous),
    temoinFichesAvecDossierEtDescFrSup900: cumul(temoinRiches),
  },
  exemplesDeMarqueurs: surRiches.filter((a) => a.marqueursInline.length).slice(0, 25),
  vingtCasALire: vingt,
  regleResserree: {
    critere: 'au moins DEUX libellés du vocabulaire en forme de titre (deux-points ou numéro romain)',
    gisementProuve,
    fichesSansDossierAInfoboxAplatie: infoboxSurSansDossier,
  },
  textesTronques: { finSansPonctuation, finSurSubordonnant },
};

const sortie = path.join(ROOT, `data/audits/sans-dossier-articulations-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));

console.log(`fiches ${entries.length} (serveur ${nEntriesServeur}) · sections ${secs.length} (serveur ${nSecsServeur})`);
console.log(`sans dossier ${sansDossier.length} · dont descFr > 900 c : ${riches.length}`);
console.log(`distribution : ${JSON.stringify(tranches)}`);
console.log(`\nsections existantes : ${anatomie.sectionsParDossierMediane} par dossier (médiane), texte médian ${anatomie.longueurTexteMediane} c, dossier médian ${anatomie.longueurDossierMediane} c, ${anatomie.sansTitre} sans titre`);
console.log(`titres distincts ${anatomie.titresDistincts} · sources ${JSON.stringify(anatomie.sources)}`);
console.log(`\nvocabulaire retenu (titres ≥ 20 emplois) : ${vocabulaire.join(' · ')}`);
console.log(`\narticulations sur les ${riches.length} riches sans dossier :`);
console.log(JSON.stringify(cumul(surRiches), null, 1));
console.log(`\ntémoin — mêmes mesures sur ${temoinRiches.length} fiches QUI ONT un dossier (descFr > 900) :`);
console.log(JSON.stringify(cumul(temoinRiches), null, 1));
console.log(`\ncandidats à lire : ${candidats.length}`);
console.log(`\nrègle resserrée (≥ 2 libellés en forme de TITRE) : ${gisementProuve.length} fiche(s)`);
for (const g of gisementProuve) console.log(`   ${g.slug.padEnd(28)} ${String(g.longueur).padStart(5)} c · ${g.titres.join(' | ')} · infobox aplatie : ${g.infobox}`);
console.log(`\ncontre-mesure — fiches sans dossier dont le texte S'OUVRE sur une infobox aplatie : ${infoboxSurSansDossier}`);
console.log(`textes sans dossier finissant SANS ponctuation finale : ${finSansPonctuation} · finissant sur un mot subordonnant + point : ${finSurSubordonnant}`);
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
