'use client';
// app/ops/pile/PileClient.tsx — une PILE sur sa propre page (01/08/2026).
//
// La console affichait les cinq bacs côte à côte : 367 fiches à relire et 321 écartées
// l'étiraient sur trois écrans avant le premier bouton utile. Chaque bac a maintenant sa page,
// avec une pagination réelle (40 par page) et son compte exact — la fenêtre de 120 lignes de
// la console mentait sur le stock.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Empty, fe, CY, OK, WARN, KO, type Result } from '../pieces';

const BACS = [
  { cle: 'relire', titre: 'À relire', accent: WARN },
  { cle: 'douteuses', titre: 'Preuve douteuse', accent: KO },
  { cle: 'ecartees', titre: 'Écartées', accent: 'var(--td3)' },
  { cle: 'approuvees', titre: 'Approuvées', accent: OK },
  { cle: 'rejetees', titre: 'Rejetées', accent: 'var(--td3)' },
] as const;

type Reponse = {
  bac: string; titre: string; page: number; parPage: number;
  total: number; results: Result[]; universDispo: string[];
};

export default function PileClient({ bac }: { bac: string }) {
  const [data, setData] = useState<Reponse | null>(null);
  const [page, setPage] = useState(0);
  const [univers, setUnivers] = useState<string>('');
  const [busy, setBusy] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const meta = BACS.find((b) => b.cle === bac) ?? BACS[0];
  const travail = bac === 'relire' || bac === 'douteuses';

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ bac, page: String(page) });
      if (univers) p.set('univers', univers);
      const r = await fetch(`/api/ops/pile?${p}`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
      if (!r.ok) throw new Error(String(r.status));
      setData(await r.json());
      setErreur(null);
    } catch {
      setErreur('pile injoignable — réessaie');
    }
  }, [bac, page, univers]);

  useEffect(() => { load(); }, [load]);
  // Les bacs de TRAVAIL se rafraîchissent (l'usine y ajoute des fiches en continu) ; les bacs
  // de consultation, non — inutile de repartir en base pendant que Dan lit.
  useEffect(() => {
    if (!travail) return;
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load, travail]);

  const review = async (id: number, action: 'approve' | 'reject') => {
    setBusy(id);
    try {
      const r = await fetch('/api/ops/state', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!r.ok) throw new Error(String(r.status));
    } catch {
      setErreur(`échec de l’action sur la fiche #${id} — réessaie`);
    } finally {
      await load();
      setBusy(null);
    }
  };

  const nbPages = data ? Math.ceil(data.total / data.parPage) : 0;

  return (
    <main style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#04181C 0%,#07252B 40%,var(--bg) 100%)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(1.2rem,3vw,2rem) 1.1rem 4rem' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <Link href="/ops" style={{ fontFamily: 'var(--fo)', fontSize: 12, color: CY, textDecoration: 'none' }}>← console</Link>
          <h1 style={{ ...fe(26), color: 'var(--td)', margin: 0 }}>{data?.titre ?? meta.titre}</h1>
          <span style={{ fontFamily: 'var(--fn)', fontSize: 20, color: meta.accent }}>{data?.total ?? '…'}</span>
        </div>

        {/* Navigation entre bacs : on reste dans le même geste, on change de bac. */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
          {BACS.map((b) => (
            <Link key={b.cle} href={`/ops/pile/${b.cle}`} style={{
              fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, textDecoration: 'none',
              color: b.cle === bac ? '#04181C' : 'var(--td3)',
              background: b.cle === bac ? b.accent : 'rgba(255,255,255,0.04)',
              border: `1px solid ${b.cle === bac ? b.accent : 'var(--bd2)'}`,
              borderRadius: 20, padding: '5px 13px',
            }}>{b.titre}</Link>
          ))}
        </div>

        {/* Filtre par univers : la stratégie de Dan est de finir les univers un par un. */}
        {!!data?.universDispo?.length && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            <button onClick={() => { setUnivers(''); setPage(0); }} style={puce(!univers)}>tous</button>
            {data.universDispo.map((u) => (
              <button key={u} onClick={() => { setUnivers(u); setPage(0); }} style={puce(univers === u)}>{u}</button>
            ))}
          </div>
        )}

        {erreur && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: KO, marginBottom: 12 }}>{erreur}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 12, alignItems: 'start' }}>
          {(travail ? [...(data?.results ?? [])].sort((a, b) => prio(a) - prio(b)) : (data?.results ?? [])).map((r) => (
            <Card key={r.id} r={r} busy={busy === r.id}
              onReview={travail ? review : undefined}
              compact={!travail} />
          ))}
          {data && !data.results.length && <Empty text="ce bac est vide" />}
          {!data && <Empty text="chargement…" />}
        </div>

        {nbPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22, fontFamily: 'var(--fo)', fontSize: 12 }}>
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={pageBtn(page === 0)}>← précédente</button>
            <span style={{ color: 'var(--td3)' }}>page {page + 1} sur {nbPages}</span>
            <button disabled={page + 1 >= nbPages} onClick={() => setPage((p) => p + 1)} style={pageBtn(page + 1 >= nbPages)}>suivante →</button>
          </div>
        )}
      </div>
    </main>
  );
}

/* Ce qui mérite l'œil en premier : un désaccord entre juges QUE PERSONNE n'a départagé — c'est
   exactement là que l'automate a besoin d'un humain. Puis l'ancrage le plus faible. */
function prio(r: Result): number {
  if (r.auto_verdict && r.auto2_verdict && r.auto_verdict !== r.auto2_verdict && !r.arbitre_verdict) return 0;
  if (r.auto_score != null) return 1 + r.auto_score;
  return 3;
}

const puce = (actif: boolean): React.CSSProperties => ({
  fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
  color: actif ? '#04181C' : 'var(--td3)',
  background: actif ? CY : 'rgba(255,255,255,0.04)',
  border: `1px solid ${actif ? CY : 'var(--bd2)'}`, borderRadius: 20, padding: '4px 11px',
});

const pageBtn = (off: boolean): React.CSSProperties => ({
  fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700,
  cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.4 : 1,
  color: 'var(--td)', background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--bd2)', borderRadius: 20, padding: '5px 13px',
});
