// scripts/ops-titres-sections-fr.mjs — les titres de sections passent au FRANÇAIS (02/08/2026,
// table étendue et harmonisée le 07/08/2026).
//
// Le découpage vient du wiki anglais : l'agent traduit le CORPS de la section mais garde
// parfois le titre du wiki tel quel (« Plot », « Trivia », « Wano Country Saga »). Sur une
// encyclopédie française, ça se voit au premier coup d'œil — c'est le seul mot que le lecteur
// lit avant de déplier. Rien à demander à un modèle : une table suffit.
//
// DEUX TRAVAUX, pas un (mesuré le 07/08) :
//  1. TRADUIRE ce qui est resté anglais — 269 titres distincts à ≥ 2 occurrences, 3 320 lignes.
//  2. HARMONISER les variantes françaises concurrentes du même titre de wiki : « Nouvelle Ère »
//     91 / « Ère nouvelle » 20 / « Ère Nouvelle » 17 / « Nouvelle ère » 11 ; « Apparitions dans
//     les jeux vidéo » 247 contre six autres tournures. Deux libellés pour la même chose, ce
//     sont deux rubriques pour le lecteur.
//
// D'OÙ VIENNENT LES TRADUCTIONS — aucune invention : pour chaque titre anglais, la forme
// retenue est une forme française DÉJÀ PRÉSENTE DANS LE CORPUS (« Saga du Pays de Wano » 26,
// « Arc des Fourmis Chimères » 8, « Arc de la fausse ville de Karakura » 20), la plus fréquente
// à qualité de langue égale. Quand aucune forme française n'existe, on ne traduit PAS le nom
// propre : on se contente du mot de structure (« Echoing Jaws of Hell arc » → « Arc Echoing
// Jaws of Hell »). Les titres d'œuvres (Phantom Blood, Battle of Gods, Eyes of Heaven) restent
// tels quels — traduire un titre d'œuvre serait une faute, pas une correction.
//
// Usage : node --env-file=.env.local scripts/ops-titres-sections-fr.mjs [--universe="Naruto"] [--appliquer]
import fs from 'node:fs';
import path from 'node:path';
import { clientSite } from '../lib/ops/db.mjs';
import { trier } from '../lib/akasha/sections.ts';

const supabase = clientSite();
const APPLIQUER = process.argv.includes('--appliquer');
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];
const TRACE = path.resolve(import.meta.dirname, '../data/audits/sections-curation-trace.json');

