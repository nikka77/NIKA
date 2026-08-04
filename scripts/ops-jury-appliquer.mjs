// Applique les verdicts d'une vague de jury fenêtre. GARDE STRICTE : un verdict dont l'id n'est
// pas dans un chargeur de CETTE vague est jeté (c'est ainsi qu'on a intercepté 9 hallucinations).
import fs from 'node:fs';
import { clientOps } from '../lib/ops/db.mjs';

const BASE = '/private/tmp/claude-501/-Users-macbookprom1pro-Library-Mobile-Documents-com-apple-CloudDocs-NIKA/4722b160-9da6-4048-9a9f-2e49102b816b/scratchpad';
const SORTIE = process.argv[2];
const PREFIXE = process.argv[3] ?? 'juge';
const N = Number(process.argv[4] ?? 50);

// 1. Ce que la vague avait le DROIT de juger.
const autorises = new Map();
for (let i = 0; i < N; i++) {
  const p = `${BASE}/${PREFIXE}_${i}.json`;
  if (!fs.existsSync(p)) continue;
  for (const e of JSON.parse(fs.readFileSync(p, 'utf8'))) autorises.set(e.id, e);
}

// 2. Ce qu'elle a rendu.
const brut = JSON.parse(fs.readFileSync(SORTIE, 'utf8'));
const verdicts = brut.result?.verdicts ?? brut.verdicts ?? [];

const vus = new Set(); const retenus = []; let horsChargeur = 0, doublons = 0;
for (const v of verdicts) {
  if (!autorises.has(v.id)) { horsChargeur++; continue; }
  if (vus.has(v.id)) { doublons++; continue; }
  vus.add(v.id); retenus.push(v);
}
console.log(`chargeurs : ${autorises.size} production(s) · verdicts rendus : ${verdicts.length}`);
console.log(`retenus ${retenus.length} · hors chargeur ${horsChargeur} (JETÉS) · doublons ${doublons}`);
const approuves = retenus.filter((v) => v.decision === 'approve');
console.log(`→ ${approuves.length} approbation(s), ${retenus.length - approuves.length} rejet(s)`);
if (process.argv.includes('--dry')) process.exit(0);

// 3. Trace du verdict AVANT l'application : si l'écriture casse en cours, le motif reste lisible.
const sb = clientOps();
const paquets = [];
for (let i = 0; i < retenus.length; i += 200) paquets.push(retenus.slice(i, i + 200));
for (const p of paquets) {
  await Promise.all(p.map((v) => sb.from('agent_results').update({
    arbitre_verdict: v.decision === 'approve' ? 'valide' : 'invalide',
    arbitre_motif: `⚖ Claude (jury fenêtre) : ${String(v.motif ?? '').slice(0, 400)}`,
    arbitre_model: 'claude-haiku-4-5 (fenêtre)',
  }).eq('id', v.id)));
}
console.log('motifs posés');

// 4. Application, une par une (la route écrit la fiche côté SITE et gère l'index d'univers).
let ok = 0, ko = 0;
for (const v of retenus) {
  try {
    const r = await fetch('http://localhost:3000/api/ops/state', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: v.id, action: v.decision === 'approve' ? 'approve' : 'reject' }),
    });
    if (r.ok) ok++; else { ko++; if (ko <= 5) console.log(`  ✗ ${v.id} → ${r.status} ${(await r.text()).slice(0, 120)}`); }
  } catch (e) { ko++; if (ko <= 5) console.log(`  ✗ ${v.id} → ${String(e.message ?? e).slice(0, 120)}`); }
  if ((ok + ko) % 200 === 0) console.log(`  … ${ok + ko}/${retenus.length}`);
}
console.log(`FINAL — appliqués ${ok} · échecs ${ko} · publications ${approuves.length}`);
