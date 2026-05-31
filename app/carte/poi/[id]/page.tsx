import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = supabase ? await supabase.from('pois').select('name').eq('id', id).single() : { data: null };
  return { title: data ? `${data.name} — Carte NIKA` : 'POI NIKA' };
}

export default async function POIDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: poi } = await supabase.from('pois').select('*, users(username, level_name)').eq('id', id).eq('status', 'approved').single();
  if (!poi) notFound();

  const catColors: Record<string, string> = {
    food: '#D4A017', auto: '#0094D4', azur: '#0868A0', stay: '#E07038',
    serv: '#0EA878', learn: '#7B5CF0', sec: '#D44B24', rent: '#5A88B0', general: '#5A88B0',
  };
  const catIcons: Record<string, string> = {
    food: '🍽️', auto: '🚗', azur: '🛥️', stay: '🏡',
    serv: '🔧', learn: '📚', sec: '🔒', rent: '📦', general: '📍',
  };
  const color = catColors[poi.category] || '#5A88B0';
  const icon = catIcons[poi.category] || '📍';

  return (
    <main style={{ padding: '4rem 1.4rem 5rem', maxWidth: 720, margin: '0 auto' }}>
      <Link href="/carte" style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '2rem' }}>
        ← Retour à la carte
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, background: `${color}20`, border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: `${color}15`, color, border: `1px solid ${color}30` }}>
              {poi.category}
            </span>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--az)' }}>▲ {poi.upvotes}</span>
          </div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95 }}>
            {poi.name}
          </h1>
        </div>
      </div>

      {poi.description && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7 }}>{poi.description}</p>
        </div>
      )}

      <div style={{ gap: '1rem', marginBottom: '2rem' }} className="g-2 max-sm:grid-cols-1">
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.2rem' }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.4rem' }}>Coordonnées</div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)' }}>{poi.lat.toFixed(5)}, {poi.lng.toFixed(5)}</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1.2rem' }}>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.4rem' }}>Créé par</div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)' }}>
            {poi.users?.username || 'Anonyme'} · {poi.users?.level_name || 'Inconnu'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <a href={`https://maps.google.com/?q=${poi.lat},${poi.lng}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '12px', borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--bd2)', fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', textAlign: 'center' }}>
          🗺️ Google Maps
        </a>
        <button style={{ flex: 1, padding: '12px', borderRadius: 6, background: `${color}15`, border: `1px solid ${color}40`, fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color, cursor: 'pointer' }}>
          ▲ Upvote ({poi.upvotes})
        </button>
      </div>
    </main>
  );
}