// Clé = titre normalisé (minuscules, sans accents, ponctuation réduite) → titre affiché.
const FR = {
  // — rubriques génériques —
  'plot': 'Intrigue',
  'story': 'Histoire',
  'history': 'Histoire',
  'past': 'Passé',
  'background': 'Contexte',
  'character': 'Personnalité',
  'personality': 'Personnalité',
  'appearance': 'Apparence',
  'abilities': 'Capacités',
  'powers and abilities': 'Pouvoirs et capacités',
  'pouvoirs et capacites': 'Pouvoirs et capacités',
  'capacites et pouvoirs': 'Capacités et pouvoirs',
  'trivia': 'Anecdotes',
  'curiosites': 'Anecdotes',
  'quotes': 'Citations',
  'gallery': 'Galerie',
  'image gallery': 'Galerie',
  'overview': 'Vue d\'ensemble',
  'vue d ensemble': 'Vue d\'ensemble',
  'synopsis': 'Synopsis',
  'crew': 'Équipage',
  'equipage': 'Équipage',
  'family': 'Famille',
  'battles': 'Combats',
  'batailles': 'Combats',
  'voice actors': 'Doubleurs',
  'equipment': 'Équipement',
  'weapons': 'Armes',
  'forms': 'Formes',
  'techniques and special abilities': 'Techniques et capacités spéciales',
  'techniques et capacites speciales': 'Techniques et capacités spéciales',
  'usage and power': 'Utilisation et puissance',
  'six powers': 'Six Pouvoirs',
  'world government': 'Gouvernement Mondial',
  'gouvernement mondial et marines': 'Gouvernement Mondial et Marines',
  'world government et marines': 'Gouvernement Mondial et Marines',
  'creation and conception': 'Concept et création',
  'concept and creation': 'Concept et création',
  'concept et creation': 'Concept et création',
  'creation et concept': 'Concept et création',
  'design': 'Conception',
  'in other media': 'Dans d\'autres médias',
  'dans d autres medias': 'Dans d\'autres médias',
  'dans les autres medias': 'Dans d\'autres médias',
  'autres medias': 'Dans d\'autres médias',
  'apparitions dans autres medias': 'Apparitions dans d\'autres médias',
  'apparitions dans d autres medias': 'Apparitions dans d\'autres médias',
  'apparence dans d autres medias': 'Apparitions dans d\'autres médias',
  'video games': 'Jeux vidéo',
  'in video games': 'Jeux vidéo',
  'jeux video': 'Jeux vidéo',
  'apparitions en jeu video': 'Apparitions dans les jeux vidéo',
  'apparitions en jeux video': 'Apparitions dans les jeux vidéo',
  'apparitions jeu video': 'Apparitions dans les jeux vidéo',
  'apparitions jeux video': 'Apparitions dans les jeux vidéo',
  'apparitions dans les jeux video': 'Apparitions dans les jeux vidéo',
  'film appearances': 'Apparitions cinématographiques',
  'apparitions cinematographiques': 'Apparitions cinématographiques',
  'differences anime et manga': 'Différences entre l\'anime et le manga',
  'differences manga et anime': 'Différences entre l\'anime et le manga',
  'differences entre anime et manga': 'Différences entre l\'anime et le manga',
  'differences entre le manga et l anime': 'Différences entre l\'anime et le manga',
  'differences entre l anime et le manga': 'Différences entre l\'anime et le manga',
  'drama': 'Drame télévisé',
  'tv drama': 'Drame télévisé',
  'drame televisuel': 'Drame télévisé',
  'television drama': 'Drame télévisé',
  'film series': 'Films',
  'films': 'Films',
  'live-action film series': 'Films en prises de vues réelles',
  'relight anime films': 'Films d\'animation Relight',
  'musical': 'Comédie musicale',
  'novel': 'Roman',
  'information': 'Informations',
  'members': 'Membres',
  'notable members': 'Membres notables',
  'restrictions': 'Restrictions',
  'eye deal': 'Le marché des yeux',
  'credits': 'Crédits',
  'cast': 'Distribution',
  'lyrics': 'Paroles',
  'japanese lyrics': 'Paroles en japonais',

  // — Naruto : parties et ère —
  'part i': 'Partie I',
  'part ii': 'Partie II',
  'premiere partie': 'Partie I',
  'deuxieme partie': 'Partie II',
  'new era': 'Nouvelle Ère',
  'ere nouvelle': 'Nouvelle Ère',
  'nouvelle ere': 'Nouvelle Ère',
  'new era part i': 'Nouvelle Ère : Partie I',
  'nouvelle ere partie i': 'Nouvelle Ère : Partie I',
  'nouvelle ere premiere partie': 'Nouvelle Ère : Partie I',
  'new era part ii': 'Nouvelle Ère : Partie II',
  'nouvelle ere partie ii': 'Nouvelle Ère : Partie II',

  // — One Piece : sagas et arcs (forme française déjà présente au corpus) —
  'wano country saga': 'Saga du Pays de Wano',
  'wano country arc': 'Arc du Pays de Wano',
  'arc de wano': 'Arc du Pays de Wano',
  'saga de wano': 'Saga du Pays de Wano',
  'whole cake island saga': 'Saga de Whole Cake Island',
  'whole cake island arc': 'Arc de Whole Cake Island',
  'summit war saga': 'Saga de la Guerre au Sommet',
  'saga de la guerre du sommet': 'Saga de la Guerre au Sommet',
  'dressrosa saga': 'Saga de Dressrosa',
  'saga dressrosa': 'Saga de Dressrosa',
  'dressrosa arc': 'Arc de Dressrosa',
  'east blue saga': 'Saga de l\'East Blue',
  'saga east blue': 'Saga de l\'East Blue',
  'saga d east blue': 'Saga de l\'East Blue',
  'saga de la east blue': 'Saga de l\'East Blue',
  'saga de la mer de l est': 'Saga de l\'East Blue',
  'east blue arc': 'Arc de l\'East Blue',
  'arc east blue': 'Arc de l\'East Blue',
  'little east blue arc': 'Arc de Little East Blue',
  'sky island saga': 'Saga de l\'Île du Ciel',
  'saga sky island': 'Saga de l\'Île du Ciel',
  'saga de sky island': 'Saga de l\'Île du Ciel',
  'saga de l ile du ciel': 'Saga de l\'Île du Ciel',
  'arc de sky island': 'Arc de l\'Île du Ciel',
  'arabasta saga': 'Saga d\'Arabasta',
  'saga d arabasta': 'Saga d\'Arabasta',
  'arabasta arc': 'Arc d\'Arabasta',
  'water 7 saga': 'Saga de Water 7',
  'fish-man island saga': 'Saga de l\'Île des Hommes-Poissons',
  'saga de l ile des hommes-poissons': 'Saga de l\'Île des Hommes-Poissons',
  'saga de l ile des hommes poissons': 'Saga de l\'Île des Hommes-Poissons',
  'fish-man island arc': 'Arc de l\'Île des Hommes-Poissons',
  'arc ile des hommes-poissons': 'Arc de l\'Île des Hommes-Poissons',
  'arc de l ile des hommes-poissons': 'Arc de l\'Île des Hommes-Poissons',
  'thriller bark saga': 'Saga de Thriller Bark',
  'saga thriller bark': 'Saga de Thriller Bark',
  'saga du thriller bark': 'Saga de Thriller Bark',
  'thriller bark arc': 'Arc de Thriller Bark',
  'final saga': 'Saga Finale',
  'zou arc': 'Arc de Zou',
  'punk hazard arc': 'Arc de Punk Hazard',
  'arc punk hazard': 'Arc de Punk Hazard',
  'post-enies lobby arc': 'Arc post-Enies Lobby',
  'arc post-enies lobby': 'Arc post-Enies Lobby',
  'arc apres enies lobby': 'Arc post-Enies Lobby',
  'apres l arc de enies lobby': 'Arc post-Enies Lobby',

  // — Bleach —
  'arrancar arc': 'Arc Arrancar',
  'arc des arrancars': 'Arc Arrancar',
  'hueco mundo arc': 'Arc de Hueco Mundo',
  'arc hueco mundo': 'Arc de Hueco Mundo',
  'soul society arc': 'Arc de la Soul Society',
  'arc soul society': 'Arc de la Soul Society',
  'the thousand-year blood war arc': 'Arc de la Guerre des Mille Ans',
  'the thousand year blood war arc': 'Arc de la Guerre des Mille Ans',
  'thousand year blood war arc': 'Arc de la Guerre des Mille Ans',
  'thousand-year blood war arc': 'Arc de la Guerre des Mille Ans',
  'l arc thousand-year blood war': 'Arc de la Guerre des Mille Ans',
  'arc thousand-year blood war': 'Arc de la Guerre des Mille Ans',
  'la guerre des mille ans arc': 'Arc de la Guerre des Mille Ans',
  'la guerre mille ans arc': 'Arc de la Guerre des Mille Ans',
  'l arc de la guerre des mille ans': 'Arc de la Guerre des Mille Ans',
  'fake karakura town arc': 'Arc de la fausse ville de Karakura',
  'arc de la fausse karakura': 'Arc de la fausse ville de Karakura',
  'arc de la fausse karakura town': 'Arc de la fausse ville de Karakura',
  'arc de la ville de karakura factice': 'Arc de la fausse ville de Karakura',
  'agent of the shinigami arc': 'Arc de l\'Agent des Shinigami',
  'arc agent of the shinigami': 'Arc de l\'Agent des Shinigami',
  'arc agent des shinigami': 'Arc de l\'Agent des Shinigami',
  'the lost substitute shinigami arc': 'Arc du Shinigami de substitution perdu',
  'l arc du shinigami de substitution perdu': 'Arc du Shinigami de substitution perdu',
  'l arc du substitute shinigami perdu': 'Arc du Shinigami de substitution perdu',
  'l arc du shinigami substitut perdu': 'Arc du Shinigami de substitution perdu',
  'l arc du shinigami substitue perdu': 'Arc du Shinigami de substitution perdu',
  'arc du shinigami substitut perdu': 'Arc du Shinigami de substitution perdu',
  'l arc du shinigami de remplacement perdu': 'Arc du Shinigami de substitution perdu',
  'bount arc anime only': 'Arc des Bount (anime seulement)',
  'bount arc anime-only': 'Arc des Bount (anime seulement)',
  'arc bount anime uniquement': 'Arc des Bount (anime seulement)',
  'arc des bount anime only': 'Arc des Bount (anime seulement)',
  'arc des bount anime uniquement': 'Arc des Bount (anime seulement)',
  'beast swords arc anime only': 'Arc Beast Swords (anime seulement)',
  'zanpakuto unknown tales arc anime only': 'Arc Zanpakutō Unknown Tales (anime seulement)',
  'arc zanpakuto unknown tales anime uniquement': 'Arc Zanpakutō Unknown Tales (anime seulement)',
  'gotei 13 invading army arc anime only': 'Arc de l\'Armée Invasive du Gotei 13 (anime seulement)',
  'echoing jaws of hell arc': 'Arc Echoing Jaws of Hell',
  'l arc echoing jaws of hell': 'Arc Echoing Jaws of Hell',

  // — Hunter x Hunter —
  'chimera ant arc': 'Arc des Fourmis Chimères',
  'arc chimera ant': 'Arc des Fourmis Chimères',
  'arc des chimeres': 'Arc des Fourmis Chimères',
  'greed island arc': 'Arc de Greed Island',
  'arc greed island': 'Arc de Greed Island',
  'yorknew city arc': 'Arc de Yorknew City',
  'arc yorknew city': 'Arc de Yorknew City',
  'arc de yorknew': 'Arc de Yorknew City',
  'hunter exam arc': 'Arc de l\'examen de Hunter',
  'examen de hunter arc': 'Arc de l\'examen de Hunter',
  'arc de l examen de hunter': 'Arc de l\'examen de Hunter',
  'succession contest arc': 'Arc du Tournoi de Succession',
  'arc du concours de succession': 'Arc du Tournoi de Succession',
  'heavens arena arc': 'Arc de l\'Arène Céleste',
  'arc du heavens arena': 'Arc de l\'Arène Céleste',
  'arc de l arene celeste': 'Arc de l\'Arène Céleste',
  '13th hunter chairman election arc': 'Arc de la 13e élection du président des Chasseurs',
  '13e election du president des chasseurs arc': 'Arc de la 13e élection du président des Chasseurs',
  '13e election du president des chasseurs': 'Arc de la 13e élection du président des Chasseurs',

  // — esperluettes et anglicismes résiduels (« Abilités » n'est pas un mot français) —
  'pouvoirs & capacites': 'Pouvoirs et capacités',
  'abilities & powers': 'Pouvoirs et capacités',
  'pouvoirs & abilites': 'Pouvoirs et capacités',
  'pouvoirs & competences': 'Pouvoirs et compétences',
  'pouvoirs et competences': 'Pouvoirs et compétences',
  'capacites & pouvoirs': 'Capacités et pouvoirs',
  'techniques situationnelles': 'Techniques situationnelles',
  'techniques similaires': 'Techniques similaires',
  'techniques non-canon': 'Techniques non canon',
  'saga finale': 'Saga Finale',
  'risque & recompense': 'Risque et récompense',

  // — arcs Naruto : harmonisation de casse et de tournure —
  'versus momoshiki arc': 'Arc contre Momoshiki',
  'arc versus momoshiki': 'Arc contre Momoshiki',
  'arc de kawaki': 'Arc Kawaki',
  'arc d activation de kara': 'Arc Activation de Kara',
  'arc de l activation de kara': 'Arc Activation de Kara',
  'arc de la grande bataille maritime de kirigakure': 'Arc de la Grande Bataille maritime de Kirigakure',
  'arc de la grande bataille de kirigakure': 'Arc de la Grande Bataille maritime de Kirigakure',
  'arc de l academie kawaki & himawari': 'Arc de l\'Académie Kawaki et Himawari',
  'arc academie kawaki & himawari': 'Arc de l\'Académie Kawaki et Himawari',
  'mujina bandits arc': 'Arc des Bandits Mujina',
  'kara actuation arc': 'Arc Activation de Kara',
  'ao arc': 'Arc d\'Ao',
  'in naruto s footsteps the friends paths': 'Sur les traces de Naruto : Les Chemins des Amis',
  'sur les traces de naruto les chemins des amis': 'Sur les traces de Naruto : Les Chemins des Amis',

  // — Bleach : dernières variantes —
  'arc fake karakura town': 'Arc de la fausse ville de Karakura',
  'arc de la ville de karakura fictive': 'Arc de la fausse ville de Karakura',
  'gotei 13 invasion army arc anime only': 'Arc de l\'Armée Invasive du Gotei 13 (anime seulement)',
  'arc de l armee invasive du gotei 13 anime seulement': 'Arc de l\'Armée Invasive du Gotei 13 (anime seulement)',
};

