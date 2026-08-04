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

/** MOTIFS INTERDITS — cassés d'office, en seconde instance motivée (04/08/2026).
 *
 *  Le barème dit depuis le 03/08 que le champ `name` du dossier EST la référence du nom : une
 *  romanisation ou une traduction différente dans la source n'est jamais un défaut. La règle a
 *  été réécrite positivement, et six rejets de la même famille sont quand même repassés le
 *  lendemain (« Kano Kuni » contre « Kano Country », le macron d'« Ashisogi Jizō »,
 *  « Don Quichotte » contre « Donquixote »).
 *
 *  Un barème s'oublie au fil d'une longue liste ; un filtre à la sortie, non. On ne discute donc
 *  plus la règle avec le juge : on relit ses motifs, et ceux qui tombent dans une famille
 *  interdite deviennent des approbations, avec le motif d'origine conservé pour l'audit.
 */
const MOTIFS_INTERDITS = [
  { famille: 'nom / romanisation',
    test: /romanis|orthograph|\bnom\b[^.]{0,40}(incorrect|erron|diff)|(au lieu de|et non|plutôt que)\s*[«"'']/i },
];
const casse = (motif) => MOTIFS_INTERDITS.find((f) => f.test.test(String(motif ?? '')));

const vus = new Set(); const retenus = []; let horsChargeur = 0, doublons = 0; const casses = [];
for (const v of verdicts) {
  if (!autorises.has(v.id)) { horsChargeur++; continue; }
  if (vus.has(v.id)) { doublons++; continue; }
  vus.add(v.id);
  const f = v.decision === 'reject' ? casse(v.motif) : null;
  if (f) {
    casses.push({ id: v.id, famille: f.famille, motif: v.motif });
    retenus.push({ id: v.id, decision: 'approve',
      motif: `seconde instance : rejet cassé (famille interdite « ${f.famille} ») — le champ name du dossier EST la référence du nom NIKA. Motif d'origine : ${String(v.motif).slice(0, 150)}` });
    continue;
  }
  retenus.push(v);
}
console.log(`chargeurs : ${autorises.size} production(s) · verdicts rendus : ${verdicts.length}`);
console.log(`retenus ${retenus.length} · hors chargeur ${horsChargeur} (JETÉS) · doublons ${doublons}`);
if (casses.length) {
  console.log(`⚖ ${casses.length} rejet(s) cassé(s) en seconde instance (motif interdit) :`);
  for (const c of casses.slice(0, 10)) console.log(`   · ${c.id} [${c.famille}] ${String(c.motif).slice(0, 110)}`);
  if (casses.length > 10) console.log(`   … et ${casses.length - 10} autre(s)`);
}
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
