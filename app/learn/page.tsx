import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LEARN — Cours & Coaching Côte d\'Azur | NIKA',
  description: 'Formateurs locaux, cours de surf, langues, musique, sport et masterclass sur Nice, Antibes et Cannes. Apprenez avec les meilleurs de la Côte d\'Azur.',
  keywords: ['cours surf nice', 'coach sport côte d\'azur', 'cours langue nice', 'formateur antibes', 'masterclass cannes'],
};

const LEARN_CATS = [
  { slug: 'sport', label: 'Sport & Fitness', icon: '💪' },
  { slug: 'langue', label: 'Langues', icon: '🌍' },
  { slug: 'musique', label: 'Musique', icon: '🎸' },
  { slug: 'cuisine', label: 'Cuisine', icon: '👨‍🍳' },
  { slug: 'code', label: 'Code & Tech', icon: '💻' },
  { slug: 'art', label: 'Arts & Design', icon: '🎨' },
  { slug: 'surf', label: 'Surf & Mer', icon: '🏄' },
  { slug: 'yoga', label: 'Yoga & Bien-être', icon: '🧘' },
];

export default async function LearnPage() {
  const supabase = await createClient();
  const { data: pros } = supabase
    ? await supabase.from('pros').select('id, business_name, description, address, rating, verified').eq('domain', 'learn').eq('active', true).order('rating', { ascending: false }).limit(20)
    : { data: [] };

  const { data: listings } = supabase
    ? await supabase.from('listings').select('id, title, description, price, pros(id, business_name)').eq('available', true).in('pro_id',
        pros?.map((p: { id: string }) => p.id) || []
      ).limit(12)
    : { data: [] };

  return (
    <main style={{ padding: 'clamp(2rem,5vw,3rem) 1.4rem clamp(3rem,7vw,5rem)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7B5CF0', marginBottom: '0.4rem' }}>📚 Domaine 07</p>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,7vw,72px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '0.8rem' }}>LEARN</h1>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', maxWidth: 500, lineHeight: 1.6 }}>Cours, coaching, ateliers — apprenez avec les meilleurs de la Côte d&apos;Azur.</p>
      </div>

      <div style={{ gap: '0.7rem', marginBottom: '3rem' }} className="g-4 max-sm:grid-cols-2">
        {LEARN_CATS.map(c => (
          <div key={c.slug} style={{ background: 'var(--bg2)', border: '1px solid rgba(123,92,240,0.15)', borderRadius: 10, padding: '1.1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: '0.4rem' }}>{c.icon}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, color: 'var(--td2)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {listings && listings.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Cours disponibles</h2>
          <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {(listings as { id: string; title: string; description?: string; price?: number; pros: { id: string; business_name: string } | null }[]).map((item) => (
              <Link key={item.id} href={item.pros ? `/pro/${item.pros.id}` : '/learn'} style={{ background: 'var(--bg2)', border: '1px solid rgba(123,92,240,0.15)', borderRadius: 10, padding: '1.3rem', textDecoration: 'none' }}>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.3rem' }}>{item.title}</div>
                {item.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)', marginBottom: '0.6rem' }}>{item.description.slice(0, 60)}…</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {item.price && <span style={{ fontFamily: 'var(--fn)', fontSize: 22, color: '#7B5CF0' }}>{item.price}€</span>}
                  <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{item.pros?.business_name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {pros && pros.length > 0 ? (
        <div>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Professeurs & Coaches</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {pros.map((pro: { id: string; business_name: string; description?: string; address?: string; rating: number; verified: boolean }) => (
              <Link key={pro.id} href={`/pro/${pro.id}`} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', textDecoration: 'none', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                    {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px' }}>✓</span>}
                  </div>
                  {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{pro.description.slice(0, 90)}…</div>}
                  {pro.address && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: '0.2rem' }}>📍 {pro.address}</div>}
                </div>
                {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--gold2)', flexShrink: 0 }}>⭐ {pro.rating.toFixed(1)}</div>}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>📚</div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', marginBottom: '1.5rem' }}>Les formateurs arrivent bientôt sur NIKA.</p>
          <Link href="/pro/inscription?type=learn" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: '#7B5CF0', border: '1px solid rgba(123,92,240,0.3)', padding: '10px 20px', borderRadius: 6 }}>
            Proposer mes cours →
          </Link>
        </div>
      )}
    </main>
  );
}
