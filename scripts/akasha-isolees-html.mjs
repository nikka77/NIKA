// scripts/akasha-isolees-html.mjs — SORTIR LES ISOLÉES PAR L'INFOBOX **RENDUE**, PAS PAR LE WIKITEXTE.
//
// POURQUOI (10/08/2026)
// La vague 1 (`akasha-sortir-isolees.mjs`) lit `action=query&prop=revisions` et cherche les
// paramètres « | affiliation = [[…]] » dans le wikitexte. Sur naruto.fandom.com cette voie rend
// ZÉRO : l'infobox y est alimentée par Semantic MediaWiki depuis une page `Infobox:<Titre>`, si
// bien que le wikitexte d'une page comme « Nawaki » ne contient plus que `{{Infobox}}` — mesuré,
// pas supposé (voir la trace, champ `wikitexteNu`).
//
// La donnée existe dans la page RENDUE. Attention : contrairement à ce qu'on attendait, ce wiki
// n'émet PAS de portable infobox Fandom (`<div class="pi-item pi-data" data-source="…">` : 0
// occurrence sur Nawaki). Il émet une table classique `<table class="infobox …">` dont chaque
// ligne est `<th>Libellé</th><td>… <a href="/wiki/Cible" title="Cible">…</a></td>`.
// Le lecteur ci-dessous accepte LES DEUX formes, pour rester utilisable sur les wikis qui, eux,
// servent bien la portable infobox.
//
// Ce qu'on lit : affiliation, team, clan, occupation, partner.
// C'est le TITRE de la page visée qui compte, jamais le libellé affiché — « [[King (Title)|King]] »
// tombait sur le personnage King (leçon de la vague 1). Ici le titre est pris dans le `href`
// (`/wiki/Land_of_Fire` → « Land of Fire »), le `title=` ne servant que de contrôle.
//
// N'ÉCRIT QUE DANS `akasha_relations`. Ne touche jamais à `akasha_entries.attributes` :
// quatre autres chantiers y travaillent en parallèle.
//
// DETTE CONNUE : l'index de résolution et `natureDe` sont le jumeau exact de ceux de
// `akasha-sortir-isolees.mjs` (lignes 55-92). Deux chemins d'écriture qui divergent = deux graphes
// qui divergent (leçon du 05/08). Le geste propre est de les sortir tous les deux dans
// `scripts/lib/akasha-resolution.mjs` ; non fait ici pour ne pas modifier un script que d'autres
// agents peuvent relancer pendant cette session.
//
// Usage :
//   node --env-file=.env.local scripts/akasha-isolees-html.mjs --sonde            (mesure, rien écrit)
//   node --env-file=.env.local scripts/akasha-isolees-html.mjs --sonde --verif    (+ 20 cas à relire)
//   node --env-file=.env.local scripts/akasha-isolees-html.mjs                    (écrit)
//   … --univers="Naruto"   (défaut) — la config WIKIS_HTML porte les autres wikis
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { norm, wikitextes } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const ARG = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const SONDE = process.argv.includes('--sonde');
const VERIF = process.argv.includes('--verif');
const EXPLORE = process.argv.includes('--explore');   // mesure le rendement de TOUS les champs
const CITANTS = process.argv.includes('--citants');   // + les fiches DÉJÀ connectées qui citent une isolée
const UNIVERS = ARG('univers', 'Naruto');
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };
// Cache disque du HTML rendu : la sonde se relance plusieurs fois avant d'écrire, et 94 pages
// re-téléchargées à chaque essai, c'est 94 requêtes gratuites de plus pour le wiki à chaque fois.
// Hors du dépôt (os.tmpdir) : un cache n'est pas un livrable, et 136 fichiers en `??` noient le
// `git status` que cinq chantiers parallèles doivent pouvoir lire.
const CACHE = path.join(os.tmpdir(), 'nika-akasha-fandom-html');

/** Les wikis dont l'infobox n'est plus dans le wikitexte. `champs` : le LIBELLÉ de la ligne (th)
 *  pour une table classique, le `data-source` pour une portable infobox — comparé via `norm()`.
 *
 *  CHOIX DES CHAMPS, MESURÉ (--explore, trace isolees-html-naruto-explore-*.json) :
 *   · affiliation/team/clan/occupation : 40 liens, 0 résolus. Les cibles sont les PAYS
 *     (Land of Fire ×9, Land of Redaku ×4, 22 pays distincts) — aucune fiche « Pays du … »
 *     n'existe dans AKASHA. Ces champs restent déclarés : le jour où ces fiches existeront, le
 *     même script rendra sans être retouché.
 *   · jutsu type / jutsu classification / parent jutsu : les seules cibles que la base contient
 *     déjà (natures élémentaires et techniques mères).
 *   · `users` ÉCARTÉ malgré ses 33 liens : la valeur du champ porte des liens de QUALIFICATION,
 *     pas seulement des utilisateurs — « Chiyo (Puppetry using Mother and Father) » donnait trois
 *     cibles dont deux fausses. Un lien dans le bon champ n'est pas encore un fait du bon type.
 *   · media (anime, game, novel, debut …), species, classification : cibles hors périmètre
 *     encyclopédique (épisodes, jeux, romans) — la base n'en a aucune.
 */
