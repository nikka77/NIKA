'use client';
// components/akasha/CharacterView.tsx — vue personnage : porte l'état de FORME sélectionnée
// et le partage entre la carte (CharacterCard) et le dossier (CharacterDossier), pour que
// TOUT évolue ensemble quand on change d'arc / de transformation.
import { useState } from 'react';
import CardFx from './CardFx';
import CharacterCard from './CharacterCard';
import CharacterDossier from './CharacterDossier';
import { RARITY_META, type AkashaEntryDetail } from '@/lib/akasha/types';

export default function CharacterView({ entry }: { entry: AkashaEntryDetail }) {
  const [sel, setSel] = useState(0);
  const frame = entry.rarity ? RARITY_META[entry.rarity].color : '#5A88B0';
  const foilmax = entry.rarity === 'legendary' ? 0.6 : entry.rarity === 'epic' ? 0.48 : entry.rarity === 'rare' ? 0.38 : 0.26;

  return (
    <>
      <CardFx color={frame} foilmax={foilmax}>
        <CharacterCard entry={entry} sel={sel} onSelect={setSel} />
      </CardFx>
      <div style={{ marginTop: '1.6rem' }}>
        <CharacterDossier entry={entry} sel={sel} />
      </div>
    </>
  );
}
