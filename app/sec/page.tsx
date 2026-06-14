import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import Spin360 from '@/components/Spin360';
import DomainHero from '@/components/DomainHero';
import { visual } from '@/lib/visuals';

export const metadata: Metadata = {
  title: 'SEC — Sécurité & Serrurerie Côte d\'Azur | NIKA',
  description: 'Serruriers 24h/24, gardiennage, alarmes et protection VIP sur Nice, Antibes et Cannes. Professionnels certifiés NIKA. Intervention rapide garantie.',
  keywords: ['serrurier nice 24h', 'gardiennage côte d\'azur', 'alarme nice', 'sécurité antibes', 'serrurerie cannes'],
};

const ACCENT = '#D44B24';

const SEC_SERVICES = [
  { slug: 'gardiennage', label: 'Gardiennage', icon: '👮', desc: 'Agents de sécurité' },
  { slug: 'serrurerie', label: 'Serrurerie', icon: '🗝️', desc: 'Ouverture 24h/24' },
  { slug: 'alarme', label: 'Alarme & Vidéo', icon: '📹', desc: 'Installation & maintenance' },
  { slug: 'coffre', label: 'Coffres & Safes', icon: '🔒', desc: 'Sécurité objets de valeur' },
  { slug: 'protection', label: 'Protection VIP', icon: '🛡️', desc: 'Garde du corps' },
  { slug: 'cybersecu', label: 'Cybersécurité', icon: '💻', desc: 'Protection digitale' },
];

