'use client';
// app/ops/AgentsPanel.tsx — vue d'ensemble des agents + console Claude.
// Chaque agent dit en une ligne ce qu'il fait ; la console lance Claude Code sur le dépôt.
import { useRef, useState } from 'react';

export type AgentEtat = {
  type: string;
  nom: string;
  role: string;
  modele: string;
  famille: 'data' | 'controle' | 'claude';
  etat: 'travaille' | 'attente' | 'inactif';
  enFile: number;
  action: string;
};

const OK = '#22DD88';
const WARN = '#E0A020';
const CY = '#12B8CC';
const PURPLE = '#9B6CF0';

const ETAT = {
  travaille: { l: 'au travail', c: OK },
  attente: { l: 'en attente', c: WARN },
  inactif: { l: 'inactif', c: 'var(--td3)' },
} as const;

const FAMILLE = { data: CY, controle: WARN, claude: PURPLE } as const;

const fe = (s: number): React.CSSProperties => ({
  fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900,
  fontSize: s, letterSpacing: '0.02em', textTransform: 'uppercase',
});

export default function AgentsPanel({ agents, modeleActif }: { agents: AgentEtat[]; modeleActif: string | null }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <h2 style={{ ...fe(15), color: 'var(--td)', margin: 0 }}>Les agents</h2>
        {modeleActif && (
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: OK }}>
            ● GPU : {modeleActif}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
        {agents.map((a) => (
          <article key={a.type} style={{
            border: '1px solid var(--bd2)', borderRadius: 12, padding: 11,
            background: 'rgba(255,255,255,0.03)',
            borderLeft: `3px solid ${FAMILLE[a.famille]}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>{a.nom}</span>
              <span style={{
                marginLeft: 'auto', fontFamily: 'var(--fo)', fontSize: 9.5, fontWeight: 700,
                color: ETAT[a.etat].c, border: `1px solid ${ETAT[a.etat].c}55`,
                background: `${ETAT[a.etat].c}12`, borderRadius: 20, padding: '2px 8px',
              }}>{ETAT[a.etat].l}</span>
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', margin: '5px 0 0', lineHeight: 1.4 }}>
              {a.role}
            </p>
            {/* La ligne qui compte : ce qu'il fait à cet instant. */}
            <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)', margin: '7px 0 0', lineHeight: 1.4 }}>
              {a.action}
            </p>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 9.5, color: 'var(--td3)', margin: '6px 0 0' }}>
              {a.modele}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ── Console Claude ──────────────────────────────────────────────── */

type Ligne = { k: string; v: string; erreur?: boolean };

export function ClaudeConsole() {
  const [prompt, setPrompt] = useState('');
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [encours, setEncours] = useState(false);
  const zone = useRef<HTMLDivElement>(null);

  const lancer = async () => {
    if (!prompt.trim() || encours) return;
    setEncours(true);
    setLignes([{ k: 'consigne', v: prompt }]);
    const res = await fetch('/api/ops/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const reader = res.body?.getReader();
    const dec = new TextDecoder();
    let reste = '';
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      reste += dec.decode(value, { stream: true });
      const parts = reste.split('\n');
      reste = parts.pop() ?? '';
      for (const p of parts) {
        if (!p.trim()) continue;
        try {
          setLignes((l) => [...l, JSON.parse(p)]);
          zone.current?.scrollTo({ top: 1e6 });
        } catch { /* ligne partielle */ }
      }
    }
    setEncours(false);
  };

  return (
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ ...fe(15), color: 'var(--td)', margin: '0 0 10px' }}>Demander à Claude</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) lancer(); }}
          placeholder="ex : ajoute un filtre par village sur la page du hub Naruto"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bd2)',
            borderRadius: 9, padding: '10px 12px', fontFamily: 'var(--fo)', fontSize: 13,
            color: 'var(--td)', outline: 'none',
          }}
        />
        <button onClick={lancer} disabled={encours || !prompt.trim()}
          style={{
            padding: '10px 18px', borderRadius: 9, cursor: encours ? 'wait' : 'pointer',
            border: `1px solid ${PURPLE}77`, background: `${PURPLE}1c`, color: PURPLE,
            fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700,
            opacity: encours || !prompt.trim() ? 0.5 : 1,
          }}>
          {encours ? 'en cours…' : 'Envoyer'}
        </button>
      </div>

      {lignes.length > 0 && (
        <div ref={zone} style={{
          maxHeight: 320, overflowY: 'auto', border: '1px solid var(--bd2)', borderRadius: 10,
          padding: 12, background: 'rgba(0,0,0,0.25)',
        }}>
          {lignes.map((l, i) => (
            <p key={i} style={{
              fontFamily: l.k === 'texte' || l.k === 'consigne' ? 'var(--fo)' : 'ui-monospace, monospace',
              fontSize: l.k === 'consigne' ? 12 : 11.5,
              color: l.k === 'consigne' ? PURPLE
                : l.k === 'outil' ? CY
                : l.erreur ? '#E0554A'
                : l.k === 'stderr' ? 'var(--td3)' : 'var(--td2)',
              margin: '0 0 6px', lineHeight: 1.5, whiteSpace: 'pre-wrap',
            }}>
              {l.k === 'consigne' ? `▸ ${l.v}` : l.k === 'outil' ? `· ${l.v}` : l.v}
            </p>
          ))}
        </div>
      )}

      <p style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', marginTop: 8, lineHeight: 1.5 }}>
        Claude travaille dans le dépôt avec les droits d’écriture, sur ton abonnement (pas de facturation
        à l’appel). Si la réponse dit que la session a expiré : lance <code>claude</code> dans un terminal
        et connecte-toi une fois.
      </p>
    </section>
  );
}
