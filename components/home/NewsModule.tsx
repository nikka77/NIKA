'use client';
// components/home/NewsModule.tsx — Module NEWS (in-hero) : l'actu de la Côte. Accent #5A88B0.
// Teasers + filtre catégorie + liens vers /news (feed réel) et /news/new (proposer une info).
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { card, gridV, itemV, Head, Chip, Cta, Trust } from './moduleKit';

const NW = '#5A88B0';
const NW2 = '#7BA8CC';

const CATS = [
  { key: 'local', label: 'Local', emoji: '📍' }, { key: 'trafic', label: 'Trafic', emoji: '🚦' },
  { key: 'sorties', label: 'Sorties', emoji: '🎉' }, { key: 'mer', label: 'Mer', emoji: '🌊' },
];
type Item = { id: string; title: string; cat: string; time: string; emoji: string };
const NEWS: Item[] = [
  { id: 'n1', title: 'Nouveau parking relais gratuit à Nice Est', cat: 'trafic', time: 'il y a 2 h', emoji: '🅿️' },
  { id: 'n2', title: 'Le festival de Cannes dévoile sa sélection', cat: 'sorties', time: 'il y a 5 h', emoji: '🎬' },
  { id: 'n3', title: 'Travaux ligne 2 du tram ce week-end', cat: 'trafic', time: 'hier', emoji: '🚊' },
  { id: 'n4', title: 'Plage éphémère & guinguette à Antibes', cat: 'sorties', time: 'hier', emoji: '🏖️' },
  { id: 'n5', title: 'Qualité de l’eau : 6 plages pavillon bleu', cat: 'mer', time: 'il y a 2 j', emoji: '🌊' },
  { id: 'n6', title: 'Marché de la Libération : nouveaux producteurs', cat: 'local', time: 'il y a 3 j', emoji: '🧺' },
];

export default function NewsModule() {
  const [cat, setCat] = useState<string | null>(null);
  const results = useMemo(() => NEWS.filter(n => !cat || n.cat === cat), [cat]);
  return (
    <div data-liquid-glass="panel" suppressHydrationWarning className="hero-domabar news-mod" style={card(NW)}>
      <Head accent={NW} label="News" sub="· L'actu de la Côte" />
      <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <Chip accent={NW} active={!cat} onClick={() => setCat(null)} label="Tout" />
        {CATS.map(c => <Chip key={c.key} accent={NW} active={cat === c.key} onClick={() => setCat(cat === c.key ? null : c.key)} label={c.label} emoji={c.emoji} />)}
      </div>
      <motion.div key={cat ?? 'all'} variants={gridV} initial="hidden" animate="show" className="hero-domabar" style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 280, overflowY: 'auto', padding: '10px 2px 4px' }}>
        {results.map(n => (
          <motion.div variants={itemV} key={n.id}>
            <Link href="/news" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 8, borderRadius: 12, border: '1px solid var(--bd2)', background: 'rgba(255,255,255,0.04)', textDecoration: 'none' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }} aria-hidden>{n.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 600, color: 'var(--td)', lineHeight: 1.25 }}>{n.title}</span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)', marginTop: 2, textTransform: 'capitalize' }}>{n.cat} · {n.time}</span>
              </span>
              <span aria-hidden style={{ color: NW2, fontSize: 14 }}>→</span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
      <Cta accent={NW} accent2={NW2} href="/news" label="Voir toute l'actu" />
      <Link href="/news/new" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11, color: NW2, textDecoration: 'none' }}>Une info à partager ? Proposer →</Link>
      <Trust text="L'actu locale, vérifiée et modérée par NIKA" />
    </div>
  );
}
