'use client';
// app/ops/OpsBoard.tsx — le kanban de la console OPS.
// Colonnes = cycle de vie d'une tâche : en file → à relire → approuvé / rejeté.
// Chaque carte montre la SOURCE et la PRODUCTION côte à côte : la review se fait ici, pas dans un terminal.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { fe, CY, OK, WARN, KO, type Result } from './pieces';
import ConfirmDialog from '@/components/ConfirmDialog';
import AgentsPanel, { ClaudeConsole, type AgentEtat } from './AgentsPanel';


type Noeud = { id: string; role: string; detail: string; gpu: boolean; vuA?: string; ageSec: number };
type Couloir = { cle: string; court: string; payant: boolean; parJour: number | null; consomme: number; restant: number | null; ferme: boolean; motifFermeture?: string | null };
type Univers = { nom: string; total: number; avecFr: number; avecDossier?: number };
type State = {
  queue: { queue_length: number; total_messages: number };
  flotte: Noeud[];
  couloirs: Couloir[];
  jury: { juge1: { nom: string; n: number }[]; juge2: { nom: string; n: number }[] };
  cadence: number;
  univers: Univers[] | null;   // null en réponse légère — on garde alors la dernière valeur
  pendingTotal: number;
  validesTotal: number;
  bacs: { relire: number; douteuses: number; ecartees: number; approuvees: number; rejetees: number; echecs: number };
  results: Result[];
  health: { ollama: boolean; omniroute: boolean; modeleActif: string | null; swap: { total: number; used: number } | null };
  agents: AgentEtat[];
};




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
      // Cadences différenciées (audit du 01/08) : un tick complet faisait 23 requêtes Supabase
      // dont 16 counts de couverture qui ne changent qu'à l'application d'une fiche. Le bloc
      // lent ne part qu'un tick sur quatre — même fraîcheur perçue, 70 % de requêtes en moins.
      const lent = tickRef.current % 4 === 0;
      tickRef.current += 1;
      const r = await fetch(`/api/ops/state${lent ? '?bloc=lent' : ''}`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
      if (!r.ok) throw new Error(String(r.status));
      const neuf: State = await r.json();
      // réponse légère : on conserve la couverture déjà connue au lieu de l'effacer
      setState((prec) => ({ ...neuf, univers: neuf.univers ?? prec?.univers ?? null }));
      setInjoignable(false);
    } catch {
      setInjoignable(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);   // le worker tourne en fond : on rafraîchit
    // Un onglet sans focus gèle ses timers : au retour, l'écran peut mentir de plusieurs
    // minutes (« à l'instant » sur un nœud mort). On refetch dès que la page redevient visible.
    const reveil = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', reveil);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', reveil); };
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
  const tickRef = useRef(0);
  const [bulk, setBulk] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<'apply' | 'purge' | null>(null);
  const applyAllValid = async () => {
    setConfirmBulk(null);
    setBulk('application en cours…');
    // try/finally : un échec réseau laissait le bouton figé sur « en cours… » jusqu'au
    // rechargement (audit du 01/08) — l'état se libère quoi qu'il arrive.
    try {
      const r = await fetch('/api/ops/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_all_valid' }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      setBulk(`✓ ${j.applied} appliquée(s)`);
    } catch {
      setReviewErr('le lot a échoué — recharge et vérifie ce qui a été écrit');
    } finally {
      await load();
      setTimeout(() => setBulk(null), 4000);
    }
  };

  const pending = state?.results.filter((r) => r.review_status === 'pending' && r.status === 'done') ?? [];
  // « suspect » = le contrôle de cohérence valeur↔preuve a tiqué : à relire EN PRIORITÉ, pas à jeter.
  const suspect = state?.results.filter((r) => r.review_status === 'pending' && r.status === 'suspect') ?? [];
  const refused = state?.results.filter(
    (r) => r.review_status === 'pending' && r.status !== 'done' && r.status !== 'suspect',
  ) ?? [];
  const approved = state?.results.filter((r) => r.review_status === 'approved') ?? [];
  const rejected = state?.results.filter((r) => r.review_status === 'rejected') ?? [];
  // Compte SERVEUR : la fenêtre de 120 lignes annonçait « 18 fiches » quand le lot en aurait
  // écrit 107 (audit du 01/08). Le serveur applique désormais le critère de l'usine (double
  // verdict, done, jamais contre l'arbitre) et c'est LUI qui compte.
  const nbValides = state?.validesTotal ?? 0;
  // Compté par le SERVEUR : la console ne charge plus les fiches, elles vivent sur leurs pages.
  const nbEchecs = state?.bacs?.echecs ?? 0;

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
            console de l’usine · rafraîchie toutes les 8 s
          </span>
          {/* L'état en 3 secondes — dérivé de la flotte et de la cadence, jamais du Mac seul.
              Le vécu qui l'impose : « 1 tâche en 20 min, service actif, personne ne s'en
              apercevait » (01/08). */}
          {(() => {
            const vivant = (state?.flotte ?? []).some((n) => n.role === 'agents' && ageNoeud(n) < 180);
            const cadence = state?.cadence ?? 0;
            const [txt, col] = !state ? ['…', 'var(--td3)']
              : !vivant ? ['ARRÊTÉE', KO]
              : cadence > 5 ? ['EN MARCHE', OK]
              : ['EN SIESTE', WARN];
            return <span style={{ ...fe(15), color: col, border: `1px solid ${col}66`, background: `${col}14`, borderRadius: 20, padding: '3px 14px' }}>usine {txt}</span>;
          })()}
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
          {/* Les pilules Ollama/OmniRoute ont disparu le 01/08 : OmniRoute n'est plus dans le
              chemin de production, et le bloc Flotte montre déjà le nœud GPU avec son battement.
              Deux alarmes rouges permanentes sur une usine en pleine forme apprenaient à l'œil
              à ignorer le rouge. Le swap ne s'affiche que si un nœud local travaille vraiment. */}
          {state?.health.swap && (state?.flotte ?? []).some((n) => n.gpu && ageNoeud(n) < 180) && (
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
              {bulk ?? `✓ Appliquer les ${nbValides} doubles-valides`}
            </button>
          )}
        </div>

        {/* ── LA FLOTTE, LES COULOIRS, LE JURY (L23-L25) ──────────────────────────
            La console montrait le Mac et rien d'autre, alors que l'usine tourne sur le VPS
            24/7 avec des couloirs qui s'ouvrent et se ferment dans la journée. Le 01/08, Groq
            s'est plafonné à 2 000 jetons/jour et llama-70b est mort à midi sans que rien ne
            l'affiche : ces trois blocs existent pour que ça ne se reproduise pas. */}
        <div className="g-3" style={{ marginBottom: 22 }}>

          <Bloc titre="La flotte" note={`${state?.flotte?.filter((n) => ageNoeud(n) < 180).length ?? 0} nœud(s) vivant(s)`}>
            {(state?.flotte ?? []).slice(0, 6).map((n) => {
              const age = ageNoeud(n);
              const vivant = age < 180;
              return (
                <Ligne key={n.id}
                  gauche={<>
                    <span style={{ color: vivant ? OK : 'var(--td3)' }}>{vivant ? '●' : '○'}</span>{' '}
                    {n.id.split(':')[0].replace('.home', '')}
                    <span style={{ color: 'var(--td3)' }}> · {n.role}</span>
                    {n.gpu && <span style={{ color: CY }}> · GPU</span>}
                  </>}
                  droite={vivant ? 'à l’instant' : age < 3600 ? `${Math.round(age / 60)} min` : `${Math.round(age / 3600)} h`}
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
                droite={c.ferme ? `fermé — ${c.motifFermeture ?? 'plafond'}`
                  : c.parJour === null ? (c.payant ? 'au jeton' : 'sans plafond')
                  : `${c.restant}/${c.parJour}`}
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

        <ConfirmDialog
          open={confirmBulk === 'apply'}
          title="Appliquer les fiches jugées valides ?"
          message={`${nbValides} fiche(s) au critère de l’usine (double verdict, jamais contre l’arbitre) seront écrites dans akasha_entries.`}
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


        {/* Console Claude : prompter le développement du site depuis la page */}


        {/* ── LES PILES — chacune sur sa page depuis le 01/08. Les cinq bacs côte à côte
            étiraient la console sur trois écrans (367 à relire, 321 écartées) avant que Dan
            n'atteigne son travail, et les compteurs mentaient : ils comptaient la fenêtre de
            120 lignes chargée, pas le stock. Ici : le volume réel, et un clic pour y aller. */}
        <div className="g-3" style={{ marginBottom: 22 }}>
          {([
            ['relire', 'À relire', WARN, 'le travail de Dan'],
            ['douteuses', 'Preuve douteuse', KO, 'valeur ↔ preuve en désaccord'],
            ['ecartees', 'Écartées par les gardes', 'var(--td3)', 'aucune source exploitable'],
            ['approuvees', 'Approuvées', OK, 'publiées sur le site'],
            ['rejetees', 'Rejetées', 'var(--td3)', 'refusées à la relecture'],
          ] as const).map(([cle, titre, accent, note]) => (
            <Link key={cle} href={`/ops/pile/${cle}`} style={{ textDecoration: 'none' }}>
              <section style={{
                border: `1px solid var(--bd2)`, borderTop: `2px solid ${accent}`, borderRadius: 12,
                padding: '13px 15px', background: 'rgba(255,255,255,0.02)', marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                  <span style={{ ...fe(13), color: 'var(--td)' }}>{titre}</span>
                  <span style={{ fontFamily: 'var(--fn)', fontSize: 20, color: accent, marginLeft: 'auto' }}>
                    {state?.bacs?.[cle] ?? '…'}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', marginTop: 4 }}>{note}</div>
              </section>
            </Link>
          ))}
        </div>


        {/* ── COUVERTURE PAR UNIVERS : combien de fiches sont VISIBLES sur le site — une fiche
            produite mais non jugée n'existe pas pour un visiteur. Puis les agents et la console
            Claude, APRÈS le travail de Dan (la pile commençait à 3 écrans de profondeur). */}
        <AgentsPanel agents={state?.agents ?? []} modeleActif={state?.health.modeleActif ?? null} />
        <ClaudeConsole />

        {/* Deux jauges par univers depuis le 02/08 : descFr ET dossiers de sections. La jauge
            unique masquait le travail du jour — 279 sections Death Note publiées, compteur
            immobile. Un tableau de bord mesure l'objectif COURANT, pas celui d'hier. */}
        <Bloc titre="Couverture des univers" note="description française · — · dossier de sections">
          {(state?.univers ?? []).sort((a, b) => b.total - a.total).map((u) => {
            const pct = u.total ? Math.round((u.avecFr / u.total) * 100) : 0;
            const pctD = u.total ? Math.round(((u.avecDossier ?? 0) / u.total) * 100) : 0;
            return (
              <div key={u.nom} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td)', width: 150, flexShrink: 0 }}>{u.nom}</span>
                <div style={{ flex: 1, minWidth: 60 }}>
                  <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? OK : pct >= 50 ? CY : WARN }} />
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 2 }}>
                    <div style={{ width: `${pctD}%`, height: '100%', background: 'var(--az)' }} />
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td3)', width: 130, textAlign: 'right', flexShrink: 0 }}>
                  {u.avecFr}/{u.total} fr · {u.avecDossier ?? 0} dossiers
                </span>
              </div>
            );
          })}
        </Bloc>

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
/* Âge d'un nœud calculé au moment du RENDU : le serveur envoie l'horodatage brut, pas un
   âge figé qui vieillirait mal dans un onglet resté en arrière-plan. */
function ageNoeud(n: Noeud): number {
  return n.vuA ? Math.round((Date.now() - new Date(n.vuA).getTime()) / 1000) : n.ageSec;
}

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

/* Ce qui mérite l'œil en premier : un désaccord entre juges QUE PERSONNE n'a départagé, puis
   l'ancrage le plus faible. Le reste suit dans l'ordre d'arrivée. */




