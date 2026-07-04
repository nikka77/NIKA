// app/learn/akasha/u/[slug]/opengraph-image.tsx — og:image « poster d'univers » : chaque hub
// partagé sur WhatsApp/Discord/X affiche une carte-monde (kanji, nom, tagline, compteur).
import { ImageResponse } from 'next/og';
import { taxonomyBySlug } from '@/lib/akasha/universe-taxonomy';
import { universeMeta } from '@/lib/akasha/types';
import { countUniverse } from '@/lib/akasha/queries';

export const runtime = 'nodejs';
export const alt = 'Univers AKASHA';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const taxo = taxonomyBySlug(slug);
  const name = taxo?.name ?? 'AKASHA';
  const m = universeMeta(name);
  const total = taxo ? await countUniverse(name) : 0;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px', fontFamily: 'sans-serif', background: `linear-gradient(135deg, #0B0820 0%, ${m.color}44 55%, #0B0F1E 100%)`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: -80, right: -20, fontSize: 460, fontWeight: 900, color: `${m.color}22`, display: 'flex', lineHeight: 1 }}>{taxo?.kanji ?? '✦'}</div>
        <div style={{ position: 'absolute', top: -140, left: -120, width: 560, height: 560, borderRadius: 9999, background: m.color, opacity: 0.20, filter: 'blur(90px)', display: 'flex' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: m.color, fontSize: 30, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>
          {m.emoji} AKASHA · Univers
        </div>
        <div style={{ display: 'flex', color: '#F4F6FB', fontSize: name.length > 14 ? 100 : 128, fontWeight: 800, fontStyle: 'italic', textTransform: 'uppercase', lineHeight: 0.95, marginTop: 12 }}>
          {name}
        </div>
        {taxo?.tagline && (
          <div style={{ display: 'flex', color: '#AAB4C8', fontSize: 34, marginTop: 22, maxWidth: 900, lineHeight: 1.3 }}>{taxo.tagline}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 34 }}>
          <div style={{ display: 'flex', alignItems: 'center', color: m.color, background: `${m.color}22`, border: `3px solid ${m.color}`, borderRadius: 999, padding: '10px 30px', fontSize: 32, fontWeight: 700 }}>
            {total} entrées · nika.fr
          </div>
        </div>
      </div>
    ),
    size,
  );
}
