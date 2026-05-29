'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMapStore, useAuthStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthModal from './AuthModal';

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const { openMap } = useMapStore();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  }

  const NAV_LINKS = [
    { href: '/#domaines', label: 'Domaines' },
    { href: '/carte', label: 'Carte' },
    { href: '/food', label: 'FOOD' },
    { href: '/auto', label: 'AUTO' },
    { href: '/stay', label: 'STAY' },
    { href: '/azur', label: 'AZUR' },
    { href: '/niko', label: 'NIKO ⚡', highlight: true },
  ];

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 300,
        background: 'rgba(5,12,23,0.93)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--bd)',
        padding: '0 1.4rem',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 54,
      }}>
        <Link href="/" style={{ fontFamily: 'var(--fn)', fontSize: 24, letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 7 }}>
          NIKA
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--az2)', boxShadow: '0 0 8px var(--az2)',
            display: 'inline-block',
            animation: 'ndp 2s ease-in-out infinite',
          }} />
        </Link>

        {/* Desktop links */}
        <ul style={{ display: 'flex' }} className="max-md:hidden">
          {NAV_LINKS.map(({ href, label, highlight }) => (
            <li key={href}>
              <Link href={href} style={{
                fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: highlight ? 'var(--az2)' : 'var(--td2)',
                padding: '0 10px', height: 54,
                display: 'flex', alignItems: 'center',
                borderBottom: highlight ? '2px solid var(--az2)' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
                className="nav-link"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right buttons */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <button
            onClick={openMap}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '1px solid var(--bd2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 15, color: 'var(--td2)', transition: 'all 0.2s',
            }}
            title="Carte"
          >
            🗺️
          </button>

          {user ? (
            /* Logged in: show user info + dashboard */
            <>
              <Link href="/dashboard" className="max-md:hidden" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
                color: 'var(--td2)', padding: '5px 12px', borderRadius: 20,
                border: '1px solid var(--bd2)', textDecoration: 'none',
              }}>
                <span style={{ color: 'var(--gold2)' }}>⭐</span>
                <span>{user.username}</span>
                <span style={{ color: 'var(--td3)', fontWeight: 400 }}>· {user.level_name}</span>
              </Link>
              {user.is_pro && (
                <Link href="/pro/dashboard" className="max-md:hidden" style={{
                  fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.04em', padding: '6px 14px', borderRadius: 3,
                  background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)',
                  color: 'var(--gold)', textDecoration: 'none',
                }}>
                  Espace pro
                </Link>
              )}
              <button
                onClick={signOut}
                className="max-md:hidden"
                style={{
                  fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.04em', padding: '6px 14px', borderRadius: 3,
                  border: '1px solid var(--bd2)', color: 'var(--td3)',
                  transition: 'all 0.2s',
                }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            /* Logged out: show login/register */
            <>
              <button
                onClick={() => setAuthMode('login')}
                className="max-md:hidden"
                style={{
                  fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.04em', padding: '6px 14px', borderRadius: 3,
                  border: '1px solid var(--bd2)', color: 'var(--td2)',
                  transition: 'all 0.2s',
                }}
              >
                Connexion
              </button>
              <button
                onClick={() => setAuthMode('register')}
                style={{
                  fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.04em', padding: '6px 14px', borderRadius: 3,
                  background: 'var(--az)', color: '#fff', transition: 'all 0.2s',
                }}
              >
                S&apos;inscrire
              </button>
            </>
          )}

          {/* Burger */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              gap: 4, padding: 6, width: 34, height: 34, borderRadius: 3,
            }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'block', width: 18, height: 2,
                background: 'var(--td2)', borderRadius: 1,
                transition: 'all 0.3s',
                transform: mobileOpen
                  ? i === 0 ? 'rotate(45deg) translate(3px,4px)'
                  : i === 1 ? 'scaleX(0)'
                  : 'rotate(-45deg) translate(3px,-4px)'
                  : 'none',
                opacity: mobileOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile nav */}
      <div style={{
        position: 'fixed', top: 54, left: 0, right: 0, zIndex: 290,
        background: 'var(--bg2)', borderBottom: '1px solid var(--bd)',
        transform: mobileOpen ? 'translateY(0)' : 'translateY(-8px)',
        opacity: mobileOpen ? 1 : 0,
        transition: 'transform 0.28s ease, opacity 0.28s ease',
        pointerEvents: mobileOpen ? 'all' : 'none',
      }}>
        {NAV_LINKS.map(({ href, label, highlight }) => (
          <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
            fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: highlight ? 'var(--az2)' : 'var(--td2)',
            padding: '0.95rem 1.4rem',
            borderBottom: '1px solid var(--bd)', display: 'block',
            transition: 'color 0.2s',
          }}>
            {label}
          </Link>
        ))}
        {user ? (
          <div style={{ padding: '1rem 1.4rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href="/dashboard" onClick={() => setMobileOpen(false)} style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', textDecoration: 'none' }}>
              ⭐ {user.username} · {user.level_name}
            </Link>
            {user.is_pro && (
              <Link href="/pro/dashboard" onClick={() => setMobileOpen(false)} style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--gold)', textDecoration: 'none' }}>
                Espace pro →
              </Link>
            )}
            <button onClick={() => { signOut(); setMobileOpen(false); }} style={{ textAlign: 'left', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              Déconnexion
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, padding: '1rem 1.4rem' }}>
            <button onClick={() => { setAuthMode('login'); setMobileOpen(false); }} style={{
              flex: 1, padding: 10, borderRadius: 3, fontFamily: 'var(--fo)',
              fontSize: 12, fontWeight: 700, textAlign: 'center',
              border: '1px solid var(--bd2)', color: 'var(--td2)',
            }}>Connexion</button>
            <button onClick={() => { setAuthMode('register'); setMobileOpen(false); }} style={{
              flex: 1, padding: 10, borderRadius: 3, fontFamily: 'var(--fo)',
              fontSize: 12, fontWeight: 700, textAlign: 'center',
              background: 'var(--az)', color: '#fff',
            }}>S&apos;inscrire</button>
          </div>
        )}
      </div>

      {authMode && (
        <AuthModal mode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </>
  );
}