const WIKIS_HTML = {
  Naruto: {
    hote: 'naruto.fandom.com',
    //   · `classification` AJOUTÉ le 10/08 (vague 4) : c'est le champ le plus cité des isolées
    //     restantes (12 des 42 pages rendues le portent), et sa valeur dominante « Summon » a
    //     désormais une cible attestée — « Créature invoquée », déjà au bout de 40 arêtes
    //     « appartient ». Il était écarté jusqu'ici faute de cible, pas faute de valeur.
    champs: ['affiliation', 'team', 'clan', 'occupation', 'partner', 'classification',
      'jutsu type', 'jutsu classification', 'parent jutsu'],
    // Pont rōmaji : nos natures élémentaires sont nommées en français avec le rōmaji entre
    // parenthèses — « Libération de la Glace (Hyōton) ». La page « Ice Release » du wiki porte
    // « Rōmaji : Hyōton » dans son infobox. C'est le MÊME second saut que la vague 1 (`rname`),
    // avec le nom de champ de ce wiki-ci.
    champRomaji: 'rōmaji',
  },
  // PORTAGE DU 10/08 (vague 5) — la plus grosse poche du corpus : 451 isolées, 59 % du reste.
  // `champs` renseigné APRÈS mesure (--explore) et non avant : voir le commentaire du champ.
  // CHOIX DES CHAMPS, MESURÉ (--explore, trace isolees-html-one-piece-explore-2026-08-10T13-03-*)
  // sur 249 pages rendues et 1 061 cibles brutes. Retenus, et pourquoi les autres ne le sont pas —
  // le critère n'est pas le rendement, c'est la VÉRITÉ de la phrase que `natureDe` va écrire :
  //   · affiliation (128 liens) · occupation (73) · residence (81) · region (51) : les quatre
  //     seuls dont la phrase produite est exacte — « appartient à », « exerce », « réside »,
  //     « appartient à » pour une île dans sa mer.
  //   · `origin` (10 liens, 6 résolus) ÉCARTÉ : notre vocabulaire n'a pas « originaire de », et
  //     `natureDe` en ferait « Réside ». Un lieu de NAISSANCE n'est pas une résidence — la fiche
  //     dirait le contraire du canon pour tout personnage qui a quitté son île.
  //   · `owner` (34 liens, 14 résolus, TOUS des personnes) ÉCARTÉ : la phrase juste serait
  //     « Mihawk POSSÈDE le Navire-Cercueil », donc une arête de sens INVERSE et de nature
  //     `possede` — un autre chantier, pas un champ de plus dans celui-ci.
  //   · `captain` ÉCARTÉ, et il porte sa propre preuve : « L'équipage des Candys → Candy » tombe
  //     sur une de nos fiches de type `place` nommée Candy, pas sur le capitaine.
  //   · `outcome`, `location`, `commanders`, `other`, `extra1` ÉCARTÉS : ils ne viennent que de la
  //     fiche « Guerre au Sommet » et diraient « la guerre appartient à Portgas D. Ace ».
  //   · `dfname` ÉCARTÉ : la phrase juste est « maîtrise », pas « appartient ».
  //   · `first` (447 liens !), `eva`, `jva`, `ename`, `bounty`, `price`, `duration` : chapitres,
  //     épisodes, comédiens, unités monétaires — hors périmètre encyclopédique, 0 fiche en base.
  'One Piece': {
    hote: 'onepiece.fandom.com',
    // VAGUE 7 (10/08) — `owner`, `captain` et `dfname` ENTRENT, non plus dans le sens du champ mais
    // sous les règles de REGLES_CHAMP, qui leur donnent le sens et la nature exacts que la vague 5
    // avait nommés sans pouvoir les écrire. Mesuré à nouveau sur les 284 isolées restantes
    // (--explore, 82 pages rendues) : owner 33 liens / 16 résolus (15 vers un personnage),
    // captain 15 / 3, dfname 3 / 2. Les cibles hors de ces types sont refusées, pas repliées :
    // « L'équipage des Candys → Candy » tombe sur une fiche de type `place`, et reste dehors.
    champs: ['affiliation', 'occupation', 'residence', 'region', 'owner', 'captain', 'dfname'],
    // Le libellé du rōmaji sur ce wiki est la clé `data-source` de la portable infobox : `rname`
    // (240 occurrences relevées sur les 249 pages rendues). « Romanized Name » est le libellé
    // AFFICHÉ, que `lignesInfobox` ne voit pas en forme B — mesuré, 0 pont avec l'autre valeur.
    champRomaji: 'rname',
  },
  // ═══ VAGUE 7 (10/08) — LES SIX UNIVERS QUE CETTE MÉTHODE N'AVAIT JAMAIS TOUCHÉS ═══════════
  // 257 des 580 isolées restantes y vivent, et aucune n'a jamais vu passer une lecture d'infobox
  // RENDUE : les vagues 1 à 6 ne sont allées que sur Naruto puis One Piece. Le mur du SENS SOURCE
  // y est aussi beaucoup plus bas — un nom propre (« Killua Zoldyck », « Ryuk », « Takeshi
  // Nakazato ») s'écrit pareil dans les deux langues, là où One Piece nous oppose « Île Obscuria ».
  // `champs` renseigné APRÈS mesure (--explore), jamais avant : voir les commentaires par univers.
  // CHOIX DES CHAMPS, MESURÉ (--explore du 10/08, 71 pages rendues, 969 cibles brutes,
  // trace data/audits/isolees-html-dragon-ball-explore-2026-08-10T18-5*.json) :
  //   · `user` (253 liens, 86 résolus, 84 vers un personnage) ÉCARTÉ APRÈS RELECTURE DES 20 CAS,
  //     et c'est le refus le plus cher de cette vague : il coûte 81 arêtes et 20 isolées. Le champ
  //     nomme qui SE SERT de l'objet, pas qui le détient, et notre vocabulaire n'a pas « utilise ».
  //     Les 20 candidats relus donnaient « Beerus possède les Dragon Balls », « Krillin possède la
  //     Machine à remonter le temps », « Vegeta possède les Haricots Senzu » : 17 défauts sur 20,
  //     soit 85 % — dix-sept fois le plafond. C'est mot pour mot la leçon payée sur le champ
  //     `users` de Naruto : un lien dans le bon champ n'est pas encore un fait du bon type.
  //     Le contraste avec `owner` (One Piece) est le critère à retenir : `owner` NOMME la
  //     détention, `user` nomme l'usage — seul le premier a une phrase chez nous.
  //   · `allegiance` (47 / 1) et `address` (14 / 1) : sens direct, phrase exacte.
  //   · `inventor` (31 / 8) ÉCARTÉ : « Bulma a INVENTÉ le Metamo-Ring » — notre vocabulaire n'a
  //     pas « invente », et un inventeur n'est pas un propriétaire.
  //   · `similar` (82 / 9), `counterparts` (18 / 2), `altname` (4 / 2) ÉCARTÉS : ils disent une
  //     ressemblance ou une IDENTITÉ (« Shen » = « Kami »), pas un lien entre deux entités.
  //   · `famconnect` (23 / 3) ÉCARTÉ : sa nature juste est `famille`, réflexive — autre chantier.
  //   · `ruler` (5 / 3) ÉCARTÉ : « Kami RÈGNE sur la Salle de l'Esprit » n'a pas de nature chez
  //     nous, et `natureDe` en ferait « appartient ».
  //   · `appears in` (135), `anime debut` (45), `date of death` (68), `debut` (51), `race` (47) :
  //     séries, épisodes, dates, espèces — 0 cible en base.
  'Dragon Ball': {
    hote: 'dragonball.fandom.com',
    champs: ['allegiance', 'address'],
  },
  // MESURÉ (--explore, 7 pages rendues seulement — 22 des 42 isolées Bleach sont des
  // redirections vers une SECTION, traitées par le second gisement ci-dessous) :
  // affiliation 5 / 4 · base of operations 6 / 2 · profession 2 / 2.
  //   · `partner` (4 / 2) et `previous partner` (3 / 3) ÉCARTÉS : cibles personnes sans nature
  //     chez nous, et « previous » dit un état révolu jusque dans son nom.
  //   · `race` (7 / 0), `education`, `division`, `manga/anime debut` : 0 cible en base.
  Bleach: {
    hote: 'bleach.fandom.com',
    champs: ['affiliation', 'base of operations', 'profession'],
  },
  // MESURÉ (--explore, 6 pages rendues sur 49 isolées — 10 redirections de section vers
  // « Minor Characters », qui n'est pas une entité) :
  //   · `user` (4 liens, 4 résolus) : le champ des MEMBRES d'un groupe (« Hommes du Pilier →
  //     Kars, Esidisi, Wamuu, Santana »). Arête INVERSE `appartient` — voir REGLES_CHAMP.
  //   · `stand` (4 / 0) : nature juste `maitrise`, mais 0 cible en base — rien à écrire.
  //   · `cod` (3 / 1) ÉCARTÉ : « cause of death », aucune nature chez nous.
  "JoJo's Bizarre Adventure": {
    hote: 'jojo.fandom.com',
    champs: ['user'],
  },
  // MESURÉ (--explore, 13 pages rendues) : `abilities` 1 / 1 (→ Nen, type skill, nature juste
  // `maitrise` — voir REGLES_CHAMP). `previous occupation` (7 / 1) ÉCARTÉ : « previous » dit le
  // révolu dans son nom même. `occupation` (2 / 1) ÉCARTÉ : sa cible résolue est Nen, une
  // compétence — `natureDe` en ferait « appartient à Nen », qui ne veut rien dire.
  'Hunter x Hunter': {
    hote: 'hunterxhunter.fandom.com',
    champs: ['abilities'],
  },
  // MESURÉ (--explore, 6 pages rendues sur 10 isolées) : AUCUN champ ne résout une seule cible.
  // `species` (6 / 0) ne vise que « Human », `occupation` (1 / 0) une université, `manga`/`anime`
  // (11 / 0) des chapitres. Ce wiki ne peut RIEN pour nos 10 isolées — c'est la mesure, pas un
  // renoncement, et la liste reste déclarée pour le jour où ces cibles existeront.
  'Death Note': { hote: 'deathnote.fandom.com', champs: ['affiliation', 'occupation'] },
  // MESURÉ (--explore, 3 pages rendues sur 5 isolées) : `alias` (3 / 1) dit une IDENTITÉ, pas un
  // lien ; `team(s)` (1 / 1) rattache le Mont Usui à l'équipe Impact Blue — une route n'appartient
  // pas à une écurie. Rien d'exact à écrire.
  'Initial D': { hote: 'initiald.fandom.com', champs: ['affiliation', 'team', 'occupation'] },
};

/* ═══ QUAND LE SENS DU CHAMP N'EST PAS LE SENS DE L'ARÊTE (vague 7, 10/08) ════════════════════
 * `natureDe` suppose que le champ d'infobox se lit dans le sens « notre fiche → la cible ». Quatre
 * familles de champs disent l'inverse, et les vagues précédentes les ont donc TOUS écartés plutôt
 * que d'écrire une phrase fausse :
 *   · `owner` / `user` — le champ nomme QUI porte l'objet. La fiche est l'objet, la phrase juste
 *     est « Mihawk POSSÈDE le Navire-Cercueil » : sens inverse, nature `possede`.
 *   · `captain` (One Piece) / `user` (JoJo) — le champ nomme les MEMBRES d'un groupe. La fiche est
 *     le groupe : « Basil Hawkins APPARTIENT À l'équipage de Hawkins ». Sens inverse, `appartient`.
 * Deux autres disent le bon sens mais pas la bonne nature :
 *   · `dfname` (One Piece), `abilities` (Hunter x Hunter) — « maîtrise », jamais « appartient ».
 *
 * CHAQUE RÈGLE PORTE SES CONDITIONS DE TYPE, et c'est ce qui a manqué aux vagues précédentes :
 * « L'équipage des Candys → Candy » tombe sur une de nos fiches de type `place`, « Noko (place)
 * → Fruit du Sommeil » part d'un lieu. Une règle qui ne vérifie pas les deux bouts écrit un fait
 * juste dans une phrase fausse. Une cible qui ne satisfait aucune condition est REFUSÉE, jamais
 * repliée sur le sens direct.
 *
 * ⚠️ `possede` A ÉTÉ VÉRIFIÉ AU RENDU AVANT D'ÊTRE ÉCRIT (règle du soir du 10/08) : la fiche
 * `tenten` affiche « Possède », `yoru` et `thousand-sunny` affichent « Possédé par · 1 ». Les deux
 * demi-arêtes se voient. Idem `appartient`, la nature la plus rendue du corpus, et `maitrise`. */
