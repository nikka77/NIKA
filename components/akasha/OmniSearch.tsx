'use client';
// components/akasha/OmniSearch.tsx — recherche INSTANTANÉE (Refonte L8) : overlay plein écran,
// résultats groupés par type, extraits descFr surlignés. Débounce 200 ms sur /api/search. Le bouton
// déclencheur remplace la friction du GET plein-page (qui reste dispo comme repli SEO).
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { universeMeta } from '@/lib/akasha/types';

interface Item { slug: string; name: string; universe: string | null; image_url: string | null; rarity: string | null; snippet: string | null; }
interface Group { type: string; label: string; icon: string; items: Item[]; }

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>{text.slice(0, i)}<mark style={{ background: 'rgba(123,92,240,0.35)', color: 'var(--td)', borderRadius: 3, padding: '0 2px' }}>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
  );
}

export default function OmniSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 40); }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) { setGroups([]); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/learn/akasha/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const j = await r.json();
        setGroups(j.groups ?? []);
      } catch { /* abort */ } finally { setLoading(false); }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="ak-tab"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td3)', background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', width: '100%', maxWidth: 520, textAlign: 'left' }}>
        <span aria-hidden>🔎</span> Recherche instantanée…
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--td3)', border: '1px solid var(--bd2)', borderRadius: 5, padding: '1px 5px' }}>⌘K</span>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(3,6,14,0.72)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 'clamp(1rem,6vh,4rem) 1rem 1rem' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, background: 'var(--bg)', border: '1px solid var(--bd2)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--bd)' }}>
              <span aria-hidden style={{ fontSize: 18 }}>🔎</span>
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Personnage, technique, univers, ou un mot de la bio…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td)' }} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'var(--td3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ maxHeight: '62vh', overflowY: 'auto', padding: groups.length ? '8px 0' : 0 }}>
              {q.trim().length < 2 ? (
                <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Tape au moins 2 lettres — la recherche fouille aussi les biographies.</div>
              ) : loading && !groups.length ? (
                <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Recherche…</div>
              ) : !groups.length ? (
                <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Aucun résultat pour « {q} ».</div>
              ) : (
                groups.map((g) => (
                  <div key={g.type} style={{ padding: '4px 0 10px' }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)', padding: '4px 16px' }}>{g.icon} {g.label}</div>
                    {g.items.map((it) => {
                      const um = it.universe ? universeMeta(it.universe) : null;
                      return (
                        <Link key={it.slug} href={`/learn/akasha/${it.slug}`} onClick={() => setOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', padding: '7px 16px' }} className="ak-omni-row">
                          <span style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                            {it.image_url && (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img aria-hidden src={it.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(7px) brightness(0.5)', transform: 'scale(1.2)' }} />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={it.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                              </>
                            )}
                          </span>
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 13.5, fontWeight: 700, color: 'var(--td)' }}>
                              <Highlight text={it.name} q={q} />{um && <span style={{ fontWeight: 600, color: um.color, marginLeft: 6, fontSize: 11 }}>{um.emoji} {it.universe}</span>}
                            </span>
                            {it.snippet && <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Highlight text={it.snippet} q={q} /></span>}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
