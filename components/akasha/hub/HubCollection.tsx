'use client';
// components/akasha/hub/HubCollection.tsx — vitrine collection du hub : progression dans l'univers,
// rail « Pokédex » (possédés en clair, manquants en ombre), badges de set, rang de collectionneur,
// booster scellé scopé à l'univers. Lit la collection localStorage (nika:akasha:collection).
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { RARITY_META, type AkashaEntryCard, type AkashaRarity } from '@/lib/akasha/types';
import { readCollectionSlugs, addManyToCollection, onCollectionChange } from '@/lib/akasha/collection-storage';

// Commun garde une bordure neutre (var(--bd2), theme-aware) plutôt que la couleur RARITY_META.common
// (#7A90A8 fixe) — différenciation volontaire, seules les raretés rare/epic/legendary sont mutualisées.
const rarityBorder = (r?: AkashaRarity | null) => (r && r !== 'common' ? RARITY_META[r].color : 'var(--bd2)');
const today = () => new Date().toISOString().slice(0, 10);

type Card = { slug: string; name: string; image_url: string | null; rarity: AkashaRarity | null };

function addToCollection(cards: { slug: string; name: string; image_url: string | null }[]) {
  addManyToCollection(cards.map((c) => ({ slug: c.slug, name: c.name, img: c.image_url })));
}

export default function HubCollection({ stars, piliers, universe, color, ranks }: { stars: Card[]; piliers: AkashaEntryCard[]; universe: string; color: string; ranks: string[] }) {
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [pack, setPack] = useState<Card[] | null>(null);
  const [opening, setOpening] = useState(false);

  const refresh = useCallback(() => setOwned(readCollectionSlugs()), []);

  useEffect(() => {
    refresh();
    const cleanup = onCollectionChange(refresh);
    // Streak de visite par univers.
    try {
      const key = `nika:akasha:streak:${universe}`;
      const raw = localStorage.getItem(key);
      const st = raw ? JSON.parse(raw) as { last: string; n: number } : null;
      const t = today();
      if (!st) { localStorage.setItem(key, JSON.stringify({ last: t, n: 1 })); setStreak(1); }
      else if (st.last === t) { setStreak(st.n); }
      else {
        const yst = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        const n = st.last === yst ? st.n + 1 : 1;
        localStorage.setItem(key, JSON.stringify({ last: t, n }));
        setStreak(n);
      }
    } catch { /* noop */ }
    return cleanup;
  }, [refresh, universe]);

  // Set « signature » traçable = têtes d'affiche + piliers (borné, honnête).
  const tracked: Card[] = [...stars, ...piliers.map((p) => ({ slug: p.slug, name: p.name, image_url: p.image_url, rarity: p.rarity }))]
    .filter((c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i);
  const ownedCount = tracked.filter((c) => owned.has(c.slug)).length;
  const pct = tracked.length ? Math.round((ownedCount / tracked.length) * 100) : 0;
  const rankIdx = Math.min(ranks.length - 1, Math.floor((pct / 100) * ranks.length));
  const starsOwned = stars.filter((s) => owned.has(s.slug)).length;
  const legOwned = tracked.filter((c) => c.rarity === 'legendary' && owned.has(c.slug)).length;
  const legTotal = tracked.filter((c) => c.rarity === 'legendary').length;

  const openPack = async () => {
    setOpening(true);
    try {
      const r = await fetch(`/learn/akasha/api/booster?u=${encodeURIComponent(universe)}`);
      const j = (await r.json()) as { cards: Card[] };
      if (j.cards?.length) { addToCollection(j.cards); setPack(j.cards); }
    } catch { /* noop */ }
    setOpening(false);
  };

  const TITLE = { fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 };
  const badge = (label: string, have: number, tot: number) => {
    const done = tot > 0 && have >= tot;
    return (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, padding: '5px 10px', borderRadius: 20, border: `1px solid ${done ? color : 'var(--bd2)'}`, background: done ? `${color}1F` : 'var(--bg2)', color: done ? color : 'var(--td3)' }}>
        <span aria-hidden>{done ? '✓' : '○'}</span>{label} {have}/{tot}
      </div>
    );
  };

  return (
    <section>
      <div style={TITLE}><span>🎴 Ta collection dans ce monde</span>{streak > 1 && <span style={{ color: '#E8623A' }}>🔥 J{streak}</span>}</div>

      {/* Carte progression + rang */}
      <div style={{ background: `linear-gradient(120deg, ${color}18, var(--bg2))`, border: `1px solid ${color}44`, borderRadius: 14, padding: '13px 15px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 20, color: 'var(--td)' }}>
            {ownedCount}<span style={{ color: 'var(--td3)', fontSize: 15 }}> / {tracked.length} cartes signature</span>
          </div>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color, background: `${color}1F`, border: `1px solid ${color}55`, borderRadius: 20, padding: '3px 11px' }}>
            Rang · {ranks[rankIdx]}
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 5, background: 'var(--bd)', marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 11, flexWrap: 'wrap' }}>
          {badge('Têtes d’affiche', starsOwned, stars.length)}
          {legTotal > 0 && badge('Légendaires', legOwned, legTotal)}
          <button type="button" onClick={openPack} disabled={opening} style={{ marginLeft: 'auto', fontFamily: 'var(--fe)', fontSize: 12, fontWeight: 800, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.03em', padding: '5px 14px', borderRadius: 20, border: 'none', background: color, color: '#fff', cursor: opening ? 'wait' : 'pointer', opacity: opening ? 0.7 : 1 }}>
            {opening ? 'Ouverture…' : `🎁 Pack ${universe.length > 12 ? '' : universe}`}
          </button>
        </div>
        {pack && (
          <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
            {pack.map((c) => (
              <Link key={c.slug} href={`/learn/akasha/${c.slug}`} style={{ width: 66, textDecoration: 'none' }}>
                <div style={{ width: 66, aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden', border: `2px solid ${rarityBorder(c.rarity)}` }}>
                  {c.image_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />}
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--td2)', marginTop: 3, lineHeight: 1.1 }}>{c.name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Rail Pokédex : possédés en clair, manquants en ombre */}
      <div className="hero-domabar ak-star-rail" style={{ display: 'flex', gap: 11, overflowX: 'auto', paddingBottom: 8 }}>
        {stars.map((s, i) => {
          const has = owned.has(s.slug);
          return (
            <Link key={s.slug} href={`/learn/akasha/${s.slug}`} className="ak-tab" style={{ flexShrink: 0, width: 104, textDecoration: 'none', textAlign: 'center' }}>
              <div className="ak-star-bob" style={{ width: 104, height: 118, borderRadius: 13, overflow: 'hidden', border: `2px solid ${has ? rarityBorder(s.rarity) : 'var(--bd)'}`, background: 'var(--bg2)', position: 'relative', animationDelay: `${(i % 6) * 0.22}s` }}>
                {s.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image_url} alt="" loading={i < 3 ? 'eager' : 'lazy'} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', filter: has ? 'none' : 'grayscale(1) brightness(0.28) contrast(0.9)', transition: 'filter 0.3s ease' }} />
                )}
                {!has && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 30, color: 'var(--td3)' }} aria-hidden>?</span>}
                {has && s.rarity === 'legendary' && <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 11 }} aria-hidden>👑</span>}
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: has ? 'var(--td)' : 'var(--td3)', lineHeight: 1.2, marginTop: 6 }}>{has ? s.name : '???'}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