const REGLES_CHAMP = {
  owner: [{ de: ['artifact', 'place', 'status'], vers: ['character'], sens: 'inverse', nature: 'possede' }],
  user: [
    { de: ['artifact'], vers: ['character'], sens: 'inverse', nature: 'possede' },
    { de: ['status'], vers: ['character'], sens: 'inverse', nature: 'appartient' },
  ],
  captain: [{ de: ['status'], vers: ['character'], sens: 'inverse', nature: 'appartient' }],
  dfname: [{ de: ['character'], vers: ['power'], sens: 'direct', nature: 'maitrise' }],
  abilities: [{ de: ['character'], vers: ['skill', 'power'], sens: 'direct', nature: 'maitrise' }],
  // `affiliation` garde son sens direct par défaut ; ce cas-ci ne s'applique QUE lorsque la fiche
  // est un objet et la cible une personne — « Navire-Cercueil / affiliation : Dracule Mihawk ».
  affiliation: [
    { de: ['artifact'], vers: ['character'], sens: 'inverse', nature: 'possede' },
    // Relu sur les 28 candidats du mode --citants : « Tomeo --appartient--> Lady Mary », où Lady
    // Mary est un NAVIRE. Le wiki met le nom du bateau dans `affiliation` parce qu'il vaut pour
    // son équipage ; nous, nous écririons qu'une personne appartient à un objet. Une affiliation
    // est un groupe, un lieu ou un métier — jamais une chose. Refus explicite, pas repli.
    { de: ['character'], vers: ['artifact'], refuse: true },
  ],
};

const cfg = WIKIS_HTML[UNIVERS];
if (!cfg) throw new Error(`univers « ${UNIVERS} » absent de WIKIS_HTML`);

/* ═══ LES DEUX SENS DE L'ALIAS (vague 4, 10/08) ══════════════════════════════════════════════
 * La vague 3 s'est arrêtée sur un mur qu'elle a nommé sans le franchir : NOS NOMS SONT FRANÇAIS.
 * Le mur a deux versants, et le second n'avait pas été mesuré :
 *
 *  · SENS CIBLE  — « Lightning Release » n'existe pas chez nous, « Libération de la Foudre
 *    (Raiton) » si. 20 liens sur 40 étaient perdus là. → data/alias-cibles-naruto.json,
 *    construit par scripts/akasha-alias-registre.mjs, une preuve par paire.
 *  · SENS SOURCE — 16 de nos 58 isolées Naruto ne sont même pas CHERCHABLES : le script demande
 *    au wiki anglais une page « Vallée de la Fin », « Clan Karatachi », « Pont Tenchi »… qui
 *    n'existe évidemment pas, range la fiche dans `journal.pageAbsente` et n'en dit rien de plus.
 *    data/alias-cures.json porte DÉJÀ la paire pour 6 d'entre elles, sondée contre le wiki réel
 *    par ops-curer-alias.mjs le 02/08. Il suffisait de la lire.
 *
 * Les deux fichiers restent la seule source : rien n'est deviné ici, et une paire absente reste
 * une fiche non traitée — jamais une fiche rapprochée « au plus proche ». */
// Le sens SOURCE a maintenant DEUX fichiers, et il les cumule :
//  · data/alias-cures.json           — les paires sondées par ops-curer-alias.mjs le 02/08.
//  · data/alias-sources-<univers>.json — le registre bâti par scripts/akasha-alias-sources.mjs
//    (témoins : notre `descFrSource` qui nomme sa page d'origine, et l'interlangue `en` déclaré par
//    le wiki FRANÇAIS). Sur One Piece, 186 des 451 isolées n'étaient CHERCHABLES sous aucun de
//    leurs trois titres — mesuré, pas supposé (data/audits/isolees-op-sonde-source-*.json).
// Le premier fichier garde la priorité : il a été sondé contre le wiki réel, le second est plus
// jeune. Une clé absente des deux reste une fiche non traitée — jamais une fiche rapprochée.
const lireAlias = (fichier, extraire) => {
  try { return extraire(JSON.parse(fs.readFileSync(path.join(ROOT, fichier), 'utf8'))[UNIVERS] ?? {}); }
  catch { return {}; }
};
const aliasCures = lireAlias('data/alias-cures.json', (o) => o);
const aliasSourcesRegistre = lireAlias(
  `data/alias-sources-${UNIVERS.toLowerCase().replace(/\W+/g, '-')}.json`,
  (o) => Object.fromEntries(Object.entries(o).map(([nom, v]) => [nom, v.titreWiki])),
);
const aliasSource = { ...aliasSourcesRegistre, ...aliasCures };
const aliasCible = (() => {
  const f = path.join(ROOT, `data/alias-cibles-${UNIVERS.toLowerCase().replace(/\W+/g, '-')}.json`);
  try { return JSON.parse(fs.readFileSync(f, 'utf8'))[UNIVERS] ?? {}; }
  catch { return {}; }
})();
console.log(`alias : ${Object.keys(aliasSource).length} paires au SENS SOURCE `
  + `(${Object.keys(aliasCures).length} de data/alias-cures.json + ${Object.keys(aliasSourcesRegistre).length} du registre de sources)`
  + ` · ${Object.keys(aliasCible).length} au SENS CIBLE (wiki → nos fiches, data/alias-cibles-${UNIVERS.toLowerCase().replace(/\W+/g, '-')}.json)`);

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;      // un select nu s'arrête à 1000 SANS erreur
  }
  console.log(`  ${t} : ${out.length} lignes`);
  return out;
};

/* ═══ Lecture du HTML rendu ══════════════════════════════════════════════════════════════════ */
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function htmlRendu(hote, titre) {
  fs.mkdirSync(CACHE, { recursive: true });
  const fichier = path.join(CACHE, `${hote}__${titre.replace(/[^\w.-]/g, '_')}.json`);
  if (fs.existsSync(fichier)) return JSON.parse(fs.readFileSync(fichier, 'utf8'));
  const u = `https://${hote}/api.php?action=parse&prop=text&format=json&formatversion=2`
    + `&redirects=1&page=${encodeURIComponent(titre)}`;
  for (let essai = 0; essai < 3; essai++) {
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) { await dormir(600); continue; }
      const j = await r.json();
      const res = j.error ? { erreur: j.error.code } : { titre: j.parse.title, html: j.parse.text };
      fs.writeFileSync(fichier, JSON.stringify(res));
      return res;
    } catch { await dormir(800); }
  }
  return { erreur: 'reseau' };
}

/** Découpe la table/aside d'infobox en respectant l'imbrication (la sous-table « Family » ferme
 *  un `</table>` bien avant la fin de l'infobox : un `indexOf` naïf tronque la moitié des champs). */
function blocInfobox(html) {
  for (const [ouvre, ferme, motif] of [['<table', '</table>', /<table[^>]*class="[^"]*\binfobox\b/i],
    ['<aside', '</aside>', /<aside[^>]*class="[^"]*\bportable-infobox\b/i]]) {
    const m = motif.exec(html);
    if (!m) continue;
    let i = m.index, prof = 0;
    for (let k = i; k < html.length; k++) {
      if (html.startsWith(ouvre, k)) prof++;
      else if (html.startsWith(ferme, k)) { prof--; if (!prof) return html.slice(i, k + ferme.length); }
    }
    return html.slice(i);           // table non refermée : on rend ce qu'on a
  }
  return null;
}

const detague = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ')
  .replace(/\s+/g, ' ').trim();

