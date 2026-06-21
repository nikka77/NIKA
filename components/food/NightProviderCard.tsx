// components/food/NightProviderCard.tsx — carte « Food de nuit » personnalisable par enseigne.
// Thème par slug (lib/night-themes) : couleurs, drapeau/accroche, plats favoris (bulles),
// image de fond (Higgsfield), logo détouré. Sans thème → carte classique (fallback).
// Carte entière cliquable (lien étiré) + icône Instagram cliquable indépendante.
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { NIGHT_THEMES } from '@/lib/night-themes';

export type NightProvider = {
  id: string; slug: string; name: string;
  description?: string; city?: string; opens_at?: string; closes_at?: string; instagram?: string;
};
type Status = 'open' | 'closed' | 'sold_out' | undefined;

function StatusPill({ status }: { status: Status }) {
  const isOpen = status === 'open';
  const isSoldOut = status === 'sold_out';
  return (
    <span className={`food-status-pill ${isOpen ? 'open' : isSoldOut ? 'sold_out' : 'closed'}`}>
      {isOpen ? '🟢 Ouvert' : isSoldOut ? '🔴 Épuisé' : '⚫ Fermé'}
    </span>
  );
}

function SnapLink({ handle }: { handle: string }) {
  return (
    <a href={`https://www.snapchat.com/add/${handle}`} target="_blank" rel="noopener noreferrer" aria-label={`Snapchat ${handle}`}
      style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content', padding: '5px 11px', borderRadius: 20, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,252,0,0.55)', textDecoration: 'none' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="#FFFC00" aria-hidden>
        <path d="M12 2.4c-2.9 0-5.2 2.3-5.2 5.2 0 .5.04 1.3-.04 1.7-.1.4-.8.5-1.3.65-.4.13-.66.32-.66.68 0 .47.58.68 1.12.9.27.1.27.3.2.57-.18.6-.97 1.1-1.85 1.34-.32.08-.46.3-.42.55.07.46 1.1.69 1.85.8.17.03.28.1.33.4.06.28.12.57.46.57.28 0 .61-.16 1.08-.16.6 0 .9.26 1.39.6.46.34.98.69 1.87.69s1.41-.35 1.87-.69c.49-.34.79-.6 1.39-.6.47 0 .8.16 1.08.16.34 0 .4-.29.46-.57.05-.3.16-.37.33-.4.75-.11 1.78-.34 1.85-.8.04-.25-.1-.47-.42-.55-.88-.24-1.67-.74-1.85-1.34-.07-.27-.07-.47.2-.57.54-.22 1.12-.43 1.12-.9 0-.36-.26-.55-.66-.68-.5-.15-1.2-.25-1.3-.65-.08-.4-.04-1.2-.04-1.7 0-2.9-2.3-5.2-5.2-5.2z" />
      </svg>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: '#FFFC00' }}>Ajouter</span>
    </a>
  );
}

