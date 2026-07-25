'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMapStore, useAuthStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { DOMAINS } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import Spin360 from './Spin360';
import NikaBadge from './ui/NikaBadge';
import { visual } from '@/lib/visuals';
import type { BadgeTier, KycLevel } from '@/lib/types';

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [nextNum, setNextNum] = useState<number | null>(null);
  const { openMap } = useMapStore();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const router = useRouter();

  // Prochain numéro (CTA) + hydratation de la session au chargement.
  useEffect(() => {
    fetch('/api/next-number').then(r => r.json()).then(d => setNextNum(d.next)).catch(() => {});
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      if (row) setUser(row);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfileOpen(false);
    router.push('/');
  }

  const badge = user ? { number: user.number ?? 0, tier: (user.badge_tier ?? 'member') as BadgeTier, kyc: (user.kyc_level ?? 0) as KycLevel } : null;

  const NAV_LINKS = [
    { href: '/carte', label: 'Carte' },
    { href: '/food', label: 'FOOD' },
    { href: '/auto', label: 'AUTO' },
    { href: '/stay', label: 'STAY' },
    { href: '/azur', label: 'AZUR' },
    { href: '/niko', label: 'NIKO ⚡', highlight: true },
  ];

  const linkStyle = (highlight?: boolean): React.CSSProperties => ({
    fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: highlight ? 'var(--az2)' : 'var(--td2)',
    padding: '0 10px', height: 54,
    display: 'flex', alignItems: 'center',
    borderBottom: highlight ? '2px solid var(--az2)' : '2px solid transparent',
    transition: 'all 0.2s',
  });

  return (
    <>
      <nav data-liquid-glass="bar" suppressHydrationWarning className="liquid-glass-bar" style={{
        position: 'sticky', top: 0, zIndex: 300, padding: '0 1.4rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54,
      }}>
        <Link href="/" style={{ fontFamily: 'var(--fn)', fontSize: 24, letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 7 }}>
          NIKA
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--az2)', boxShadow: '0 0 8px var(--az2)', display: 'inline-block', animation: 'ndp 2s ease-in-out infinite' }} />
        </Link>

        {/* Desktop links */}
        <ul style={{ display: 'flex', alignItems: 'center' }} className="max-md:hidden">
          <li style={{ position: 'relative' }} onMouseEnter={() => setDomainsOpen(true)} onMouseLeave={() => setDomainsOpen(false)}>
            <button onClick={() => setDomainsOpen(o => !o)} className="nav-link" style={{ ...linkStyle(), background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', gap: 5 }}>
              Domaines
              <span style={{ fontSize: 8, transform: domainsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {domainsOpen && (
              <div data-liquid-glass="panel" suppressHydrationWarning className="liquid-glass" style={{ position: 'absolute', top: 54, left: 0, width: 400, borderRadius: 16, padding: '0.6rem' }}>
                <div className="g-2" style={{ gap: 4 }}>
                  {DOMAINS.map(d => (
                    <Link key={d.slug} href={`/${d.slug}`} className="nav-drop-item" onClick={() => setDomainsOpen(false)}>
                      <Spin360 emoji={d.icon} alt={d.label} accent={d.color} size={34} {...visual('domains', d.slug)} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: d.color }}>{d.label}</span>
                        <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </li>
          {NAV_LINKS.map(({ href, label, highlight }) => (
            <li key={href}><Link href={href} style={linkStyle(highlight)} className="nav-link">{label}</Link></li>
          ))}
        </ul>

        {/* Right buttons */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <button onClick={openMap} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--bd2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'var(--td2)', transition: 'all 0.2s' }} title="Carte">🗺️</button>

          {user && badge ? (
            /* Connecté : badge + dropdown profil */
            <div style={{ position: 'relative' }}>
              <button onClick={() => setProfileOpen(o => !o)} aria-label="Mon profil"
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <NikaBadge number={badge.number} tier={badge.tier} kycLevel={badge.kyc} size="sm" isPro={!!user.is_pro} />
                <span className="max-md:hidden" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td2)' }}>#{badge.number}</span>
                <span className="max-md:hidden" style={{ fontSize: 8, color: 'var(--td3)', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </button>
              {profileOpen && (
                <div data-liquid-glass="panel" suppressHydrationWarning className="liquid-glass" style={{ position: 'absolute', top: 46, right: 0, width: 200, borderRadius: 16, padding: '0.5rem', zIndex: 320 }}>
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--bd)', marginBottom: 4 }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--td)' }}>{user.username}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{user.level_name} · {user.nika_credits ?? 0} $NIKKA</div>
                  </div>
                  {[{ href: '/profil', label: '👤 Mon profil' }, { href: '/dashboard', label: '📊 Tableau de bord' }, ...(user.is_pro ? [{ href: '/pro/dashboard', label: '🔧 Espace pro' }] : [])].map(it => (
                    <Link key={it.href} href={it.href} onClick={() => setProfileOpen(false)} style={dropItem}>{it.label}</Link>
                  ))}
                  <button onClick={signOut} style={{ ...dropItem, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--td3)' }}>↩ Déconnexion</button>
                </div>
              )}
            </div>
          ) : (
            /* Déconnecté : Connexion + Rejoindre #N */
            <>
              <Link href="/connexion" className="max-md:hidden" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', padding: '6px 14px', borderRadius: 3, border: '1px solid var(--bd2)', color: 'var(--td2)', textDecoration: 'none' }}>
                Connexion
              </Link>
              <Link href="/inscription" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', padding: '6px 14px', borderRadius: 3, background: 'linear-gradient(90deg, var(--az), var(--az2))', color: '#fff', textDecoration: 'none' }}>
                Rejoindre {nextNum != null ? `#${nextNum}` : 'NIKA'}
              </Link>
            </>
          )}

          {/* Burger */}
          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, padding: 6, width: 40, height: 40, borderRadius: 4 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'block', width: 18, height: 2, background: 'var(--td2)', borderRadius: 1, transition: 'all 0.3s', transform: mobileOpen ? i === 0 ? 'rotate(45deg) translate(3px,4px)' : i === 1 ? 'scaleX(0)' : 'rotate(-45deg) translate(3px,-4px)' : 'none', opacity: mobileOpen && i === 1 ? 0 : 1 }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile nav */}
      <div data-liquid-glass="bar" suppressHydrationWarning className="liquid-glass-bar" style={{ position: 'fixed', top: 54, left: 0, right: 0, zIndex: 290, transform: mobileOpen ? 'translateY(0)' : 'translateY(-8px)', opacity: mobileOpen ? 1 : 0, transition: 'transform 0.28s ease, opacity 0.28s ease', pointerEvents: mobileOpen ? 'all' : 'none' }}>
        <div style={{ padding: '0.9rem 1.4rem', borderBottom: '1px solid var(--bd)' }}>
          <div className="g-3" style={{ gap: 6 }}>
            {DOMAINS.map(d => (
              <Link key={d.slug} href={`/${d.slug}`} onClick={() => setMobileOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '0.65rem 0.3rem', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--bd)', textDecoration: 'none' }}>
                <Spin360 emoji={d.icon} alt={d.label} accent={d.color} size={40} {...visual('domains', d.slug)} />
                <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--td2)' }}>{d.label}</span>
              </Link>
            ))}
          </div>
        </div>
        {NAV_LINKS.filter(l => !DOMAINS.some(d => `/${d.slug}` === l.href)).map(({ href, label, highlight }) => (
          <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: highlight ? 'var(--az2)' : 'var(--td2)', padding: '0.95rem 1.4rem', borderBottom: '1px solid var(--bd)', display: 'block', transition: 'color 0.2s' }}>{label}</Link>
        ))}
        {user && badge ? (
          <div style={{ padding: '1rem 1.4rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/profil" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <NikaBadge number={badge.number} tier={badge.tier} kycLevel={badge.kyc} size="md" isPro={!!user.is_pro} />
              <span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>#{badge.number} · {user.username}</span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{user.level_name} · {user.nika_credits ?? 0} $NIKKA</span>
              </span>
            </Link>
            {user.is_pro && <Link href="/pro/dashboard" onClick={() => setMobileOpen(false)} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--gold)', textDecoration: 'none' }}>Espace pro →</Link>}
            <button onClick={() => { signOut(); setMobileOpen(false); }} style={{ textAlign: 'left', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Déconnexion</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, padding: '1rem 1.4rem' }}>
            <Link href="/connexion" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: 10, borderRadius: 3, fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, textAlign: 'center', border: '1px solid var(--bd2)', color: 'var(--td2)', textDecoration: 'none' }}>Connexion</Link>
            <Link href="/inscription" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: 10, borderRadius: 3, fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, textAlign: 'center', background: 'linear-gradient(90deg, var(--az), var(--az2))', color: '#fff', textDecoration: 'none' }}>Rejoindre {nextNum != null ? `#${nextNum}` : 'NIKA'}</Link>
          </div>
        )}
      </div>
    </>
  );
}

const dropItem: React.CSSProperties = {
  display: 'block', padding: '8px 10px', borderRadius: 8,
  fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600,
  color: 'var(--td2)', textDecoration: 'none',
};
