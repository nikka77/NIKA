// scripts/ops-tester-gardes.mjs — BATTERIE DES GARDES, DANS LES DEUX SENS (07/08/2026).
//
// Pourquoi ce fichier : l'audit du 07/08 a lu 67 refus un par un et démontré que 19 % sont des
// FAUX POSITIFS, concentrés dans quatre familles. Corriger une garde sans batterie, c'est
// échanger un défaut contre un autre — une garde trop lâche coûte plus cher qu'une garde trop
// stricte (des milliers de fiches fausses évitées jusqu'ici). Chaque correction est donc jugée
// DEUX FOIS : le faux positif doit disparaître, ET le vrai refus doit tenir.
//
// La garde du worker n'est pas recopiée ici : elle est EXTRAITE du source d'agent-worker.mjs et
// évaluée telle quelle. Sans ça, le test finirait par juger une copie périmée de lui-même.
//
// Usage : node scripts/ops-tester-gardes.mjs [--ecrire]
//   --ecrire : dépose le bilan dans data/audits/gardes-tests-0708.json

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  fetchFandomProse, citeLeNom, titrePlusRiche, titreStrictementEgal,
  pagePlusGenerale, pageDOeuvre, sameEntityName, ALIAS_REGISTRE,
} from './lib/fandom.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');

/** La garde fandom_descfr TELLE QU'ELLE EST ÉCRITE dans agent-worker.mjs.
 *  On découpe à l'accolade équilibrée depuis « guard: (p) => { » — pas de copier-coller. */
function gardeDuWorker() {
  const src = readFileSync(join(RACINE, 'scripts', 'agent-worker.mjs'), 'utf8');
  const debut = src.indexOf('guard: (p) => {', src.indexOf('fandom_descfr:'));
  if (debut < 0) throw new Error('garde fandom_descfr introuvable dans agent-worker.mjs');
  let i = src.indexOf('{', debut + 'guard: (p) =>'.length), n = 0, fin = -1;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') n++;
    else if (src[k] === '}') { n--; if (!n) { fin = k + 1; break; } }
  }
  const corps = src.slice(i, fin);
  // eslint-disable-next-line no-new-func
  return new Function('citeLeNom', 'titrePlusRiche', 'titreStrictementEgal',
    `return (p) => ${corps};`)(citeLeNom, titrePlusRiche, titreStrictementEgal);
}
const guard = gardeDuWorker();

/** Rejoue la chaîne réelle : résolution de page → charge utile du worker → garde.
 *  `summary` EST OBLIGATOIRE ici : c'est la matière même de la garde anti-homonyme. Sans lui,
 *  `propres` est vide, la garde ne se déclenche jamais et la batterie passe au vert pour la
 *  pire des raisons — elle croit tester une garde qu'elle a en fait désarmée (constaté sur
 *  cette batterie même, le 07/08, en la confrontant aux 177 couples nommés de l'audit). */