/** Les cibles d'un fragment de HTML : uniquement les liens INTERNES d'article.
 *  Le titre vient du `href` (`/wiki/Land_of_Fire`), jamais du texte du lien.
 *
 *  QUALIFICATEUR « (former) » — resserrage du 10/08 (vague 5), mesuré : 1 défaut sur les 20 cas
 *  relus avant écriture. La fiche « Kobe » sortait « exerce Pirate » alors que Koby est capitaine
 *  de la Marine : le wiki écrit, dans le champ `occupation`,
 *      <a href="/wiki/Pirate">Pirate</a> Ship Caretaker (former)
 *  et rien, dans le titre du lien, ne dit que c'est révolu. Nos libellés sont au PRÉSENT
 *  (« Appartient à », « Exerce », « Réside ») : écrire une appartenance passée au présent, c'est
 *  affirmer le contraire du canon (leçon du 10/08 sur le sens des arêtes). On lit donc le texte
 *  qui SUIT chaque lien, jusqu'au lien suivant — c'est là que le wiki accroche ses qualificateurs —
 *  et on refuse la cible s'il y annonce un état révolu. Le champ garde ses autres cibles. */
const NS_EXCLUS = /^(File|Image|Category|Template|Help|User|Talk|Special|Project|Module|MediaWiki|Forum|Blog|Infobox)\s*:/i;
const REVOLU = /\(\s*(former|formerly|ex-)/i;

/* UNE SUITE DE PROPRIÉTAIRES N'EST PAS UNE LISTE DE PROPRIÉTAIRES (vague 7, resserrage mesuré).
 * Le champ `owner` de onepiece.fandom.com écrit la CHAÎNE des détenteurs successifs, séparés par
 * une flèche : « Kashu / owner : Mr. 11 → Tashigi », « Enma / owner : Shimotsuki Kouzaburou →
 * Kouzuki Oden → Kouzuki Hiyori → Roronoa Zoro ». Tous sauf le dernier sont des propriétaires
 * PASSÉS, et nos libellés sont au présent : « Mr. 11 possède Kashu » affirme le contraire du canon
 * alors que Tashigi la porte. C'est le même défaut que « (former) » (leçon du 10/08), sous une
 * autre notation — le qualificateur n'est plus un mot, c'est une flèche.
 * Un seul défaut sur les 20 cas relus, mais il ne se répare pas en resserrant le seuil : il se
 * répare en lisant la flèche. On garde le DERNIER segment qui contient un lien — « → Damaged » de
 * Yubashiri n'en contient aucun, et l'on retombe alors sur « Roronoa Zoro », qui est le bon. */
const FLECHE = /→|&rarr;|&#8594;|-&gt;|->/;
const CHAMPS_CHAINE = new Set(['owner']);
function dernierMaillon(src) {
  const bouts = String(src ?? '').split(FLECHE);
  if (bouts.length < 2) return src;
  for (let i = bouts.length - 1; i >= 0; i--) if (/<a\b/i.test(bouts[i])) return bouts[i];
  return src;
}

function ciblesDuHtml(fragment) {
  const out = new Map();      // titre → { titre, ancre, libelle }
  const src = String(fragment ?? '');
  const liens = [...src.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  for (let i = 0; i < liens.length; i++) {
    const m = liens[i];
    const attrs = m[1];
    if (/\bclass="[^"]*\b(extiw|external|new)\b/i.test(attrs)) continue;   // interwiki / lien rouge
    const href = /href="([^"]*)"/i.exec(attrs)?.[1] ?? '';
    if (!href.startsWith('/wiki/')) continue;
    const brut = href.slice(6);
    if (brut.includes('?')) continue;                                       // Special:RunQuery…
    let titre;
    try { titre = decodeURIComponent(brut.split('#')[0]).replace(/_/g, ' ').trim(); } catch { continue; }
    const ancre = brut.includes('#') ? decodeURIComponent(brut.split('#').slice(1).join('#')).replace(/_/g, ' ') : null;
    if (!titre || NS_EXCLUS.test(titre)) continue;
    const finLien = m.index + m[0].length;
    const suite = detague(src.slice(finLien, liens[i + 1] ? liens[i + 1].index : src.length));
    if (REVOLU.test(suite)) { out.set(titre, { titre, ancre, libelle: detague(m[2]) || null, revolu: suite.slice(0, 60) }); continue; }
    if (!out.has(titre) || out.get(titre).revolu) out.set(titre, { titre, ancre, libelle: detague(m[2]) || null });
  }
  return [...out.values()];
}

/** Lignes d'infobox utiles : { champ, htmlValeur, texteValeur }. Gère les deux formes.
 *  `champs === null` (mode --explore) rend TOUTES les lignes : c'est ce qui permet de mesurer le
 *  rendement de chaque champ au lieu de le supposer. */
function lignesInfobox(bloc, champs) {
  const voulu = champs && new Set(champs.map(norm));
  const out = [];
  const libellesVus = new Set();
  const garder = (champ, html) => {
    libellesVus.add(champ);
    // Comparaison par `norm` : le libellé du wiki porte des diacritiques (« Rōmaji ») que la
    // simple minuscule ne réduit pas.
    if (!voulu || voulu.has(norm(champ))) out.push({ champ, html, texte: detague(html) });
  };
  // Forme A — table classique alimentée par Semantic MediaWiki (pages personnage de Narutopedia) :
  // <tr><th>Libellé</th><td>valeur</td></tr>
  for (const m of bloc.matchAll(/<tr[^>]*>\s*<th\b([^>]*)>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>/gi)) {
    if (/\bcolspan=/i.test(m[1])) continue;                 // en-tête de section, pas un champ
    garder(detague(m[2]).toLowerCase(), m[3]);
  }
  // Forme B — portable infobox Fandom (pages jutsu du même wiki) :
  // <div class="pi-item pi-data" data-source="users"> … <div class="pi-data-value">VALEUR</div></div>
  // On borne la capture au bloc `pi-data-value` en comptant les <div> imbriqués : s'arrêter au
  // premier `</div>` couperait les valeurs en liste (<div class="plainlist"><ul>…), et laisser
  // courir jusqu'au champ suivant fait entrer les liens du voisin.
  for (const m of bloc.matchAll(/<div\b[^>]*\bdata-source="([^"]*)"[^>]*>/gi)) {
    const v = /<div\b[^>]*\bclass="[^"]*\bpi-data-value\b[^"]*"[^>]*>/i.exec(bloc.slice(m.index));
    if (!v) continue;
    const debut = m.index + v.index + v[0].length;
    let prof = 1, k = debut;
    for (; k < bloc.length && prof; k++) {
      if (bloc.startsWith('<div', k)) prof++;
      else if (bloc.startsWith('</div', k)) prof--;
    }
    garder(m[1].toLowerCase(), bloc.slice(debut, k - 1));
  }
  return { lignes: out, libellesVus: [...libellesVus] };
}

/* ═══ Base ═══════════════════════════════════════════════════════════════════════════════════ */
console.log('→ lecture de la base (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');

const degre = new Map();
const areteExistante = new Set();
for (const r of rels) {
  degre.set(r.from_entry, (degre.get(r.from_entry) ?? 0) + 1);
  degre.set(r.to_entry, (degre.get(r.to_entry) ?? 0) + 1);
  areteExistante.add(`${r.from_entry}|${r.to_entry}|${r.relation}`);
}
const estIsolee = (id) => !(degre.get(id) ?? 0);
const isolees = entries.filter((e) => estIsolee(e.id));
const lot = isolees.filter((e) => e.universe === UNIVERS);
console.log(`\nAVANT : ${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées`
  + `  dont ${lot.length} en ${UNIVERS}`);

/* Index de résolution PAR UNIVERS — jamais à plat (les 5 arêtes inter-univers purgées le 05/08
   venaient exactement de là). Trois passes de priorité : name, roman_name, slug. */
const index = new Map();
const cleParPasse = (e, p) => (p === 0 ? e.name : p === 1 ? e.attributes?.roman_name : e.slug);
for (let passe = 0; passe < 3; passe++) {
  for (const e of entries) {
    const cle = norm(cleParPasse(e, passe));
    if (!cle) continue;
    if (!index.has(e.universe)) index.set(e.universe, new Map());
    const m = index.get(e.universe);
    const deja = m.get(cle);
    if (!deja) { m.set(cle, { passe, candidats: [e] }); continue; }
    if (deja.passe !== passe) continue;
    if (!deja.candidats.some((c) => c.id === e.id)) deja.candidats.push(e);
  }
}
/* Index par slug : le registre d'alias désigne sa fiche par SLUG, pas par nom — un slug est unique
   en base, un nom ne l'est pas. C'est ce qui distingue un alias curé d'une résolution par libellé. */
