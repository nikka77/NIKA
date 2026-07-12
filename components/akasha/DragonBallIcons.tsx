// components/akasha/DragonBallIcons.tsx — icônes-médaillon bespoke des axes Dragon Ball.
// Jeu maison flat (recraft vectoriel, SVG transparent) : races guerrières + sagas.
// Consommé par le hub /learn/akasha/u/[slug] (mêmes boutons-médaillon que Naruto/One Piece).
// Renvoie null pour une valeur non mappée → le hub retombe sur la pastille texte.
import type { ReactNode } from 'react';
import Image from 'next/image';

const DIR = '/images/akasha/universes/db-icons';

const RACE_IMG: Record<string, string> = {
  'Saiyan': 'saiyan', 'Human': 'human', 'Namekian': 'namekian', 'Android': 'android',
  'Majin': 'majin', 'Frieza Race': 'frieza-race', 'Angel': 'angel',
};
const SAGA_IMG: Record<string, string> = {
  'Saga Saiyan': 'saga-saiyan', 'Saga Namek': 'saga-namek', 'Saga Cell': 'saga-cell',
  'Saga Buu': 'saga-buu', 'Saga Super': 'saga-super',
};

const MAPS: Record<string, Record<string, string>> = { race: RACE_IMG, saga: SAGA_IMG };

/** Icône-médaillon d'un chip d'axe Dragon Ball, ou null si la valeur n'a pas d'icône dédiée. */
export function dbAxisIcon(attr: string, value: string, size = 48): ReactNode {
  const file = MAPS[attr]?.[value];
  if (!file) return null;
  return (
    <Image src={`${DIR}/${file}.svg`} alt={value} width={size} height={size} unoptimized
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  );
}
