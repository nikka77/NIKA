// app/learn/akasha/vs/[a]/[b]/page.tsx — COMPARATEUR (Refonte L8) : « Goku vs Luffy » — deux fiches
// face à face, stats comparées en barres (popularité, taille, prime, nb de techniques), gagnant mis
// en avant par métrique. URL partageable. Server Component (2× getEntryBySlug, déjà cache()).
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEntryBySlug } from '@/lib/akasha/queries';
import { RARITY_META, universeMeta, type AkashaEntryDetail } from '@/lib/akasha/types';
import { getCuratedDuels } from '@/lib/akasha/curated-duels';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

type Props = { params: Promise<{ a: string; b: string }> };

// Pré-génère la sélection de duels curée (voir lib/akasha/curated-duels.ts) pour le SEO ; toute
// autre paire de slugs reste accessible à la demande (dynamicParams reste à true par défaut).
export async function generateStaticParams() {
  return getCuratedDuels();
}

const num = (a: Record<string, unknown>, k: string): number => (typeof a[k] === 'number' ? (a[k] as number) : Number(String(a[k] ?? '').replace(/[^\d]/g, '')) || 0);
const techCount = (e: AkashaEntryDetail) => e.relationsOut.filter((r) => r.relation === 'maitrise' && r.target.category === 'Attaque').length;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { a, b } = await params;
  const [ea, eb] = await Promise.all([getEntryBySlug(a), getEntryBySlug(b)]);
  if (!ea || !eb) return { title: 'Comparateur — AKASHA' };
  return {
    title: `${ea.name} vs ${eb.name} — Comparateur AKASHA`,
    description: `Qui l'emporte ? ${ea.name} face à ${eb.name} : popularité, prime, gabarit, arsenal comparés dans le registre AKASHA.`,
    alternates: { canonical: `${SITE_URL}/learn/akasha/vs/${a}/${b}` },
  };
}

function Fighter({ e, side }: { e: AkashaEntryDetail; side: 'a' | 'b' }) {
  const m = e.universe ? universeMeta(e.universe) : null;
  const rar = e.rarity ? RARITY_META[e.rarity] : null;
  return (
    <Link href={`/learn/akasha/${e.slug}`} className={`ak-r-${e.rarity ?? 'common'}`} style={{ display: 'block', textDecoration: 'none', borderRadius: 14, overflow: 'hidden', border: `1px solid ${rar?.color ?? 'var(--bd)'}`, background: 'var(--bg2)' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: `${(m?.color ?? '#7B5CF0')}18` }}>
        {e.image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img aria-hidden src={e.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'blur(16px) brightness(0.5)', transform: 'scale(1.2)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.image_url} alt={e.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
          </>
        ) : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>👤</div>}
        <span style={{ position: 'absolute', top: 8, [side === 'a' ? 'left' : 'right']: 8, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 20, color: rar?.color ?? '#fff', textShadow: '0 2px 8px #000' }}>{side === 'a' ? 'A' : 'B'}</span>
      </div>
      <div style={{ padding: '10px 12px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 17, color: 'var(--td)', lineHeight: 1.1 }}>{e.name}</div>
        {m && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: m.color, marginTop: 3 }}>{m.emoji} {e.universe}</div>}
      </div>
    </Link>
  );
}

function StatRow({ label, va, vb, fmt }: { label: string; va: number; vb: number; fmt: (n: number) => string }) {
  if (!va && !vb) return null;
  const max = Math.max(va, vb, 1);
  const aWins = va > vb, bWins = vb > va;
  const Bar = ({ v, win, align }: { v: number; win: boolean; align: 'r' | 'l' }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: align === 'r' ? 'flex-end' : 'flex-start', gap: 3 }}>
      <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 13, color: win ? '#D4A017' : 'var(--td2)' }}>{v ? fmt(v) : '—'}{win && ' 👑'}</span>
      <div style={{ width: '100%', height: 7, borderRadius: 5, background: 'var(--bg3)', overflow: 'hidden', display: 'flex', justifyContent: align === 'r' ? 'flex-end' : 'flex-start' }}>
        <div style={{ width: `${(v / max) * 100}%`, height: '100%', borderRadius: 5, background: win ? 'linear-gradient(90deg, #D4A017, #F0C040)' : 'linear-gradient(90deg, #5A88B0, #7B5CF0)' }} />
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <Bar v={va} win={aWins} align="r" />
      <div style={{ width: 96, flexShrink: 0, textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)' }}>{label}</div>
      <Bar v={vb} win={bWins} align="l" />
    </div>
  );
}

export default async function VersusPage({ params }: Props) {
  const { a, b } = await params;
  const [ea, eb] = await Promise.all([getEntryBySlug(a), getEntryBySlug(b)]);
  if (!ea || !eb) notFound();
  const aa = ea.attributes as Record<string, unknown>;
  const ab = eb.attributes as Record<string, unknown>;

  return (
    <main>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.4rem) 1.2rem clamp(3rem,7vw,5rem)' }}>
        <Link href="/learn/akasha" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 24, padding: '4px 2px', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', textDecoration: 'none' }}>← Registre AKASHA</Link>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#E8623A', margin: '1rem 0 0.4rem', textAlign: 'center' }}>⚔️ Comparateur</div>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(26px,6vw,44px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', textAlign: 'center', lineHeight: 1, margin: '0 0 1.4rem' }}>
          {ea.name} <span style={{ color: '#E8623A' }}>vs</span> {eb.name}
        </h1>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1.8rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}><Fighter e={ea} side="a" /></div>
          <div style={{ flex: '0 0 auto', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(22px,6vw,34px)', color: 'var(--td3)' }}>VS</div>
          <div style={{ flex: 1, minWidth: 0 }}><Fighter e={eb} side="b" /></div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 14, padding: '0.8rem 1.1rem' }}>
          <StatRow label="Popularité" va={num(aa, 'favorites')} vb={num(ab, 'favorites')} fmt={(n) => `★ ${n.toLocaleString('fr-FR')}`} />
          <StatRow label="Prime" va={num(aa, 'bounty')} vb={num(ab, 'bounty')} fmt={(n) => `${(n / 1e6).toLocaleString('fr-FR')} M฿`} />
          <StatRow label="Taille" va={num(aa, 'height_cm')} vb={num(ab, 'height_cm')} fmt={(n) => `${n} cm`} />
          <StatRow label="Techniques" va={techCount(ea)} vb={techCount(eb)} fmt={(n) => `${n}`} />
        </div>

        <p style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', textAlign: 'center', margin: '1.2rem 0 0', lineHeight: 1.5 }}>
          Comparaison sur les données disponibles du registre. 👑 = meilleur sur la métrique.
        </p>
      </div>
    </main>
  );
}
