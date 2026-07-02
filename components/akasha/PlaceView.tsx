'use client';
// components/akasha/PlaceView.tsx — vue LIEU (village) : porte l'ère chronologique sélectionnée et la
// partage entre la frise, la carte évolutive et le dossier. Pendant place de CharacterView.
import { useState } from 'react';
import ArcFrieze from './ArcFrieze';
import CardFx from './CardFx';
import PlaceCard, { type Era } from './PlaceCard';
import PlaceDossier from './PlaceDossier';
import CardActions from './CardActions';
import { RARITY_META, type AkashaEntryDetail } from '@/lib/akasha/types';

export default function PlaceView({ entry }: { entry: AkashaEntryDetail }) {
  const [sel, setSel] = useState(0);
  const a = entry.attributes as Record<string, unknown>;
  const eras = (Array.isArray(a.eras) ? (a.eras as Era[]) : []).filter((e) => e && typeof e === 'object');
  const frame = entry.rarity ? RARITY_META[entry.rarity].color : '#0EA878';
  const foilmax = entry.rarity === 'legendary' ? 0.6 : entry.rarity === 'epic' ? 0.48 : entry.rarity === 'rare' ? 0.38 : 0.26;
  const quote = a.quote && typeof a.quote === 'object' ? (a.quote as { text?: string; author?: string }) : null;
  const friezeItems: Record<string, unknown>[] = eras.map((e) => ({ label: e.label, url: e.img, age: e.period, arc: e.event }));
  const statLabels =
    entry.type === 'artifact' ? { leader: 'Porteur', event: 'Fait marquant', threat: 'Particularité' }
    : entry.type === 'profession' ? { leader: 'Figure', event: 'Technique clé', threat: 'Exigence' }
    : entry.type === 'status' ? { leader: 'Figure', event: 'Événement', threat: 'Dōjutsu' }
    : entry.type === 'power' ? { leader: 'Maître', event: 'Forme', threat: 'Rang' }
    : entry.type === 'skill' ? { leader: 'Porteur', event: 'Éveil', threat: 'Pouvoir' }
    : undefined;

  return (
    <>
      {eras.length > 1 && (
        <ArcFrieze forms={friezeItems} sel={sel} onSelect={setSel} color={frame} heading={`◆ Chronologie — ${eras.length} ères`} pixelated={false} />
      )}
      <CardFx color={frame} foilmax={foilmax}>
        <PlaceCard entry={entry} era={eras[sel] ?? {}} frame={frame} baseImg={entry.image_url} statLabels={statLabels} />
      </CardFx>

      <CardActions slug={entry.slug} name={entry.name} img={entry.image_url ?? undefined} color={frame} />

      {quote?.text && (
        <div style={{ marginTop: '1.4rem', position: 'relative', padding: '0.95rem 1.05rem 0.9rem 2.5rem', borderRadius: 14, background: `linear-gradient(135deg, ${frame}1F, ${frame}0A)`, border: `1px solid ${frame}45`, overflow: 'hidden' }}>
          <span aria-hidden style={{ position: 'absolute', left: 11, top: -2, fontFamily: 'var(--fe)', fontSize: 52, lineHeight: 1, color: `${frame}66`, fontStyle: 'italic', fontWeight: 900 }}>“</span>
          <p style={{ margin: 0, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(15px,3.6vw,18px)', lineHeight: 1.4, color: 'var(--td)' }}>{quote.text}</p>
          {quote.author && (
            <div style={{ marginTop: 6, fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: frame }}>{quote.author}</div>
          )}
        </div>
      )}

      <div style={{ marginTop: '1.6rem' }}>
        <PlaceDossier entry={entry} />
      </div>
    </>
  );
}