const parSlug = new Map(entries.map((e) => [e.slug, e]));
const resoudre = (univers, valeur) => {
  const cle = norm(valeur);
  if (!cle) return null;
  const t = index.get(univers)?.get(cle);
  if (t) return t.candidats.length === 1 ? t.candidats[0] : null;   // homonyme non départagé → on renonce
  // 4e passe : le registre d'alias CURÉ. Il arrive en dernier, jamais avant l'égalité de nom —
  // un alias corrige ce que la base ne dit pas, il ne remplace pas ce qu'elle dit.
  if (univers !== UNIVERS) return null;
  const a = aliasCible[valeur] ?? aliasCible[String(valeur ?? '').trim()];
  const f = a && parSlug.get(a.slug);
  return f && f.universe === univers ? f : null;
};

/* Index des PARENTHÈSES de nos noms : « Libération de la Glace (Hyōton) » → clé « hyoton ».
   Ne sert qu'au pont rōmaji ci-dessous, et seulement quand la clé est unique dans l'univers —
   une parenthèse qui désigne deux fiches ne désigne aucune des deux. */
const indexParenthese = new Map();
for (const e of entries) {
  const m = /\(([^()]+)\)\s*$/.exec(e.name ?? '');
  const cle = m && norm(m[1]);
  if (!cle) continue;
  const k = `${e.universe}|${cle}`;
  if (!indexParenthese.has(k)) indexParenthese.set(k, []);
  indexParenthese.get(k).push(e);
}

/* LA NATURE N'EST PAS CHOISIE, ELLE EST LUE DANS LE GRAPHE EXISTANT (16 699 arêtes en place) :
   village → habite 753 · monde → habite 66 (personnage vers un lieu : il y vit)
   crew/organization/equipe/clan/camp → appartient (adhésion) · cible métier → exerce.
   Cette règle redit ces précédents et n'en invente aucun. */
const natureDe = (source, cible) => {
  if (cible.type === 'profession') return 'exerce';
  if (cible.type === 'place' && source.type === 'character') return 'habite';
  return 'appartient';
};

/** L'arête que produit un couple (fiche, cible) LU DANS UN CHAMP DONNÉ — ou `null` si aucune
 *  phrase exacte n'est possible. C'est le SEUL endroit du script qui décide d'un sens, et il
 *  refuse plutôt que de replier une règle non satisfaite sur le sens direct : un champ inverse
 *  dont les types ne collent pas ne dit rien, il ne dit pas le contraire. */
const areteDe = (source, cible, champ) => {
  const cle = String(champ ?? '').toLowerCase().trim();
  const regles = REGLES_CHAMP[cle];
  for (const r of regles ?? []) {
    if (!r.de.includes(source.type) || !r.vers.includes(cible.type)) continue;
    if (r.refuse) return null;
    return r.sens === 'inverse'
      ? { from: cible, to: source, relation: r.nature, sens: 'inverse', regle: `champ « ${champ} » → arête INVERSE de nature « ${r.nature} »` }
      : { from: source, to: cible, relation: r.nature, sens: 'direct', regle: `champ « ${champ} » → nature « ${r.nature} »` };
  }
  // RESSERRAGE MESURÉ (vague 7, avant toute écriture) : un champ QUI A UNE RÈGLE et dont aucune
  // condition de type n'est satisfaite doit être REFUSÉ, jamais replié sur le sens direct. Le repli
  // avait produit deux des quatre défauts des 20 cas relus : « Noko (place) --appartient--> Fruit
  // du Sommeil » (la règle `dfname` exige une source `character`) et « L'équipage des Candys
  // --appartient--> Candy (place) » (la règle `captain` exige une cible `character`) — soit
  // exactement les deux pièges que la vague 5 avait nommés. Le commentaire de REGLES_CHAMP le
  // promettait déjà ; le code ne le faisait pas.
  // `affiliation` est la seule exception, et elle est explicite : sa règle ne couvre qu'un cas
  // PARTICULIER (objet → personne), son sens direct reste valable partout ailleurs.
  if (regles && cle !== 'affiliation') return null;
  // Défaut : sens direct, nature lue dans le graphe existant. Une cible PERSONNE n'y a jamais sa
  // place — une appartenance, une équipe, un clan, un métier, une résidence ne sont jamais quelqu'un.
  if (cible.type === 'character') return null;
  const n = natureDe(source, cible);
  return { from: source, to: cible, relation: n, sens: 'direct', regle: `champ « ${champ} » → nature « ${n} » (défaut du graphe)` };
};

/* ═══ Saut 1 — identifier la page de chaque isolée, sans se tromper de page ═══════════════════ */
const journal = { pageAbsente: [], redirectionSection: [], pagePartagee: [], sansInfobox: [], sansChampUtile: [], cibleRefusee: [], qualificateurRevolu: [] };

console.log(`\n→ résolution des ${lot.length} titres sur ${cfg.hote} (redirections + fragments)…`);
// SENS SOURCE : on demande au wiki le titre ANGLAIS quand une paire curée existe. `titreDemande`
// garde la correspondance dans les deux sens — la réponse du wiki est indexée sur ce qu'on a
// demandé, pas sur le nom de notre fiche.
const titreDemande = (e) => aliasSource[e.name] ?? e.name;
const parAlias = lot.filter((e) => aliasSource[e.name]);
if (parAlias.length) console.log(`  ${parAlias.length} fiche(s) demandées sous leur titre anglais curé : `
  + parAlias.map((e) => `« ${e.name} » → « ${aliasSource[e.name]} »`).join(' · '));
const pagesSource = await wikitextes(cfg.hote, lot.map(titreDemande));

// GARDE 2 — une page réclamée par PLUSIEURS de nos fiches n'identifie aucune d'elles.
const compteurPage = new Map();
for (const e of lot) { const p = pagesSource.get(titreDemande(e)); if (p) compteurPage.set(p.titre, (compteurPage.get(p.titre) ?? 0) + 1); }

const aLire = [];
let wikitexteNu = 0;
for (const e of lot) {
  const p = pagesSource.get(titreDemande(e));
  if (!p) { journal.pageAbsente.push(aliasSource[e.name] ? `${e.name} (demandée « ${aliasSource[e.name]} »)` : e.name); continue; }
  // GARDE 1 — redirection vers une SECTION : la page atteinte n'est pas celle de notre fiche.
  // « Konpira » renvoie vers « Gion#Weapons » ; l'infobox lue serait celle de Gion.
  if (p.fragment) { journal.redirectionSection.push(`${e.name} → ${p.fragment}`); continue; }
  if (compteurPage.get(p.titre) > 1) { journal.pagePartagee.push(`${e.name} → « ${p.titre} » (${compteurPage.get(p.titre)} fiches)`); continue; }
  // GARDE 3 — LA PAGE D'AUTRUI (vague 7, 10/08, mesurée sur 6 candidats faux avant écriture).
  // GARDE 1 n'attrape que les redirections vers une SECTION. Une redirection dure SANS fragment
  // vers la page d'une AUTRE de nos fiches est tout aussi trompeuse et ne se signale nulle part :
  // le wiki envoie « Ashisogi Jizo » (le zanpakutō de Mayuri) sur la page « Mayuri Kurotsuchi »,
  // et l'infobox qu'on y lit est celle de MAYURI. Sans cette garde, la fiche du sabre déclarait
  // « appartient au Gotei 13 », « habite la Soul Society », « exerce Shinigami » — trois faits
  // vrais de son porteur, faux d'elle. Idem « Hyourinmaru » → « Tōshirō Hitsugaya ».
  // Le signal est gratuit et il est dans NOTRE corpus : si le titre atteint désigne une fiche à
  // nous dont l'identifiant diffère, la page n'est pas la nôtre. (Le compteur de GARDE 2 ne le
  // voit pas : une seule de nos fiches réclame cette page-là.)
  const proprietaire = resoudre(UNIVERS, p.titre);
  if (proprietaire && proprietaire.id !== e.id) {
    journal.pageDAutrui ??= [];
    journal.pageDAutrui.push(`${e.name} → « ${p.titre} », qui EST notre fiche ${proprietaire.slug} (${proprietaire.type})`);
    continue;
  }
  // Mesure de la cause du chantier : l'infobox est-elle vide dans le wikitexte ?
  if (/\{\{\s*Infobox\s*\}\}/i.test(p.texte)) wikitexteNu++;
  aLire.push({ e, titreWiki: p.titre });
}
console.log(`  ${aLire.length} pages à rendre · ${wikitexteNu} d'entre elles ont un « {{Infobox}} » NU dans le wikitexte`);

