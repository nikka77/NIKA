import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import Spin360 from '@/components/Spin360';
import DomainHero from '@/components/DomainHero';

export const metadata: Metadata = {
  title: 'AUTO — Dépannage & VTC Nice | NIKA',
  description: 'Dépannage automobile, VTC certifiés, lavage, mécanique mobile sur la Côte d\'Azur. Géolocalisation en temps réel.',
};

const ACCENT = '#0094D4';

const SERVICES = [
  { icon: '🔧', title: 'Dépannage', desc: 'Pro le plus proche en temps réel. ETA garanti.', color: '#0094D4', href: '/auto/depannage' },
  { icon: '🚖', title: 'VTC', desc: 'Chauffeurs certifiés NIKA. Réservation instantanée.', color: '#00C2FF', href: '/auto/vtc' },
  { icon: '🔑', title: 'Location', desc: 'Véhicules disponibles immédiatement. Sans agence physique.', color: '#7B5CF0', href: '/auto/location' },
  { icon: '⛽', title: 'Carburant', desc: 'Livraison de carburant directement à votre véhicule.', color: '#E07038', href: '/niko' },
  { icon: '🚿', title: 'Lavage mobile', desc: 'Lavage à la mousse écologique sans eau sur votre parking.', color: '#0EA878', href: '/niko' },
  { icon: '🏎️', title: 'Mécanique mobile', desc: 'Vidange, pneus, freins. L\'atelier vient à vous.', color: '#D4A017', href: '/niko' },
];

export default async function AutoPage() {
  const supabase = await createClient();
  const { data: pros } = supabase
    ? await supabase.from('pros').select('*, listings(*)').eq('domain', 'auto').eq('active', true).order('rating', { ascending: false })
    : { data: null };

  return (
    <main>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #02101E 0%, #041B30 60%, var(--bg) 100%)',
        borderBottom: '1px solid var(--bd)',
        padding: 'clamp(3rem,7vw,5.5rem) 1.4rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <DomainHero slug="auto" />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: ACCENT, marginBottom: '1rem',
          }}>
            🚗 NIKA AUTO — Domaine 02
          </div>

          <h1 style={{
            fontFamily: 'var(--fe)',
            fontSize: 'clamp(44px,8vw,96px)',
            fontWeight: 900, fontStyle: 'italic',
            textTransform: 'uppercase', color: 'var(--td)',
            lineHeight: 0.88, marginBottom: '1.2rem',
          }}>
            Roulez<br />
            <span style={{ color: ACCENT }}>sans souci</span>
          </h1>

          <p style={{
            fontFamily: 'var(--fo)',
            fontSize: 'clamp(14px,1.5vw,16px)',
            color: 'var(--td2)', maxWidth: 480, lineHeight: 1.7,
            marginBottom: '1.8rem',
          }}>
            Dépannage géolocalisé, VTC certifiés, lavage mobile,
            carburant livré — tout l&apos;automobile, en un seul endroit.
          </p>

          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <Link href="/auto/depannage" style={{
              fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '12px 26px', borderRadius: 3,
              background: ACCENT, color: '#fff', textDecoration: 'none',
              boxShadow: '0 0 28px rgba(0,148,212,0.3)',
            }}>
              🔧 Dépannage maintenant
            </Link>
            <Link href="/auto/vtc" style={{
              fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
              padding: '12px 22px', borderRadius: 3,
              border: '1px solid var(--bd2)', color: 'var(--td2)', textDecoration: 'none',
            }}>
              🚖 Appeler un VTC
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--bd)', padding: '0.9rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { v: '06', l: 'Services' },
            { v: 'GPS', l: 'Pro le plus proche' },
            { v: '24/7', l: 'Dépannage' },
          ].map(stat => (
            <div key={stat.l}>
              <div style={{ fontFamily: 'var(--fn)', fontSize: 20, color: ACCENT, lineHeight: 1 }}>
                {stat.v}
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                {stat.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENU ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(2rem,4vw,3rem) 1.4rem clamp(3rem,7vw,5rem)' }}>

        {/* Services */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.92, marginBottom: '0.4rem' }}>
            Services disponibles
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1.5rem' }}>
            De la panne au plein, l&apos;atelier vient à vous
          </p>
          <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {SERVICES.map(({ icon, title, desc, color, href }) => (
              <Link key={title} href={href} className="dom-card" style={{
                background: 'var(--bg2)', border: `1px solid ${color}22`,
                borderRadius: 10, padding: '1.5rem', position: 'relative',
                overflow: 'hidden', textDecoration: 'none',
                ['--dc' as string]: color,
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.75 }} />
                <div style={{ marginBottom: '0.8rem' }}>
                  <Spin360 emoji={icon} alt={title} accent={color} size={58} />
                </div>
                <h3 style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Pros */}
        {pros && pros.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.5rem' }}>
              Pros certifiés NIKA
            </h2>
            <div style={{ gap: '1rem' }} className="g-2 max-sm:grid-cols-1">
              {pros.map((pro) => (
                <div key={pro.id} className="dom-card" style={{
                  background: 'var(--bg2)', border: '1px solid var(--bd)',
                  borderRadius: 10, padding: '1.5rem',
                  ['--dc' as string]: ACCENT,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                    <Link href={`/pro/${pro.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)' }}>{pro.business_name}</div>
                      {pro.verified && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: 'rgba(14,168,120,0.1)', color: 'var(--teal)', border: '1px solid rgba(14,168,120,0.2)' }}>
                          ✓ Certifié
                        </span>
                      )}
                    </Link>
                    {pro.rating > 0 && (
                      <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: 'var(--gold2)' }}>
                        ⭐ {pro.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                  {pro.description && (
                    <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, marginBottom: '0.8rem' }}>{pro.description}</p>
                  )}
                  {pro.phone && (
                    <a href={`tel:${pro.phone}`} style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: ACCENT, textDecoration: 'none' }}>
                      📞 {pro.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA pro */}
        <div style={{
          borderRadius: 16, padding: 'clamp(1.8rem,4vw,2.6rem)',
          background: 'linear-gradient(135deg, rgba(0,148,212,0.14), rgba(0,148,212,0.04))',
          border: '1px solid rgba(0,148,212,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1.2rem',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.3rem' }}>
              Pro de l&apos;automobile ?
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', margin: 0 }}>
              Demandes géolocalisées, gestion par SMS, clientèle locale qui revient.
            </p>
          </div>
          <Link href="/pro/inscription?type=auto" style={{
            fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '13px 28px', borderRadius: 3, flexShrink: 0,
            background: ACCENT, color: '#fff', textDecoration: 'none',
            boxShadow: '0 0 28px rgba(0,148,212,0.3)',
          }}>
            Rejoindre NIKA AUTO →
          </Link>
        </div>
      </div>
    </main>
  );
}
