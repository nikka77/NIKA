// components/akasha/OnePieceIcons.tsx — icônes-médaillon bespoke des axes One Piece.
// Jeu maison flat (recraft vectoriel, SVG transparent) : types de Fruit du Démon, grades de
// sabre Meito, emblèmes de factions et de Jolly Rogers d'équipages (recréés fidèlement, pas de
// texte/drapeau). Consommé par le hub /learn/akasha/u/[slug] (mêmes boutons-médaillon que Naruto).
// Renvoie null pour une valeur non mappée → le hub retombe sur la pastille texte (long-tail non curé).
import type { ReactNode } from 'react';
import Image from 'next/image';

const DIR = '/images/akasha/universes/op-icons';

const FRUIT_IMG: Record<string, string> = {
  'Paramecia': 'paramecia', 'Logia': 'logia', 'Zoan': 'zoan',
  'Zoan Antique': 'zoan-antique', 'Zoan Mythique': 'zoan-mythique', 'Smile': 'smile', 'Clone': 'clone',
};
const GRADE_IMG: Record<string, string> = {
  'Saijo Ô Wazamono': 'saijo', 'Ô Wazamono': 'o-wazamono', 'Ryo Wazamono': 'ryo-wazamono',
};
const FACTION_IMG: Record<string, string> = {
  'Pirate': 'pirate', 'Marine': 'marine', 'Gouvernement Mondial': 'gouvernement-mondial',
  'Révolutionnaire': 'revolutionnaire', 'Civil': 'civil',
};
const CREW_IMG: Record<string, string> = {
  'L’équipage du Chapeau de Paille': 'chapeau-de-paille',
  'L’équipage de Big Mom': 'big-mom',
  'L’équipage aux Cent Bêtes': 'cent-betes',
  'L’équipage de Barbe Blanche': 'barbe-blanche',
  'L’équipage de Don Quichotte': 'don-quichotte',
  'L’équipage des Pirates Roger': 'roger',
  // Extras d'axe fréquents (valeurs minées) : réutilise l'emblème de faction Marine + Armada bespoke.
  'Marine': 'marine',
  'Armada du Chapeau de Paille': 'armada',
};

const MAPS: Record<string, Record<string, string>> = {
  fruit_type: FRUIT_IMG, meito_grade: GRADE_IMG, faction: FACTION_IMG, crew: CREW_IMG,
};

/** Icône-médaillon d'un chip d'axe One Piece, ou null si la valeur n'a pas d'icône dédiée. */
export function opAxisIcon(attr: string, value: string, size = 48): ReactNode {
  const file = MAPS[attr]?.[value];
  if (!file) return null;
  return (
    <Image src={`${DIR}/${file}.svg`} alt={value} width={size} height={size} unoptimized
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  );
}
