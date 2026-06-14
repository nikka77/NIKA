import { createClient } from '@/lib/supabase/server';
import { NFC_ITEMS } from '@/lib/constants';
import { visual } from '@/lib/visuals';
import type { Metadata } from 'next';
import Link from 'next/link';

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = NFC_ITEMS.find(i => i.slug === slug);
  return {
    title: `${item?.name || 'NIKA NFC'} — Portail NIKA`,
    description: `Accès direct via token NFC NIKA. ${item?.name}`,
  };
}

export default async function NFCPage({ params }: Props) {
  const { slug, id } = await params;
  const item = NFC_ITEMS.find(i => i.slug === slug);
  const supabase = await createClient();

  // Load entity based on slug type
  let entity: Record<string, unknown> | null = null;
  if (supabase) {
    if (['vtc', 'skipper', 'coach', 'wellness'].includes(slug)) {
      const { data } = await supabase.from('pros').select('*').eq('id', id).single();
      entity = data;
    } else if (slug === 'pass') {
      const { data } = await supabase.from('users').select('username, level_name, xp, nika_credits').eq('id', id).single();
      entity = data;
    } else if (slug === 'fidelite') {
      const { data } = await supabase.from('pros').select('business_name, description, rating').eq('id', id).single();
      entity = data;
    }
  }

  const color = item?.color || '#0094D4';
  const card = item ? visual('nfc', item.slug).poster : undefined;

  return (
    <main style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        {/* Carte phygitale détourée (fallback anneau animé) */}
        {card ? (
          <div style={{
            position: 'relative', width: 'min(340px,82vw)', margin: '0 auto 1.5rem',
            background: `radial-gradient(ellipse at center, ${color}2e 0%, transparent 68%)`,
          }}>
            <img src={card} alt={`Carte NIKA ${item?.name}`}
              style={{ width: '100%', height: 'auto', display: 'block', filter: `drop-shadow(0 18px 40px rgba(0,0,0,0.55)) drop-shadow(0 0 32px ${color}3a)` }} />
          </div>
        ) : (
          <div style={{
            width: 140, height: 140, borderRadius: '50%',
            background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
            border: `2px solid ${color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 60, margin: '0 auto 1.5rem',
            boxShadow: `0 0 60px ${color}22, 0 0 120px ${color}11`,
            animation: 'tspin 12s linear infinite',
            position: 'relative',
          }}>
            {item?.icon || '📲'}
          </div>
        )}

        {/* Header */}
        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color, marginBottom: '0.4rem' }}>
          NIKA NFC · Token {item?.n}
        </div>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,7vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '1.5rem' }}>
          {item?.name || 'NIKA'}
        </h1>

        {/* Entity card */}
        {entity && (
          <div style={{ background: 'var(--bg2)', border: `1px solid ${color}33`, borderRadius: 8, padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            {!!entity.business_name && (
              <div style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.5rem' }}>
                {entity.business_name as string}
              </div>
            )}
            {!!entity.username && (
              <div style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.5rem' }}>
                @{entity.username as string}
              </div>
            )}
            {!!entity.level_name && (
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: `${color}15`, color, border: `1px solid ${color}30`, display: 'inline-block', marginBottom: '0.8rem' }}>
                {entity.level_name as string}
              </div>
            )}
            {!!entity.description && (
              <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6 }}>{entity.description as string}</p>
            )}
            {entity.xp != null && (
              <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: 'var(--gold2)', marginTop: '0.5rem' }}>
                ⚡ {entity.xp as number} XP
              </div>
            )}
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {slug === 'vtc' && !!entity?.phone && (
            <a href={`tel:${entity.phone as string}`} style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '14px 30px', borderRadius: 3, background: color, color: '#fff', boxShadow: `0 0 28px ${color}30`, display: 'block' }}>
              📞 Appeler maintenant
            </a>
          )}
          {slug === 'skipper' && (
            <Link href={`/azur?skipper=${id}`} style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '14px 30px', borderRadius: 3, background: color, color: '#fff', display: 'block' }}>
              ⚓ Voir les disponibilités
            </Link>
          )}
          <Link href="/" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 700, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 24px', borderRadius: 3, border: '1px solid var(--bd2)', color: 'var(--td)', display: 'block' }}>
            Explorer NIKA →
          </Link>
        </div>

        {/* NIKA branding */}
        <div style={{ marginTop: '2rem', fontFamily: 'var(--fn)', fontSize: 16, letterSpacing: '0.12em', color: 'var(--td3)' }}>
          NIKA
        </div>
      </div>
    </main>
  );
}
