// scripts/ops-ecartees-tri.mjs — TRI PÉRIODIQUE DE LA PILE « ÉCARTÉES PAR LES GARDES ».
//
// POURQUOI (04/08/2026)
// La pile a été vidée à zéro le 04/08 après un chantier complet (curation d'alias, proposition de
// titre canon, sonde du wiki, trois sceptiques). Mais l'usine tourne : elle produit de NOUVEAUX
// refus en continu, et sans tri la pile regonfle à quelques centaines par nuit. Or l'essentiel de
// ces nouveaux refus tombe dans deux familles dont la réponse est DÉJÀ connue :
//
//  1. une entité que le chantier a déjà tranchée « sans page propre » — inutile de la rejuger ;
//  2. un refus « homonyme » ou « page absente » que la garde du SLUG sait maintenant résoudre
//     (le slug garde souvent le nom d'origine là où `name` porte la traduction).
//
// Ce script fait les deux passes, laisse le reste intact, et n'écrit jamais de fiche : il ne fait
// que classer des refus et remettre en file ce qui redevient traitable.
//
// Usage : node --env-file=.env.local scripts/ops-ecartees-tri.mjs [--dry] [--max-sondes=200]
import fs from 'node:fs';
import path from 'node:path';
import { clientOps } from '../lib/ops/db.mjs';
import { fetchFandomProse, ALIAS_REGISTRE } from './lib/fandom.mjs';

const DRY = process.argv.includes('--dry');
const MAX_SONDES = Number(process.argv.find((a) => a.startsWith('--max-sondes='))?.split('=')[1] ?? 200);
const norm = (s) => String(s).replace(/[’‘´]/g, "'").replace(/\s+/g, ' ').trim();
const sb = clientOps();

/** Toutes les écartées en attente, en une lecture. */
async function ecartees() {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await sb.from('agent_results')
      .select('id, task_type, target_slug, error, payload')
      .eq('review_status', 'pending').eq('status', 'refused').range(d, d + 999);
    if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

const clore = async (ids, motif) => {
  if (DRY || !ids.length) return;
  for (let i = 0; i < ids.length; i += 200)
    await sb.from('agent_results')
      .update({ review_status: 'rejected', reviewed_at: new Date().toISOString(), error: motif })
      .in('id', ids.slice(i, i + 200));
};

const lignes = await ecartees();
console.log(`${lignes.length} écartée(s) en attente`);

// ── PASSE 1 : les entités DÉJÀ tranchées par le chantier du 04/08.
// Le verdict vit dans les chargeurs de curation : une entité qui y figure et qui n'a toujours pas
// d'alias au registre est un « sans page propre » établi — la rejuger coûterait des agents pour
// retrouver la même réponse.
const dejaJuges = new Map();
const dossiersCuration = (process.env.NIKA_CURATION_DIR ?? '').split(':').filter(Boolean);
for (const dir of dossiersCuration) {
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!/^alias\d*_\d+\.json$/.test(f)) continue;
    try {
      for (const e of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
        dejaJuges.set(`${e.universe}|${norm(e.nom)}`, e);
    } catch { /* chargeur illisible : on l'ignore, il ne fait pas autorité */ }
  }
}
const sansIssue = new Set([...dejaJuges]
  .filter(([, e]) => !ALIAS_REGISTRE[e.universe]?.[e.nom])
  .map(([cle]) => cle));

const p1 = [];
for (const r of lignes) {
  const m = String(r.error ?? '').match(/mauvaise entité : article « (.+?) » pour « (.+?) »/);
  if (!m || !r.payload?.universe) continue;
  if (sansIssue.has(`${r.payload.universe}|${norm(m[2])}`)) p1.push(r.id);
}
console.log(`passe 1 — entités déjà tranchées « sans page propre » : ${p1.length} tentative(s)`);
await clore(p1, '⛔ aucune page Fandom propre — déjà tranché le 04/08 (curation, titre canon, sonde du wiki, trois sceptiques)');

// ── PASSE 2 : re-sonde des familles que la garde du slug sait résoudre depuis le 04/08.
const restantes = lignes.filter((r) => !p1.includes(r.id));
const aSonder = new Map();
for (const r of restantes) {
  if (!/homonyme probable|absente ou trop maigre/.test(String(r.error ?? ''))) continue;
  const cle = `${r.task_type}|${r.payload?.universe}|${r.payload?.name ?? r.target_slug}`;
  if (!aSonder.has(cle)) aSonder.set(cle, r);
}
const lot = [...aSonder.values()].slice(0, MAX_SONDES);
console.log(`passe 2 — ${aSonder.size} entité(s) à re-sonder, ${lot.length} ce tour`);

const relancer = []; const resolues = new Set();
for (const r of lot) {
  const page = await fetchFandomProse(r.payload?.universe, r.payload?.name ?? r.target_slug,
    { maxChars: 600, slug: r.payload?.slug ?? r.target_slug }).catch(() => null);
  if (page?.text && page.text.length > 400 && page.sameEntity) {
    relancer.push({ type: r.task_type, payload: r.payload });
    resolues.add(`${r.payload?.universe}|${r.payload?.name ?? r.target_slug}`);
  }
}
console.log(`  → ${relancer.length} résolue(s) par la garde du slug, ${lot.length - relancer.length} sans source`);

if (!DRY && relancer.length)
  for (let i = 0; i < relancer.length; i += 100)
    await sb.rpc('ops_queue_send_batch', { messages: relancer.slice(i, i + 100) });

// Les tentatives des entités sondées sont closes des deux côtés, avec le motif qui dit LEQUEL.
const idsSondes = restantes.filter((r) => aSonder.has(`${r.task_type}|${r.payload?.universe}|${r.payload?.name ?? r.target_slug}`)
  && lot.some((x) => x.task_type === r.task_type && (x.payload?.name ?? x.target_slug) === (r.payload?.name ?? r.target_slug)));
const relancees = idsSondes.filter((r) => resolues.has(`${r.payload?.universe}|${r.payload?.name ?? r.target_slug}`)).map((r) => r.id);
const impossibles = idsSondes.filter((r) => !resolues.has(`${r.payload?.universe}|${r.payload?.name ?? r.target_slug}`)).map((r) => r.id);
await clore(relancees, 'source retrouvée par la garde du slug — relancée en production');
await clore(impossibles, '⛔ aucune page Fandom exploitable (re-sondée avec la garde du slug)');

console.log(`FINAL — ${p1.length + relancees.length + impossibles.length} tentative(s) classée(s) · ${relancer.length} fiche(s) remise(s) en production${DRY ? ' (DRY)' : ''}`);
