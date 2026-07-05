'use client';
// components/akasha/QuizClient.tsx — QUIZ « Qui suis-je ? » (Refonte L8). 5 questions auto-générées :
// un indice = la bio VF (nom masqué), 4 propositions du même univers. Streak en localStorage.
// Récompense symbolique : un booster (message). Seed jour → même quiz pour tous, une fois par jour.
import { useMemo, useState } from 'react';
import Link from 'next/link';

export interface QuizEntry { slug: string; name: string; universe: string | null; image_url: string | null; clue: string; }

const STREAK = 'nika:akasha:quiz:streak';
const LASTDAY = 'nika:akasha:quiz:day';

// PRNG déterministe (mulberry32) seedé par la date → quiz stable sur la journée.
function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle<T>(arr: T[], r: () => number): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export default function QuizClient({ pool, daySeed }: { pool: QuizEntry[]; daySeed: number }) {
  const questions = useMemo(() => {
    const r = rng(daySeed);
    const targets = shuffle(pool, r).slice(0, 5);
    return targets.map((t) => {
      const sameU = pool.filter((p) => p.universe === t.universe && p.slug !== t.slug);
      const distractors = shuffle(sameU.length >= 3 ? sameU : pool.filter((p) => p.slug !== t.slug), r).slice(0, 3);
      const options = shuffle([t, ...distractors], r);
      return { target: t, options };
    });
  }, [pool, daySeed]);

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[step];
  if (!q) return null;

  const answer = (slug: string) => {
    if (picked) return;
    setPicked(slug);
    if (slug === q.target.slug) setScore((s) => s + 1);
  };
  const next = () => {
    if (step + 1 >= questions.length) {
      setDone(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem(LASTDAY) !== today) {
          const perfect = score + (picked === q.target.slug ? 1 : 0) === questions.length;
          const prev = Number(localStorage.getItem(STREAK)) || 0;
          localStorage.setItem(STREAK, String(perfect ? prev + 1 : 0));
          localStorage.setItem(LASTDAY, today);
        }
      } catch { /* stockage privé */ }
    } else { setStep((s) => s + 1); setPicked(null); }
  };

  if (done) {
    const finalScore = score;
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{ fontSize: 54 }} aria-hidden>{finalScore === 5 ? '🏆' : finalScore >= 3 ? '✨' : '🎴'}</div>
        <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 34, color: 'var(--td)' }}>{finalScore} / 5</div>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', margin: '0.6rem 0 1.4rem' }}>
          {finalScore === 5 ? 'Sans faute ! Un booster t’attend sur le registre.' : finalScore >= 3 ? 'Bien joué — reviens demain pour un nouveau défi.' : 'Explore le registre et retente demain !'}
        </p>
        <Link href="/learn/akasha" style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: '#7B5CF0', textDecoration: 'none', border: '1px solid #7B5CF066', borderRadius: 10, padding: '10px 20px', display: 'inline-block' }}>
          🎴 Ouvrir mon booster →
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* progression */}
      <div style={{ display: 'flex', gap: 5, marginBottom: '1.2rem' }}>
        {questions.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < step ? '#0EA878' : i === step ? '#7B5CF0' : 'var(--bg3)' }} />
        ))}
      </div>

      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7B5CF0', marginBottom: 8 }}>Question {step + 1} / 5 · De qui parle-t-on ?</div>
      <blockquote style={{ margin: '0 0 1.3rem', fontFamily: 'var(--fo)', fontSize: 15, fontStyle: 'italic', color: 'var(--td)', lineHeight: 1.65, borderLeft: '3px solid #7B5CF0', paddingLeft: 14 }}>
        « {q.target.clue} »
      </blockquote>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        {q.options.map((o) => {
          const isTarget = o.slug === q.target.slug;
          const chosen = picked === o.slug;
          const reveal = picked !== null;
          const bg = reveal ? (isTarget ? 'rgba(14,168,120,0.16)' : chosen ? 'rgba(214,60,60,0.16)' : 'var(--bg2)') : 'var(--bg2)';
          const bd = reveal ? (isTarget ? '#0EA878' : chosen ? '#D63C3C' : 'var(--bd)') : 'var(--bd2)';
          return (
            <button key={o.slug} type="button" onClick={() => answer(o.slug)} disabled={reveal}
              style={{ display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', cursor: reveal ? 'default' : 'pointer', background: bg, border: `1px solid ${bd}`, borderRadius: 11, padding: '8px 10px' }}>
              <span style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                {o.image_url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img aria-hidden src={o.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(7px) brightness(0.5)', transform: 'scale(1.2)' }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                  </>
                )}
              </span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>{o.name}{reveal && isTarget && ' ✓'}</span>
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div style={{ marginTop: '1.3rem', textAlign: 'center' }}>
          <button type="button" onClick={next} style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: '#fff', background: '#7B5CF0', border: 'none', borderRadius: 10, padding: '11px 26px', cursor: 'pointer' }}>
            {step + 1 >= questions.length ? 'Voir mon score' : 'Question suivante →'}
          </button>
        </div>
      )}
    </div>
  );
}