async function passeLaGarde({ universe, name, type, slug, summary }) {
  const page = await fetchFandomProse(universe, name, { slug });
  const p = page
    ? { name, universe, type, slug, summary, fandom: page.text, fandomTitle: page.title,
        sameEntity: page.sameEntity, aliasCure: page.aliasCure, pageOeuvre: page.pageOeuvre,
        identiteAttestee: page.identiteAttestee }
    : { name, universe, type, slug, summary };
  return { refus: guard(p), titre: page?.title ?? null, taille: (page?.text ?? '').length,
    resolvedBy: page?.resolvedBy ?? null };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// SENS 1 — FAUX POSITIFS de l'audit du 07/08 : ils doivent désormais PASSER.
// Les résumés sont les VRAIS résumés de la base (relevés le 07/08), pas des inventions :
// c'est leur généricité qui déclenchait la garde anti-homonyme.
// ════════════════════════════════════════════════════════════════════════════════════════
const FAUX_POSITIFS = [
  { defaut: 1, universe: 'Dragon Ball', name: 'Mutaito', type: 'character', slug: 'mutaito',
    summary: 'Personnage secondaire de Dragon Ball.',
    avant: 'homonyme probable — titre honorifique « Master Mutaito »' },
  { defaut: 1, universe: 'Hunter x Hunter', name: 'Hiru', type: 'character', slug: 'hiru',
    summary: "Sangsue était un membre des Bêtes de l'Ombre, la garde d'élite des Dix Parrains.",
    avant: 'homonyme probable — alias curé « Leech » ignoré par la garde' },
  { defaut: 1, universe: 'One Piece', name: 'Dip', type: 'character', slug: 'dip',
    summary: "Personnage mineur d'One Piece, mentionné sans rôle narratif approfondi.",
    avant: 'homonyme probable — page commune « Chip and Dip »' },
  { defaut: 1, universe: 'One Piece', name: 'Minoru Kazeno', type: 'character', slug: 'minoru-kazeno',
    summary: 'Personnage japonais secondaire de One Piece au patronyme évoquant le vent (kaze), sans implication notable établie dans l\'histoire.',
    avant: 'homonyme probable — ordre japonais « Kazeno Minoru »' },
  { defaut: 1, universe: 'Bleach', name: 'Goethe', type: 'character', slug: 'goethe',
    summary: "Nom d'emprunt à consonance germanique, cohérent avec l'univers Quincy du Wandenreich, mais dont le rôle précis reste incertain.",
    avant: 'homonyme probable : aucun repère du résumé (Quincy, Wandenreich) dans « Yoshino Sōma/Goethe »' },

  { defaut: 2, universe: 'Naruto', name: 'Kanchi', type: 'character', slug: 'kanchi',
    summary: "Personnage à l'apparition ponctuelle dans un contenu dérivé de Naruto, dont le rôle précis n'est pas détaillé.",
    avant: 'page Fandom absente ou trop maigre (398 c pour un seuil de 400)' },
  { defaut: 2, universe: 'Naruto', name: 'Ugai', type: 'character', slug: 'ugai',
    summary: 'Personnage secondaire mineur dont le patronyme peut évoquer ukai, la pêche traditionnelle au cormoran.',
    avant: 'page Fandom absente ou trop maigre (254 c pour un seuil de 400)' },
  { defaut: 2, universe: 'Naruto', name: 'Piercing Showers', type: 'power', slug: 'piercing-showers',
    summary: "Technique lançant une multitude de projectiles pointus qui s'abattent en pluie sur la cible.",
    avant: 'page Fandom absente ou trop maigre (191 c pour un seuil de 250)' },
  { defaut: 2, universe: 'Naruto', name: 'Puppet Buzzsaw', type: 'artifact', slug: 'puppet-buzzsaw',
    summary: "Arme / outil de l'univers Naruto — porté par Sasori.",
    avant: 'page Fandom absente ou trop maigre (183 c pour un seuil de 250)' },

  { defaut: 3, universe: 'Dragon Ball', name: 'Son Gohan', type: 'character', slug: 'son-gohan',
    summary: "Fils aîné de Goku, au potentiel colossal qui n'explose que lorsque les siens sont menacés.",
    avant: 'page plus générale : « Gohan » ne couvre pas « Son Gohan »' },
  { defaut: 3, universe: 'One Piece', name: 'Carol Masterson', type: 'character', slug: 'carol-masterson',
    summary: 'Personnage au nom occidental croisé ponctuellement dans One Piece, dont le rôle exact demeure anecdotique.',
    avant: 'page plus générale : « Carol » ne couvre pas « Carol Masterson »' },

  // Défaut 4 : les 12 paires ATTESTÉES entrées au registre d'alias le 07/08.
  { defaut: 4, universe: 'One Piece', name: 'Ponéglyphes', type: 'artifact', slug: 'ponegliphes', summary: 'Stèles indestructibles portant l\'histoire du Siècle Oublié.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'One Piece', name: 'Île Amour', type: 'place', slug: 'loving', summary: 'Île de Totto Land.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'One Piece', name: 'Île Paquet', type: 'place', slug: 'package', summary: 'Île de Totto Land.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'One Piece', name: 'Île Tricolore', type: 'place', slug: 'sanshoku', summary: 'Île de Totto Land.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'One Piece', name: 'Île Levure', type: 'place', slug: 'kibo', summary: 'Île de Totto Land.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'One Piece', name: 'Île Graine', type: 'place', slug: 'tanega', summary: 'Île de Totto Land.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'One Piece', name: 'Île Moelleuse', type: 'place', slug: 'funwari', summary: 'Île de Totto Land.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'One Piece', name: 'Île Fromage', type: 'place', slug: 'cheese', summary: 'Île de Totto Land.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'One Piece', name: 'Île Confiture', type: 'place', slug: 'jam', summary: 'Île de Totto Land.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'Naruto', name: 'Capitaine du navire fantôme', type: 'character', slug: 'captain-of-the-ghost-ship', summary: 'Capitaine d\'un navire fantôme.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'Naruto', name: 'Premier Chemin Animal (personnage)', type: 'character', slug: 'first-animal-path-character', summary: 'Shinobi du clan Fūma.', avant: 'source vide (0 caractère)' },
  { defaut: 4, universe: 'Naruto', name: 'Cimetière des Monts', type: 'place', slug: 'mountains-graveyard', summary: 'Région montagneuse entre Takigakure et Otogakure.', avant: 'source vide (0 caractère)' },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// SENS 2 — VRAIS REFUS : ils doivent TENIR. C'est la moitié qui compte le plus.
// ════════════════════════════════════════════════════════════════════════════════════════
const VRAIS_REFUS = [
  // Page PARENTE d'une variante : les 5 cas retirés à la main les 04 et 05/08.
  { classe: 'page plus générale', universe: 'Naruto', name: 'Eternal Mangekyō Sharingan', type: 'power', slug: 'eternal-mangekyo-sharingan',
    summary: "Forme définitive du Mangekyō, obtenue par greffe des yeux d'un proche.",
    pourquoi: "redirection SANS fragment, mais la page « Mangekyō Sharingan » a une SECTION du même nom : notre sujet n'est qu'un morceau" },
  { classe: 'page plus générale', universe: 'Naruto', name: 'Pseudo-Jinchūriki', type: 'profession', slug: 'pseudo-jinchuriki',
    summary: "Porteur d'une fraction de chakra de démon à queues sans en être l'hôte véritable.",
    pourquoi: 'redirection AVEC fragment (#Similar Cases) : le wiki dit lui-même que c\'est un morceau de page' },
  { classe: 'page plus générale', universe: 'Naruto', name: "Summoning Technique (Hōzuki Castle's Ninken)", type: 'power', slug: 'summoning-technique-hozuki-castle-s-ninken',
    summary: "Invocation des chiens ninja de la prison du Château Hōzuki.",
    pourquoi: 'aucune redirection : page atteinte par la RECHERCHE, qui n\'atteste rien' },
  { classe: 'page plus générale', universe: 'Naruto', name: "Katasuke Tōno's Assistant", type: 'profession', slug: 'katasuke-tono-s-assistant',
    summary: "Assistant du chercheur Katasuke Tōno à l'équipe scientifique de Konoha.",
    pourquoi: 'aucune redirection : la page décrit le maître, pas l\'assistant' },
  { classe: 'page plus générale', universe: 'Naruto', name: 'Chūnin Exams Assistant', type: 'profession', slug: 'chunin-exams-assistant',
    summary: "Auxiliaire chargé d'encadrer le déroulement de l'examen chūnin.",
    pourquoi: 'aucune redirection : la page décrit l\'examen, pas son auxiliaire' },
  // Entité ÉTRANGÈRE : le nom français ne trouve rien, la recherche ramène un article voisin.
  { classe: 'mauvaise entité', universe: 'Naruto', name: 'Mercenaire', type: 'profession', slug: 'mercenaire',
    summary: "Combattant sans village d'attache qui vend ses talents au plus offrant.",
    pourquoi: 'nom français non attesté sur le wiki anglais — reste au plafond, pas d\'alias inventé' },
  { classe: 'mauvaise entité', universe: 'One Piece', name: 'Hollandais Volant', type: 'artifact', slug: 'hollandais-volant',
    summary: 'Navire fantôme de la légende, repris dans One Piece.',
    pourquoi: 'traduction française sans attestation du wiki — plafond documenté' },
  { classe: 'mauvaise entité', universe: 'Naruto', name: 'Grelot', type: 'artifact', slug: 'grelot',
    summary: "Arme / outil de l'univers Naruto — porté par Shion, Kin Tsuchi, Miroku.",
    pourquoi: 'traduction française sans attestation du wiki — plafond documenté' },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// SENS 3 — LA PAGE SERVIE DOIT ÊTRE LA BONNE (07/08 au soir).
//
// Les deux contre-vérificateurs ont convergé sur le même défaut : une garde peut dire « oui »
// sur une page qui décrit quelqu'un d'AUTRE. Passer la garde ne suffit donc pas — on vérifie
// ici le TITRE retenu, seul contrôle qui distingue « produit une fiche » de « produit la bonne
// fiche ». Les quatre cas viennent tous de la même cause : nos noms écrivent la voyelle longue
// « ou/uu » là où le wiki écrit « ō/ū » ou une simple voyelle, le titre exact échouait, et la
// recherche plein texte ramenait un homonyme phonétique.
// ════════════════════════════════════════════════════════════════════════════════════════
const BONNES_PAGES = [
  { universe: 'Bleach', name: 'Gunjou', slug: 'gunjou', attendu: 'Gunjō',
    avant: 'Kūgo Ginjō — le Fullbringer chef de Xcution, un AUTRE personnage (12 sections déjà rédigées dessus)',
    pourquoi: 'notre Gunjou est un Togabito de l\'Enfer aux tentacules ; « Gunjō » existe sur le même wiki' },
  { universe: 'Dragon Ball', name: 'Shuu', slug: 'shuu', attendu: 'Shu',
    avant: 'Mr. Shu — le précepteur de Gohan, un AUTRE personnage',
    pourquoi: 'notre Shuu est l\'homme de main ninja de Pilaf : la page « Shu » (27 604 c) existe' },
  { universe: 'One Piece', name: 'Bongou', slug: 'bongou', attendu: 'Bongo',
    avant: 'Bungo — deux entités distinctes de Wano réduites à une seule page',
    pourquoi: '« Bongo » (凡ゴウ) et « Bungo » (ブン業) sont deux personnages, et deux pages' },
  { universe: 'One Piece', name: 'Bungou', slug: 'bungou', attendu: 'Bungo',
    avant: 'Bungo — bonne page, mais atteinte par hasard : « Bongou » y tombait aussi',
    pourquoi: 'la résolution doit être déterministe, pas une collision de recherche' },
];

// Contrôles UNITAIRES des primitives : ce que les gardes doivent continuer de dire « non ».
const UNITAIRES = [
  { nom: 'désambiguïsation pure — « Ain » ≠ « Ain (Neo Marines) »',
    attendu: false, obtenu: () => titrePlusRiche('Ain', 'Ain (Neo Marines)') },
  { nom: 'désambiguïsation pure — « Zangetsu » ≠ « Zangetsu (Quincy Powers) »',
    attendu: false, obtenu: () => titrePlusRiche('Zangetsu', 'Zangetsu (Quincy Powers)') },
  { nom: 'entité voisine — « Giorno\'s Mother » ≠ « Giorno Giovanna »',
    attendu: false, obtenu: () => titrePlusRiche("Giorno's Mother", 'Giorno Giovanna') },
  { nom: 'entité voisine — sameEntityName(« Giorno\'s Mother », « Giorno Giovanna »)',
    attendu: false, obtenu: () => sameEntityName("Giorno's Mother", 'Giorno Giovanna') },
  { nom: 'voisin numéroté — « Super 17 » ≠ « Android 17 »',
    attendu: false, obtenu: () => titrePlusRiche('Super 17', 'Android 17') },
  { nom: 'titre plus riche — « Mutaito » ⊂ « Master Mutaito »',
    attendu: true, obtenu: () => titrePlusRiche('Mutaito', 'Master Mutaito') },
  { nom: 'glose entre parenthèses — « Hiru » ⊂ « Leech (Hiru) »',
    attendu: true, obtenu: () => titrePlusRiche('Hiru', 'Leech (Hiru)') },
  { nom: 'page d\'œuvre — « Île de Drum » → « Drum Island Arc »',
    attendu: true, obtenu: () => Boolean(pageDOeuvre('Drum Island Arc', '')) },
  { nom: 'page d\'œuvre — « Man X » → « SO Chapter 103 »',
    attendu: true, obtenu: () => Boolean(pageDOeuvre('SO Chapter 103', '')) },
  { nom: 'page-liste — « List of Devil Fruits »',
    attendu: true, obtenu: () => Boolean(pageDOeuvre('List of Devil Fruits', '')) },
  { nom: 'plus générale SANS attestation — « Eternal Mangekyō Sharingan » → « Mangekyō Sharingan »',
    attendu: true, obtenu: () => Boolean(pagePlusGenerale('Eternal Mangekyō Sharingan', 'Mangekyō Sharingan')) },
  { nom: 'plus générale — section du même nom sur la page : refus TENU',
    attendu: true,
    obtenu: () => Boolean(pagePlusGenerale('Eternal Mangekyō Sharingan', 'Mangekyō Sharingan', {
      redirections: [{ from: 'Eternal Mangekyō Sharingan', to: 'Mangekyō Sharingan' }],
      sections: ['Overview', 'Variations', 'Mangekyō Sharingan', 'Eternal Mangekyō Sharingan', 'Trivia'] })) },
  { nom: 'plus générale — redirection AVEC fragment : refus TENU',
    attendu: true,
    obtenu: () => Boolean(pagePlusGenerale('Pseudo-Jinchūriki', 'Jinchūriki', {
      redirections: [{ from: 'Pseudo-Jinchūriki', to: 'Jinchūriki', tofragment: 'Similar Cases' }],
      sections: ['History', 'Similar Cases', 'Trivia'] })) },
  { nom: 'plus générale — redirection d\'un AUTRE titre que le nôtre : refus TENU',
    attendu: true,
    obtenu: () => Boolean(pagePlusGenerale('Chūnin Exams Assistant', 'Chūnin Exams', {
      redirections: [{ from: 'Chunin Exam', to: 'Chūnin Exams' }], sections: ['Overview'] })) },
  { nom: 'forme courte attestée — « Son Gohan » → « Gohan » : refus LEVÉ',
    attendu: false,
    obtenu: () => Boolean(pagePlusGenerale('Son Gohan', 'Gohan', {
      redirections: [{ from: 'Son Gohan', to: 'Gohan' }],
      sections: ['Appearance', 'Personality', 'References', 'Site Navigation'] })) },
  // Les trois manques révélés en confrontant la batterie aux 177 couples nommés de l'audit.
  { nom: 'nom de l\'œuvre non discriminant — « Personnage mineur d\'One Piece » ne fonde aucun doute',
    attendu: null,
    obtenu: () => guard({ name: 'Dip', type: 'character', universe: 'One Piece', fandomTitle: 'Chip and Dip',
      summary: "Personnage mineur d'One Piece, mentionné sans rôle narratif approfondi.",
      fandom: 'x'.repeat(900), sameEntity: true }) },
  // ⚠ CE CAS A ÉTÉ REBÂTI LE 07/08 AU SOIR. Il portait « Captain John » → « John », et
  // affirmait donc un refus SUR UN COUPLE RÉEL — en construisant à la main une charge utile
  // sans `identiteAttestee`, champ que le worker ne transmettait pas encore. Vérification faite
  // à la source : le wiki One Piece REDIRIGE « Captain John » vers « John », sans fragment, et
  // aucune section ne porte notre nom. L'identité est donc attestée par la source elle-même et
  // ce refus était un faux positif — la batterie le figeait en cas-témoin. Le contrôle garde son
  // objet (un repère réel manquant doit maintenir le doute) mais sur un couple SANS attestation,
  // et le vrai couple est passé côté SENS 1. Leçon : un cas-témoin de refus doit être vérifié à
  // la source comme un faux positif, sinon la batterie protège l'erreur au lieu de la garde.
  { nom: 'repère RÉEL absent de la page, sans attestation : doute maintenu (« Jaya »)',
    attendu: 'homonyme probable : aucun repère du résumé (Jaya) dans « Masira »',
    obtenu: () => guard({ name: 'Chasseur d\'épaves', type: 'character', universe: 'One Piece', fandomTitle: 'Masira',
      summary: "Ancien pirate dont le trésor est recherché à Jaya.",
      fandom: 'x'.repeat(900), sameEntity: true }) },
  // ── TROU TROUVÉ PAR L'ANTI-LAXISME, 07/08 au soir : le cousin phonétique dans un titre PLUS
  //    LONG. Ces quatre-là doivent rester à « false » : c'est la garde anti-homonyme qui doit
  //    reprendre la parole, pas titrePlusRiche qui doit la lui couper.
  { nom: 'cousin phonétique, titre plus long — « Gunjou » ≠ « Kūgo Ginjō »',
    attendu: false, obtenu: () => titrePlusRiche('Gunjou', 'Kūgo Ginjō') },
  { nom: 'cousin phonétique, titre plus long — « Councillor » ≠ « Konoha Council »',
    attendu: false, obtenu: () => titrePlusRiche('Councillor', 'Konoha Council') },
  { nom: 'résumé sans repère ET titre étranger : refus (« Mother » → « Chi-Chi\'s mother »)',
    attendu: "identité invérifiable : résumé sans repère, et « Chi-Chi's mother » n'est ni notre nom ni une de ses écritures",
    obtenu: () => guard({ name: 'Mother', type: 'character', universe: 'Dragon Ball', fandomTitle: "Chi-Chi's mother",
      summary: 'Personnage secondaire de Dragon Ball.', fandom: 'x'.repeat(900), sameEntity: true }) },
  { nom: 'résumé sans repère MAIS la page nous nomme : le doute tombe (« Abellon » → « Aveyron »)',
    attendu: null,
    obtenu: () => guard({ name: 'Abellon', type: 'character', universe: 'One Piece', fandomTitle: 'Aveyron',
      summary: "Abellon est un personnage d'arrière-plan de One Piece, sans rôle marquant dans l'intrigue principale.",
      fandom: 'Romanized Name : Aberon\nOfficial English Name : Avelon\n' + 'x'.repeat(900), sameEntity: false }) },
  // Second trou, trouvé en auditant les 145 couples débloqués : le possessif du TITRE.
  { nom: 'possessif du titre = tri entre porteurs — « Mother » ≠ « Chi-Chi\'s mother »',
    attendu: false, obtenu: () => titrePlusRiche('Mother', "Chi-Chi's mother") },
  { nom: 'possessif dans NOTRE nom : titrePlusRiche n\'a pas à trancher — « Katasuke Tōno\'s Assistant »',
    attendu: false, obtenu: () => titrePlusRiche("Katasuke Tōno's Assistant", 'Katasuke Tōno') },
  { nom: 'variante d\'écriture, MÊME nombre de mots — « Musse » ≡ « Mousse »',
    attendu: true, obtenu: () => titrePlusRiche('Musse', 'Mousse') },
  { nom: 'variante d\'écriture, MÊME nombre de mots — « Minoru Kazeno » ≡ « Kazeno Minoru »',
    attendu: true, obtenu: () => titrePlusRiche('Minoru Kazeno', 'Kazeno Minoru') },
  { nom: 'identité attestée par redirection : le doute anti-homonyme tombe aussi',
    attendu: null,
    obtenu: () => guard({ name: 'Carol Masterson', type: 'character', universe: 'One Piece', fandomTitle: 'Carol',
      summary: 'Personnage au nom occidental croisé ponctuellement dans One Piece.',
      fandom: 'x'.repeat(900), sameEntity: true, identiteAttestee: true }) },
  { nom: 'alias CURÉ : pagePlusGenerale ne le re-juge pas (« Son Goku » → « Goku »)',
    attendu: 'Goku',
    obtenu: () => ALIAS_REGISTRE['Dragon Ball']?.['Son Goku'] ?? null },
  { nom: 'seuil — identité NON acquise : le seuil de type reste en vigueur',
    attendu: 'page Fandom absente ou trop maigre',
    obtenu: () => guard({ name: 'Zoro', type: 'character', fandomTitle: 'Roronoa Zoro', fandom: 'x'.repeat(399), sameEntity: true }) },
  { nom: 'seuil — source VIDE, identité acquise : refus TENU',
    attendu: 'page Fandom absente ou trop maigre',
    obtenu: () => guard({ name: 'Kanchi', type: 'character', fandomTitle: 'Kanchi', fandom: '', sameEntity: true }) },
  { nom: 'seuil — 149 c sous identité acquise : refus TENU',
    attendu: 'page Fandom absente ou trop maigre',
    obtenu: () => guard({ name: 'Kanchi', type: 'character', fandomTitle: 'Kanchi', fandom: 'x'.repeat(149), sameEntity: true }) },
  { nom: 'seuil — 150 c sous identité acquise : accepté',
    attendu: null,
    obtenu: () => guard({ name: 'Kanchi', type: 'character', fandomTitle: 'Kanchi', fandom: 'x'.repeat(150), sameEntity: true }) },
];

// VERDICT MESURÉ AVANT CORRECTION — la même batterie rejouée contre `git show HEAD` (miroir
// des trois fichiers, registre d'alias d'avant les 12 ajouts). Sans ce relevé, « 23 faux
// positifs corrigés » ne serait qu'une affirmation : ici, chaque cas a d'abord été vu refusé.
const AVANT = {
  'Mutaito': 'homonyme probable : aucun repère du résumé (Dragon, Ball) dans « Master Mutaito »',
  'Hiru': 'homonyme probable : aucun repère du résumé (Bêtes, Ombre, Parrains) dans « Leech »',
  'Dip': 'homonyme probable : aucun repère du résumé (Piece) dans « Chip and Dip »',
  'Minoru Kazeno': 'homonyme probable : aucun repère du résumé (Piece) dans « Kazeno Minoru »',
  'Goethe': 'homonyme probable : aucun repère du résumé (Quincy, Wandenreich) dans « Yoshino Sōma/Goethe »',
  'Kanchi': 'page Fandom absente ou trop maigre (398 c mesurés, seuil 400)',
  'Ugai': 'page Fandom absente ou trop maigre (254 c mesurés, seuil 400)',
  'Piercing Showers': 'page Fandom absente ou trop maigre (191 c mesurés, seuil 250)',
  'Puppet Buzzsaw': 'page Fandom absente ou trop maigre (183 c mesurés, seuil 250)',
  'Son Gohan': "mauvaise entité : page plus générale que l'entité : « Gohan » ne couvre pas « Son Gohan »",
  'Carol Masterson': "mauvaise entité : page plus générale que l'entité : « Carol » ne couvre pas « Carol Masterson »",
  'Premier Chemin Animal (personnage)': 'mauvaise entité : article « Chūji » pour « Premier Chemin Animal (personnage) » (et non source vide : la recherche tombait sur un voisin)',
  // tous les autres cas du défaut 4 : page nulle, 0 caractère servi
  'Ponéglyphes': 'page Fandom absente ou trop maigre (0 c — aucune page servie)',
  'Île Amour': 'page Fandom absente ou trop maigre (0 c)', 'Île Paquet': 'page Fandom absente ou trop maigre (0 c)',
  'Île Tricolore': 'page Fandom absente ou trop maigre (0 c)', 'Île Levure': 'page Fandom absente ou trop maigre (0 c)',
  'Île Graine': 'page Fandom absente ou trop maigre (0 c)', 'Île Moelleuse': 'page Fandom absente ou trop maigre (0 c)',
  'Île Fromage': 'page Fandom absente ou trop maigre (0 c)', 'Île Confiture': 'page Fandom absente ou trop maigre (0 c)',
  'Capitaine du navire fantôme': 'page Fandom absente ou trop maigre (0 c)',
  'Cimetière des Monts': 'page Fandom absente ou trop maigre (0 c)',
};

// ════════════════════════════════════════════════════════════════════════════════════════
const bilan = { chantier: 'gardes-tests', fait_le: new Date().toISOString(),
  garde_testee: 'agent-worker.mjs → TASK_TYPES.fandom_descfr.guard (extraite du source, non recopiée)',
  methode_avant: 'même batterie rejouée sur un miroir de `git show HEAD` (fandom.mjs, agent-worker.mjs, alias-cures.json) : 31/31 refusés',
  // COMPTE CROISÉ SUR LES 177 COUPLES NOMMÉS de l'audit (a_refusees.familles[*].paires_a_resonder),
  // rejoués en entier des DEUX côtés, avec les charges utiles réelles (type ET résumé lus en base).
  couples_nommes_de_l_audit: {
    methode: '177 couples des 3 familles suspectes, résolution + garde, sur le miroir HEAD puis sur le code corrigé',
    avant: { refuses: 174, passent: 3 },
    apres: { refuses: 32, passent: 145 },
    refus_restants: {
      'C3 — 17': "pages RÉELLEMENT vides : leur wikitext entier vaut « Category:Tools » (14 caractères). Le plancher de 150 fait exactement son travail — ce ne sont pas des faux positifs.",
      'E — 9': "5 sont les vrais refus du 05/08 (Summoning Technique (…), Wood Release, Katasuke Tōno's Assistant) et 3 de la même classe ; 1 relève d'un défaut DISTINCT non traité ici — « Z-Sword (Épée Zeta) », dont NOTRE nom porte une glose française entre parenthèses qui empoisonne la requête.",
      'B — 6': "formes courtes SANS redirection du wiki (famille Achino, Koala Zombie, Pirate Captain (500 Hostages), Snake Way Guide) : aucune attestation, donc refus conservé. Ce sont des candidats au registre d'alias curé, pas à un assouplissement de garde.",
    },
  },
  sens_1_faux_positifs: [], sens_2_vrais_refus: [], sens_3_bonnes_pages: [], unitaires: [], comptes: {} };

console.log('\n══ SENS 1 — les faux positifs de l\'audit doivent PASSER ══');
for (const c of FAUX_POSITIFS) {
  let r; try { r = await passeLaGarde(c); } catch (e) { r = { refus: `PANNE : ${e.message}`, titre: null, taille: 0 }; }
  const ok = r.refus === null;
  console.log(`${ok ? '✅' : '❌'} D${c.defaut} ${c.universe} | ${c.name} → « ${r.titre} » ${r.taille} c ${r.refus ? '· REFUS : ' + r.refus : '· passe'}`);
  bilan.sens_1_faux_positifs.push({ defaut: c.defaut, universe: c.universe, nom: c.name, type: c.type,
    refus_avant_audit: c.avant, refus_avant_mesure: AVANT[c.name] ?? null,
    titre_trouve: r.titre, taille: r.taille, resolu_par: r.resolvedBy,
    refus_apres: r.refus, verdict: ok ? 'CORRIGÉ' : 'ENCORE REFUSÉ' });
}

console.log('\n══ SENS 2 — les vrais refus doivent TENIR ══');
for (const c of VRAIS_REFUS) {
  let r; try { r = await passeLaGarde(c); } catch (e) { r = { refus: `PANNE : ${e.message}`, titre: null, taille: 0 }; }
  const ok = r.refus !== null;
  console.log(`${ok ? '✅' : '❌'} ${c.classe} | ${c.name} → « ${r.titre} » ${r.refus ? '· REFUS : ' + r.refus : '· PASSE (régression !)'}`);
  bilan.sens_2_vrais_refus.push({ classe: c.classe, universe: c.universe, nom: c.name, type: c.type,
    pourquoi: c.pourquoi, titre_trouve: r.titre, taille: r.taille, resolu_par: r.resolvedBy,
    refus_apres: r.refus, verdict: ok ? 'REFUS PRÉSERVÉ' : 'RÉGRESSION' });
}

console.log('\n══ SENS 3 — la page servie doit être LA BONNE ══');
for (const c of BONNES_PAGES) {
  let r; try { r = await passeLaGarde({ ...c, type: 'character', summary: 'Personnage secondaire.' }); }
  catch (e) { r = { refus: `PANNE : ${e.message}`, titre: null, taille: 0 }; }
  const ok = r.titre === c.attendu;
  console.log(`${ok ? '✅' : '❌'} ${c.universe} | ${c.name} → « ${r.titre} » (attendu « ${c.attendu} ») ${r.resolvedBy ?? ''}`);
  bilan.sens_3_bonnes_pages.push({ universe: c.universe, nom: c.name, titre_attendu: c.attendu,
    titre_avant: c.avant, pourquoi: c.pourquoi, titre_trouve: r.titre, resolu_par: r.resolvedBy,
    taille: r.taille, refus: r.refus, verdict: ok ? 'BONNE PAGE' : 'MAUVAISE PAGE' });
}

console.log('\n══ UNITAIRES — les primitives ══');
for (const u of UNITAIRES) {
  let obtenu; try { obtenu = u.obtenu(); } catch (e) { obtenu = `PANNE ${e.message}`; }
  const ok = obtenu === u.attendu;
  console.log(`${ok ? '✅' : '❌'} ${u.nom} → ${JSON.stringify(obtenu)}`);
  bilan.unitaires.push({ cas: u.nom, attendu: u.attendu, obtenu, verdict: ok ? 'OK' : 'ÉCHEC' });
}

const c1 = bilan.sens_1_faux_positifs.filter((x) => x.verdict === 'CORRIGÉ').length;
const c2 = bilan.sens_2_vrais_refus.filter((x) => x.verdict === 'REFUS PRÉSERVÉ').length;
const cu = bilan.unitaires.filter((x) => x.verdict === 'OK').length;
bilan.comptes = {
  faux_positifs_avant: FAUX_POSITIFS.length,
  tous_refuses_avant_correction: `${Object.keys(AVANT).length}/${FAUX_POSITIFS.length} relevés nommément, 31/31 refusés au total sur le miroir HEAD`,
  faux_positifs_apres: FAUX_POSITIFS.length - c1,
  faux_positifs_corriges: `${c1}/${FAUX_POSITIFS.length}`,
  vrais_refus_preserves: `${c2}/${VRAIS_REFUS.length}`,
  bonnes_pages: `${bilan.sens_3_bonnes_pages.filter((x) => x.verdict === 'BONNE PAGE').length}/${BONNES_PAGES.length}`,
  unitaires: `${cu}/${UNITAIRES.length}`,
};
console.log('\n══ BILAN ══\n' + JSON.stringify(bilan.comptes, null, 2));

if (process.argv.includes('--ecrire')) {
  const f = join(RACINE, 'data', 'audits', 'gardes-tests-0708.json');
  writeFileSync(f, JSON.stringify(bilan, null, 2) + '\n');
  console.log('→ écrit :', f);
}