export default async function SecPage() {
  const supabase = await createClient();
  const { data: pros } = supabase
    ? await supabase.from('pros').select('id, business_name, description, address, rating, verified, phone').eq('domain', 'sec').eq('active', true).order('verified', { ascending: false }).order('rating', { ascending: false }).limit(20)
    : { data: [] };

  const sosPhone = pros?.find((p: { phone?: string }) => p.phone)?.phone;

  return (
    <main>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #170804 0%, #220D06 60%, var(--bg) 100%)',
        borderBottom: '1px solid var(--bd)',
        padding: 'clamp(3rem,7vw,5.5rem) 1.4rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <DomainHero slug="sec" />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: ACCENT, marginBottom: '1rem',
          }}>
            🔒 NIKA SEC — Domaine 08
          </div>

          <h1 style={{
            fontFamily: 'var(--fe)',
            fontSize: 'clamp(44px,8vw,96px)',
            fontWeight: 900, fontStyle: 'italic',
            textTransform: 'uppercase', color: 'var(--td)',
            lineHeight: 0.88, marginBottom: '1.2rem',
          }}>
            Dormez<br />
            <span style={{ color: ACCENT }}>tranquille</span>
          </h1>

          <p style={{
            fontFamily: 'var(--fo)',
            fontSize: 'clamp(14px,1.5vw,16px)',
            color: 'var(--td2)', maxWidth: 480, lineHeight: 1.7,
            marginBottom: '1.8rem',
          }}>
            Serrurerie 24h/24, gardiennage, alarmes, protection —
            des professionnels certifiés qui interviennent vite.
          </p>

          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <a href="#services" style={{
              fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '12px 26px', borderRadius: 3,
              background: ACCENT, color: '#fff', textDecoration: 'none',
            }}>
              Voir les services →
            </a>
            <Link href="/pro/inscription?type=sec" style={{
              fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
              padding: '12px 22px', borderRadius: 3,
              border: '1px solid var(--bd2)', color: 'var(--td2)', textDecoration: 'none',
            }}>
              Rejoindre NIKA SEC
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--bd)', padding: '0.9rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { v: '24/7', l: 'Interventions' },
            { v: '100%', l: 'Certifiés NIKA' },
            { v: '<30min', l: 'Urgence serrurerie' },
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
      <div id="services" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(2rem,4vw,3rem) 1.4rem clamp(3rem,7vw,5rem)' }}>

        {/* SOS banner */}
        <div style={{
          background: 'rgba(212,75,36,0.07)', border: '1px solid rgba(212,75,36,0.3)',
          borderRadius: 12, padding: '1.4rem 1.8rem', marginBottom: '3rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: ACCENT }} />
          <div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: ACCENT, fontWeight: 700, marginBottom: '0.2rem' }}>🚨 Urgence serrurerie ?</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>Intervention 24h/24 — 7j/7 sur la Côte d&apos;Azur</div>
          </div>
          {sosPhone ? (
            <a href={`tel:${sosPhone}`} style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 24px', borderRadius: 6, background: ACCENT, color: '#fff', textDecoration: 'none' }}>
              📞 Appeler maintenant
            </a>
          ) : (
            <Link href="/niko" style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 24px', borderRadius: 6, background: ACCENT, color: '#fff', textDecoration: 'none' }}>
              ⚡ Demander via NIKO
            </Link>
          )}
        </div>

        {/* Services */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.92, marginBottom: '0.4rem' }}>
            Services
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1.5rem' }}>
            De la porte claquée à la protection rapprochée
          </p>
          <div style={{ gap: '0.7rem' }} className="g-3 max-sm:grid-cols-2">
            {SEC_SERVICES.map(s => (
              <div key={s.slug} className="dom-card" style={{
                background: 'var(--bg2)', border: '1px solid rgba(212,75,36,0.12)',
                borderRadius: 10, padding: '1.2rem', textAlign: 'center',
                ['--dc' as string]: ACCENT,
              }}>
                <div style={{ marginBottom: '0.4rem' }}>
                  <Spin360 emoji={s.icon} alt={s.label} accent={ACCENT} size={54} {...visual('sec/cats', s.slug)} />
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', marginBottom: '0.2rem' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pros */}
        {pros && pros.length > 0 ? (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Professionnels certifiés</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {pros.map((pro: { id: string; business_name: string; description?: string; address?: string; rating: number; verified: boolean; phone?: string }) => (
                <div key={pro.id} className="dom-card" style={{
                  background: 'var(--bg2)',
                  border: `1px solid ${pro.verified ? 'rgba(14,168,120,0.2)' : 'var(--bd)'}`,
                  borderRadius: 10, padding: '1.4rem', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center',
                  gap: '1rem', flexWrap: 'wrap',
                  ['--dc' as string]: ACCENT,
                }}>
                  <Link href={`/pro/${pro.id}`} style={{ flex: 1, minWidth: 220, textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.3rem' }}>
                      <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                      {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px' }}>✓ CERTIFIÉ</span>}
                    </div>
                    {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{pro.description.slice(0, 90)}…</div>}
                    {pro.address && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: '0.2rem' }}>📍 {pro.address}</div>}
                  </Link>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--gold2)', marginBottom: '0.3rem' }}>⭐ {pro.rating.toFixed(1)}</div>}
                    {pro.phone && <a href={`tel:${pro.phone}`} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: ACCENT, textDecoration: 'none' }}>📞 Appeler</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px dashed rgba(212,75,36,0.3)', borderRadius: 12, padding: '3.5rem 2rem', textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: 44, marginBottom: '0.8rem' }}>🔒</div>
            <p style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', fontWeight: 700, color: 'var(--td)', marginBottom: '0.4rem' }}>Les pros arrivent</p>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Les premiers profils sécurité sont en cours de certification.</p>
          </div>
        )}

        {/* CTA pro */}
        <div style={{
          borderRadius: 16, padding: 'clamp(1.8rem,4vw,2.6rem)',
          background: 'linear-gradient(135deg, rgba(212,75,36,0.14), rgba(212,75,36,0.04))',
          border: '1px solid rgba(212,75,36,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1.2rem',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.3rem' }}>
              Pro de la sécurité ?
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', margin: 0 }}>
              Serrurier, agent, installateur — rejoignez le réseau certifié de la Côte d&apos;Azur.
            </p>
          </div>
          <Link href="/pro/inscription?type=sec" style={{
            fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '13px 28px', borderRadius: 3, flexShrink: 0,
            background: ACCENT, color: '#fff', textDecoration: 'none',
          }}>
            Rejoindre NIKA SEC →
          </Link>
        </div>
      </div>
    </main>
  );
}
