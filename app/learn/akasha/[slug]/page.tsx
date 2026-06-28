// app/learn/akasha/[slug]/page.tsx — fiche détaillée d'une entité du registre.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEntryBySlug } from '@/lib/akasha/queries';
import { TYPE_META, RARITY_META } from '@/lib/akasha/types';
import EntityBadge from '@/components/akasha/EntityBadge';
import EntityAttributes from '@/components/akasha/EntityAttributes';
import EntityRelations from '@/components/akasha/EntityRelations';
import Markdown from '@/components/akasha/Markdown';
import CharacterCard from '@/components/akasha/CharacterCard';
import CharacterDossier from '@/components/akasha/CharacterDossier';
import CardFx from '@/components/akasha/CardFx';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);
  if (!entry) return { title: 'Entité introuvable — AKASHA' };
  const m = TYPE_META[entry.type];
  return {
    title: `${entry.name} — ${m.label} | AKASHA`,
    description:
      entry.summary ??
      `${entry.name}, ${m.label.toLowerCase()} du registre AKASHA${entry.universe ? ` (${entry.universe})` : ''}.`,
  };
}

export default async function AkashaEntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);
  if (!entry) notFound();

  const m = TYPE_META[entry.type];

  // Personnages → fiche « carte à jouer » (stat-block riche + emblèmes).
  if (entry.type === 'character') {
    const frameChar = entry.rarity ? RARITY_META[entry.rarity].color : '#5A88B0';
    const foilmaxChar = entry.rarity === 'legendary' ? 0.6 : entry.rarity === 'epic' ? 0.48 : entry.rarity === 'rare' ? 0.38 : 0.26;
    return (
      <main>
        <div style={{ maxWidth: 470, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.4rem) 1.2rem clamp(3rem,7vw,5rem)' }}>
          <Link
            href="/learn/akasha"
            style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}
          >
            ← Registre AKASHA
          </Link>
          <CardFx color={frameChar} foilmax={foilmaxChar}>
            <CharacterCard entry={entry} />
          </CardFx>
          <div style={{ marginTop: '1.6rem' }}>
            <CharacterDossier entry={entry} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* ── BANDEAU ───────────────────────────────────────────── */}
      <div
        style={{
          background: `linear-gradient(180deg, ${m.color}24 0%, ${m.color}08 45%, var(--bg) 100%)`,
          borderBottom: '1px solid var(--bd)',
          padding: 'clamp(2rem,5vw,3.2rem) 1.4rem 1.8rem',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Link
            href="/learn/akasha"
            style={{
              fontFamily: 'var(--fo)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--td3)',
              textDecoration: 'none',
            }}
          >
            ← Registre AKASHA
          </Link>

          <div style={{ display: 'flex', gap: '1.4rem', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '1.1rem' }}>
            {/* Visuel */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 16,
                overflow: 'hidden',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${m.color}40, ${m.color}10)`,
                border: `1px solid ${m.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {entry.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image_url} alt={entry.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span aria-hidden style={{ fontSize: 48, opacity: 0.6 }}>
                  {m.icon}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <EntityBadge type={entry.type} />
                <span
                  style={{
                    fontFamily: 'var(--fo)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '3px 9px',
                    borderRadius: 20,
                    color: entry.is_fiction ? m.color : 'var(--td2)',
                    background: entry.is_fiction ? `${m.color}14` : 'var(--bg3)',
                    border: `1px solid ${entry.is_fiction ? `${m.color}40` : 'var(--bd2)'}`,
                  }}
                >
                  {entry.is_fiction ? '✦ Fiction' : '◆ Réel'}
                </span>
                {entry.rarity && (
                  <span
                    style={{
                      fontFamily: 'var(--fo)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      padding: '3px 9px',
                      borderRadius: 20,
                      color: RARITY_META[entry.rarity].color,
                      background: `${RARITY_META[entry.rarity].color}14`,
                      border: `1px solid ${RARITY_META[entry.rarity].color}55`,
                    }}
                  >
                    {RARITY_META[entry.rarity].label}
                  </span>
                )}
              </div>

              <h1
                style={{
                  fontFamily: 'var(--fe)',
                  fontSize: 'clamp(30px,6vw,56px)',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  color: 'var(--td)',
                  lineHeight: 0.9,
                  margin: 0,
                }}
              >
                {entry.name}
              </h1>

              {entry.universe && (
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginTop: 8 }}>
                  {entry.universe}
                </div>
              )}

              {entry.summary && (
                <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.65, margin: '0.9rem 0 0', maxWidth: 560 }}>
                  {entry.summary}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CORPS ─────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 'clamp(1.6rem,4vw,2.6rem) 1.4rem clamp(3rem,7vw,5rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.2rem',
        }}
      >
        {entry.description && (
          <section>
            <h2 className="akasha-section-title">Description</h2>
            <Markdown source={entry.description} />
          </section>
        )}

        <EntityAttributes type={entry.type} attributes={entry.attributes} />

        <EntityRelations out={entry.relationsOut} incoming={entry.relationsIn} />
      </div>
    </main>
  );
}