/* ═══ MODE --citants — LE LIEN QUI EXISTE EN PUISSANCE ET QUE PERSONNE NE VIENT POSER ═════════
 * Ce script ne parcourt que les fiches ISOLÉES. C'est sa raison d'être et c'est aussi son angle
 * mort, mesuré par la vague 6 : « Archipel Totto Land » est cité par 14 fiches DÉJÀ connectées,
 * qu'aucune passe ne crawle plus — la fiche cible est née isolée et le restera, non par manque de
 * source mais parce que personne ne lit la page qui la nomme.
 *
 * La réponse évidente — parcourir tout l'univers — coûte 2 273 rendus pour One Piece. Le wiki sait
 * répondre bien moins cher : `list=backlinks` rend, pour la page d'une de nos isolées, la liste des
 * pages qui la citent. On n'ouvre alors QUE l'intersection de cette liste avec notre corpus.
 * Le filtre final est le seul qui compte : on ne garde que les arêtes dont un bout est ENCORE
 * isolé. Les autres sont peut-être vraies, mais elles ne sont pas ce chantier-ci. */
async function backlinks(hote, titre) {
  const out = [];
  let cont = null;
  for (let tour = 0; tour < 4; tour++) {
    const u = `https://${hote}/api.php?action=query&list=backlinks&format=json&formatversion=2`
      + `&blnamespace=0&bllimit=500&blfilterredir=all&bltitle=${encodeURIComponent(titre)}`
      + (cont ? `&blcontinue=${encodeURIComponent(cont)}` : '');
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) break;
      const j = await r.json();
      for (const b of j.query?.backlinks ?? []) out.push(b.title);
      cont = j.continue?.blcontinue;
      if (!cont) break;
    } catch { break; }
  }
  return out;
}

if (CITANTS) {
  const dejaLues = new Set(aLire.map((x) => x.titreWiki));
  const titresIsolees = [...dejaLues];
  console.log(`\n→ --citants : qui, dans le corpus, cite les ${titresIsolees.length} pages de nos isolées ?`);
  const citantsBruts = new Map();          // titre citant → [titres d'isolées qu'il cite]
  for (let i = 0; i < titresIsolees.length; i++) {
    process.stdout.write(`\r  backlinks ${i + 1}/${titresIsolees.length}`);
    for (const b of await backlinks(cfg.hote, titresIsolees[i])) {
      if (dejaLues.has(b)) continue;                       // une isolée qui en cite une autre : déjà dans le lot
      citantsBruts.set(b, [...(citantsBruts.get(b) ?? []), titresIsolees[i]]);
    }
    await dormir(120);
  }
  console.log(`\n  ${citantsBruts.size} pages citantes distinctes sur le wiki`);
  // On n'ouvre que celles qui SONT une de nos fiches : le reste du wiki ne nous concerne pas.
  const retenus = [];
  for (const [titre, cite] of citantsBruts) {
    const f = resoudre(UNIVERS, titre);
    if (!f || f.universe !== UNIVERS) continue;
    retenus.push({ e: f, titreWiki: titre, cite });
  }
  retenus.sort((a, b) => b.cite.length - a.cite.length);
  const PLAFOND = Number(ARG('plafond', 400));
  const garde = retenus.slice(0, PLAFOND);
  journal.citantsPlafonnes = retenus.length > PLAFOND ? retenus.length - PLAFOND : 0;
  console.log(`  ${retenus.length} d'entre elles sont une de NOS fiches ${UNIVERS}`
    + (journal.citantsPlafonnes ? ` · ${journal.citantsPlafonnes} au-delà du plafond de ${PLAFOND}, NON lues` : '')
    + ` — ${garde.length} pages ajoutées au lot à rendre`);
  for (const g of garde) aLire.push({ e: g.e, titreWiki: g.titreWiki });
}

/* ═══ Saut 2 — lire l'infobox rendue ═════════════════════════════════════════════════════════ */
const brut = [];                  // { e, champ, titre, ancre, libelle, url, ligne }
const libellesGlobaux = new Map();
for (let i = 0; i < aLire.length; i++) {
  const { e, titreWiki } = aLire[i];
  const r = await htmlRendu(cfg.hote, titreWiki);
  process.stdout.write(`\r  rendu ${i + 1}/${aLire.length}`);
  if (r.erreur) { journal.pageAbsente.push(`${e.name} (rendu: ${r.erreur})`); await dormir(200); continue; }
  const bloc = blocInfobox(r.html);
  if (!bloc) { journal.sansInfobox.push(e.name); await dormir(200); continue; }
  const { lignes, libellesVus } = lignesInfobox(bloc, EXPLORE ? null : cfg.champs);
  for (const l of libellesVus) libellesGlobaux.set(l, (libellesGlobaux.get(l) ?? 0) + 1);
  let n = 0;
  for (const l of lignes) {
    const valeur = CHAMPS_CHAINE.has(l.champ) ? dernierMaillon(l.html) : l.html;
    if (valeur !== l.html) journal.chaineTronquee ??= [], journal.chaineTronquee.push(`${e.name} · ${l.champ} : « ${l.texte.slice(0, 120)} » → dernier maillon retenu`);
    for (const c of ciblesDuHtml(valeur)) {
      if (c.revolu) { journal.qualificateurRevolu.push(`${e.name} --${l.champ}--> ${c.titre} (« ${c.revolu} »)`); continue; }
      brut.push({
        e, champ: l.champ, ...c,
        url: `https://${cfg.hote}/wiki/${encodeURIComponent(r.titre.replace(/ /g, '_'))}`,
        ligne: `${l.champ} : ${l.texte.slice(0, 160)}`,
      });
      n++;
    }
  }
  if (!n) journal.sansChampUtile.push(e.name);
  await dormir(200);              // courtoisie envers le wiki
}
console.log('');
console.log(`  cibles brutes : ${brut.length} · ${journal.qualificateurRevolu.length} refusées pour qualificateur révolu « (former…) »`);
console.log(`  libellés d'infobox rencontrés (top 25) : `
  + [...libellesGlobaux.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${k}=${v}`).join(' · '));

/* ═══ Saut 3 — la cible du lien pointe-t-elle vraiment sur la page qu'on croit ? ══════════════ */
const titresCibles = [...new Set(brut.map((b) => b.titre))];
console.log(`\n→ résolution des ${titresCibles.length} titres cibles (redirections + fragments)…`);
const pagesCibles = titresCibles.length ? await wikitextes(cfg.hote, titresCibles) : new Map();

/* Mode --explore : AVANT de choisir les champs, mesurer ce que CHACUN rendrait. C'est la leçon du
   02/08 (« vérifier D'ABORD où le texte se trouve, ENSUITE quels sont ses défauts ») appliquée aux
   arêtes : la liste de champs attendue vaut ce que vaut la mesure, pas l'inverse. */
if (EXPLORE) {
  const parChampExplore = {};
  for (const b of brut) {
    const p = pagesCibles.get(b.titre);
    const titreFinal = p && !p.fragment ? p.titre : null;
    const cible = titreFinal ? (resoudre(UNIVERS, titreFinal) ?? resoudre(UNIVERS, b.titre)) : null;
    const c = (parChampExplore[b.champ] ??= { liens: 0, resolus: 0, versTypes: {}, exemplesResolus: [], exemplesPerdus: {} });
    c.liens++;
    if (!cible) { c.exemplesPerdus[b.titre] = (c.exemplesPerdus[b.titre] ?? 0) + 1; continue; }
    c.resolus++;
    c.versTypes[cible.type] = (c.versTypes[cible.type] ?? 0) + 1;
    if (c.exemplesResolus.length < 8) c.exemplesResolus.push(`${b.e.name} (${b.e.type}) → ${cible.name} (${cible.type})`);
  }
  const classe = Object.entries(parChampExplore).sort((a, b) => b[1].resolus - a[1].resolus);
  console.log('\n=== RENDEMENT MESURÉ, CHAMP PAR CHAMP ===');
  for (const [champ, c] of classe) {
    if (!c.liens) continue;
    console.log(`\n${champ}  —  ${c.liens} liens · ${c.resolus} résolus en base · types visés : ${Object.entries(c.versTypes).map(([k, v]) => `${k}=${v}`).join(' ') || '—'}`);
    for (const x of c.exemplesResolus.slice(0, 4)) console.log(`    ✓ ${x}`);
    const perdus = Object.entries(c.exemplesPerdus).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (perdus.length) console.log(`    ✗ absents de la base : ${perdus.map(([t, n]) => `${t}×${n}`).join(' · ')}`);
  }
  const sortie = path.join(ROOT, `data/audits/isolees-html-${UNIVERS.toLowerCase().replace(/\W+/g, '-')}-explore-${HORODATE}.json`);
  fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), univers: UNIVERS, pagesLues: aLire.length, ciblesBrutes: brut.length, parChamp: parChampExplore, journal }, null, 1));
  console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
  process.exit(0);
}

/* ═══ Saut 3 bis — le pont rōmaji, pour les cibles que la base nomme en français ══════════════
   « Ice Release » n'existe pas chez nous ; « Libération de la Glace (Hyōton) » si. Le témoin n'est
   pas une ressemblance de libellé mais le champ « Rōmaji » de l'infobox de la page cible, exigé
   ÉGAL (après normalisation) à la parenthèse de notre nom. Aucune inclusion de mots : c'est elle
   qui avait fait passer « Île Patate » pour le pirate « Potato » le 07/08. */
const pontRomaji = new Map();     // titre wiki → { fiche, romaji, url }
if (cfg.champRomaji) {
  const orphelins = [...new Set(brut.map((b) => (pagesCibles.get(b.titre)?.fragment ? null : (pagesCibles.get(b.titre)?.titre ?? b.titre)))
    .filter((t) => t && !resoudre(UNIVERS, t)))];
  console.log(`\n→ pont rōmaji sur ${orphelins.length} cibles sans fiche de même nom…`);
  for (let i = 0; i < orphelins.length; i++) {
    const t = orphelins[i];
    process.stdout.write(`\r  ${i + 1}/${orphelins.length}`);
    const r = await htmlRendu(cfg.hote, t);
    if (r.erreur) continue;
    const bloc = blocInfobox(r.html);
    if (!bloc) continue;
    const ligne = lignesInfobox(bloc, [cfg.champRomaji]).lignes[0];
    const romaji = ligne?.texte?.trim();
    if (!romaji) continue;
    const trouves = indexParenthese.get(`${UNIVERS}|${norm(romaji)}`) ?? [];
    if (trouves.length !== 1) continue;
    pontRomaji.set(t, { fiche: trouves[0], romaji, url: `https://${cfg.hote}/wiki/${encodeURIComponent(r.titre.replace(/ /g, '_'))}` });
    await dormir(150);
  }
  console.log(`\n  ${pontRomaji.size} cibles rattachées par leur rōmaji : `
    + [...pontRomaji.entries()].map(([t, v]) => `${t} → ${v.fiche.name}`).join(' · '));
}