export default function NightProviderCard({ provider, status, compact }: { provider: NightProvider; status: Status; compact?: boolean }) {
  const theme = NIGHT_THEMES[provider.slug];
  const displayName = theme?.name || provider.name; // jamais le handle brut (ex. @afroweek06)
  const logoSz = compact ? 44 : 54;
  const nameSz = compact ? 21 : 25;
  const hours = provider.opens_at && provider.closes_at
    ? `${provider.opens_at.slice(0, 5)} – ${provider.closes_at.slice(0, 5)}` : null;
  const snap = (provider.instagram || '').replace(/^@/, '');

  // ===== Carte classique (enseignes sans thème) =====
  if (!theme) {
    const isOpen = status === 'open';
    return (
      <Link href={`/food/${provider.slug}`} className="dom-card"
        style={{ background: 'var(--food-dark)', borderRadius: 14, padding: '1.2rem 1.4rem', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', border: isOpen ? '1px solid rgba(216,90,48,0.4)' : '1px solid rgba(255,255,255,0.08)', ['--dc']: 'rgba(216,90,48,0.7)' } as CSSProperties}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--fn)', fontSize: 22, color: '#fff', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>{displayName}</div>
          {provider.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: '0.5rem', lineHeight: 1.4 }}>{provider.description}</div>}
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            {provider.city && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>📍 {provider.city}</span>}
            {hours && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>🕐 {hours}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <StatusPill status={status} />
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Voir le menu →</span>
        </div>
      </Link>
    );
  }

  // ===== Carte personnalisée (thème par enseigne) =====
  return (
    <div className="dom-card" style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, minHeight: compact ? 0 : 168, border: `1px solid ${theme.accent}66`, ['--dc']: theme.accent } as CSSProperties}>
      {/* Fond : motif Higgsfield si dispo, sinon dégradé thématique */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, background: theme.bg ? `url(${theme.bg}) center/cover no-repeat` : `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent2} 120%)` }} />
      {/* Voile sombre : horizontal (lisibilité texte gauche) + vignette basse (pied lisible) */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(8,6,2,0.22) 0%, rgba(8,6,2,0) 40%, rgba(8,6,2,0.62) 100%), linear-gradient(95deg, rgba(8,6,2,0.94) 0%, rgba(8,6,2,0.82) 52%, rgba(8,6,2,0.64) 100%)' }} />
      {/* Lien étiré : toute la carte mène au menu */}
      <Link href={`/food/${provider.slug}`} aria-label={`Voir ${displayName}`} style={{ position: 'absolute', inset: 0, zIndex: 2 }} />

      {/* Contenu : pointer-events none → les clics passent au lien ; les éléments interactifs ré-activent */}
      <div style={{ position: 'relative', zIndex: 3, padding: compact ? '0.85rem 1.05rem 0.95rem' : '1.1rem 1.4rem 1.2rem', pointerEvents: 'none' }}>
        {/* Méta en haut : ville · horaires · état */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 11 }}>
          {provider.city && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>📍 {provider.city}</span>}
          {hours && <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>🕐 {hours}</span>}
          <span style={{ marginLeft: 'auto' }}><StatusPill status={status} /></span>
        </div>

        {/* Logo + nom + drapeau/accroche */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: logoSz, height: logoSz, borderRadius: compact ? 13 : 15, flexShrink: 0, background: 'rgba(0,0,0,0.32)', border: `1px solid ${theme.accent}66`, boxShadow: `0 0 16px ${theme.accent}55` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {theme.logo ? <img src={theme.logo} alt={displayName} width={logoSz - 6} height={logoSz - 6} style={{ width: logoSz - 6, height: logoSz - 6, objectFit: 'contain' }} /> : <span style={{ fontSize: 24 }}>{theme.flag || '🍽️'}</span>}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--fn)', fontSize: nameSz, color: '#fff', letterSpacing: '0.04em', lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{displayName}</div>
            {theme.flag
              ? <span style={{ fontSize: 19, marginTop: 5, display: 'inline-block', lineHeight: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>{theme.flag}</span>
              : theme.tagline ? <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: theme.accent2, marginTop: 4 }}>{theme.tagline}</div> : null}
          </div>
        </div>

        {/* Plats conseillés : plat · accompagnement · boisson (vignettes images du pro) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: compact ? 9 : 12 }}>
          {theme.dishes.slice(0, 3).map(d => (
            <div key={d.name} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 11, overflow: 'hidden', border: `1px solid ${theme.accent2}55`, background: 'rgba(0,0,0,0.35)', boxShadow: '0 3px 10px rgba(0,0,0,0.4)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.img} alt={d.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 4px rgba(0,0,0,0.75)' }}>{d.name}</div>
            </div>
          ))}
        </div>

        {/* Pied : Snap + Voir le menu */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {snap ? <SnapLink handle={snap} /> : <span />}
          <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: theme.accent2, textShadow: '0 1px 6px rgba(0,0,0,0.85)' }}>Voir le menu →</span>
        </div>
      </div>
    </div>
  );
}
