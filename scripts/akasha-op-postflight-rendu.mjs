// scripts/akasha-op-postflight-rendu.mjs — RÈGLE 6, SECOND TEMPS : après écriture, le nouveau lien
// SE VOIT-IL sur la fiche désisolée ?
//
// « Sortir une fiche de l'isolement » est une mesure de GRAPHE, pas une mesure de lecteur (leçon du
// 10/08 : 12 des 19 fiches désisolées par la vague 4 n'affichaient rien de leur nouveau lien). On
// ouvre donc les pages sur le serveur de dev et on cherche le CHIP rendu — `{label} · {nom}` —
// pas la valeur dans la charge RSC, qui répond « présent » même quand rien ne l'affiche.
//
// N'ÉCRIT RIEN EN BASE. Trace horodatée dans data/audits/.
// Usage : node --env-file=.env.local scripts/akasha-op-postflight-rendu.mjs [--trace=<exec.json>] [--max=N]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const ARG = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const BASE = process.env.NIKA_DEV_URL ?? 'http://localhost:3000';
const MAX = Number(ARG('max', 0));
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = ARG('trace', null);
if (!TRACE) throw new Error('passer --trace=data/audits/isolees-html-one-piece-trace-….json (la trace AVANT écriture, qui porte les candidats)');

const LIBELLES = { appartient: ['Appartient à'], habite: ['Réside'], exerce: ['Exerce'] };
const texteNu = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');

const candidats = JSON.parse(fs.readFileSync(path.join(ROOT, TRACE), 'utf8')).candidats;
// Une fiche par SLUG (elle peut avoir gagné plusieurs arêtes) — on vérifie chacune de ses arêtes.
const parFiche = new Map();
for (const c of candidats) {
  if (!c.sauveDe) continue;
  if (!parFiche.has(c.deSlug)) parFiche.set(c.deSlug, { slug: c.deSlug, nom: c.de, type: c.deType, arretes: [] });
  parFiche.get(c.deSlug).arretes.push({ relation: c.relation, vers: c.vers, versSlug: c.versSlug, versType: c.versType });
}
// L'arête écrite existe-t-elle VRAIMENT en base ? (on ne croit pas la trace sur parole)
const ids = [...new Set(candidats.filter((c) => c.sauveDe).map((c) => c.from_entry))];
const enBase = new Map();
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await db.from('akasha_relations').select('from_entry, to_entry, relation').in('from_entry', ids.slice(i, i + 200));
  if (error) throw new Error(error.message);
  for (const r of data ?? []) enBase.set(`${r.from_entry}|${r.to_entry}|${r.relation}`, true);
}
let manquantesEnBase = 0;
for (const c of candidats) if (c.sauveDe && !enBase.has(`${c.from_entry}|${c.to_entry}|${c.relation}`)) manquantesEnBase++;

const fiches = [...parFiche.values()];
const echantillon = MAX ? fiches.filter((_, i) => i % Math.max(1, Math.floor(fiches.length / MAX)) === 0).slice(0, MAX) : fiches;
console.log(`→ ${fiches.length} fiches désisolées · ${echantillon.length} pages ouvertes sur ${BASE}`);
console.log(`  arêtes de la trace absentes de la base : ${manquantesEnBase} / ${candidats.filter((c) => c.sauveDe).length}`);

const resultats = [];
let vues = 0, muettes = 0;
for (const f of echantillon) {
  const url = `${BASE}/learn/akasha/${f.slug}`;
  let txt = '';
  try { txt = texteNu(await fetch(url, { signal: AbortSignal.timeout(90_000) }).then((r) => r.text())); }
  catch (e) { resultats.push({ ...f, url, erreur: String(e.message) }); continue; }
  const detail = f.arretes.map((a) => {
    const attendus = LIBELLES[a.relation].map((l) => `${l} · ${a.vers}`);
    return { ...a, chip: attendus.find((x) => txt.includes(x)) ?? null, attendu: attendus[0] };
  });
  const vu = detail.some((d) => d.chip);
  if (vu) vues++; else muettes++;
  resultats.push({ ...f, url, seVoit: vu, detail });
  console.log(`  ${vu ? '✓' : '✗'} ${f.nom} (${f.type}) — ${detail.map((d) => `${d.chip ? 'VU' : 'MUET'} « ${d.attendu} »`).join(' · ')}`);
}
console.log(`\n=== ${vues} fiches montrent leur nouveau lien · ${muettes} restent muettes ===`);

const sortie = path.join(ROOT, `data/audits/op-postflight-rendu-${HORODATE}.json`);
fs.writeFileSync(sortie, JSON.stringify({
  quand: new Date().toISOString(), base: BASE, traceLue: TRACE, ecritEnBase: false,
  fichesDesisolees: fiches.length, pagesOuvertes: echantillon.length, seVoient: vues, muettes,
  aretesTraceAbsentesDeLaBase: manquantesEnBase, resultats,
}, null, 1));
console.log(`trace : ${path.relative(ROOT, sortie)}`);
