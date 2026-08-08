// lib/akasha/shape.ts — LE CONTRAT du LOT 2 (« la fiche unique ») : quels modules une fiche AKASHA
// a le DROIT de monter, décidé d'après ses CAPACITÉS RÉELLEMENT PRÉSENTES — jamais d'après son
// `type`. C'est tout l'enjeu (cf. tasks/akasha-architecture.md, LOT 2a) : un aiguillage par `type`
// oblige à énumérer d'avance ce qu'un 9ᵉ univers apportera ; un aiguillage par capacité s'y adapte
// tout seul. La garantie n'est pas qu'une discipline : `ShapeEntry`, plus bas, ne porte même PAS de
// champ `type` — il est structurellement impossible d'écrire `entry.type === …` dans ce fichier.
//
// Fonction PURE, sans I/O : `deriveShape` ne lit QUE l'objet qu'on lui donne (attributs déjà
// résolus, relations déjà jointes par `getEntryBySlug`). Elle ne touche jamais Supabase — c'est
// pour ça qu'elle est testable sans base (voir shape.test.ts) et importable des deux côtés (Next
// et les scripts .mjs, comme lib/akasha/relations.ts et lib/akasha/sections.ts) : ce fichier ne
// contient QUE de la syntaxe effaçable — pas d'enum, pas de namespace.
//
// RÈGLE ABSOLUE (rappel Dan) : un module absent n'est PAS monté. Jamais un état vide déguisé,
// jamais un titre de section suivi de rien — chaque garde ci-dessous existe pour qu'un module ne
// soit proposé QUE quand le composant qui le rend aura vraiment quelque chose à afficher.
import type { AkashaType } from './types';
import { taxonomyByName } from './universe-taxonomy';

// ─── Le vocabulaire des modules ──────────────────────────────────────────
// Ordre = celui énuméré par le plan (tasks/akasha-architecture.md, LOT 2a). Ce n'est PAS l'ordre
// de rendu à l'écran (ça, c'est la hiérarchie de lecture à six niveaux du LOT 2b/EntityZone,
// tasks/akasha-hierarchies.md §3) — juste un ordre stable et déterministe pour les tests et les
// diffs.
export const AKASHA_MODULES = [
  'identity',
  'axis',
  'relations',
  'sections',
  'timeline',
  'orbit',
  'stats',
] as const;
export type AkashaModule = (typeof AKASHA_MODULES)[number];

// ─── Le contrat d'entrée ──────────────────────────────────────────────────
// Volontairement plus ÉTROIT que `AkashaEntryDetail` (lib/akasha/types.ts) : deriveShape ne lit
// que ces quatre champs, donc un test n'a jamais à fabriquer un id/slug/name/rarity/created_at
// bidon. `AkashaEntryDetail` satisfait cette forme telle quelle (typage structurel) — le retour de
// `getEntryBySlug` se passe donc tel quel à `deriveShape`, sans adaptation.
//
// Absence délibérée de `type` : voir le commentaire d'en-tête. Une relation ne porte, elle aussi,
// que le type de sa CIBLE (nécessaire au module `orbit`, ci-dessous) — jamais la nature de
// l'entrée elle-même.
export interface ShapeRelation {
  relation: string;
  target: { type: AkashaType };
}

export interface ShapeEntry {
  universe: string | null;
  attributes: Record<string, unknown>;
  relationsOut: ShapeRelation[];
  relationsIn: ShapeRelation[];
}

// ─── Seuils, et leur POURQUOI ─────────────────────────────────────────────

