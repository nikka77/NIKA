'use client';
// components/home/SecModule.tsx — Module SEC (in-hero) : sécurité & urgences. Accent rouge #D44B24.
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { card, gridV, itemV, Head, Cta, Trust } from './moduleKit';

const SC = '#D44B24';
const SC2 = '#E8703A';
const OK = '#22DD88';

type Service = { id: string; label: string; emoji: string; pro: string; urgent?: boolean };
const SERVICES: Service[] = [
  { id: 'serrurier', label: 'Serrurier', emoji: '🔑', pro: 'Serrurier Express 06', urgent: true },
  { id: 'gardiennage', label: 'Gardiennage', emoji: '🛡️', pro: 'Azur Sécurité' },
  { id: 'alarme', label: 'Alarme & vidéo', emoji: '📹', pro: 'Côte Alarme' },
  { id: 'agent', label: 'Agent événementiel', emoji: '👮', pro: 'Azur Sécurité' },
];

export default function SecModule() {
  const [sel, setSel] = useState<string | null>(null);
  const selS = SERVICES.find(s => s.id === sel) ?? null;
  return (
    <div className="hero-domabar sec-mod" style={card(SC)}>
      <Head accent={SC} label="Sec" sub="· Sécurité & urgences" />

      {/* SOS */}
      <Link href="/sec?sos=1" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: `1px solid ${SC}`, background: `linear-gradient(135deg, ${SC}28, ${SC}0c)`, textDecoration: 'none', marginBottom: 10 }}>
        <span style={{ flexShrink: 0, width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: `${SC}33`, border: `1px solid ${SC}88` }} aria-hidden>🚨</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15.5, textTransform: 'uppercase', color: 'var(--td)' }}>SOS urgence</span>
          <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)' }}>Intervention rapide 24/7 · partout sur la Côte</span>
        </span>
        <span aria-hidden style={{ fontSize: 16, color: SC2 }}>→</span>
      </Link>

      <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)', margin: '2px 2px 8px' }}>Quel besoin ?</div>
      <motion.div variants={gridV} initial="hidden" animate="show" className="g-2" style={{ gap: 9 }}>
        {SERVICES.map(s => {
          const a = sel === s.id;
          return (
            <motion.button variants={itemV} key={s.id} onClick={() => setSel(a ? null : s.id)} aria-pressed={a}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '11px', borderRadius: 13, cursor: 'pointer', border: `2px solid ${a ? OK : 'var(--bd2)'}`, background: a ? `${OK}14` : 'rgba(255,255,255,0.04)', textAlign: 'left', transition: 'all .18s' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden>{s.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: a ? OK : 'var(--td)' }}>{s.label}</span>
                <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)', marginTop: 1 }}>{s.pro}{s.urgent ? ' · 24/7' : ''}</span>
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      <Cta accent={SC} accent2={SC2} href={selS ? `/sec?service=${selS.id}` : '/sec'} label={selS ? `Demander · ${selS.label}` : 'Voir les pros sécurité'} mt={11} />
      <Trust text="Pros vérifiés & assurés · devis avant intervention" />
    </div>
  );
}
