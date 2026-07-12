'use client';
// components/akasha/AlbumClient.tsx — le CLASSEUR de collection (Refonte L5) : sets à compléter en
// slots façon album Panini. Possédée → mini-carte ; manquante → dos de carte « ??? ». Progression
// par set + badge ✔ complet. Collection = localStorage nika:akasha:collection (contrat CardActions).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CardBack from './CardBack';
import { universeMeta, type AkashaEntryCard } from '@/lib/akasha/types';
import { readCollectionSlugs, onCollectionChange } from '@/lib/akasha/collection-storage';

export interface AlbumSetData {
  id: string;
  title: string;
  icon: string;
  universe: string;
  entries: AkashaEntryCard[];
}

export default function AlbumClient({ sets }: { sets: AlbumSetData[] }) {
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => setOwned(readCollectionSlugs());
    sync();
    return onCollectionChange(sync, { crossTab: true });
  }, []);

  const universes = Array.from(new Set(sets.map((s) => s.universe)));
  const totalSlots = sets.reduce((a, s) => a + s.entries.length, 0);
  const totalOwned = mounted ? sets.reduce((a, s) => a + s.entries.filter((e) => owned.has(e.slug)).length, 0) : 0;
  const completeSets = mounted ? sets.filter((s) => s.entries.length > 0 && s.entries.every((e) => owned.has(e.slug))).length : 0;

  return (
    <div>
      {/* Progression globale */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.6rem' }}>
        <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 26, color: 'var(--td)' }}>
          {mounted ? totalOwned : '—'}<span style={{ color: 'var(--td3)', fontSize: 18 }}> / {totalSlots} cartes</span>
        </div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: '#D4A017', background: '#D4A0171A', border: '1px solid #D4A01755', borderRadius: 20, padding: '4px 12px' }}>
          🏆 {mounted ? completeSets : '—'} set{completeSets > 1 ? 's' : ''} complet{completeSets > 1 ? 's' : ''} / {sets.length}
        </div>
      </div>

      {universes.map((uni) => {
        const um = universeMeta(uni);
        const uniSets = sets.filter((s) => s.universe === uni);
        return (
          <section key={uni} style={{ marginBottom: '2.2rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: um.color, margin: '0 0 0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden>{um.emoji}</span>{uni}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {uniSets.map((set) => {
                const got = mounted ? set.entries.filter((e) => owned.has(e.slug)).length : 0;
                const complete = mounted && got === set.entries.length && set.entries.length > 0;
                const pct = set.entries.length ? Math.round((got / set.entries.length) * 100) : 0;
                return (
                  <div key={set.id} className="dom-card" style={{ background: complete ? `linear-gradient(120deg, ${um.color}1A, var(--bg2))` : 'var(--bg2)', border: `1px solid ${complete ? um.color : 'var(--bd)'}`, borderRadius: 14, padding: '0.9rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 15.5, color: 'var(--td)' }}>
                        <span aria-hidden style={{ marginRight: 6 }}>{set.icon}</span>{set.title}
                        {complete && <span style={{ marginLeft: 8, fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: um.color }}>✔ Complet</span>}
                      </div>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: got ? um.color : 'var(--td3)' }}>{mounted ? `${got}/${set.entries.length}` : `${set.entries.length} cartes`}</div>
                    </div>
                    {/* jauge */}
                    <div aria-hidden style={{ height: 4, borderRadius: 4, background: 'var(--bg3)', overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${um.color}, ${um.color}88)`, transition: 'width 0.5s ease' }} />
                    </div>
                    {/* slots */}
                    <div className="g-fill-86" style={{ gap: 8 }}>
                      {set.entries.map((e) => {
                        const has = mounted && owned.has(e.slug);
                        return has ? (
                          <Link key={e.slug} href={`/learn/akasha/${e.slug}`} className={`ak-r-${e.rarity ?? 'common'}`} style={{ display: 'block', textDecoration: 'none', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--bd2)', background: 'var(--bg)' }}>
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 4', overflow: 'hidden' }}>
                              {e.image_url ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img aria-hidden src={e.image_url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'blur(10px) brightness(0.5)', transform: 'scale(1.2)' }} />
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={e.image_url} alt={e.name} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                                </>
                              ) : (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, opacity: 0.6 }}>👤</div>
                              )}
                            </div>
                            <div style={{ padding: '3px 6px', fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: 'var(--td2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                          </Link>
                        ) : (
                          <Link key={e.slug} href={`/learn/akasha/${e.slug}`} title="Carte manquante — visite sa fiche pour la collectionner" style={{ display: 'block', textDecoration: 'none', opacity: 0.65 }}>
                            <div style={{ width: '100%', aspectRatio: '3 / 4' }}>
                              <CardBack universe={set.universe} height="100%" />
                            </div>
                            <div style={{ padding: '3px 6px', fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: 'var(--td3)', textAlign: 'center' }}>???</div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
