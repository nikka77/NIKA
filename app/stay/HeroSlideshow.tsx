'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export interface HeroSlide {
  slug: string;
  name: string;
  city: string;
  country: string;
  type: string;
  wow_score: number;
  rating: number;
  booking_type: string;
  tagline: string;
}

const BG_BY_TYPE: Record<string, { bg: string; accent: string }> = {
  'sous-marin':               { bg: 'linear-gradient(135deg,#030C1A 0%,#060F24 60%,#0A1A3A 100%)', accent: 'var(--az)' },
  'bunker-militaire':         { bg: 'linear-gradient(135deg,#060F12 0%,#071A12 60%,#0D2519 100%)', accent: 'var(--teal)' },
  'architecture-surréaliste': { bg: 'linear-gradient(135deg,#1A0E06 0%,#221008 60%,#2E1A06 100%)', accent: '#E07038' },
  'train-reconverti':         { bg: 'linear-gradient(135deg,#150C06 0%,#1E1006 60%,#2A1808 100%)', accent: 'var(--gold2)' },
  'transport-reconverti':     { bg: 'linear-gradient(135deg,#150C06 0%,#1E1006 60%,#2A1808 100%)', accent: 'var(--gold2)' },
  'suite-flottante':          { bg: 'linear-gradient(135deg,#04121A 0%,#061824 60%,#082230 100%)', accent: 'var(--az)' },
  'maison-terre':             { bg: 'linear-gradient(135deg,#160C06 0%,#201408 60%,#2A1C0A 100%)', accent: 'var(--amber)' },
  'grotte':                   { bg: 'linear-gradient(135deg,#0E0C0A 0%,#181410 60%,#221C14 100%)', accent: 'var(--td2)' },
  'eco-cabin':                { bg: 'linear-gradient(135deg,#060F06 0%,#0A1A08 60%,#102B0C 100%)', accent: '#4CAF50' },
  'earthship':                { bg: 'linear-gradient(135deg,#160C06 0%,#201408 60%,#2A1C0A 100%)', accent: 'var(--amber)' },
};

const ICON_BY_TYPE: Record<string, string> = {
  'sous-marin': '🤿', 'train-reconverti': '🚂', 'bunker-militaire': '☢️',
  'suite-flottante': '🚤', 'architecture-surréaliste': '🌀', 'transport-reconverti': '🚃',
  'peniche': '⚓', 'silo-reconverti': '🏗️', 'earthship': '🌱', 'maison-terre': '🧱',
  'grotte': '🪨', 'eco-cabin': '🌲', 'maison-architecturale': '🏛️', 'dome-adobe': '🌵',
  'cabane-perchée': '🌲', 'tiny-house': '🏡', 'bambou': '🎋', 'villa-bali': '🌴',
  'dôme': '🫧', 'yourte': '⛺',
};

export default function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback((idx: number) => {
    if (animating) return;
    setAnimating(true);
    setCurrent(idx);
    setTimeout(() => setAnimating(false), 380);
  }, [animating]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo, slides.length]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo, slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [paused, next, slides.length]);

  if (!slides.length) return null;
  const slide = slides[current];
  const isDirect = slide.booking_type === 'direct' || slide.booking_type === 'direct_or_booking';
  const theme = BG_BY_TYPE[slide.type] ?? { bg: 'linear-gradient(135deg,#060F1E,#0A1628)', accent: '#E07038' };
  const icon = ICON_BY_TYPE[slide.type] ?? '🏡';

  return (
    <div
      style={{ position: 'relative', minHeight: 520, overflow: 'hidden' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, background: theme.bg, transition: 'background 0.6s ease' }} />

      {/* Grid texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.035, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Decorative bg icon */}
      <div style={{
        position: 'absolute', right: '-2%', top: '50%', transform: 'translateY(-50%)',
        fontSize: 260, opacity: 0.04, userSelect: 'none', pointerEvents: 'none', lineHeight: 1,
      }}>
        {icon}
      </div>

      {/* Slide content */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1100, margin: '0 auto',
        padding: 'clamp(4rem,8vw,6rem) 1.4rem clamp(4rem,7vw,5.5rem)',
        minHeight: 520, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}>
        {/* Badges row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 40, lineHeight: 1 }}>{icon}</span>
          <span style={{
            fontFamily: 'var(--fe)', fontSize: 11, fontStyle: 'italic',
            color: '#E07038', background: 'rgba(224,112,56,0.12)',
            border: '1px solid rgba(224,112,56,0.28)', borderRadius: 20, padding: '3px 10px',
          }}>
            WOW {slide.wow_score}/25
          </span>
          {isDirect && (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', background: 'rgba(14,168,120,0.12)', border: '1px solid rgba(14,168,120,0.28)', borderRadius: 20, padding: '3px 9px' }}>
              Via NIKA
            </span>
          )}
          {slide.rating > 0 && (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--gold2)' }}>⭐ {slide.rating}/5</span>
          )}
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--fe)', fontSize: 'clamp(36px,6.5vw,80px)',
          fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase',
          color: 'var(--td)', lineHeight: 0.9, marginBottom: '1rem', maxWidth: 680,
        }}>
          {slide.name}
        </h2>

        {/* Location */}
        <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '0.8rem' }}>
          📍 {slide.city}, {slide.country}
        </p>

        {/* Tagline */}
        <p style={{
          fontFamily: 'var(--fo)', fontSize: 'clamp(13px,1.5vw,15px)',
          color: 'var(--td2)', maxWidth: 480, lineHeight: 1.65, marginBottom: '2rem',
        }}>
          {slide.tagline}
        </p>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Link
            href={`/stay/${slide.slug}`}
            style={{
              fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 900, fontStyle: 'italic',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              background: '#E07038', color: '#fff',
              padding: '12px 24px', borderRadius: 4, textDecoration: 'none',
            }}
          >
            Voir ce logement →
          </Link>
        </div>
      </div>

      {/* Prev / Next arrows */}
      {[
        { side: 'left' as const, label: '‹', action: prev },
        { side: 'right' as const, label: '›', action: next },
      ].map(({ side, label, action }) => (
        <button
          key={side}
          onClick={action}
          aria-label={side === 'left' ? 'Précédent' : 'Suivant'}
          style={{
            position: 'absolute', [side]: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--td2)', width: 38, height: 38, borderRadius: '50%',
            cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2, lineHeight: 1,
          }}
        >
          {label}
        </button>
      ))}

      {/* Dot indicators */}
      <div style={{
        position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 7, zIndex: 2,
      }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              width: i === current ? 24 : 7, height: 7, borderRadius: 4,
              border: 'none', cursor: 'pointer', padding: 0,
              background: i === current ? '#E07038' : 'rgba(255,255,255,0.2)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 56,
        background: 'linear-gradient(to bottom,transparent,var(--bg))',
        pointerEvents: 'none',
      }} />
    </div>
  );
}
