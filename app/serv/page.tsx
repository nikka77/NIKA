import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SERV — Services à Domicile Côte d\'Azur | NIKA',
  description: 'Plombiers, électriciens, serruriers, déménageurs et artisans certifiés sur Nice, Antibes et Cannes. Réservation rapide, notation communauté.',
  keywords: ['plombier nice', 'électricien côte d\'azur', 'serrurier antibes', 'déménagement cannes', 'artisan nice'],
};

const SERV_CATS = [
  { slug: 'plomberie', label: 'Plomberie', icon: '🚿' },
  { slug: 'electricite', label: 'Électricité', icon: '⚡' },
  { slug: 'menage', label: 'Ménage', icon: '🧹' },
  { slug: 'jardinage', label: 'Jardinage', icon: '🌿' },
  { slug: 'demenagement', label: 'Déménagement', icon: '📦' },
  { slug: 'informatique', label: 'Informatique', icon: '💻' },
  { slug: 'serrurerie', label: 'Serrurerie', icon: '🔑' },
  { slug: 'peinture', label: 'Peinture', icon: '🎨' },
];

export default async function ServPage() {
  const supabase = await createClient();
  const { data: pros } = supabase
    ? await supabase.from('pros').select('id, business_name, description, address, rating, rating_count, verified, phone').eq('domain', 'serv').eq('active', true).order('rating', { ascending: false }).limit(20)
    : { data: [] };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0EA878', marginBottom: '0.4rem' }}>🔧 Domaine 06</p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,7vw,72px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '0.8rem' }}>SERV</h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', maxWidth: 500, lineHeight: 1.6 }}>Services à domicile et artisans de confiance sur la Côte d&apos;Azur.</p>
      </div>

      <div style={{ gap: '0.7rem', marginBottom: '3rem' }} className="g-4 max-sm:grid-cols-2">
        {SERV_CATS.map(c => (
          <div key={c.slug} style={{ background: 'var(--bg2)', border: '1px solid rgba(14,168,120,0.15)', borderRadius: 10, padding: '1.1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: '0.4rem' }}>{c.icon}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, color: 'var(--td2)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {pros && pros.length > 0 ? (
        <div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Prestataires</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {pros.map((pro: { id: string; business_name: string; description?: string; address?: string; rating: number; rating_count: number; verified: boolean; phone?: string }) => (
              <Link key={pro.id} href={`/pro/${pro.id}`} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', textDecoration: 'none', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                    {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px' }}>✓</span>}
                  </div>
                  {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{pro.description.slice(0, 90)}…</div>}
                  {pro.address && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: '0.2rem' }}>📍 {pro.address}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--gold2)', marginBottom: '0.3rem' }}>⭐ {pro.rating.toFixed(1)}</div>}
                  {pro.phone && <a href={`tel:${pro.phone}`} onClick={e => e.stopPropagation()} style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--teal)', textDecoration: 'none' }}>📞 Appeler</a>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>🔧</div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', marginBottom: '1.5rem' }}>Les artisans arrivent sur NIKA.</p>
          <Link href="/pro/inscription?type=serv" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--teal)', border: '1px solid rgba(14,168,120,0.3)', padding: '10px 20px', borderRadius: 6 }}>
            Inscrire mon activité →
          </Link>
        </div>
      )}
    </main>
  );
}
