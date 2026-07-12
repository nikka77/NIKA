// app/learn/akasha/album/page.tsx — L'ALBUM DE COLLECTION (Refonte L5) : classeur par univers,
// ~20 sets canon à compléter (Équipe 7, Mugiwara, Gotei 13, Espada, Joestar…). RSC : charge les
// entrées des sets en 1 requête ; la possession (localStorage) est résolue côté client (AlbumClient).
import type { Metadata } from 'next';
import Link from 'next/link';
import { AKASHA_SETS } from '@/lib/akasha/sets';
import { getEntriesBySlugs } from '@/lib/akasha/queries';
import AlbumClient, { type AlbumSetData } from '@/components/akasha/AlbumClient';

export const revalidate = 3600; // ISR 1 h

export const metadata: Metadata = {
  title: 'Album de collection — AKASHA | NIKA LEARN',
  description: 'Complète les sets canon d’AKASHA : Équipe 7, Chapeau de Paille, Gotei 13, Espada, lignée Joestar… Collectionne les cartes en explorant le registre.',
};

export default async function AlbumPage() {
  // 1 seule requête pour tous les slugs (uniques) des 20 sets.
  const allSlugs = Array.from(new Set(AKASHA_SETS.flatMap((s) => s.slugs)));
  const entries = await getEntriesBySlugs(allSlugs);
  const bySlug = new Map(entries.map((e) => [e.slug, e]));

  // Sets peuplés — un slug introuvable en base est simplement omis (auto-cicatrisation).
  const sets: AlbumSetData[] = AKASHA_SETS.map((s) => ({
    id: s.id,
    title: s.title,
    icon: s.icon,
    universe: s.universe,
    entries: s.slugs.map((slug) => bySlug.get(slug)).filter((e): e is NonNullable<typeof e> => !!e),
  })).filter((s) => s.entries.length > 0);

  return (
    <main>
      <div style={{ background: 'linear-gradient(180deg, #0B0820 0%, #140C30 55%, var(--bg) 100%)', borderBottom: '1px solid var(--bd)', padding: 'clamp(2rem,5vw,3.4rem) 1.4rem 1.6rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Link href="/learn/akasha" style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', textDecoration: 'none' }}>
            ← Registre AKASHA
          </Link>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4A017', margin: '1rem 0 0.5rem' }}>
            🗂 Ma collection
          </div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,8vw,76px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, margin: 0 }}>
            L&rsquo;Album
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 'clamp(13px,1.5vw,15.5px)', color: 'var(--td2)', maxWidth: 520, lineHeight: 1.65, margin: '0.9rem 0 0' }}>
            Complète les sets canon de chaque univers : ajoute les cartes à ta collection depuis leurs fiches,
            le booster quotidien ou la carte du jour. Une carte manquante = un dos « ??? » à conquérir.
          </p>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2.2rem) 1.4rem clamp(3rem,7vw,5rem)' }}>
        <AlbumClient sets={sets} />
      </div>
    </main>
  );
}
