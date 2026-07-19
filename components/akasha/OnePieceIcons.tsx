// components/akasha/OnePieceIcons.tsx — icônes-médaillon bespoke des axes One Piece.
// Jeu maison flat (SVG vectorisés + webp détourés de la campagne Chantier 0) : Fruits, grades de
// sabre Meito, emblèmes de factions et de Jolly Rogers d'équipages (recréés fidèlement, pas de
// texte/drapeau). Consommé par le hub /learn/akasha/u/[slug] (mêmes boutons-médaillon que Naruto).
// Renvoie null pour une valeur non mappée → le hub retombe sur la pastille texte (long-tail non curé).
import type { ReactNode } from 'react';
import Image from 'next/image';

const DIR = '/images/akasha/universes/op-icons';

const FRUIT_IMG: Record<string, string> = {
  'Paramecia': 'paramecia.svg', 'Logia': 'logia.svg', 'Zoan': 'zoan.svg',
  'Zoan Antique': 'zoan-antique.svg', 'Zoan Mythique': 'zoan-mythique.svg', 'Smile': 'smile.svg', 'Clone': 'clone.webp',
};
const GRADE_IMG: Record<string, string> = {
  'Saijo Ô Wazamono': 'saijo.svg', 'Ô Wazamono': 'o-wazamono.svg', 'Ryo Wazamono': 'ryo-wazamono.webp',
};
const FACTION_IMG: Record<string, string> = {
  'Pirate': 'pirate.svg', 'Marine': 'marine.svg', 'Gouvernement Mondial': 'gouvernement-mondial.webp',
  'Révolutionnaire': 'revolutionnaire.svg', 'Civil': 'civil.webp',
};
const CREW_IMG: Record<string, string> = {
  'L’équipage du Chapeau de Paille': 'chapeau-de-paille.svg',
  'L’équipage de Big Mom': 'big-mom.svg',
  'L’équipage aux Cent Bêtes': 'cent-betes.webp',
  'L’équipage de Barbe Blanche': 'barbe-blanche.svg',
  'L’équipage de Don Quichotte': 'don-quichotte.svg',
  'L’équipage des Pirates Roger': 'roger.svg',
  // Extras d'axe fréquents (valeurs minées) : réutilise l'emblème de faction Marine + Armada bespoke.
  'Marine': 'marine.svg',
  'Armada du Chapeau de Paille': 'armada.svg',
  // Jolly Rogers générés (campagne médaillons Chantier 0) — valeurs EXACTES de la base.
  'L’équipage de Barbe Noire': 'barbe-noire.webp',
  'Faux Equipage du Chapeau de Paille': 'faux-chapeau.webp',
  'Royaume de Germa': 'germa.webp',
  'L’équipage des Nouveaux Hommes-Poissons': 'nouveaux-hommes-poissons.webp',
  'L’équipage du Roux': 'le-roux.webp',
  'L’équipage du Fire Tank': 'fire-tank.webp',
};

const MAPS: Record<string, Record<string, string>> = {
  fruit_type: FRUIT_IMG, meito_grade: GRADE_IMG, faction: FACTION_IMG, crew: CREW_IMG,
};

/** Icône-médaillon d'un chip d'axe One Piece, ou null si la valeur n'a pas d'icône dédiée. */
export function opAxisIcon(attr: string, value: string, size = 48): ReactNode {
  const file = MAPS[attr]?.[value];
  if (!file) return null;
  return (
    <Image src={`${DIR}/${file}`} alt={value} width={size} height={size} unoptimized
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  );
}
