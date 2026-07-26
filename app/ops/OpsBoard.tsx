'use client';
// app/ops/OpsBoard.tsx — le kanban de la console OPS.
// Colonnes = cycle de vie d'une tâche : en file → à relire → approuvé / rejeté.
// Chaque carte montre la SOURCE et la PRODUCTION côte à côte : la review se fait ici, pas dans un terminal.
import { useCallback, useEffect, useState } from 'react';
import AgentsPanel, { ClaudeConsole, type AgentEtat } from './AgentsPanel';

type Relation = { avec: string; nature: string; periode: string; resume: string; preuve: string };

type Result = {
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
};
type State = {
  queue: { queue_length: number; total_messages: number };
  results: Result[];
  health: { ollama: boolean; omniroute: boolean; modeleActif: string | null };
  agents: AgentEtat[];
};

const CY = '#12B8CC';
const OK = '#22DD88';
const WARN = '#E0A020';
const KO = '#E0554A';

const VERDICT: Record<string, { l: string; c: string }> = {
  valide: { l: 'valide', c: OK },
  a_corriger: { l: 'à corriger', c: WARN },
  rejeter: { l: 'à rejeter', c: KO },
};

const fe = (s: number): React.CSSProperties => ({
  fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900,
  fontSize: s, letterSpacing: '0.02em', textTransform: 'uppercase',
});

export default function OpsBoard() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const [injoignable, setInjoignable] = useState(false);

  // Le worker peut saturer la machine : l'API devient alors lente ou muette. On l'encaisse
  // au lieu d'empiler des rejets non gérés (constaté le 25/07 : compilation de 2 h 44 sous
  // charge, et la page qui relançait un fetch échouant toutes les 8 s).
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/ops/state', { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
      if (!r.ok) throw new Error(String(r.status));
      setState(await r.json());
      setInjoignable(false);
    } catch {
      setInjoignable(true);
    }
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

  // Lot : n'applique que ce que le relecteur local a jugé « valide ». Un clic au lieu de N.
  const [bulk, setBulk] = useState<string | null>(null);
  const applyAllValid = async () => {
    setBulk('en cours…');
    const r = await fetch('/api/ops/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_all_valid' }),
    });
    const j = await r.json();
    setBulk(`${j.applied ?? 0} fiche(s) appliquée(s)`);
    await load();
    setTimeout(() => setBulk(null), 4000);
  };

  const pending = state?.results.filter((r) => r.review_status === 'pending' && r.status === 'done') ?? [];
  // « suspect » = le contrôle de cohérence valeur↔preuve a tiqué : à relire EN PRIORITÉ, pas à jeter.
  const suspect = state?.results.filter((r) => r.review_status === 'pending' && r.status === 'suspect') ?? [];
  const refused = state?.results.filter(
    (r) => r.review_status === 'pending' && r.status !== 'done' && r.status !== 'suspect',
  ) ?? [];
  const approved = state?.results.filter((r) => r.review_status === 'approved') ?? [];
  const rejected = state?.results.filter((r) => r.review_status === 'rejected') ?? [];
  const nbValides = [...pending, ...suspect].filter((r) => r.auto_verdict === 'valide').length;

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
          {injoignable && <Pill label="API injoignable — machine chargée ?" color={KO} />}
          <Pill label={`file : ${state?.queue.queue_length ?? '…'}`} color={CY} />
          <Pill label={`traitées : ${state?.queue.total_messages ?? '…'}`} color="var(--td3)" />
          <Pill label={`Ollama ${state?.health.ollama ? 'actif' : 'éteint'}`} color={state?.health.ollama ? OK : KO} />
          <Pill label={`OmniRoute ${state?.health.omniroute ? 'actif' : 'éteint'}`} color={state?.health.omniroute ? OK : KO} />

          {nbValides > 0 && (
            <button onClick={applyAllValid} disabled={!!bulk}
              style={{
                marginLeft: 'auto', padding: '5px 14px', borderRadius: 20, cursor: bulk ? 'wait' : 'pointer',
                border: `1px solid ${OK}77`, background: `${OK}1c`, color: OK,
                fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700,
              }}>
              {bulk ?? `✓ Appliquer les ${nbValides} jugées valides`}
            </button>
          )}
        </div>

        {/* Vue par agent : état + ce qu'il fait à cet instant */}
        <AgentsPanel agents={state?.agents ?? []} modeleActif={state?.health.modeleActif ?? null} />

        {/* Console Claude : prompter le développement du site depuis la page */}
        <ClaudeConsole />

        {/* Kanban des productions */}
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
      {r.auto_score != null && (
        <span style={{
          display: 'inline-block', marginTop: 7,
          fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700,
          color: r.auto_score >= 0.5 ? OK : r.auto_score >= 0.15 ? WARN : KO,
          border: `1px solid ${(r.auto_score >= 0.5 ? OK : r.auto_score >= 0.15 ? WARN : KO)}55`,
          background: `${r.auto_score >= 0.5 ? OK : r.auto_score >= 0.15 ? WARN : KO}12`,
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
            relecture IA : {VERDICT[r.auto_verdict]?.l ?? r.auto_verdict}
          </span>
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

const btn = (color: string, disabled?: boolean): React.CSSProperties => ({
  flex: 1, padding: '7px 10px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
  border: `1px solid ${color}66`, background: `${color}14`, color,
  fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, opacity: disabled ? 0.45 : 1,
});
