// lib/akasha/relation-labels.ts — dictionnaire FR DIRECTIONNEL des natures d'arêtes `akasha_relations`.
// Extrait de components/akasha/zone/EntityZone.tsx (LOT 3a) pour être réutilisable côté SERVEUR
// (lib/akasha/queries.ts, profil relationnel des pages d'axe) sans dépendre d'un composant
// 'use client'. Fichier server-safe : aucune JSX, aucun hook — importable des deux côtés.
//
// LE SENS N'EST PAS DÉCORATIF (08/08). Une arête a une direction, et la même étiquette lue à
// l'envers dit le contraire de la vérité : la fiche « Fruit du Démon » reçoit 210 arêtes
// `appartient` ENTRANTES depuis les fruits individuels, et les afficher « Appartient à » lui
// faisait déclarer qu'elle appartient à chacun d'eux — l'inverse exact du canon. Les relations
// réflexives (allié, ennemi, rival, famille, jumeau) se lisent pareil dans les deux sens et
// gardent donc leur libellé ; les autres prennent leur forme passive.
//
// ⚠️ SOURCE UNIQUE : ne pas dupliquer ces deux dictionnaires ailleurs (ex. l'ancien
// `RELATION_LABELS`/`relationLabel` de lib/akasha/types.ts est un troisième dictionnaire,
// direction-naïf, hérité d'avant ce correctif — ne pas s'en servir pour du neuf).

/** Libellés FR de toutes les natures de lien rencontrées sur ce corpus (mesuré 08/08/2026 :
 *  appartient, maitrise, habite, exerce, possede, allie, ennemi, rival, famille, mentor, eleve,
 *  + 4 relations Dragon Ball à faible volume). Une relation absente de cette liste garde son nom
 *  brut plutôt que de disparaître silencieusement — jamais un lien perdu par oubli de dictionnaire. */
export const RELATION_LABELS: Record<string, string> = {
  maitrise: 'Maîtrise', possede: 'Possède', exerce: 'Exerce', habite: 'Habite',
  appartient: 'Appartient à', allie: 'Allié', ennemi: 'Ennemi', rival: 'Rival',
  mentor: 'Mentor', eleve: 'Élève', famille: 'Famille',
  jumeau: 'Jumeau', ange: 'Ange gardien', kaio_shin: 'Kaiō shin', dieu_destruction: 'Dieu de la destruction',
};

export const RELATIONS_REFLEXIVES = new Set(['allie', 'ennemi', 'rival', 'famille', 'jumeau']);

export const RELATION_LABELS_ENTRANT: Record<string, string> = {
  maitrise: 'Maîtrisé par', possede: 'Possédé par', exerce: 'Exercé par', habite: 'Habité par',
  appartient: 'Regroupe', mentor: 'Élève', eleve: 'Mentor',
  ange: 'Ange gardien de', kaio_shin: 'Kaiō shin de', dieu_destruction: 'Dieu de la destruction de',
};

/** Le libellé d'une arête vue depuis la fiche COURANTE, selon le sens où elle la traverse. */
export function libelle(relation: string, entrant: boolean): string {
  return !entrant || RELATIONS_REFLEXIVES.has(relation)
    ? RELATION_LABELS[relation] ?? relation
    : RELATION_LABELS_ENTRANT[relation] ?? RELATION_LABELS[relation] ?? relation;
}
