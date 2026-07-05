'use client';
// components/akasha/CharacterView.tsx — vue personnage : porte l'état de FORME sélectionnée
// et le partage entre la carte (CharacterCard) et le dossier (CharacterDossier), pour que
// TOUT évolue ensemble quand on change d'arc / de transformation.
import { useState } from 'react';
import CardFx from './CardFx';
import CharacterCard from './CharacterCard';
import CharacterDossier from './CharacterDossier';
import CardActions from './CardActions';
import ArcFrieze from './ArcFrieze';
import { RARITY_META, type AkashaEntryDetail } from '@/lib/akasha/types';
import { normalizeForms } from '@/lib/akasha/forms';

export default function CharacterView({ entry, popRank }: { entry: AkashaEntryDetail; popRank?: number | null }) {
  const [sel, setSel] = useState(0);
  const frame = entry.rarity ? RARITY_META[entry.rarity].color : '#5A88B0';
  const foilmax = entry.rarity === 'legendary' ? 0.6 : entry.rarity === 'epic' ? 0.48 : entry.rarity === 'rare' ? 0.38 : 0.26;
  const nindo = typeof (entry.attributes as Record<string, unknown>).nindo === 'string'
    ? ((entry.attributes as Record<string, unknown>).nindo as string)
    : null;
  // Libellé du credo piloté par la data (Naruto = « Nindō · sa voie du ninja », défaut multi-univers = « Credo »).
  const nindoLabel = typeof (entry.attributes as Record<string, unknown>).nindoLabel === 'string'
    ? ((entry.attributes as Record<string, unknown>).nindoLabel as string)
    : 'Credo';
  // Formes affichables : règle UNIQUE partagée (url OU idle) via normalizeForms — même filtre
  // que CharacterCard et CharacterDossier, sinon `sel` se désynchronise entre carte et dossier.
  const forms = normalizeForms(entry.attributes as Record<string, unknown>) as Record<string, unknown>[];

  // Attaques SIGNATURE liées (relations 'maitrise' → techniques is_signature) : imprimées sur la
  // face TCG pour les persos non curés (Goku → Kamehameha sans aucune saisie manuelle).
  const sigMoves = entry.relationsOut
    .filter((r) => r.relation === 'maitrise' && r.target.category === 'Attaque' && r.target.is_signature === 'true')
    .map((r) => r.target.name)
    .slice(0, 3);

  return (
    <>
      {/* Frise chronologique horizontale — remplace le sélecteur d'onglets ET l'onglet Parcours */}
      {forms.length > 1 && <ArcFrieze forms={forms} sel={sel} onSelect={setSel} color={frame} />}

      <CardFx color={frame} foilmax={foilmax}>
        <CharacterCard entry={entry} sel={sel} onSelect={setSel} sigMoves={sigMoves} />
      </CardFx>

      {/* Rang de popularité dans l'univers (favoris MAL/AniList) — la rareté devient lisible. */}
      {(() => {
        const fav = typeof (entry.attributes as Record<string, unknown>).favorites === 'number'
          ? ((entry.attributes as Record<string, unknown>).favorites as number) : 0;
        if (!fav || !popRank) return null;
        return (
          <div style={{ textAlign: 'center', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: 'var(--td3)', letterSpacing: '0.04em' }}>
            <span style={{ color: '#E8623A' }}>★ {fav.toLocaleString('fr-FR')} fans</span>
            {entry.universe && <span> · #{popRank} de {entry.universe}</span>}
          </div>
        );
      })()}

      <CardActions slug={entry.slug} name={entry.name} img={entry.image_url ?? undefined} color={frame} />

      {nindo && (
        <div style={{ marginTop: '1.4rem', position: 'relative', padding: '0.95rem 1.05rem 0.9rem 2.5rem', borderRadius: 14, background: `linear-gradient(135deg, ${frame}1F, ${frame}0A)`, border: `1px solid ${frame}45`, overflow: 'hidden' }}>
          <span aria-hidden style={{ position: 'absolute', left: 11, top: -2, fontFamily: 'var(--fe)', fontSize: 52, lineHeight: 1, color: `${frame}66`, fontStyle: 'italic', fontWeight: 900 }}>“</span>
          <p style={{ margin: 0, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(15px,3.6vw,18px)', lineHeight: 1.4, color: 'var(--td)' }}>{nindo}</p>
          <div style={{ marginTop: 6, fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: frame }}>{nindoLabel}</div>
        </div>
      )}

      <div style={{ marginTop: '1.6rem' }}>
        <CharacterDossier entry={entry} sel={sel} />
      </div>
    </>
  );
}
