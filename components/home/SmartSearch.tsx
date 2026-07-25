'use client';
// components/home/SmartSearch.tsx — barre de recherche premium (style NIKA, inspirée 21st.dev).
// Glow au focus, placeholder rotatif animé quand vide, icône de tête + accent qui MORPHENT
// selon le contexte (NIKO / destination VTC / véhicule Location / lieu livraison Dépannage).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type SmartSearchProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholders: string[];     // exemples qui défilent quand le champ est vide
  accent?: string;            // couleur d'accent (focus glow + bouton)
  icon?: ReactNode;           // icône de tête (change selon le contexte)
  submitLabel?: string;       // aria-label du bouton d'envoi
};

export default function SmartSearch({ value, onChange, onSubmit, placeholders, accent = '#0094D4', icon, submitLabel = 'Rechercher' }: SmartSearchProps) {
  const [focused, setFocused] = useState(false);
  const [ph, setPh] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotation du placeholder (uniquement quand vide + non focus)
  useEffect(() => {
    if (focused || value || placeholders.length <= 1) return;
    const t = setInterval(() => setPh(p => (p + 1) % placeholders.length), 2800);
    return () => clearInterval(t);
  }, [focused, value, placeholders.length]);

  const showPlaceholder = !value;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Halo de focus */}
      <div aria-hidden style={{
        position: 'absolute', inset: -1, borderRadius: 40, pointerEvents: 'none',
        boxShadow: focused ? `0 0 0 1.5px ${accent}, 0 0 26px -4px ${accent}` : 'none',
        opacity: focused ? 1 : 0, transition: 'opacity .25s, box-shadow .25s',
      }} />
      <div data-liquid-glass="capsule" suppressHydrationWarning style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(5,12,23,0.72)', border: `1px solid ${focused ? accent : 'var(--bd2)'}`,
        borderRadius: 40, padding: '0 6px 0 16px', height: 52,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', transition: 'border-color .25s',
      }}>
        {/* Icône de tête (morphe selon le contexte) */}
        <span aria-hidden style={{ flexShrink: 0, display: 'flex', color: accent, transition: 'color .25s' }}>
          {icon ?? <DefaultGlass />}
        </span>

        {/* Champ + placeholder animé */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef} value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            aria-label={submitLabel}
            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)', padding: 0 }}
          />
          {showPlaceholder && (
            <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
              <AnimatePresence mode="wait">
                <motion.span key={ph}
                  initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -9 }} transition={{ duration: 0.3 }}
                  style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {placeholders[ph]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Bouton d'envoi */}
        <button onClick={onSubmit} aria-label={submitLabel}
          style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 18px ${accent}73`, transition: 'background .25s' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        </button>
      </div>
    </div>
  );
}

function DefaultGlass() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
  );
}