// `orbit` (« organisation à membres denses ») partage le seuil du garde-fou de volume du LOT 2b :
// « au-delà de 12 éléments dans une grappe, replier en 'voir les N autres' ». Au-delà de CETTE
// MÊME ligne, une relation de MEMBRES (habite/appartient) cesse d'être une grappe pliable pour
// devenir un collectif : Konohagakure (503 arêtes habite/appartient entrantes, mesuré 08/08/2026)
// rendu en liste-qui-replie serait un mur de liens sans valeur ; rendu en puits + orbites
// (le patron déjà en code dans OrganizationZone), les membres les plus notables restent lisibles
// et le reste devient un compteur honnête. Mesuré sur les 333 fiches `place` du corpus, la coupure
// est nette, pas un artefact d'un seuil choisi au hasard : 176 fiches à 0 membre, 100 à 1-5,
// 32 à 6-12 (le garde-fou de 2b suffit) — puis un décrochage à 25 fiches au-delà de 12, dont
// plusieurs dans la centaine (grand-line 104, soul-society 93, konohagakure 503).
//
// ⚠ NUANCE DE ROUTAGE (relevée à l'épreuve du LOT 2, 08/08) : Konohagakure, grand-line,
// soul-society, marineford, morioh, namek et hueco-mundo portent `eras` et sont donc servies par
// EraZone AVANT d'atteindre EntityZone — les trois exemples cités ci-dessus, les plus
// spectaculaires, n'empruntent PAS ce chemin aujourd'hui. Ils restent le bon argument pour le
// seuil (la mesure vaut, elle vient du corpus entier) mais ne sont pas des cas d'école du module
// `orbit` tel qu'il est monté : les 21 fiches qui le déclenchent réellement sont plus modestes.
// Le repli d'EraZone dans un module `timeline` est prévu au LOT 5 ; ce jour-là, ces sept fiches
// rejoindront le chemin commun et le module `orbit` prendra tout son sens.
export const ORBIT_MIN_MEMBERS = 12;

// Relations qui signifient « appartenance à un collectif », jamais « usage » ou « mastery » — une
// technique maîtrisée par 100 personnages (`maitrise` entrante, ex. Rasengan) n'est pas un
// collectif à mettre en orbite, c'est une liste de pratiquants : elle reste dans `relations`
// (repliée par le garde-fou de 2b, pas migrée vers `orbit`). `habite` (un lieu) et `appartient`
// (une organisation/faction) sont les deux seules relations où la CIBLE EST le collectif.
const MEMBERSHIP_RELATIONS = new Set(['habite', 'appartient']);

// ─── Petites gardes, une par capacité ─────────────────────────────────────

/** Une valeur d'attribut JSONB compte comme « peuplée » si c'est une chaîne non vide ou un
 *  tableau non vide ; tout le reste (booléen, nombre, objet) retombe sur sa véracité JS. Les
 *  valeurs d'axe du corpus (village, clan, crew, race…) sont toujours l'un des deux premiers cas —
 *  voir lib/akasha/universe-taxonomy.ts, `AxisValue.v: string`. */
