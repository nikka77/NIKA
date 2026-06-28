'use client';
// components/akasha/AkashaGrid.tsx — grille animée (fade + stagger), respecte prefers-reduced-motion.
import { motion, useReducedMotion } from 'framer-motion';
import AkashaCard from './AkashaCard';
import type { AkashaEntryCard } from '@/lib/akasha/types';

export default function AkashaGrid({ entries }: { entries: AkashaEntryCard[] }) {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.04 } },
  };
  const item = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="g-4 max-sm:grid-cols-2"
      style={{ gap: '1rem' }}
    >
      {entries.map((e) => (
        <motion.div key={e.id} variants={item} style={{ display: 'flex' }}>
          <AkashaCard entry={e} />
        </motion.div>
      ))}
    </motion.div>
  );
}