const candidats = [];
const vues = new Set();
const echecs = [];
for (const b of brut) {
  const p = pagesCibles.get(b.titre);
  if (!p) { echecs.push({ ...b, e: b.e.name, motif: 'page cible absente' }); continue; }
  // GARDE 1 au second saut aussi : une cible qui redirige vers une SECTION désigne un morceau
  // d'une autre entité — « Okobore Town » → « Kuri#Okobore Town » servait le rname de la RÉGION.
  if (p.fragment) { journal.redirectionSection.push(`cible ${b.titre} → ${p.fragment}`); echecs.push({ ...b, e: b.e.name, motif: `cible redirigée vers une section (${p.fragment})` }); continue; }
  const pont = pontRomaji.get(p.titre) ?? pontRomaji.get(b.titre);
  const cible = resoudre(UNIVERS, p.titre) ?? resoudre(UNIVERS, b.titre) ?? pont?.fiche ?? null;
  if (!cible) { echecs.push({ ...b, e: b.e.name, motif: `aucune fiche ${UNIVERS} nommée « ${p.titre} »` }); continue; }
  if (cible.id === b.e.id) continue;
  if (cible.universe !== b.e.universe) continue;                 // garde-fou inter-univers
  const a = areteDe(b.e, cible, b.champ);
  if (!a) { journal.cibleRefusee.push(`${b.e.name} --${b.champ}--> ${cible.name} (personne, et aucune règle de champ ne couvre ce couple de types)`); echecs.push({ ...b, e: b.e.name, motif: `cible de type personnage (${cible.name})` }); continue; }
  const relation = a.relation;
  const cle = `${a.from.id}|${a.to.id}|${relation}`;
  if (areteExistante.has(cle) || vues.has(cle)) continue;
  vues.add(cle);
  candidats.push({
    from_entry: a.from.id, to_entry: a.to.id, relation, sens: a.sens,
    de: a.from.name, deSlug: a.from.slug, deType: a.from.type,
    vers: a.to.name, versSlug: a.to.slug, versType: a.to.type,
    lue: b.e.name, gisement: 'infobox',
    champ: b.champ, titreWiki: b.titre, titreResolu: p.titre, ancre: b.ancre, libelleAffiche: b.libelle,
    voie: pont && !resoudre(UNIVERS, p.titre) && !resoudre(UNIVERS, b.titre) ? 'rōmaji' : 'nom direct',
    sauveDe: estIsolee(a.from.id), sauveVers: estIsolee(a.to.id),
    source_url: b.url,
    preuve: `${b.url} · infobox rendue, ligne « ${b.ligne} » → lien /wiki/${b.titre.replace(/ /g, '_')}`
      + (p.titre !== b.titre ? ` (redirige vers « ${p.titre} »)` : '')
      + (pont && !resoudre(UNIVERS, p.titre) && !resoudre(UNIVERS, b.titre)
        ? ` ; ${pont.url} porte « Rōmaji : ${pont.romaji} », égal à la parenthèse de notre fiche`
        : ` ; fiche ${UNIVERS} de ce nom :`)
      + ` ${cible.name} (${cible.slug}, type ${cible.type}) ; ${a.regle}`,
  });
}

/* ═══ SECOND GISEMENT — LA REDIRECTION DURE VERS UNE SECTION (vague 7, 10/08) ═════════════════
 * GARDE 1 refuse depuis la vague 4 toute fiche dont le titre redirige vers « Page#Section » : lire
 * l'infobox de la page atteinte, ce serait prêter à notre fiche celle d'une AUTRE entité. La garde
 * est juste et elle reste. Mais elle jetait avec l'eau du bain un FAIT que la redirection énonce
 * elle-même, et qui est le premier gisement des isolées de Bleach (22 des 42) et le troisième de
 * One Piece (15) : une redirection dure dit « ce dont je parle est traité DANS cet article-là ».
 *
 * Deux formes seulement sont retenues, parce que deux seulement portent une phrase exacte :
 *   · La page atteinte est un GROUPE ou un LIEU de notre corpus — « Acrobatic Fuwas #1 →
 *     Buggy Pirates#Acrobatic Fuwas », « Arrow → Tsumegeri Guards#Arrow ». La phrase est
 *     l'appartenance, écrite par `natureDe` comme partout ailleurs.
 *   · La section s'appelle « Zanpakutō » ou « Weapons » et la page atteinte est un PERSONNAGE —
 *     « Suzumebachi → Suì-Fēng#Zanpakutō », « Konpira → Gion#Weapons ». Le nom de la section EST
 *     le nom de la relation ; l'arête est INVERSE et de nature `possede`, exactement les 6 arêtes
 *     `possede` que Bleach porte déjà (`byakuya-kuchiki → senbonzakura`).
 *
 * REFUSÉ, et c'est le cœur de la règle : une section qui porte simplement NOTRE NOM dans l'article
 * d'un PERSONNAGE (« Baigon → Orihime Inoue#Baigon ») ne nomme aucune relation — elle dit où le
 * wiki a rangé son paragraphe, pas ce que les deux entités sont l'une pour l'autre. Et les pages
 * de ramassage (« Minor Characters », « List of tertiary characters », « Miscellaneous Shinigami »)
 * ne sont pas des entités : elles ne résolvent sur aucune de nos fiches, donc elles ne produisent
 * rien — la garde est le corpus lui-même, pas une liste de titres à maintenir. */
