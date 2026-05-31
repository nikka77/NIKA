import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Services AZUR — NIKA' };

export default async function AzurServicesPage() {
  const supabase = await createClient();
  const { data: pros } = supabase
    ? await supabase.from('pros').select('id, business_name, description, rating, verified').eq('domain', 'azur').eq('active', true).order('rating', { ascending: false })
    : { data: [] };

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 900, margin: '0 auto' }}>
      <Link href="/azur" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1.2rem' }}>← AZUR</Link>
      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '2rem' }}>
        Services Nautiques
      </h1>
      {pros && pros.length > 0 ? (
        <div style={{ gap: '1rem' }} className="g-2 max-sm:grid-cols-1">
          {pros.map((pro: { id: string; business_name: string; description?: string; rating: number; verified: boolean }) => (
            <Link key={pro.id} href={`/azur/bateau/${pro.id}`} style={{ background: 'var(--bg2)', border: '1px solid rgba(8,104,160,0.2)', borderRadius: 10, padding: '1.4rem', textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.4rem' }}>
                <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>✓</span>}
              </div>
              {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginBottom: '0.6rem' }}>{pro.description.slice(0, 80)}…</div>}
              {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontStyle: 'italic', color: 'var(--gold2)' }}>⭐ {pro.rating.toFixed(1)}</div>}
            </Link>
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>⚓</div>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)' }}>Aucun service nautique disponible pour l&apos;instant.</p>
        </div>
      )}
    </main>
  );
}
