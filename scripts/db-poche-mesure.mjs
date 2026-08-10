// Chantier 4 — MESURE (lecture seule). Poche Dragon Ball : résumés creux + isolées.
// Toute lecture paginée (.range) — règle 1.
import { clientSite } from '../lib/ops/db.mjs';
import fs from 'node:fs';

const db = clientSite();
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

async function pageAll(table, select, tweak = (q) => q) {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await tweak(db.from(table).select(select)).range(d, d + 999);
    if (error) throw new Error(`${table} @${d}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

const entries = await pageAll('akasha_entries', 'id,slug,name,universe,type,summary,description,attributes,image_url');
const edges = await pageAll('akasha_relations', 'id,from_entry,to_entry,relation');

console.log('fiches', entries.length, 'aretes', edges.length);

const lies = new Set();
for (const e of edges) { lies.add(e.from_entry); lies.add(e.to_entry); }
const isolees = entries.filter((e) => !lies.has(e.id));

const parUnivIso = {};
for (const e of isolees) parUnivIso[e.universe] = (parUnivIso[e.universe] ?? 0) + 1;

const MOTIF = /^(personnage|lieu|objet|technique|créature|groupe)\s+(secondaire|mineur|de l'univers)[^.]{0,60}\.?$/i;
const creux = entries.filter((e) => e.summary && MOTIF.test(e.summary.trim()));
const parUnivCreux = {};
for (const e of creux) parUnivCreux[e.universe] = (parUnivCreux[e.universe] ?? 0) + 1;

const sansResume = entries.filter((e) => !e.summary || !e.summary.trim());

// Dragon Ball : matière disponible
const db_ = entries.filter((e) => e.universe === 'Dragon Ball');
const dbIso = isolees.filter((e) => e.universe === 'Dragon Ball');
const dbCreux = creux.filter((e) => e.universe === 'Dragon Ball');

const clefsAttr = {};
for (const e of dbIso) for (const k of Object.keys(e.attributes ?? {})) clefsAttr[k] = (clefsAttr[k] ?? 0) + 1;
const clefsAttrCreux = {};
for (const e of dbCreux) for (const k of Object.keys(e.attributes ?? {})) clefsAttrCreux[k] = (clefsAttrCreux[k] ?? 0) + 1;

const rapport = {
  quand: new Date().toISOString(),
  mode: 'MESURE (lecture seule)',
  corpus: { fiches: entries.length, aretes: edges.length },
  isolees: { total: isolees.length, parUnivers: parUnivIso },
  resumesCreux: { total: creux.length, parUnivers: parUnivCreux, motif: String(MOTIF) },
  sansResume: sansResume.length,
  dragonBall: {
    fiches: db_.length,
    isolees: dbIso.length,
    creux: dbCreux.length,
    creuxEtIsolee: dbCreux.filter((e) => !lies.has(e.id)).length,
    isoleesParType: dbIso.reduce((a, e) => ((a[e.type] = (a[e.type] ?? 0) + 1), a), {}),
    creuxParType: dbCreux.reduce((a, e) => ((a[e.type] = (a[e.type] ?? 0) + 1), a), {}),
    isoleesAvecDescFr: dbIso.filter((e) => (e.attributes?.descFr ?? '').trim().length > 0).length,
    creuxAvecDescFr: dbCreux.filter((e) => (e.attributes?.descFr ?? '').trim().length > 0).length,
    clefsAttributsIsolees: Object.fromEntries(Object.entries(clefsAttr).sort((a, b) => b[1] - a[1])),
    clefsAttributsCreux: Object.fromEntries(Object.entries(clefsAttrCreux).sort((a, b) => b[1] - a[1])),
  },
  echantillonIsolees: dbIso.slice(0, 20).map((e) => ({ slug: e.slug, name: e.name, type: e.type, attrs: Object.keys(e.attributes ?? {}) })),
  echantillonCreux: dbCreux.slice(0, 10).map((e) => ({ slug: e.slug, name: e.name, summary: e.summary, descFr: (e.attributes?.descFr ?? '').slice(0, 400) })),
};

const p = `data/audits/poche-db-mesure-${STAMP}.json`;
fs.writeFileSync(p, JSON.stringify(rapport, null, 2));
console.log('trace →', p);
console.log(JSON.stringify({ ...rapport, echantillonIsolees: undefined, echantillonCreux: undefined }, null, 2));