const SECTION_POSSESSION = new Set(['zanpakuto', 'zanpakutō', 'weapons', 'weapon', 'sword', 'swords']);
const fragCand = [];
for (const e of lot) {
  const p = pagesSource.get(titreDemande(e));
  if (!p?.fragment) continue;
  const [titreCible, ...reste] = p.fragment.split('#');
  const section = reste.join('#');
  const cible = resoudre(UNIVERS, titreCible);
  if (!cible || cible.id === e.id || cible.universe !== e.universe) {
    journal.fragmentSansCible ??= [];
    journal.fragmentSansCible.push(`${e.name} → ${p.fragment}${cible ? '' : ' (page de ramassage : aucune fiche de ce nom)'}`);
    continue;
  }
  let a = null;
  if (cible.type === 'character') {
    if (SECTION_POSSESSION.has(section.toLowerCase().trim())) a = { from: cible, to: e, relation: 'possede', sens: 'inverse', regle: `section « ${section} » → arête INVERSE de nature « possede »` };
  } else {
    const n = natureDe(e, cible);
    a = { from: e, to: cible, relation: n, sens: 'direct', regle: `page de groupe/lieu → nature « ${n} »` };
  }
  if (!a) {
    journal.fragmentRefuse ??= [];
    journal.fragmentRefuse.push(`${e.name} → ${p.fragment} (section dans l'article d'un personnage, aucune relation nommée)`);
    continue;
  }
  const cle = `${a.from.id}|${a.to.id}|${a.relation}`;
  if (areteExistante.has(cle) || vues.has(cle)) continue;
  vues.add(cle);
  const c = {
    from_entry: a.from.id, to_entry: a.to.id, relation: a.relation, sens: a.sens,
    de: a.from.name, deSlug: a.from.slug, deType: a.from.type,
    vers: a.to.name, versSlug: a.to.slug, versType: a.to.type,
    lue: e.name, gisement: 'redirection de section',
    champ: `redirection → #${section}`, titreWiki: titreDemande(e), titreResolu: titreCible, ancre: section, libelleAffiche: null,
    voie: 'redirection dure', sauveDe: estIsolee(a.from.id), sauveVers: estIsolee(a.to.id),
    source_url: `https://${cfg.hote}/wiki/${encodeURIComponent(titreDemande(e).replace(/ /g, '_'))}`,
    preuve: `https://${cfg.hote}/wiki/${encodeURIComponent(titreDemande(e).replace(/ /g, '_'))}`
      + ` · le wiki redirige ce titre vers « ${p.fragment} » (redirection DURE, api.php action=query&redirects=1, champ tofragment)`
      + ` ; fiche ${UNIVERS} nommée « ${titreCible} » : ${cible.name} (${cible.slug}, type ${cible.type}) ; ${a.regle}`,
  };
  fragCand.push(c);
  candidats.push(c);
}
console.log(`\n→ second gisement (redirections de section) : ${fragCand.length} arête(s) candidate(s)`
  + ` · ${journal.fragmentSansCible?.length ?? 0} sans fiche cible · ${journal.fragmentRefuse?.length ?? 0} refusées (section dans un article de personnage)`);

/* En mode --citants, le lot contient des fiches DÉJÀ connectées : leurs infobox produisent quantité
 * d'arêtes vraies mais hors sujet (« Sanji habite East Blue »). Ce chantier ne pose que ce qui SORT
 * une fiche de l'isolement — le reste appartient à un chantier d'enrichissement, pas à celui-ci. */
if (CITANTS) {
  const avantFiltre = candidats.length;
  const garde = candidats.filter((c) => estIsolee(c.from_entry) || estIsolee(c.to_entry));
  candidats.length = 0;
  candidats.push(...garde);
  console.log(`\n--citants : ${avantFiltre} arêtes candidates, dont ${garde.length} touchent une fiche ENCORE isolée`
    + ` (${avantFiltre - garde.length} écartées : vraies peut-être, mais elles ne sortent personne de l'isolement)`);
}

/* ═══ Bilan mesuré AVANT toute écriture ══════════════════════════════════════════════════════ */
const sauvees = new Set();
for (const c of candidats) { if (c.sauveDe) sauvees.add(c.from_entry); if (c.sauveVers) sauvees.add(c.to_entry); }
const parNature = {}, parChamp = {}, motifsEchec = {};
for (const c of candidats) { parNature[c.relation] = (parNature[c.relation] ?? 0) + 1; parChamp[c.champ] = (parChamp[c.champ] ?? 0) + 1; }
for (const x of echecs) { const k = x.motif.replace(/«[^»]*»/g, '«…»').replace(/\([^)]*\)/g, '(…)'); motifsEchec[k] = (motifsEchec[k] ?? 0) + 1; }

console.log(`\n=== BILAN AVANT ÉCRITURE ===`);
console.log(`arêtes candidates : ${candidats.length}`);
console.log(`par nature : ${Object.entries(parNature).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · ') || '—'}`);
console.log(`par champ  : ${Object.entries(parChamp).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · ') || '—'}`);
console.log(`échecs     : ${Object.entries(motifsEchec).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} = ${v}`).join('\n             ') || '—'}`);
console.log(`isolées ${UNIVERS} sorties : ${[...sauvees].filter((id) => lot.some((e) => e.id === id)).length} / ${lot.length}`);

const trace = path.join(ROOT, `data/audits/isolees-html-${UNIVERS.toLowerCase().replace(/\W+/g, '-')}-${SONDE ? 'sonde' : 'trace'}-${HORODATE}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: `sortir les isolées ${UNIVERS} par l'infobox RENDUE`, quand: new Date().toISOString(),
  mode: SONDE ? 'sonde' : 'écriture', hote: cfg.hote, champs: cfg.champs,
  avant: { fiches: entries.length, aretes: rels.length, isoleesTotales: isolees.length, isoleesUnivers: lot.length },
  pagesLues: aLire.length, wikitexteInfoboxNue: wikitexteNu,
  libellesInfobox: Object.fromEntries([...libellesGlobaux.entries()].sort((a, b) => b[1] - a[1])),
  ciblesBrutes: brut.length,
  attendu: { aretes: candidats.length, isoleesSorties: sauvees.size },
  parNature, parChamp, motifsEchec, journal,
  candidats,
  echecs: echecs.map((x) => ({ de: x.e, champ: x.champ, titreWiki: x.titre, libelle: x.libelle, motif: x.motif })),
}, null, 1));
console.log(`\ntrace AVANT écriture : ${path.relative(ROOT, trace)}`);

if (VERIF) {
  console.log('\n=== 20 CAS À RELIRE À LA MAIN ===');
  const pas = Math.max(1, Math.floor(candidats.length / 20));
  for (const c of candidats.filter((_, i) => i % pas === 0).slice(0, 20)) {
    console.log(`\n· ${c.de} (${c.deType}) --${c.relation}--> ${c.vers} (${c.versType})   [sens ${c.sens}, lu sur la fiche « ${c.lue} », gisement ${c.gisement}]`);
    console.log(`  champ « ${c.champ} » · lien [[${c.titreWiki}]]${c.titreResolu !== c.titreWiki ? ` → « ${c.titreResolu} »` : ''} · libellé affiché « ${c.libelleAffiche} »`);
    console.log(`  ${c.source_url}`);
    console.log(`  preuve : ${c.preuve}`);
  }
}

if (SONDE) { console.log('\n--sonde : rien écrit.'); process.exit(0); }

/* ═══ Écriture. Seule table touchée : akasha_relations. ══════════════════════════════════════ */
let ecrites = 0, erreurs = 0;
for (let i = 0; i < candidats.length; i += 200) {
  const paquet = candidats.slice(i, i + 200).map((c) => ({ from_entry: c.from_entry, to_entry: c.to_entry, relation: c.relation }));
  const { data, error } = await db.from('akasha_relations')
    .upsert(paquet, { onConflict: 'from_entry,to_entry,relation', ignoreDuplicates: true })
    .select('id');
  if (error) { console.error(`  ✗ paquet ${i} : ${error.message}`); erreurs += paquet.length; continue; }
  ecrites += data?.length ?? 0;
  process.stdout.write(`\r  écrites ${ecrites}/${candidats.length}`);
}
console.log('');

const apresRels = await page('akasha_relations', 'from_entry, to_entry');
const deg2 = new Set();
for (const r of apresRels) { deg2.add(r.from_entry); deg2.add(r.to_entry); }
const isoApres = entries.filter((e) => !deg2.has(e.id));
console.log(`\nAPRÈS : ${apresRels.length} arêtes · ${isoApres.length} isolées`
  + ` (dont ${isoApres.filter((e) => e.universe === UNIVERS).length} en ${UNIVERS})`
  + `  — avant ${rels.length} / ${isolees.length} (dont ${lot.length})`);

const exec = path.join(ROOT, `data/audits/isolees-html-${UNIVERS.toLowerCase().replace(/\W+/g, '-')}-exec-${HORODATE}.json`);
fs.writeFileSync(exec, JSON.stringify({
  quand: new Date().toISOString(), tentees: candidats.length, ecrites, erreurs,
  avant: { aretes: rels.length, isolees: isolees.length, isoleesUnivers: lot.length },
  apres: { aretes: apresRels.length, isolees: isoApres.length, isoleesUnivers: isoApres.filter((e) => e.universe === UNIVERS).length },
  fichesDesisolees: lot.filter((e) => deg2.has(e.id)).map((e) => ({ name: e.name, slug: e.slug, type: e.type })),
}, null, 1));
console.log(`trace d'exécution : ${path.relative(ROOT, exec)}`);
