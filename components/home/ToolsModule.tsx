'use client';
// components/home/ToolsModule.tsx — Module TOOLS (in-hero) : boîte à outils. Accent cyan #12B8CC.
// Met en avant l'outil Livraison (réel) + grille des utilitaires → /tools.
import Link from 'next/link';
import { motion } from 'framer-motion';
import { card, gridV, itemV, Head, Cta, Trust } from './moduleKit';

const TL = '#12B8CC';
const TL2 = '#3AD7E6';

const TILES = [
  { icon: '💱', label: 'Convertisseur' }, { icon: '🌊', label: 'Météo & marées' },
  { icon: '🅿️', label: 'Parkings' }, { icon: '🆘', label: 'Numéros utiles' },
  { icon: '🚦', label: 'Trafic A8' }, { icon: '🗣️', label: 'Traduction' },
];

export default function ToolsModule() {
  return (
    <div data-liquid-glass="panel" suppressHydrationWarning className="hero-domabar tools-mod" style={card(TL)}>
      <Head accent={TL} label="Tools" sub="· Boîte à outils Côte d'Azur" />

      {/* Outil vedette : Livraison */}
      <Link href="/tools/livraison" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: `1px solid ${TL}99`, background: `linear-gradient(135deg, ${TL}26, ${TL}08)`, textDecoration: 'none', marginBottom: 10, boxShadow: `0 6px 22px ${TL}33` }}>
        <span style={{ fontSize: 28, flexShrink: 0 }} aria-hidden>🚚</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15.5, textTransform: 'uppercase', color: 'var(--td)' }}>Livraison</span>
          <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)' }}>Kit livreur, équipe, colis & avis express</span>
        </span>
        <span style={{ flexShrink: 0, fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: TL2, background: `${TL}22`, border: `1px solid ${TL}66`, borderRadius: 20, padding: '3px 9px' }}>Ouvrir →</span>
      </Link>

      <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td2)', margin: '2px 2px 8px' }}>Utilitaires</div>
      <motion.div variants={gridV} initial="hidden" animate="show" className="g-3" style={{ gap: 9 }}>
        {TILES.map(t => (
          <motion.div variants={itemV} key={t.label}>
            <Link href="/tools" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '12px 6px', borderRadius: 12, border: '1px solid var(--bd2)', background: 'rgba(255,255,255,0.04)', textDecoration: 'none' }}>
              <span style={{ fontSize: 22 }} aria-hidden>{t.icon}</span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 600, color: 'var(--td2)', textAlign: 'center', lineHeight: 1.1 }}>{t.label}</span>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <Cta accent={TL} accent2={TL2} href="/tools" label="Tous les outils" mt={11} fg="#04222a" />
      <Trust text="Les utilitaires du quotidien, réunis au même endroit" />
    </div>
  );
}
