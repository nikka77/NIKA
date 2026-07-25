'use client';
// app/ops/OpsBoard.tsx — le kanban de la console OPS.
// Colonnes = cycle de vie d'une tâche : en file → à relire → approuvé / rejeté.
// Chaque carte montre la SOURCE et la PRODUCTION côte à côte : la review se fait ici, pas dans un terminal.
import { useCallback, useEffect, useState } from 'react';

type Result = {
  id: number;
  task_type: string;
  target_slug: string;
  model: string | null;
  payload: { name?: string; universe?: string; summary?: string; fandomTitle?: string; fandomUrl?: string } | null;
  result: Record<string, string> | null;
  status: string;
  review_status: string;
  error: string | null;
  created_at: string;
};
type State = {
  queue: { queue_length: number; total_messages: number };
  results: Result[];
  health: { ollama: boolean; omniroute: boolean };
};

const CY = '#12B8CC';
const OK = '#22DD88';
const WARN = '#E0A020';
const KO = '#E0554A';

const fe = (s: number): React.CSSProperties => ({
  fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900,
  fontSize: s, letterSpacing: '0.02em', textTransform: 'uppercase',
});

export default function OpsBoard() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/ops/state', { cache: 'no-store' });
    if (r.ok) setState(await r.json());
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);   // le worker tourne en fond : on rafraîchit
    return () => clearInterval(t);
  }, [load]);

  const review = async (id: number, action: 'approve' | 'reject') => {
    setBusy(id);
    await fetch('/api/ops/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    await load();
    setBusy(null);
  };

  const pending = state?.results.filter((r) => r.review_status === 'pending' && r.status === 'done') ?? [];
  // « suspect » = le contrôle de cohérence valeur↔preuve a tiqué : à relire EN PRIORITÉ, pas à jeter.
  const suspect = state?.results.filter((r) => r.review_status === 'pending' && r.status === 'suspect') ?? [];
  const refused = state?.results.filter(
    (r) => r.review_status === 'pending' && r.status !== 'done' && r.status !== 'suspect',
  ) ?? [];
  const approved = state?.results.filter((r) => r.review_status === 'approved') ?? [];
  const rejected = state?.results.filter((r) => r.review_status === 'rejected') ?? [];

  return (
    <main style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#04181C 0%,#07252B 40%,var(--bg) 100%)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 'clamp(1.2rem,3vw,2rem) 1.1rem 4rem' }}>

        {/* En-tête + santé des services */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 4 }}>
          <h1 style={{ ...fe(30), color: 'var(--td)', margin: 0 }}>NIKA OPS</h1>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
            console locale des agents · rafraîchie toutes les 8 s
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 22px' }}>
          <Pill label={`file : ${state?.queue.queue_length ?? '…'}`} color={CY} />
          <Pill label={`traitées : ${state?.queue.total_messages ?? '…'}`} color="var(--td3)" />
          <Pill label={`Ollama ${state?.health.ollama ? 'actif' : 'éteint'}`} color={state?.health.ollama ? OK : KO} />
          <Pill label={`OmniRoute ${state?.health.omniroute ? 'actif' : 'éteint'}`} color={state?.health.omniroute ? OK : KO} />
        </div>

        {/* Kanban */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: 14, alignItems: 'start' }}>
          <Column title="À relire" count={pending.length} accent={WARN}>
            {pending.map((r) => (
              <Card key={r.id} r={r} busy={busy === r.id} onReview={review} />
            ))}
            {!pending.length && <Empty text="rien à relire" />}
          </Column>

          <Column title="Preuve douteuse" count={suspect.length} accent={KO}>
            {suspect.map((r) => (
              <Card key={r.id} r={r} busy={busy === r.id} onReview={review} />
            ))}
            {!suspect.length && <Empty text="aucune incohérence détectée" />}
          </Column>

          <Column title="Écartées par les gardes" count={refused.length} accent="var(--td3)">
            {refused.map((r) => (
              <Card key={r.id} r={r} busy={busy === r.id} onReview={review} />
            ))}
            {!refused.length && <Empty text="aucun refus" />}
          </Column>

          <Column title="Approuvées" count={approved.length} accent={OK}>
            {approved.slice(0, 15).map((r) => (
              <Card key={r.id} r={r} compact />
            ))}
            {!approved.length && <Empty text="rien encore appliqué" />}
          </Column>

          <Column title="Rejetées" count={rejected.length} accent="var(--td3)">
            {rejected.slice(0, 15).map((r) => (
              <Card key={r.id} r={r} compact />
            ))}
            {!rejected.length && <Empty text="rien rejeté" />}
          </Column>
        </div>

        <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 26, lineHeight: 1.6 }}>
          Approuver écrit le résultat dans <code>akasha_entries.attributes</code> (les valeurs « inconnu » ne
          remplacent jamais une valeur existante). Alimenter la file :{' '}
          <code>node --env-file=.env.local scripts/ops-fill-attrs.mjs --limit=20</code> · lancer le worker :{' '}
          <code>node --env-file=.env.local scripts/agent-worker.mjs</code>
        </p>
      </div>
    </main>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color,
      border: `1px solid ${color}55`, background: `${color}12`,
      borderRadius: 20, padding: '5px 12px',
    }}>{label}</span>
  );
}

function Column({ title, count, accent, children }: { title: string; count: number; accent: string; children: React.ReactNode }) {
  return (
    <section style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${accent}` }}>
        <span style={{ ...fe(13), color: 'var(--td)' }}>{title}</span>
        <span style={{ fontFamily: 'var(--fn)', fontSize: 17, color: accent }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', padding: '14px 2px' }}>{text}</div>;
}

function Card({ r, busy, compact, onReview }: {
  r: Result; busy?: boolean; compact?: boolean;
  onReview?: (id: number, a: 'approve' | 'reject') => void;
}) {
  // attributs : on sépare valeurs et preuves (champs « <attr>_preuve »)
  const attrs = r.task_type === 'akasha_attrs' && r.result
    ? Object.entries(r.result).filter(([k, v]) => !k.endsWith('_preuve') && v && v !== 'inconnu')
    : null;
  const preuve = (k: string) => r.result?.[`${k}_preuve`];

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

const btn = (color: string, disabled?: boolean): React.CSSProperties => ({
  flex: 1, padding: '7px 10px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
  border: `1px solid ${color}66`, background: `${color}14`, color,
  fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, opacity: disabled ? 0.45 : 1,
});
