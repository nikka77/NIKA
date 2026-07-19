// components/akasha/DragonBallIcons.tsx — icônes-médaillon bespoke des axes Dragon Ball.
// Jeu maison flat (recraft vectoriel, SVG transparent) : races guerrières + sagas.
// Consommé par le hub /learn/akasha/u/[slug] (mêmes boutons-médaillon que Naruto/One Piece).
// Renvoie null pour une valeur non mappée → le hub retombe sur la pastille texte.
import type { ReactNode } from 'react';
import Image from 'next/image';

const DIR = '/images/akasha/universes/db-icons';

const RACE_IMG: Record<string, string> = {
  'Saiyan': 'saiyan.svg', 'Human': 'human.svg', 'Namekian': 'namekian.svg', 'Android': 'android.webp',
  'Majin': 'majin.svg', 'Frieza Race': 'frieza-race.svg', 'Angel': 'angel.svg',
};
const SAGA_IMG: Record<string, string> = {
  'Saga Saiyan': 'saga-saiyan.svg', 'Saga Namek': 'saga-namek.svg', 'Saga Cell': 'saga-cell.svg',
  'Saga Buu': 'saga-buu.webp', 'Saga Super': 'saga-super.svg',
};

const MAPS: Record<string, Record<string, string>> = { race: RACE_IMG, saga: SAGA_IMG };

/** Icône-médaillon d'un chip d'axe Dragon Ball, ou null si la valeur n'a pas d'icône dédiée. */
export function dbAxisIcon(attr: string, value: string, size = 48): ReactNode {
  const file = MAPS[attr]?.[value];
  if (!file) return null;
  return (
    <Image src={`${DIR}/${file}`} alt={value} width={size} height={size} unoptimized
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  );
}
