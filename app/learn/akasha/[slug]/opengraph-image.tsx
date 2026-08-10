// app/learn/akasha/[slug]/opengraph-image.tsx — og:image « carte à jouer » générée par fiche :
// chaque partage WhatsApp/Discord/X affiche une mini-carte AKASHA (visuel, nom, rareté, univers).
//
// Le visuel passe par `visuelOg` (lib/akasha/og-visuel.ts) et JAMAIS par `entry.image_url` brut.
// Mesuré le 10/08/2026, images ouvertes et regardées : les CDN du registre servent du WebP que
// satori refuse (cadre vide sur 6 783 fiches à URL distante, une seule exception sondée), et un
// chemin relatif le fait JETER, ce qui tue la réponse entière — 121 fiches ne rendaient rien du
// tout, pas même une carte. `visuelOg` rend `null` quand rien n'est servable, et on retombe ici
// sur la tuile à icône : un repli vaut mieux qu'un cadre vide.
import { ImageResponse } from 'next/og';
import { getEntryBySlug } from '@/lib/akasha/queries';
import { RARITY_META, TYPE_META, universeMeta } from '@/lib/akasha/types';
import { visuelOg } from '@/lib/akasha/og-visuel';

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
  const visuel = await visuelOg(entry?.image_url);

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
            {/* La police embarquée par @vercel/og (Geist-Regular.ttf, 726 glyphes) n'a NI ✦
                U+2726 NI ◆ U+25C6 : ils sortaient en carré barré sur chaque carte partagée.
                Vérifié dans la table cmap du fichier de police, puis à l'œil sur le rendu.
                • U+2022, ● U+25CF, ▲ U+25B2 et · U+00B7 y sont, eux. */}
            • AKASHA · le registre
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
                • {rar.label}
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
            {visuel ? (
              // Image ENTIÈRE centrée sur le cadre dégradé (Satori ne supporte pas filter:blur → contain
              // plutôt que le fond flouté, mais même intention : sujet centré, jamais rogné).
              // eslint-disable-next-line @next/next/no-img-element
              <img src={visuel} alt="" width={340} height={470} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
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
