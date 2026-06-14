'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMapStore } from '@/lib/store';
import { visual } from '@/lib/visuals';
import ScrollVideo from '@/components/ScrollVideo';

const HOME = visual('heroes', 'home');
const NIKO_ICON = visual('niko', 'niko-idle').poster;

const JOY_BOY_SVG = (
  <svg
    viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg"
    fill="currentColor" color="var(--td)" aria-hidden="true"
    style={{
      position: 'absolute', right: '-3%', bottom: 0,
      width: 'min(260px, 38vw)', opacity: 0.055,
      pointerEvents: 'none', zIndex: 0,
    }}
  >
    <line x1="12" y1="18" x2="128" y2="188" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
    <line x1="110" y1="30" x2="44" y2="172" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="78" cy="36" r="20"/>
    <ellipse cx="64" cy="20" rx="13" ry="17" transform="rotate(-18 64 20)"/>
    <ellipse cx="78" cy="12" rx="11" ry="16"/>
    <ellipse cx="93" cy="20" rx="12" ry="16" transform="rotate(18 93 20)"/>
    <ellipse cx="74" cy="80" rx="13" ry="26" transform="rotate(-5 74 80)"/>
    <ellipse cx="47" cy="68" rx="7" ry="21" transform="rotate(-42 47 68)"/>
    <ellipse cx="104" cy="80" rx="6" ry="19" transform="rotate(32 104 80)"/>
    <ellipse cx="58" cy="130" rx="7" ry="25" transform="rotate(-14 58 130)"/>
    <ellipse cx="86" cy="132" rx="7" ry="23" transform="rotate(18 86 132)"/>
  </svg>
);

export default function Hero() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { openMap } = useMapStore();

  function doSearch() {
    const q = query.trim();
    if (!q) return;
    // Route vers NIKO avec la query pré-remplie
    router.push(`/niko?q=${encodeURIComponent(q)}`);
  }

  return (
    <header style={{
      position: 'relative', minHeight: '100svh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '6rem 1.4rem 4rem',
      overflow: 'hidden',
    }}>
      {/* Fond cinématique Côte d'Azur (vidéo au scroll, fallback image) + scrim */}
      {HOME.poster && (
        <>
          <ScrollVideo poster={HOME.poster} video={HOME.video} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.42, zIndex: 0 }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, var(--bg) 0%, rgba(5,12,23,0.5) 22%, rgba(5,12,23,0.68) 50%, rgba(5,12,23,0.55) 78%, var(--bg) 100%)' }} />
        </>
      )}

      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,148,212,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(0,148,212,0.07) 1px,transparent 1px)',
        backgroundSize: '52px 52px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%,black,transparent 65%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 100%,black,transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '80vw', maxWidth: 560, height: 280, pointerEvents: 'none',
        background: 'radial-gradient(ellipse,rgba(0,148,212,0.13) 0%,transparent 70%)',
      }} />

      {JOY_BOY_SVG}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, width: '100%' }}>
        {/* Eyebrow */}
        <p style={{
          fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--az)', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          animation: 'hin 0.6s ease 0.2s both',
        }}>
          <span style={{ display: 'block', width: 24, height: 1, background: 'var(--az)', opacity: 0.5 }} />
          Explore · Joue · Vis
          <span style={{ display: 'block', width: 24, height: 1, background: 'var(--az)', opacity: 0.5 }} />
        </p>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--fe)', fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(38px,10vw,88px)', letterSpacing: '0.02em',
          lineHeight: 0.9, color: 'var(--td)', textTransform: 'uppercase',
          marginBottom: '0.5rem',
          animation: 'hin 0.7s ease 0.4s both',
        }}>
          Tout ce qui<br />bouge sur la<br />
          <span style={{ color: 'var(--az)' }}>Côte d&apos;Azur</span>
        </h1>

        {/* Sub */}
        <p style={{
          fontFamily: 'var(--fo)', fontSize: 'clamp(13px,3vw,16px)',
          color: 'var(--td2)', lineHeight: 1.65, maxWidth: 480,
          margin: '0.8rem auto 1.4rem',
          animation: 'hin 0.7s ease 0.6s both',
        }}>
          Restaurants, dépanneurs, logements insolites dans le monde entier, bateaux, services locaux — tout ce qui compte, au même endroit.
        </p>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto 1.6rem', animation: 'hin 0.7s ease 0.7s both' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Restaurant, logement insolite, dépannage..."
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--bd2)',
              borderRadius: 40, padding: '13px 50px 13px 20px',
              fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)',
              outline: 'none',
            }}
          />
          <button
            onClick={doSearch}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--az)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Rechercher"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </button>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', animation: 'hin 0.7s ease 0.85s both' }}>
          <Link
            href="/niko"
            style={{
              fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '13px 30px', borderRadius: 3,
              background: 'var(--az)', color: '#fff',
              boxShadow: '0 0 28px rgba(0,148,212,0.3)',
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}
          >
            {NIKO_ICON && <img src={NIKO_ICON} alt="" aria-hidden width={22} height={22} style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.4))' }} />}
            NIKO Commander
          </Link>
          <button
            onClick={() => document.getElementById('domaines')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '13px 30px', borderRadius: 3,
              border: '1px solid var(--bd2)', color: 'var(--td)', transition: 'all 0.25s',
            }}
          >
            Explorer →
          </button>
          <button
            onClick={openMap}
            style={{
              fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '13px 30px', borderRadius: 3,
              border: '1px solid var(--bd2)', color: 'var(--td2)', transition: 'all 0.25s',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6.5-5.6-6.5-10.5A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.5C18.5 15.4 12 21 12 21Z" /><circle cx="12" cy="10.5" r="2.3" /></svg>
            Carte live
          </button>
        </div>

        {/* Live pulse */}
        <div style={{ marginTop: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, animation: 'hin 0.7s ease 1s both', flexWrap: 'wrap' }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#22DD88', boxShadow: '0 0 8px #22DD88',
            flexShrink: 0, animation: 'pdot 1.8s ease-in-out infinite',
          }} />
          <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
            <strong style={{ color: 'var(--td2)', fontWeight: 600 }}>23</strong> personnes sur NIKA en ce moment
          </span>
          <span style={{ color: 'var(--td3)', fontSize: 11 }}>·</span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
            <strong style={{ color: 'var(--td2)', fontWeight: 600 }}>4</strong> nouveaux POIs aujourd&apos;hui
          </span>
        </div>

        {/* XP teaser */}
        <div style={{
          marginTop: '0.7rem', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)',
          letterSpacing: '0.04em', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, animation: 'hin 0.7s ease 1.1s both',
        }}>
          <span>Inscris-toi · Gagne de l&apos;XP · Monte en niveau</span>
          <div style={{ width: 70, height: 3, background: 'var(--bd2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '32%', background: 'var(--gold)', borderRadius: 2, animation: 'xpbr 3s ease-in-out infinite' }} />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute', bottom: '1.8rem', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        fontFamily: 'var(--fo)', fontSize: 9, letterSpacing: '0.15em',
        textTransform: 'uppercase', color: 'var(--td3)',
        animation: 'hin 0.7s ease 1.3s both',
      }}>
        <span>Défiler</span>
        <div style={{ width: 1, height: 32, background: 'linear-gradient(var(--az),transparent)' }} />
      </div>
    </header>
  );
}
