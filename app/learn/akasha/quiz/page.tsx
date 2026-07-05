// app/learn/akasha/quiz/page.tsx — QUIZ QUOTIDIEN (Refonte L8). Pool = personnages populaires à bio
// VF ; le client génère 5 questions « Qui suis-je ? » (indice = flavor, nom masqué). Seed jour.
import type { Metadata } from 'next';
import Link from 'next/link';
import { listTopByAttr } from '@/lib/akasha/queries';
import { flavorText } from '@/lib/akasha/flavor';
import QuizClient, { type QuizEntry } from '@/components/akasha/QuizClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Quiz du jour — AKASHA | NIKA LEARN',
  description: 'Le quiz quotidien d’AKASHA : sauras-tu reconnaître ces personnages d’après leur biographie ? 5 questions, un booster à la clé.',
};

// Masque le nom (et ses tokens) dans l'indice pour ne pas donner la réponse.
function maskName(text: string, name: string): string {
  let out = text;
  const parts = name.split(/[\s·/]+/).filter((p) => p.length >= 3);
  for (const p of [name, ...parts]) {
    out = out.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '•••');
  }
  return out;
}

export default async function QuizPage() {
  // Pool : ~80 persos les plus populaires (bio VF + image requises pour un bon quiz).
  const top = await listTopByAttr('favorites', { limit: 120 });
  const pool: QuizEntry[] = top
    .filter((e) => e.image_url && e.descFr)
    .map((e) => {
      const flav = flavorText(e.descFr, 200);
      return flav ? { slug: e.slug, name: e.name, universe: e.universe, image_url: e.image_url, clue: maskName(flav, e.name) } : null;
    })
    .filter((x): x is QuizEntry => !!x)
    .slice(0, 80);

  // Seed jour (nombre) déterministe.
  const today = new Date().toISOString().slice(0, 10);
  let seed = 0;
  for (const ch of today) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;

  return (
    <main>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.4rem) 1.2rem clamp(3rem,7vw,5rem)' }}>
        <Link href="/learn/akasha" style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', textDecoration: 'none' }}>← Registre AKASHA</Link>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7B5CF0', margin: '1rem 0 0.4rem' }}>🧠 Quiz du jour</div>
        <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(30px,7vw,52px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, margin: '0 0 1.6rem' }}>Qui suis-je ?</h1>
        {pool.length >= 8 ? (
          <QuizClient pool={pool} daySeed={seed} />
        ) : (
          <p style={{ fontFamily: 'var(--fo)', color: 'var(--td2)' }}>Le quiz sera bientôt disponible.</p>
        )}
      </div>
    </main>
  );
}
