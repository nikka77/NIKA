'use client';
// components/home/LearnModule.tsx — Module LEARN (in-hero) : cours & coaching. Accent violet #7B5CF0.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { card, gridV, itemV, Head, Chip, Price, Cta, Trust } from './moduleKit';

const LV = '#7B5CF0';
const LV2 = '#9B7DF5';
const OK = '#22DD88';

const CATS = [
  { key: 'surf', label: 'Surf & Mer', emoji: '🏄' }, { key: 'sport', label: 'Sport', emoji: '💪' },
  { key: 'langue', label: 'Langues', emoji: '🌍' }, { key: 'musique', label: 'Musique', emoji: '🎸' },
  { key: 'cuisine', label: 'Cuisine', emoji: '👨‍🍳' }, { key: 'yoga', label: 'Yoga', emoji: '🧘' },
];
type Cours = { id: string; title: string; pro: string; cat: string; price: number; unit: string; emoji: string };
const COURS: Cours[] = [
  { id: 'c1', title: 'Cours de surf', pro: 'Nice Surf School', cat: 'surf', price: 45, unit: '1h30', emoji: '🏄' },
  { id: 'c2', title: 'Anglais intensif', pro: 'Azur Languages', cat: 'langue', price: 30, unit: 'heure', emoji: '🌍' },
  { id: 'c3', title: 'Guitare', pro: 'Riviera Music Academy', cat: 'musique', price: 28, unit: 'heure', emoji: '🎸' },
  { id: 'c4', title: 'Coaching sportif', pro: 'Coach Côte d’Azur', cat: 'sport', price: 50, unit: 'séance', emoji: '💪' },
  { id: 'c5', title: 'Atelier cuisine niçoise', pro: 'Chez Marinette', cat: 'cuisine', price: 40, unit: 'atelier', emoji: '👨‍🍳' },
  { id: 'c6', title: 'Yoga face à la mer', pro: 'Zen Riviera', cat: 'yoga', price: 22, unit: 'séance', emoji: '🧘' },
];

export default function LearnModule() {
  const [cat, setCat] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const results = useMemo(() => COURS.filter(c => !cat || c.cat === cat), [cat]);
  const selC = results.find(c => c.id === sel) ?? results[0] ?? null;
  return (
    <div data-liquid-glass="panel" suppressHydrationWarning className="hero-domabar learn-mod" style={card(LV)}>
      <Head accent={LV} label="Learn" sub="· Apprends sur la Côte" />
      <div className="hero-domabar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <Chip accent={LV} active={!cat} onClick={() => setCat(null)} label="Tout" />
        {CATS.map(c => <Chip key={c.key} accent={LV} active={cat === c.key} onClick={() => setCat(cat === c.key ? null : c.key)} label={c.label} emoji={c.emoji} />)}
      </div>
      <motion.div key={cat ?? 'all'} variants={gridV} initial="hidden" animate="show" className="hero-domabar" style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 270, overflowY: 'auto', padding: '10px 2px 4px' }}>
        {results.map(c => {
          const a = selC?.id === c.id;
          return (
            <motion.button variants={itemV} key={c.id} onClick={() => setSel(c.id)} aria-pressed={a}
              style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: 8, borderRadius: 12, cursor: 'pointer', border: `2px solid ${a ? OK : 'var(--bd2)'}`, background: a ? `${OK}14` : 'rgba(255,255,255,0.04)', textAlign: 'left', transition: 'all .18s' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden>{c.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: a ? OK : 'var(--td)' }}>{c.title}</span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td2)', marginTop: 1 }}>{c.pro}</span>
              </span>
              <Price accent={LV2} value={c.price} suffix={`€ /${c.unit}`} />
            </motion.button>
          );
        })}
      </motion.div>
      <Cta accent={LV} accent2={LV2} href={selC ? `/learn?cours=${selC.id}` : '/learn'} label={selC ? `Réserver · ${selC.title}` : 'Voir les cours'} />
      <Link href="/pro/inscription?type=learn" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11, color: LV2, textDecoration: 'none' }}>Tu enseignes ? Proposer un cours →</Link>
      <Trust text="Formateurs notés par la communauté · de Nice à Cannes" />
    </div>
  );
}
