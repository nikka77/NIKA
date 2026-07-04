// app/learn/akasha/[slug]/opengraph-image.tsx — og:image « carte à jouer » générée par fiche :
// chaque partage WhatsApp/Discord/X affiche une mini-carte AKASHA (visuel, nom, rareté, univers).
import { ImageResponse } from 'next/og';
import { getEntryBySlug } from '@/lib/akasha/queries';
import { RARITY_META, TYPE_META, universeMeta } from '@/lib/akasha/types';

export const runtime = 'nodejs';
export const alt = 'Carte AKASHA';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);

  const name = entry?.name ?? 'AKASHA';
  const m = entry ? TYPE_META[entry.type] : TYPE_META.character;
  const rar = entry?.rarity ? RARITY_META[entry.rarity] : null;
  const um = entry?.universe ? universeMeta(entry.universe) : null;
  const accent = rar?.color ?? m.color;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: `linear-gradient(120deg, #0B0820 0%, #140C30 55%, #0B0F1E 100%)`,
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* halo rareté */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: accent,
            opacity: 0.22,
            filter: 'blur(80px)',
            display: 'flex',
          }}
        />
        {/* colonne texte */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 24px 64px 72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#8f7bf0', fontSize: 26, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>
            ✦ AKASHA · le registre
          </div>
          <div style={{ display: 'flex', color: '#F4F6FB', fontSize: name.length > 18 ? 74 : 96, fontWeight: 800, fontStyle: 'italic', textTransform: 'uppercase', lineHeight: 1.02, marginTop: 18, maxWidth: 700 }}>
            {name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', color: m.color, background: `${m.color}22`, border: `2px solid ${m.color}`, borderRadius: 999, padding: '8px 24px', fontSize: 26, fontWeight: 700 }}>
              {m.icon} {m.label}
            </div>
            {rar && (
              <div style={{ display: 'flex', alignItems: 'center', color: rar.color, background: `${rar.color}22`, border: `2px solid ${rar.color}`, borderRadius: 999, padding: '8px 24px', fontSize: 26, fontWeight: 700 }}>
                ◆ {rar.label}
              </div>
            )}
          </div>
          {um && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#AAB4C8', fontSize: 30, marginTop: 26, fontWeight: 600 }}>
              {um.emoji} {entry?.universe} · nika.fr
            </div>
          )}
        </div>
        {/* visuel carte */}
        <div style={{ width: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <div
            style={{
              width: 340,
              height: 470,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 28,
              border: `5px solid ${accent}`,
              background: `linear-gradient(160deg, ${accent}33, #0B0F1E 70%)`,
              overflow: 'hidden',
              boxShadow: `0 30px 80px -20px ${accent}`,
            }}
          >
            {entry?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.image_url} alt="" width={340} height={470} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            ) : (
              <div style={{ display: 'flex', fontSize: 150 }}>{m.icon}</div>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
