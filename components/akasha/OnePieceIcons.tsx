// components/akasha/OnePieceIcons.tsx — icônes-médaillon bespoke des axes One Piece.
// Jeu maison flat (recraft vectoriel, fond transparent) : types de Fruit du Démon + grades de sabre.
// Consommé par le hub /learn/akasha/u/[slug] (mêmes boutons-médaillon que les emblèmes Naruto).
const DIR = '/images/akasha/universes/op-icons';

// Valeur de taxonomy (attr `fruit_type`) → fichier SVG.
const FRUIT_IMG: Record<string, string> = {
  'Paramecia': 'paramecia',
  'Logia': 'logia',
  'Zoan': 'zoan',
  'Zoan Antique': 'zoan-antique',
  'Zoan Mythique': 'zoan-mythique',
  'Smile': 'smile',
};

// Valeur de taxonomy (attr `meito_grade`) → fichier SVG.
const GRADE_IMG: Record<string, string> = {
  'Saijo Ô Wazamono': 'saijo',
  'Ô Wazamono': 'o-wazamono',
  'Ryo Wazamono': 'ryo-wazamono',
};

function Icon({ file, alt, size }: { file: string | undefined; alt: string; size: number }) {
  if (!file) return <span aria-hidden style={{ fontSize: size * 0.7 }}>◈</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`${DIR}/${file}.svg`} alt={alt} width={size} height={size}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} />
  );
}

export function DevilFruitIcon({ value, size = 48 }: { value: string; size?: number }) {
  return <Icon file={FRUIT_IMG[value]} alt={value} size={size} />;
}

export function SabreGradeIcon({ value, size = 48 }: { value: string; size?: number }) {
  return <Icon file={GRADE_IMG[value]} alt={value} size={size} />;
}