// Mots de structure : ce sont EUX qu'on francise quand la table n'a pas d'entrée, jamais le nom
// propre qui les accompagne. « Zou Arc » → « Arc de Zou » ; « Foo Bar Saga » → « Saga Foo Bar ».
const STRUCTURE = [
  [/^(?:the\s+)?(.+?)\s+arc\s*\(anime[\s-]only\)$/i, (x) => `Arc ${x} (anime seulement)`],
  [/^(?:the\s+)?(.+?)\s+arc$/i, (x) => `Arc ${x}`],
  [/^(?:the\s+)?(.+?)\s+saga$/i, (x) => `Saga ${x}`],
];

const clef = (t) => String(t ?? '')
  .replace(/<[^>]+>/g, '')                 // <sup>th</sup>, <i>…</i> : du balisage, pas du titre
  .replace(/[*_`]/g, '')                   // astérisques markdown
  .normalize('NFD').replace(/\p{Mn}/gu, '')
  .toLowerCase()
  .replace(/['’]/g, ' ')
  .replace(/[()«»",:;!?.]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Le titre porte-t-il du balisage qui n'a rien à faire dans un libellé rendu en HTML ? */
const balisage = (t) => /<[^>]+>|[*_`]/.test(String(t ?? ''));
const sansBalisage = (t) => String(t ?? '')
  .replace(/<sup>\s*(th|st|nd|rd|e|er|ème)\s*<\/sup>/gi, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, '$1')
  .replace(/\s{2,}/g, ' ')
  .trim();

/** Titre français d'une section, ou null si rien à changer. */
const versFr = (titre, dejaPris) => {
  const brut = String(titre ?? '');
  let fr = FR[clef(brut)];
  if (!fr) {
    for (const [re, f] of STRUCTURE) {
      const m = re.exec(sansBalisage(brut));
      if (m) { const c = FR[clef(m[1])]; fr = f(c ?? m[1]); break; }
    }
  }
  // Les titres de chansons gardent leur nom propre : seul le mot « lyrics » se traduit.
  if (!fr && /\slyrics$/i.test(brut)) fr = `Paroles — ${brut.replace(/\s*lyrics$/i, '')}`;
  // Aucun changement de langue, mais du balisage à retirer : c'est déjà un motif suffisant.
  if (!fr && balisage(brut)) fr = sansBalisage(brut);
  if (!fr || fr === brut) return null;
  // Deux sections d'une même fiche ne peuvent pas porter le même titre : « Film series » et
  // « Films » deviendraient jumelles et le lecteur ne saurait plus laquelle il déplie.
  return dejaPris.has(fr) ? null : fr;
};

// UNE SECTION = UNE LIGNE de akasha_sections (05/08) : attributes.sections est purgé.
const entrees = [];
for (let d = 0; ; d += 1000) {
  let q = supabase.from('akasha_entries').select('id, slug').order('slug').range(d, d + 999);
  if (UNIVERSE) q = q.eq('universe', UNIVERSE);
  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }
  entrees.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

const parFiche = new Map(); // entry_id → lignes { id, idx, titre }
for (let d = 0; d < entrees.length; d += 100) {
  const ids = entrees.slice(d, d + 100).map((e) => e.id);
  for (let p = 0; ; p += 1000) {
    const { data, error } = await supabase.from('akasha_sections')
      .select('id, entry_id, idx, titre').in('entry_id', ids).order('id').range(p, p + 999);
    if (error) { console.error(error.message); process.exit(1); }
    for (const l of data ?? []) {
      if (!parFiche.has(l.entry_id)) parFiche.set(l.entry_id, []);
      parFiche.get(l.entry_id).push(l);
    }
    if ((data?.length ?? 0) < 1000) break;
  }
}

let fiches = 0, lues = 0;
const changements = [], inconnus = new Map(), collisions = [];
for (const e of entrees) {
  // trier ne lit que `.i` : les lignes gardent leur `id` pour l'UPDATE ciblé.
  const lignes = trier((parFiche.get(e.id) ?? []).map((l) => ({ ...l, i: l.idx })));
  if (!lignes.length) continue;
  lues += lignes.length;
  let touche = false;
  const dejaPris = new Set(lignes.map((l) => l.titre));
  for (const l of lignes) {
    const fr = versFr(l.titre, dejaPris);
    if (fr) {
      touche = true; dejaPris.add(fr);
      changements.push({ slug: e.slug, sectionId: l.id, idx: String(l.idx), avant: l.titre, apres: fr });
      continue;
    }
    const cle = clef(l.titre);
    if (FR[cle] && FR[cle] !== l.titre) collisions.push({ slug: e.slug, idx: String(l.idx), titre: l.titre, voulu: FR[cle] });
    // Titre encore anglais mais absent de la table : on le signale plutôt que de le deviner.
    // Un titre qui porte un accent ou un mot-outil français est DÉJÀ français, même s'il contient
    // « Arc » ou « Saga » — sans cette garde, « Saga du Pays de Wano » se signalait lui-même.
    const brutTitre = String(l.titre ?? '');
    const dejaFrancais = /[àâäéèêëîïôöùûüÿçœÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇŒ]/.test(brutTitre)
      || /\b(de|du|des|le|la|les|au|aux|dans|et|sur|contre|entre|avec|pour|par|un|une)\b/i.test(brutTitre)
      || /\bd['’]/i.test(brutTitre) || /\bl['’]/i.test(brutTitre);
    if (!dejaFrancais && /^[\x00-\x7F]+$/.test(brutTitre)
      && /\b(the|of|and|in|for|arc|saga|series|film|note|deal|lyrics|drama|gallery|plot|trivia|crew|family|battles|quotes|appearances?|abilities|powers|history|background|techniques|overview|story|past)\b/i.test(brutTitre))
      inconnus.set(l.titre, (inconnus.get(l.titre) ?? 0) + 1);
  }
  if (touche) fiches++;
}

console.log(`sections lues            : ${lues}${UNIVERSE ? ` [${UNIVERSE}]` : ''}`);
console.log(`titres réécrits          : ${changements.length} sur ${fiches} fiche(s)`);
console.log(`sautés (titre déjà pris) : ${collisions.length}`);
console.log(`COMPTE CROISÉ            : ${changements.length} réécrits + ${lues - changements.length} inchangés = ${lues} ${changements.length + (lues - changements.length) === lues ? 'OK' : 'ÉCART'}`);

// Cinq réécritures à l'œil, prises au hasard du lot : une traduction fausse est pire qu'un titre
// anglais, donc on regarde avant d'appliquer.
console.log('\nÉCHANTILLON (à contrôler à l’œil) :');
const pas = Math.max(1, Math.floor(changements.length / 12));
for (let i = 0; i < changements.length && i / pas < 12; i += pas) {
  const c = changements[i];
  console.log(`  ${c.slug.padEnd(26)} §${c.idx.padEnd(3)} « ${c.avant} »  →  « ${c.apres} »`);
}

// ——— TRACE AVANT ÉCRITURE (ajoutée au fichier du chantier, sans écraser la passe 1) ———
const trace = fs.existsSync(TRACE) ? JSON.parse(fs.readFileSync(TRACE, 'utf8')) : {};
trace.passe2Titres = {
  date: new Date().toISOString(), applique: APPLIQUER, univers: UNIVERSE ?? 'tous',
  sectionsLues: lues, changements, sautesTitreDejaPris: collisions,
  restesAnglais: [...inconnus].sort((a, b) => b[1] - a[1]).map(([titre, n]) => ({ titre, n })),
};
fs.writeFileSync(TRACE, JSON.stringify(trace, null, 1));
console.log(`\ntrace écrite : ${TRACE}`);

if (!APPLIQUER) {
  console.log('\n(à blanc — aucun titre modifié.)');
  if (inconnus.size) {
    console.log('\nTitres encore anglais, hors table (à ajouter à FR si récurrents) :');
    for (const [t, n] of [...inconnus].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${String(n).padStart(3)}  ${t}`);
  }
  process.exit(0);
}

let ecrits = 0, echecs = 0;
for (const c of changements) {
  const { error } = await supabase.from('akasha_sections').update({ titre: c.apres }).eq('id', c.sectionId);
  if (error) { echecs++; console.error(`  ✗ ${c.slug} §${c.idx} : ${error.message}`); } else ecrits++;
}
console.log(`\ntitres écrits : ${ecrits} · échecs : ${echecs}`);

// Compte croisé APRÈS, relu en base : combien de lignes portent bien le nouveau libellé ?
let verifies = 0;
for (let d = 0; d < changements.length; d += 200) {
  const lot = changements.slice(d, d + 200);
  const { data } = await supabase.from('akasha_sections').select('id, titre').in('id', lot.map((c) => c.sectionId));
  const parLigne = new Map((data ?? []).map((l) => [l.id, l.titre]));
  for (const c of lot) if (parLigne.get(c.sectionId) === c.apres) verifies++;
}
console.log(`COMPTE CROISÉ (après) : ${verifies}/${changements.length} lignes relues portent le libellé attendu ${verifies === changements.length ? 'OK' : 'ÉCART'}`);
