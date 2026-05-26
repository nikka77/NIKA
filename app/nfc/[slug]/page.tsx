import { NFC_ITEMS } from '@/lib/constants';
import type { Metadata } from 'next';
import Link from 'next/link';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = NFC_ITEMS.find(i => i.slug === slug);
  return {
    title: `${item?.name || 'NIKA NFC'} — Portail NIKA`,
    description: 'Token NFC NIKA — Accès rapide aux services de l\'écosystème.',
  };
}

export async function generateStaticParams() {
  return NFC_ITEMS.map(item => ({ slug: item.slug }));
}

export default async function NFCSlugPage({ params }: Props) {
  const { slug } = await params;
  const item = NFC_ITEMS.find(i => i.slug === slug);

  if (!item) {
    return (
      <main style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <div>
          <div style={{ fontSize: 64, marginBottom: '1rem' }}>❓</div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 32, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)' }}>Token NFC inconnu</h1>
          <Link href="/" style={{ display: 'inline-block', marginTop: '1.5rem', fontFamily: 'var(--fo)', color: 'var(--az)' }}>← Retour à NIKA</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        {/* Token visual */}
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: `radial-gradient(circle, ${item.color}22 0%, transparent 70%)`,
          border: `2px solid ${item.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 52, margin: '0 auto 1.5rem',
          boxShadow: `0 0 40px ${item.color}22`,
        }}>
          {item.icon}
        </div>

        <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: item.color, marginBottom: '0.5rem' }}>
          NIKA NFC · {item.n}
        </div>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,8vw,56px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem', lineHeight: 0.95 }}>
          {item.name}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link href="/" style={{
            fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '14px 30px', borderRadius: 3,
            background: item.color, color: '#fff',
            boxShadow: `0 0 28px ${item.color}30`,
            display: 'block',
          }}>
            Explorer NIKA
          </Link>
          <Link href="/#access" style={{
            fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '14px 30px', borderRadius: 3,
            border: '1px solid var(--bd2)', color: 'var(--td)',
            display: 'block',
          }}>
            Rejoindre NIKA
          </Link>
        </div>
      </div>
    </main>
  );
}
