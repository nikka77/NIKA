'use client';
// components/ConfirmDialog.tsx — modales in-app NIKA (remplacent confirm()/prompt() natifs).
// Style cohérent (var CSS), Échap + clic backdrop pour fermer, scroll body verrouillé.
import { useEffect, useRef } from 'react';

function useModalChrome(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 4000, display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: '1.2rem',
  background: 'rgba(3,8,15,0.66)', backdropFilter: 'blur(3px)',
  animation: 'cd-fade 0.15s ease',
};
const card: React.CSSProperties = {
  width: '100%', maxWidth: 380, background: 'var(--bg2)',
  border: '1px solid var(--bd2)', borderRadius: 14, padding: '1.4rem',
  boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
  animation: 'cd-pop 0.18s cubic-bezier(.2,.9,.3,1.2)',
};
const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic',
  color: 'var(--td)', margin: '0 0 0.5rem',
};
const msgStyle: React.CSSProperties = {
  fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, margin: '0 0 1.3rem',
};
const cancelBtn: React.CSSProperties = {
  fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, padding: '10px 18px',
  borderRadius: 8, border: '1px solid var(--bd2)', background: 'transparent', color: 'var(--td2)', cursor: 'pointer',
};
function confirmBtn(accent: string, busy?: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 800, padding: '10px 20px',
    borderRadius: 8, border: 'none', background: accent, color: '#fff',
    cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1,
  };
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler',
  danger, busy, onConfirm, onClose,
}: ConfirmDialogProps) {
  useModalChrome(open, onClose);
  if (!open) return null;
  const accent = danger ? 'var(--coral)' : 'var(--az)';
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={busy ? undefined : onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={card}>
        <h3 style={titleStyle}>{title}</h3>
        {message && <p style={msgStyle}>{message}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={cancelBtn}>{cancelLabel}</button>
          <button onClick={onConfirm} disabled={busy} style={confirmBtn(accent, busy)}>{busy ? '…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

interface PromptDialogProps {
  open: boolean;
  title: string;
  message?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputType?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function PromptDialog({
  open, title, message, value, onChange, placeholder, inputType = 'text',
  confirmLabel = 'Valider', cancelLabel = 'Annuler', busy, onConfirm, onClose,
}: PromptDialogProps) {
  useModalChrome(open, onClose);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={busy ? undefined : onClose} style={overlay}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={e => { e.preventDefault(); if (!busy) onConfirm(); }}
        style={card}
      >
        <h3 style={titleStyle}>{title}</h3>
        {message && <p style={{ ...msgStyle, marginBottom: '0.8rem' }}>{message}</p>}
        <input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd2)',
            borderRadius: 8, padding: '11px 14px', fontFamily: 'var(--fo)', fontSize: 13,
            color: 'var(--td)', outline: 'none', marginBottom: '1.3rem',
          }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={busy} style={cancelBtn}>{cancelLabel}</button>
          <button type="submit" disabled={busy} style={confirmBtn('var(--az)', busy)}>{busy ? '…' : confirmLabel}</button>
        </div>
      </form>
    </div>
  );
}
