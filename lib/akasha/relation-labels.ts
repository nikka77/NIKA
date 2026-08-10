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

// ─── LE RESTE DES ARÊTES — le lecteur qui ne peut pas laisser de trou (10/08/2026) ─────────
//
// POURQUOI CE HELPER EXISTE. Le soir du 10/08, 3 830 arêtes `appartient`/`habite`/`exerce` de
// personnages ont été trouvées invisibles ; le correctif a ouvert CES TROIS natures-là dans
// CharacterZone. Recensé le lendemain sur le corpus paginé (7 654 fiches, 16 910 arêtes), il en
// restait 2 518 demi-arêtes qu'aucune grappe ne rendait — parce que chaque zone ÉNUMÉRAIT les
// natures qu'elle accepte, et qu'une énumération est un trou en attente : `possede` sortant (706
// demi-arêtes, dont l'arsenal entier de Tenten) n'était nommé nulle part côté source, et
// OrganizationZone ne lisait QUE `relationsIn` — ses 280 arêtes sortantes (les 16 techniques du
// clan Aburame, l'appartenance de Team Guy à Konohagakure…) n'avaient aucun point de rendu.
//
// D'où l'inversion de charge : au lieu d'énumérer ce qu'on ACCEPTE, on déclare ce qui est DÉJÀ
// rendu ailleurs sur la fiche et on rend TOUT LE RESTE. Une nature inconnue de tous les
// dictionnaires garde son nom brut (cf. RELATION_LABELS) mais ne peut plus DISPARAÎTRE — c'est le
// même principe que `deriveShape` (lib/akasha/shape.ts) : décider par capacité, jamais par une
// liste fermée qu'il faudra penser à rallonger.
//
// LE SENS EST PORTÉ PAR `libelle()`, jamais par l'appelant : c'est la garantie que le demi-lien
// entrant ne redira pas le libellé sortant — la faute du 08/08 sur « Fruit du Démon », qui
// affirmait l'exact contraire du canon.

/** Une arête prête à être rendue en chip : son libellé DANS LE SENS où la fiche courante la
 *  traverse, plus l'autre bout déjà résolu. `entrant` est conservé pour que l'appelant puisse
 *  trier ou styler par sens sans recalculer la direction. */
export interface AreteVue<T> {
  label: string;
  relation: string;
  entrant: boolean;
  target: T;
}

/** Toutes les arêtes de l'entrée que la fiche ne rend PAS encore, dans les deux sens, chacune sous
 *  son libellé directionnel.
 *
 *  @param dejaRendu prédicat de la ZONE appelante : « cette demi-arête est-elle déjà montrée par
 *    une autre grappe de cette même fiche ? ». C'est le seul endroit où une zone énumère — et ce
 *    qu'elle énumère est ce qu'elle AFFICHE, pas ce qu'elle accepte : un oubli y produit un
 *    doublon visible, jamais un silence.
 *
 *  DÉDOUBLONNAGE PAR (slug, libellé) et non par slug seul : 231 paires d'entités du corpus sont
 *  reliées par DEUX natures (mesuré le 10/08) — dédoublonner par slug seul en perdrait une. Et pas
 *  par (nom, libellé) non plus : trois entités distinctes s'appellent « Hina ». Le slug est
 *  l'identité (leçon du 10/08 sur « Habité par · 449 », qui comptait des arêtes pour des
 *  personnes). */
export function autresAretes<T extends { slug: string }>(
  relationsOut: readonly { relation: string; target: T }[],
  relationsIn: readonly { relation: string; target: T }[],
  dejaRendu: (relation: string, entrant: boolean, target: T) => boolean,
): AreteVue<T>[] {
  const vues: AreteVue<T>[] = [
    ...relationsOut
      .filter((r) => !dejaRendu(r.relation, false, r.target))
      .map((r) => ({ label: libelle(r.relation, false), relation: r.relation, entrant: false, target: r.target })),
    ...relationsIn
      .filter((r) => !dejaRendu(r.relation, true, r.target))
      .map((r) => ({ label: libelle(r.relation, true), relation: r.relation, entrant: true, target: r.target })),
  ];
  return vues.filter(
    (v, i, t) => t.findIndex((x) => x.target.slug === v.target.slug && x.label === v.label) === i,
  );
}
