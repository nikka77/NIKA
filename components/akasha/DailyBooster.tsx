'use client';
// components/akasha/DailyBooster.tsx — BOOSTER QUOTIDIEN : 1 pack de 3 cartes par jour.
// Flip séquentiel des cartes → ajout auto à la collection localStorage (même clé que CardActions).
// Rythme journalier : localStorage['nika:akasha:booster'] = date du dernier pack (YYYY-MM-DD).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RARITY_META, universeMeta, type AkashaRarity } from '@/lib/akasha/types';

type Card = { slug: string; name: string; universe: string | null; image_url: string | null; rarity: AkashaRarity | null };

const LS_LAST = 'nika:akasha:booster';
const LS_COLLECTION = 'nika:akasha:collection';
const today = () => new Date().toISOString().slice(0, 10);

function addToCollection(cards: Card[]) {
  try {
    const raw = localStorage.getItem(LS_COLLECTION);
    const cur: { slug: string; name: string; img: string | null }[] = raw ? JSON.parse(raw) : [];
    for (const c of cards) {
      if (!cur.some((x) => x.slug === c.slug)) cur.push({ slug: c.slug, name: c.name, img: c.image_url });
    }
    localStorage.setItem(LS_COLLECTION, JSON.stringify(cur));
    window.dispatchEvent(new Event('akasha:collection'));
  } catch { /* stockage indisponible → le pack reste visuel */ }
}

export default function DailyBooster() {
  const [state, setState] = useState<'hidden' | 'ready' | 'opening' | 'done'>('hidden');
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState(0);

  useEffect(() => {
    try {
      setState(localStorage.getItem(LS_LAST) === today() ? 'hidden' : 'ready');
    } catch { setState('hidden'); }
  }, []);

  const open = async () => {
    setState('opening');
    try {
      const r = await fetch('/learn/akasha/api/booster');
      const j = (await r.json()) as { cards: Card[] };
      if (!j.cards?.length) { setState('hidden'); return; }
      setCards(j.cards);
      localStorage.setItem(LS_LAST, today());
      addToCollection(j.cards);
      setState('done');
      // Flip séquentiel : 1 carte toutes les 450 ms.
      j.cards.forEach((_, i) => setTimeout(() => setFlipped(i + 1), 350 + i * 450));
    } catch { setState('ready'); }
  };

  if (state === 'hidden') return null;

  return (
    <div style={{ background: 'linear-gradient(120deg, rgba(123,92,240,0.12), rgba(212,160,23,0.08))', border: '1px solid rgba(123,92,240,0.35)', borderRadius: 15, padding: '1rem 1.1rem', marginBottom: '1.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7B5CF0' }}>
            🎴 Booster du jour
          </div>
          <div style={{ fontFamily: 'var(--fe)', fontSize: 19, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 1.05, marginTop: 3 }}>
            {state === 'done' ? 'Ajoutées à ta collection !' : '3 cartes gratuites t’attendent'}
          </div>
        </div>
        {state !== 'done' && (
          <button
            type="button"
            onClick={open}
            disabled={state === 'opening'}
            className="ak-tab"
            style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '10px 22px', borderRadius: 10, border: 'none', background: '#7B5CF0', color: '#fff', cursor: state === 'opening' ? 'wait' : 'pointer', opacity: state === 'opening' ? 0.7 : 1 }}
          >
            {state === 'opening' ? 'Ouverture…' : 'Ouvrir le pack'}
          </button>
        )}
      </div>

      {state === 'done' && cards.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          {cards.map((c, i) => {
            const on = flipped > i;
            const rar = c.rarity ? RARITY_META[c.rarity] : null;
            const um = c.universe ? universeMeta(c.universe) : null;
            return (
              <Link
                key={c.slug}
                href={`/learn/akasha/${c.slug}`}
                style={{ width: 108, textDecoration: 'none', perspective: '600px' }}
                aria-label={c.name}
              >
                <div
                  style={{
                    position: 'relative', width: '100%', aspectRatio: '3 / 4', borderRadius: 12,
                    transformStyle: 'preserve-3d', transition: 'transform 0.55s cubic-bezier(0.2,0.7,0.3,1.1)',
                    transform: on ? 'rotateY(0deg)' : 'rotateY(180deg)',
                  }}
                >
                  {/* face */}
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden', backfaceVisibility: 'hidden', border: `2px solid ${rar?.color ?? 'var(--bd2)'}`, background: 'var(--bg2)', boxShadow: on && rar ? `0 10px 26px -12px ${rar.color}` : 'none' }}>
                    {c.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image_url} alt="" style={{ width: '100%', height: '72%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
                    )}
                    <div style={{ padding: '4px 7px' }}>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 800, color: 'var(--td)', lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.name}</div>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, fontWeight: 700, color: rar?.color ?? 'var(--td3)' }}>
                        {um?.emoji ?? '✦'} {rar?.label ?? '—'}
                      </div>
                    </div>
                  </div>
                  {/* dos */}
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 12, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', border: '2px solid rgba(123,92,240,0.5)', background: 'linear-gradient(135deg, #171232, #0B0820)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
                    ✦
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
