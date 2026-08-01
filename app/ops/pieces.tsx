'use client';
// app/ops/pieces.tsx — les briques COMMUNES à la console et aux pages de pile.
// Extraites le 01/08 : la console dépassait 3 écrans avant que Dan n'atteigne son travail, et
// les piles (367 à relire, 321 écartées) l'écrasaient. Elles vivent désormais sur leurs propres
// pages — mais elles montrent la MÊME carte, au caractère près, pour qu'une fiche se lise
// pareil partout.
import React from 'react';

type Relation = { avec: string; nature: string; periode: string; resume: string; preuve: string };


export type Result = {
  id: number;
  task_type: string;
  target_slug: string;
  model: string | null;
  payload: { name?: string; universe?: string; summary?: string; fandomTitle?: string; fandomUrl?: string } | null;
  result: { descFr?: string; relations?: Relation[]; [k: string]: unknown } | null;
  status: string;
  review_status: string;
  error: string | null;
  created_at: string;
  auto_verdict: string | null;   // verdict du relecteur local
  auto_motif: string | null;
  auto_model: string | null;
  auto_score: number | null;   // ancrage factuel HHEM (0 = non étayé, 1 = étayé)
  auto2_verdict: string | null;  // 2e juge (cloud, autre famille) — double verdict = autonomie
  auto2_motif: string | null;
  auto2_model: string | null;
  arbitre_verdict: string | null;  // 3e voix (famille NVIDIA) — convoquée sur désaccord des juges
  arbitre_motif: string | null;
  arbitre_model: string | null;
  auto_applique: boolean;        // appliquée SANS Dan (double valide) — journalisée, annulable
};

export const CY = '#12B8CC';
export const OK = '#22DD88';
export const WARN = '#E0A020';
export const KO = '#E0554A';

export const VERDICT: Record<string, { l: string; c: string }> = {
  valide: { l: 'valide', c: OK },
  a_corriger: { l: 'à corriger', c: WARN },
  rejeter: { l: 'à rejeter', c: KO },
};

export const fe = (s: number): React.CSSProperties => ({
  fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900,
  fontSize: s, letterSpacing: '0.02em', textTransform: 'uppercase',
});

export function Empty({ text }: { text: string }) {
  return <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', padding: '14px 2px' }}>{text}</div>;
}

const btn = (color: string, disabled?: boolean): React.CSSProperties => ({
  flex: 1, padding: '7px 10px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
  border: `1px solid ${color}66`, background: `${color}14`, color,
  fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, opacity: disabled ? 0.45 : 1,
});

