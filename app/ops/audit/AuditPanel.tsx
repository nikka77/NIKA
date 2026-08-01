'use client';
// app/ops/audit/AuditPanel.tsx — l'audit à l'aveugle : Dan tranche SANS voir le verdict de l'IA.
// Une seule fiche à la fois, la source à côté, trois boutons. Le taux d'accord se construit au fil
// des votes ; le kappa dit s'il vaut mieux que le hasard. C'est ce chiffre — et lui seul — qui
// autorisera (ou non) l'application automatique.
import { useCallback, useEffect, useState } from 'react';

type Fiche = {
  id: number;
  task_type: string;
  target_slug: string;
  model: string | null;
  payload: { name?: string; universe?: string; summary?: string; fandomTitle?: string; fandomUrl?: string; fandom?: string } | null;
  result: { descFr?: string; relations?: Array<Record<string, string>>; [k: string]: unknown } | null;
  status: string;
  review_status: string;
};
type Etat = { fiche: Fiche | null; restants: number; juges: number; accord: number | null; kappa: number | null; desaccords: number };

const CY = '#12B8CC';
const OK = '#22DD88';
const WARN = '#E0A020';
const KO = '#E0554A';

const fe = (s: number): React.CSSProperties => ({
  fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900,
  fontSize: s, letterSpacing: '0.02em', textTransform: 'uppercase',
});

export default function AuditPanel() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/ops/audit', { cache: 'no-store' });
    setEtat(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const voter = async (verdict_dan: 'exact' | 'a_corriger' | 'faux') => {
    try {
      if (!etat?.fiche || busy) return;
      setBusy(true);
      const r = await fetch('/api/ops/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: etat.fiche.id, verdict_dan }),
      });
      const j = await r.json();
      if (j.annule) setFlash('fiche déjà appliquée → annulée en base');
      setTimeout(() => setFlash(null), 4000);
      await load();
      setBusy(false);
} finally {
      setBusy(false);
    }
  };

  const f = etat?.fiche;
  const rel = Array.isArray(f?.result?.relations) ? f!.result!.relations! : null;
  const attrs = f && !rel && !f.result?.descFr
    ? Object.entries(f.result ?? {}).filter(([k, v]) => !k.endsWith('_preuve') && typeof v === 'string' && v !== 'inconnu')
    : null;

  return (
    <main style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#04181C 0%,#07252B 40%,var(--bg) 100%)' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: 'clamp(1.2rem,3vw,2rem) 1.1rem 4rem' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ ...fe(28), color: 'var(--td)', margin: 0 }}>Audit à l’aveugle</h1>
          <a href="/ops" style={{ fontFamily: 'var(--fo)', fontSize: 12, color: CY, textDecoration: 'none' }}>← console</a>
        </div>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', margin: '6px 0 18px', lineHeight: 1.5, maxWidth: 640 }}>
          Le verdict de l’IA est <b>caché</b>. Compare la production à sa source et tranche.
          C’est ce taux d’accord qui décidera si les agents peuvent écrire sans toi.
        </p>

        {/* Le tableau de bord de confiance */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <Pill label={`${etat?.juges ?? 0} jugée(s)`} color={CY} />
          <Pill label={`accord : ${etat?.accord == null ? '—' : etat.accord + ' %'}`}
            color={etat?.accord == null ? 'var(--td3)' : etat.accord >= 90 ? OK : etat.accord >= 75 ? WARN : KO} />
          <Pill label={`kappa : ${etat?.kappa ?? '—'}`} color={etat?.kappa == null ? 'var(--td3)' : etat.kappa >= 0.6 ? OK : WARN} />
          <Pill label={`${etat?.desaccords ?? 0} désaccord(s)`} color={etat?.desaccords ? WARN : 'var(--td3)'} />
          <Pill label={`${etat?.restants ?? 0} en réserve`} color="var(--td3)" />
        </div>

        {flash && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: WARN, marginBottom: 14 }}>↩ {flash}</p>
        )}

        {!f && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>
            {etat ? 'Plus rien à auditer — relance des lots depuis la console.' : 'chargement…'}
          </p>
        )}

        {f && (
          <article style={{ border: '1px solid var(--bd2)', borderRadius: 14, padding: 16, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 15, fontWeight: 700, color: 'var(--td)' }}>
                {f.payload?.name ?? f.target_slug}
              </span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{f.payload?.universe}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--fo)', fontSize: 10, color: CY }}>{f.task_type}</span>
              {f.review_status === 'approved' && (
                <span style={{
                  fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700, color: WARN,
                  border: `1px solid ${WARN}55`, background: `${WARN}12`, borderRadius: 5, padding: '2px 7px',
                }}>déjà appliquée</span>
              )}
            </div>

            {/* La production à juger */}
            {f.result?.descFr && (
              <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', lineHeight: 1.6, margin: '0 0 12px' }}>
                {f.result.descFr}
              </p>
            )}
            {rel && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {rel.map((r, i) => (
                  <div key={i}>
                    <span style={{
                      fontFamily: 'var(--fo)', fontSize: 10.5, color: CY,
                      border: `1px solid ${CY}44`, background: `${CY}12`, borderRadius: 6, padding: '3px 8px',
                    }}>{r.avec} · {r.nature} · {r.periode}</span>
                    <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', margin: '4px 0 0', lineHeight: 1.45 }}>{r.resume}</p>
                  </div>
                ))}
              </div>
            )}
            {attrs && attrs.length > 0 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                {attrs.map(([k, v]) => (
                  <span key={k} style={{
                    fontFamily: 'var(--fo)', fontSize: 11, color: OK,
                    border: `1px solid ${OK}44`, background: `${OK}12`, borderRadius: 6, padding: '3px 9px',
                  }}>{k} : {String(v)}</span>
                ))}
              </div>
            )}

            {f.payload?.fandomUrl && (
              <a href={f.payload.fandomUrl} target="_blank" rel="noreferrer"
                style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: CY, textDecoration: 'none' }}>
                vérifier la source : {f.payload.fandomTitle} ↗
              </a>
            )}

            <div style={{ display: 'flex', gap: 9, marginTop: 18, flexWrap: 'wrap' }}>
              <Bouton label="✓ Exact" color={OK} onClick={() => voter('exact')} busy={busy} />
              <Bouton label="~ Un détail cloche" color={WARN} onClick={() => voter('a_corriger')} busy={busy} />
              <Bouton label="✕ Faux" color={KO} onClick={() => voter('faux')} busy={busy} />
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', margin: '10px 0 0', lineHeight: 1.5 }}>
              « Faux » sur une fiche déjà appliquée l’annule aussitôt en base (retour au champ vide).
            </p>
          </article>
        )}
      </div>
    </main>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color,
      border: `1px solid ${color}55`, background: `${color}12`, borderRadius: 20, padding: '4px 12px',
    }}>{label}</span>
  );
}

function Bouton({ label, color, onClick, busy }: { label: string; color: string; onClick: () => void; busy: boolean }) {
  return (
    <button onClick={onClick} disabled={busy}
      style={{
        padding: '9px 18px', borderRadius: 10, cursor: busy ? 'wait' : 'pointer',
        border: `1px solid ${color}77`, background: `${color}1c`, color,
        fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, opacity: busy ? 0.5 : 1,
      }}>{label}</button>
  );
}
