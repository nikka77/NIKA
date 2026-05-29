import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'SEC — NIKA' };

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

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Hero — SEC has dark/serious vibe */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D44B24', marginBottom: '0.4rem' }}>🔒 Domaine 08</p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,7vw,72px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '0.8rem' }}>SEC</h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', maxWidth: 500, lineHeight: 1.6 }}>
          Sécurité, serrurerie, gardiennage — des professionnels certifiés sur la Côte d&apos;Azur.
        </p>
      </div>

      {/* SOS banner */}
      <div style={{ background: 'rgba(212,75,36,0.06)', border: '1px solid rgba(212,75,36,0.25)', borderRadius: 12, padding: '1.4rem 1.8rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--coral)', fontWeight: 700, marginBottom: '0.2rem' }}>🚨 Urgence serrurerie ?</div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>Intervention 24h/24 — 7j/7 sur la Côte d&apos;Azur</div>
        </div>
        {pros && pros.find((p: { phone?: string }) => p.phone) && (
          <a href={`tel:${pros.find((p: { phone?: string }) => p.phone)?.phone}`} style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 24px', borderRadius: 6, background: 'var(--coral)', color: '#fff', textDecoration: 'none' }}>
            📞 Appeler maintenant
          </a>
        )}
      </div>

      {/* Services */}
      <div style={{ gap: '0.7rem', marginBottom: '3rem' }} className="g-3 max-sm:grid-cols-2">
        {SEC_SERVICES.map(s => (
          <div key={s.slug} style={{ background: 'var(--bg2)', border: '1px solid rgba(212,75,36,0.12)', borderRadius: 10, padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: '0.4rem' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', marginBottom: '0.2rem' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Pros */}
      {pros && pros.length > 0 ? (
        <div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Professionnels certifiés</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {pros.map((pro: { id: string; business_name: string; description?: string; address?: string; rating: number; verified: boolean; phone?: string }) => (
              <Link key={pro.id} href={`/pro/${pro.id}`} style={{ background: 'var(--bg2)', border: `1px solid ${pro.verified ? 'rgba(14,168,120,0.2)' : 'var(--bd)'}`, borderRadius: 10, padding: '1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', textDecoration: 'none', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                    {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px' }}>✓ CERTIFIÉ</span>}
                  </div>
                  {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{pro.description.slice(0, 90)}…</div>}
                  {pro.address && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: '0.2rem' }}>📍 {pro.address}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--gold2)', marginBottom: '0.3rem' }}>⭐ {pro.rating.toFixed(1)}</div>}
                  {pro.phone && <a href={`tel:${pro.phone}`} onClick={e => e.stopPropagation()} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--coral)', textDecoration: 'none' }}>📞 Appeler</a>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>🔒</div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', marginBottom: '1.5rem' }}>Les professionnels de sécurité arrivent sur NIKA.</p>
          <Link href="/pro/inscription?type=sec" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--coral)', border: '1px solid rgba(212,75,36,0.3)', padding: '10px 20px', borderRadius: 6 }}>
            Inscrire mon activité →
          </Link>
        </div>
      )}
    </main>
  );
}