export function Card({ r, busy, compact, onReview }: {
  r: Result; busy?: boolean; compact?: boolean;
  onReview?: (id: number, a: 'approve' | 'reject') => void;
}) {
  // attributs : on sépare valeurs et preuves (champs « <attr>_preuve »)
  const attrs = r.task_type === 'akasha_attrs' && r.result
    ? (Object.entries(r.result).filter(([k, v]) => !k.endsWith('_preuve') && typeof v === 'string' && v !== 'inconnu') as [string, string][])
    : null;
  const preuve = (k: string) => r.result?.[`${k}_preuve`] as string | undefined;

  return (
    <article style={{
      border: '1px solid var(--bd2)', borderRadius: 12, padding: 11,
      background: 'rgba(255,255,255,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>
          {r.payload?.name ?? r.target_slug}
        </span>
        {r.payload?.universe && (
          <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{r.payload.universe}</span>
        )}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--fo)', fontSize: 9, color: CY }}>{r.task_type}</span>
      </div>

      {/* Ancrage HHEM : « ce qui est affirmé est-il dans la source ? » — modèle spécialisé sur CPU. */}
      {/* Teinte NEUTRE depuis le 01/08 : mesuré, ce score ne discrimine pas le vrai du faux
          (le veto a été retiré du pipeline le même jour) — un rouge ici biaisait la review
          avec un signal démontré non informatif. Le chiffre reste pour la calibration. */}
      {r.auto_score != null && (
        <span style={{
          display: 'inline-block', marginTop: 7,
          fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--td3)',
          border: '1px solid var(--bd2)', background: 'rgba(255,255,255,0.04)',
          borderRadius: 5, padding: '2px 7px', marginRight: 6,
        }}>ancrage {r.auto_score.toFixed(2)}</span>
      )}

      {/* Verdict du relecteur local : trie la file humaine, ne décide jamais seul. */}
      {r.auto_verdict && (
        <div style={{ marginTop: 7 }}>
          <span style={{
            fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
            color: VERDICT[r.auto_verdict]?.c ?? 'var(--td3)',
            border: `1px solid ${VERDICT[r.auto_verdict]?.c ?? 'var(--bd2)'}55`,
            background: `${VERDICT[r.auto_verdict]?.c ?? '#888'}12`,
            borderRadius: 5, padding: '2px 7px',
          }}>
            juge local : {VERDICT[r.auto_verdict]?.l ?? r.auto_verdict}
          </span>
          {r.auto2_verdict && (
            <span style={{
              marginLeft: 6, fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
              color: VERDICT[r.auto2_verdict]?.c ?? 'var(--td3)',
              border: `1px solid ${VERDICT[r.auto2_verdict]?.c ?? 'var(--bd2)'}55`,
              background: `${VERDICT[r.auto2_verdict]?.c ?? '#888'}12`,
              borderRadius: 5, padding: '2px 7px',
            }}>
              juge cloud : {VERDICT[r.auto2_verdict]?.l ?? r.auto2_verdict}
            </span>
          )}
          {r.arbitre_verdict && (
            <span style={{
              marginLeft: 6, fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
              color: VERDICT[r.arbitre_verdict]?.c ?? 'var(--td3)',
              border: `1px solid ${VERDICT[r.arbitre_verdict]?.c ?? 'var(--bd2)'}55`,
              background: `${VERDICT[r.arbitre_verdict]?.c ?? '#888'}12`,
              borderRadius: 5, padding: '2px 7px',
            }}>
              ⚖ arbitre : {VERDICT[r.arbitre_verdict]?.l ?? r.arbitre_verdict}
            </span>
          )}
          {r.auto_applique && (
            <span style={{
              marginLeft: 6, fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: CY,
              border: `1px solid ${CY}55`, background: `${CY}12`, borderRadius: 5, padding: '2px 7px',
            }}>⚡ auto</span>
          )}
          {!compact && r.auto_motif && (
            <p style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', margin: '4px 0 0', lineHeight: 1.4 }}>
              {r.auto_motif.slice(0, 260)}
            </p>
          )}
        </div>
      )}

      {!compact && r.payload?.summary && (
        <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', margin: '7px 0 0', lineHeight: 1.45 }}>
          <b style={{ color: 'var(--td2)' }}>avant · </b>{r.payload.summary}
        </p>
      )}

      {attrs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {attrs.length ? attrs.map(([k, v]) => (
            <div key={k}>
              <span style={{
                fontFamily: 'var(--fo)', fontSize: 10.5, color: OK,
                border: `1px solid ${OK}44`, background: `${OK}12`, borderRadius: 6, padding: '3px 8px',
              }}>{k} : {v}</span>
              {/* La preuve est la garantie d'ancrage : elle se relit d'un coup d'œil. */}
              {!compact && preuve(k) && (
                <p style={{
                  fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontStyle: 'italic',
                  margin: '4px 0 0', paddingLeft: 8, borderLeft: '2px solid var(--bd2)', lineHeight: 1.4,
                }}>« {String(preuve(k)).slice(0, 200)} »</p>
              )}
            </div>
          )) : <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>aucun attribut établi</span>}
        </div>
      )}

      {r.task_type === 'akasha_relations' && Array.isArray(r.result?.relations) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
          {r.result.relations.map((rel, i) => {
            const tint = ['ennemi', 'rival'].includes(rel.nature) ? KO
              : ['équipage actuel', 'ancien équipage'].includes(rel.nature) ? CY : OK;
            return (
              <div key={i}>
                <span style={{
                  fontFamily: 'var(--fo)', fontSize: 10.5, color: tint,
                  border: `1px solid ${tint}44`, background: `${tint}12`, borderRadius: 6, padding: '3px 8px',
                }}>{rel.avec} · {rel.nature} · {rel.periode}</span>
                {!compact && (
                  <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)', margin: '4px 0 0', lineHeight: 1.45 }}>
                    {rel.resume}
                  </p>
                )}
                {!compact && rel.preuve && (
                  <p style={{
                    fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontStyle: 'italic',
                    margin: '3px 0 0', paddingLeft: 8, borderLeft: '2px solid var(--bd2)', lineHeight: 1.4,
                  }}>« {rel.preuve.slice(0, 160)} »</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!attrs && r.result?.descFr && (
        <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', margin: '7px 0 0', lineHeight: 1.5 }}>
          {compact ? r.result.descFr.slice(0, 110) + '…' : r.result.descFr}
        </p>
      )}

      {r.error && (
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: WARN, margin: '7px 0 0', lineHeight: 1.4 }}>{r.error}</p>
      )}

      {r.payload?.fandomUrl && !compact && (
        <a href={r.payload.fandomUrl} target="_blank" rel="noreferrer"
          style={{ fontFamily: 'var(--fo)', fontSize: 10, color: CY, textDecoration: 'none', display: 'inline-block', marginTop: 6 }}>
          source : {r.payload.fandomTitle} ↗
        </a>
      )}

      {onReview && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {/* un « suspect » reste applicable : c'est un signalement pour le relecteur, pas un rejet */}
          <button onClick={() => onReview(r.id, 'approve')}
            disabled={busy || (r.status !== 'done' && r.status !== 'suspect')}
            style={btn(OK, busy || (r.status !== 'done' && r.status !== 'suspect'))}>✓ Appliquer</button>
          <button onClick={() => onReview(r.id, 'reject')} disabled={busy}
            style={btn('var(--td3)', busy)}>× Rejeter</button>
        </div>
      )}
    </article>
  );
}
