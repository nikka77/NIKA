'use client';
// app/ops/OpsBoard.tsx — le kanban de la console OPS.
// Colonnes = cycle de vie d'une tâche : en file → à relire → approuvé / rejeté.
// Chaque carte montre la SOURCE et la PRODUCTION côte à côte : la review se fait ici, pas dans un terminal.
import { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
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
  auto2_verdict: string | null;  // 2e juge (cloud, autre famille) — double verdict = autonomie
  auto2_motif: string | null;
  auto2_model: string | null;
  auto_applique: boolean;        // appliquée SANS Dan (double valide) — journalisée, annulable
};
type Noeud = { id: string; role: string; detail: string; gpu: boolean; ageSec: number };
type Couloir = { cle: string; court: string; payant: boolean; parJour: number | null; consomme: number; restant: number | null; ferme: boolean };
type Univers = { nom: string; total: number; avecFr: number };
type State = {
  queue: { queue_length: number; total_messages: number };
  flotte: Noeud[];
  couloirs: Couloir[];
  jury: { juge1: { nom: string; n: number }[]; juge2: { nom: string; n: number }[] };
  cadence: number;
  univers: Univers[];
  results: Result[];
  health: { ollama: boolean; omniroute: boolean; modeleActif: string | null; swap: { total: number; used: number } | null };
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
  const [reviewErr, setReviewErr] = useState<string | null>(null);

  const [injoignable, setInjoignable] = useState(false);
  const loading = state === null && !injoignable;

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
    setReviewErr(null);
    try {
      const r = await fetch('/api/ops/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!r.ok) throw new Error(String(r.status));
    } catch {
      setReviewErr(`échec de l'action sur la fiche #${id} — réessaie`);
    }
    await load();
    setBusy(null);
  };

  // Lot : n'applique que ce que le relecteur local a jugé « valide ». Un clic au lieu de N.
  const [bulk, setBulk] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<'apply' | 'purge' | null>(null);
  const applyAllValid = async () => {
    setConfirmBulk(null);
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
  const nbEchecs = refused.filter((r) => r.status === 'failed').length;

  const purgerEchecs = async () => {
    setConfirmBulk(null);
    await fetch('/api/ops/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'purge_failed' }),
    });
    await load();
  };

  return (
    <main style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#04181C 0%,#07252B 40%,var(--bg) 100%)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 'clamp(1.2rem,3vw,2rem) 1.1rem 4rem' }}>

        {/* En-tête + santé des services */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 4 }}>
          <h1 style={{ ...fe(30), color: 'var(--td)', margin: 0 }}>NIKA OPS</h1>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
            console locale des agents · rafraîchie toutes les 8 s
          </span>
          {/* La calibration : sans elle, le verdict du juge n'est qu'une décoration. */}
          <a href="/ops/audit" style={{
            fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: CY, textDecoration: 'none',
            border: `1px solid ${CY}55`, background: `${CY}12`, borderRadius: 20, padding: '4px 12px',
          }}>◎ Audit à l’aveugle</a>
        </div>
        {reviewErr && (
          <div style={{ margin: '8px 0', fontFamily: 'var(--fo)', fontSize: 11.5, color: KO }}>{reviewErr}</div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 22px' }}>
          {loading && <Pill label="chargement…" color={CY} />}
          {injoignable && <Pill label="API injoignable — machine chargée ?" color={KO} />}
          <Pill label={`file : ${state?.queue.queue_length ?? '…'}`} color={CY} />
          <Pill label={`traitées : ${state?.queue.total_messages ?? '…'}`} color="var(--td3)" />
          {/* Cadence : le seul chiffre qui dit si l'usine AVANCE. Une file qui ne bouge pas
              et une usine à l'arrêt se ressemblent trop sans lui (vécu le 01/08 : 1 tâche
              en 20 min, service « active », personne ne s'en apercevait). */}
          <Pill label={`cadence : ${state?.cadence ?? '…'}/h`}
            color={(state?.cadence ?? 0) > 40 ? OK : (state?.cadence ?? 0) > 5 ? WARN : KO} />
          <Pill label={`Ollama ${state?.health.ollama ? 'actif' : 'éteint'}`} color={state?.health.ollama ? OK : KO} />
          <Pill label={`OmniRoute ${state?.health.omniroute ? 'actif' : 'éteint'}`} color={state?.health.omniroute ? OK : KO} />
          {state?.health.swap && (
            <Pill
              label={`swap ${(state.health.swap.used / 1024).toFixed(1)}/${(state.health.swap.total / 1024).toFixed(0)} Go`}
              color={state.health.swap.used / state.health.swap.total < 0.4 ? OK
                : state.health.swap.used / state.health.swap.total < 0.75 ? WARN : KO}
            />
          )}

          {nbEchecs > 0 && (
            <button onClick={() => setConfirmBulk('purge')}
              style={{
                marginLeft: nbValides ? 0 : 'auto', padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                border: '1px solid var(--bd2)', background: 'rgba(255,255,255,0.04)', color: 'var(--td3)',
                fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700,
              }}>
              ✕ Purger les {nbEchecs} échecs techniques
            </button>
          )}
          {nbValides > 0 && (
            <button onClick={() => setConfirmBulk('apply')} disabled={!!bulk}
              style={{
                marginLeft: 'auto', padding: '5px 14px', borderRadius: 20, cursor: bulk ? 'wait' : 'pointer',
                border: `1px solid ${OK}77`, background: `${OK}1c`, color: OK,
                fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700,
              }}>
              {bulk ?? `✓ Appliquer les ${nbValides} jugées valides`}
            </button>
          )}
        </div>

        {/* ── LA FLOTTE, LES COULOIRS, LE JURY (L23-L25) ──────────────────────────
            La console montrait le Mac et rien d'autre, alors que l'usine tourne sur le VPS
            24/7 avec des couloirs qui s'ouvrent et se ferment dans la journée. Le 01/08, Groq
            s'est plafonné à 2 000 jetons/jour et llama-70b est mort à midi sans que rien ne
            l'affiche : ces trois blocs existent pour que ça ne se reproduise pas. */}
        <div className="g-3" style={{ marginBottom: 22 }}>

          <Bloc titre="La flotte" note={`${state?.flotte?.filter((n) => n.ageSec < 180).length ?? 0} nœud(s) vivant(s)`}>
            {(state?.flotte ?? []).slice(0, 6).map((n) => {
              const vivant = n.ageSec < 180;
              return (
                <Ligne key={n.id}
                  gauche={<>
                    <span style={{ color: vivant ? OK : 'var(--td3)' }}>{vivant ? '●' : '○'}</span>{' '}
                    {n.id.split(':')[0].replace('.home', '')}
                    <span style={{ color: 'var(--td3)' }}> · {n.role}</span>
                    {n.gpu && <span style={{ color: CY }}> · GPU</span>}
                  </>}
                  droite={vivant ? 'à l’instant' : n.ageSec < 3600 ? `${Math.round(n.ageSec / 60)} min` : `${Math.round(n.ageSec / 3600)} h`}
                />
              );
            })}
            {!state?.flotte?.length && <Vide>aucun nœud n’a battu</Vide>}
          </Bloc>

          <Bloc titre="Les couloirs" note="guichet du jour">
            {(state?.couloirs ?? []).map((c) => (
              <Ligne key={c.cle}
                gauche={<>
                  <span style={{ color: c.ferme ? KO : c.payant ? CY : OK }}>{c.ferme ? '✕' : c.payant ? '$' : '●'}</span>{' '}
                  {c.court}
                </>}
                droite={c.parJour === null ? (c.payant ? 'au jeton' : 'sans plafond')
                  : c.ferme ? 'fermé' : `${c.restant}/${c.parJour}`}
                sourd={c.ferme}
              />
            ))}
          </Bloc>

          <Bloc titre="Le jury" note="verdicts de la dernière heure">
            <Ligne gauche={<span style={{ color: 'var(--td3)' }}>juge n°1</span>} droite="" />
            {(state?.jury?.juge1 ?? []).slice(0, 3).map((j) => (
              <Ligne key={'a' + j.nom} gauche={<span style={{ paddingLeft: 10 }}>{j.nom}</span>} droite={String(j.n)} />
            ))}
            <Ligne gauche={<span style={{ color: 'var(--td3)' }}>juge n°2</span>} droite="" />
            {(state?.jury?.juge2 ?? []).slice(0, 3).map((j) => (
              <Ligne key={'b' + j.nom} gauche={<span style={{ paddingLeft: 10 }}>{j.nom}</span>} droite={String(j.n)} />
            ))}
            {!state?.jury?.juge1?.length && !state?.jury?.juge2?.length && <Vide>aucun verdict depuis une heure</Vide>}
          </Bloc>
        </div>

        {/* ── COUVERTURE PAR UNIVERS — l'objectif final, et le seul chiffre qui compte
            vraiment : combien de fiches sont VISIBLES sur le site, pas combien ont été
            produites. Une fiche produite mais non jugée n'existe pas pour un visiteur. */}
        <Bloc titre="Couverture des univers" note="fiches publiées avec une description française">
          {(state?.univers ?? []).sort((a, b) => b.total - a.total).map((u) => {
            const pct = u.total ? Math.round((u.avecFr / u.total) * 100) : 0;
            return (
              <div key={u.nom} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', width: 150, flexShrink: 0 }}>{u.nom}</span>
                <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', minWidth: 60 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? OK : pct >= 50 ? CY : WARN }} />
                </div>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', width: 96, textAlign: 'right', flexShrink: 0 }}>
                  {u.avecFr}/{u.total} · {pct} %
                </span>
              </div>
            );
          })}
        </Bloc>

        <ConfirmDialog
          open={confirmBulk === 'apply'}
          title="Appliquer les fiches jugées valides ?"
          message={`${nbValides} fiche(s) seront écrites dans akasha_entries en une fois.`}
          confirmLabel="Appliquer"
          onConfirm={applyAllValid}
          onClose={() => setConfirmBulk(null)}
        />
        <ConfirmDialog
          open={confirmBulk === 'purge'}
          title="Purger les échecs techniques ?"
          message={`${nbEchecs} entrée(s) seront supprimées définitivement (les refus de garde ne sont pas concernés).`}
          confirmLabel="Purger"
          danger
          onConfirm={purgerEchecs}
          onClose={() => setConfirmBulk(null)}
        />

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
            {approved.length > 15 && <Empty text={`+ ${approved.length - 15} de plus`} />}
          </Column>

          <Column title="Rejetées" count={rejected.length} accent="var(--td3)">
            {rejected.slice(0, 15).map((r) => (
              <Card key={r.id} r={r} compact />
            ))}
            {!rejected.length && <Empty text="rien rejeté" />}
            {rejected.length > 15 && <Empty text={`+ ${rejected.length - 15} de plus`} />}
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

/* Briques des blocs de suivi — même grammaire visuelle que le reste de la console :
   hairline, typo Outfit, aucune couleur qui ne dise quelque chose. */
function Bloc({ titre, note, children }: { titre: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid var(--bd2)', borderRadius: 12, padding: '13px 15px', background: 'rgba(255,255,255,0.02)', minWidth: 0, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
        <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td)' }}>{titre}</span>
        {note && <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)' }}>{note}</span>}
      </div>
      {children}
    </section>
  );
}
function Ligne({ gauche, droite, sourd }: { gauche: React.ReactNode; droite: string; sourd?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0', fontFamily: 'var(--fo)', fontSize: 12, color: sourd ? 'var(--td3)' : 'var(--td)' }}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gauche}</span>
      <span style={{ color: 'var(--td3)', flexShrink: 0 }}>{droite}</span>
    </div>
  );
}
function Vide({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', padding: '3px 0' }}>{children}</div>;
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

const btn = (color: string, disabled?: boolean): React.CSSProperties => ({
  flex: 1, padding: '7px 10px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
  border: `1px solid ${color}66`, background: `${color}14`, color,
  fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, opacity: disabled ? 0.45 : 1,
});