function estPeuplee(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

/** `axis` : dès qu'UN axe canon de l'univers de l'entrée est peuplé dans ses attributs. Un univers
 *  sans taxonomie (9ᵉ univers pas encore décrit dans UNIVERSE_TAXONOMY, ou `universe: null`) ne
 *  peut structurellement proposer aucun axe — LOT 7, pas un bug de ce fichier. Lit la taxonomie
 *  réelle (jamais une liste recopiée ici) : une nouvelle valeur d'axe ajoutée dans
 *  universe-taxonomy.ts est visible ici sans y toucher. */
function aUnAxePeuple(universe: string | null, attributes: Record<string, unknown>): boolean {
  if (!universe) return false;
  const taxonomie = taxonomyByName(universe);
  if (!taxonomie) return false;
  return taxonomie.axes.some((axe) => estPeuplee(attributes[axe.attr]));
}

/** `relations` : au moins une arête, dans un sens ou l'autre. Aucun seuil — dès 1, il y a quelque
 *  chose à monter (le garde-fou de volume, lui, vit dans le composant LOT 2b, pas ici : deriveShape
 *  décide SI le module existe, pas comment il replie au-delà de 12). */
function aUneArete(entry: ShapeEntry): boolean {
  return entry.relationsOut.length + entry.relationsIn.length > 0;
}

/** Une section « lisible » exige titre ET texte — exactement le filtre de
 *  components/akasha/DossierSections.tsx (`s?.titre && s?.texte`). Sans cette garde IDENTIQUE,
 *  `sections` pourrait se monter pour une entrée dont la seule section a un texte sans titre (ou
 *  l'inverse) : le composant rendrait `null` et on aurait un module fantôme — exactement l'« état
 *  vide déguisé » que Dan proscrit. */
function aUneSectionLisible(list: unknown): boolean {
  if (!Array.isArray(list)) return false;
  return list.some((s) => {
    if (!s || typeof s !== 'object') return false;
    const section = s as { titre?: unknown; texte?: unknown };
    return Boolean(section.titre) && Boolean(section.texte);
  });
}

/** `sections` lit `attributes.sections` — le champ où `getEntryBySlug` réinjecte déjà les lignes
 *  résolues de `akasha_sections` (lib/akasha/queries.ts l.262, arbitrage A5 : la fusion en mémoire
 *  reste en place tant que l'étape 3 de l'arbitrage n'a pas tourné). deriveShape n'interroge donc
 *  jamais la table : elle fait confiance à l'objet qu'on lui passe, comme le reste de ce fichier. */
function aDesSectionsLisibles(attributes: Record<string, unknown>): boolean {
  return aUneSectionLisible(attributes.sections);
}

/** Un tableau (forms/eras) compte comme « non vide » s'il contient au moins un ÉLÉMENT-OBJET —
 *  même garde que `normalizeForms` (lib/akasha/forms.ts) et le filtre de `EraZone.tsx` :
 *  `[null, null]` ou `["texte"]` ne sont pas des formes/ères exploitables. */
function aDesElementsObjets(value: unknown): boolean {
  return Array.isArray(value) && value.some((x) => x !== null && typeof x === 'object');
}

/** `timeline` : `attributes.forms` OU `attributes.eras` non vide — jamais les deux exigés (Death
 *  Note a des `eras` sans `forms` ; la plupart des personnages à formes n'ont pas d'`eras`). */
function aUneChronologie(attributes: Record<string, unknown>): boolean {
  return aDesElementsObjets(attributes.forms) || aDesElementsObjets(attributes.eras);
}

/** `orbit` : plus de ORBIT_MIN_MEMBERS arêtes ENTRANTES de membership (habite/appartient) dont la
 *  CIBLE (l'autre bout, donc l'entrée elle-même vue depuis relationsIn) est un `character` — un
 *  artefact « appartenant » à une organisation (l'arsenal, dans OrganizationZone) n'est pas un
 *  MEMBRE, il ne compte pas dans ce total. */
function aUneAppartenanceDense(entry: ShapeEntry): boolean {
  const membres = entry.relationsIn.filter(
    (r) => MEMBERSHIP_RELATIONS.has(r.relation) && r.target.type === 'character',
  );
  return membres.length > ORBIT_MIN_MEMBERS;
}

/** `stats` : VERROUILLÉ aux databooks canon Naruto (décision Dan, 06/08/2026) — refusé PARTOUT
 *  ailleurs, même quand `attributes.forms[i].stats` existe réellement. Mesuré le 08/08/2026 :
 *  37 fiches portent un radar sur au moins une forme, dont seulement 27 sont Naruto ; les 10
 *  autres (l-lawliet, monkey-d-luffy, roronoa-zoro, ichigo-kurosaki, killua-zoldyck,
 *  takumi-fujiwara, gon-freecss, dio-brando, jotaro-kujo, light-yagami) restent affichables
 *  ailleurs dans le site (CharacterZone les marque « estimées »), mais PAS via ce module : c'est
 *  le sens même du verrouillage — la fonction DOIT refuser, pas seulement déconseiller. Les stats
 *  vivent par FORME (`f.stats`), jamais à la racine de `attributes` — la même route que lit déjà
 *  CharacterZone.tsx (`f.stats && typeof f.stats === 'object'`). */
function aDesStatsCanonNaruto(universe: string | null, attributes: Record<string, unknown>): boolean {
  if (universe !== 'Naruto') return false;
  const forms = Array.isArray(attributes.forms) ? attributes.forms : [];
  return forms.some((f) => {
    if (!f || typeof f !== 'object') return false;
    const stats = (f as Record<string, unknown>).stats;
    return Boolean(stats) && typeof stats === 'object';
  });
}

// ─── Le contrat ─────────────────────────────────────────────────────────

/** Modules à monter pour une entrée, d'après ses capacités réellement présentes. `identity` est
 *  toujours en tête (socle niveau 0 de la hiérarchie de lecture, 100 % de couverture mesurée —
 *  tasks/akasha-hierarchies.md §3) ; les six autres ne s'ajoutent que si LEUR garde passe. */
export function deriveShape(entry: ShapeEntry): AkashaModule[] {
  const modules: AkashaModule[] = ['identity'];

  if (aUnAxePeuple(entry.universe, entry.attributes)) modules.push('axis');
  if (aUneArete(entry)) modules.push('relations');
  if (aDesSectionsLisibles(entry.attributes)) modules.push('sections');
  if (aUneChronologie(entry.attributes)) modules.push('timeline');
  if (aUneAppartenanceDense(entry)) modules.push('orbit');
  if (aDesStatsCanonNaruto(entry.universe, entry.attributes)) modules.push('stats');

  return modules;
}
