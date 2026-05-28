import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

type Props = { params: Promise<{ item_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { item_id } = await params;
  const supabase = await createClient();
  if (!supabase) return { title: 'Article — NIKA RENT' };
  const { data: item } = await supabase.from('listings').select('title').eq('id', item_id).single();
  return { title: `${item?.title || 'Article'} — NIKA RENT` };
}

export default async function RentItemPage({ params }: Props) {
  const { item_id } = await params;
  const supabase = await createClient();

  const { data: item } = supabase
    ? await supabase.from('listings').select('*, pros(id, business_name, phone, rating, verified, description)').eq('id', item_id).single()
    : { data: null };

  if (!item) notFound();

  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const pro = item.pros as { id: string; business_name: string; phone?: string; rating: number; verified: boolean; description?: string } | null;

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 760, margin: '0 auto' }}>
      <Link href="/rent" style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1.2rem' }}>← RENT</Link>

      <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '1rem' }}>
        {item.title}
      </h1>

      {item.description && (
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, marginBottom: '2rem' }}>{item.description}</p>
      )}

      {/* Booking card */}
      <div style={{ background: 'var(--bg2)', border: '1px solid rgba(90,136,176,0.3)', borderRadius: 14, padding: '2rem', marginBottom: '2rem' }}>
        {item.price && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'var(--fn)', fontSize: 42, color: '#5A88B0', lineHeight: 1 }}>{item.price}€</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>par jour</div>
          </div>
        )}
        {item.stock !== undefined && item.stock !== null && (
          <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: item.stock < 3 ? 'var(--coral)' : 'var(--teal)', marginBottom: '1rem', fontWeight: 600 }}>
            {item.stock < 3 ? `⚠️ Plus que ${item.stock} disponible(s)` : `✓ ${item.stock} disponibles`}
          </div>
        )}
        {pro?.phone ? (
          <a href={`tel:${pro.phone}`} style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 6, background: 'rgba(90,136,176,0.12)', border: '1px solid rgba(90,136,176,0.3)', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A88B0', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
            📞 Contacter le loueur
          </a>
        ) : (
          <Link href={user ? `/food/commande/${item.id}?pro=${pro?.id || ''}` : `/connexion?redirect=/rent/${item_id}`} style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 6, background: '#5A88B0', fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff', textAlign: 'center', textDecoration: 'none' }}>
            Réserver
          </Link>
        )}
      </div>

      {/* Loueur info */}
      {pro && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.4rem' }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.5rem' }}>Loueur</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>✓ CERTIFIÉ</span>}
              </div>
              {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginTop: '0.3rem' }}>{pro.description}</div>}
            </div>
            {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--gold2)', flexShrink: 0, marginLeft: '1rem' }}>⭐ {pro.rating.toFixed(1)}</div>}
          </div>
          <Link href={`/pro/${pro.id}`} style={{ display: 'inline-block', marginTop: '0.8rem', fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--az)', fontWeight: 600 }}>Voir le profil complet →</Link>
        </div>
      )}
    </main>
  );
}
