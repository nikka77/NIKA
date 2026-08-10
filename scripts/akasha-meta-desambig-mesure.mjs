// scripts/akasha-meta-desambig-mesure.mjs — CHANTIER 4, étape 2 : MESURER avant de coder.
// Les descriptions dupliquées « à un nom près » viennent du repli `summary`. Question posée ici :
// le corpus porte-t-il, POUR CES FICHES, un fait propre capable de casser l'égalité —
// et si oui, lequel ? On ne code le correctif qu'après la réponse chiffrée.
// LECTURE SEULE. Trace horodatée dans data/audits/.
import { readFileSync, writeFileSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const rec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const db = clientSite();

// slugs des groupes dupliqués (recensement) — on les recharge en ENTIER
const empCount = new Map();
for (const f of rec.fiches) empCount.set(f.emp, (empCount.get(f.emp) ?? 0) + 1);
const dupes = rec.fiches.filter((f) => empCount.get(f.emp) > 1);
console.log('fiches dupliquées à traiter :', dupes.length);

/** Charge id + attributes + rarity pour une liste de slugs, par paquets de 200. */
async function charger(slugs) {
  const out = new Map();
  for (let i = 0; i < slugs.length; i += 200) {
    const lot = slugs.slice(i, i + 200);
    const { data, error } = await db
      .from('akasha_entries')
      .select('id,slug,name,type,universe,rarity,summary,attributes')
      .in('slug', lot);
    if (error) throw new Error(error.message);
    for (const r of data) out.set(r.slug, r);
  }
  return out;
}

const rows = await charger(dupes.map((d) => d.slug));
console.log('rechargées :', rows.size);

// relations ENTRANTES et SORTANTES de ces fiches, par paquets d'id
const ids = [...rows.values()].map((r) => r.id);
const relIn = new Map();   // id → [{relation, name}]
const relOut = new Map();
for (let i = 0; i < ids.length; i += 150) {
  const lot = ids.slice(i, i + 150);
  const [{ data: din, error: ein }, { data: dout, error: eout }] = await Promise.all([
    db.from('akasha_relations')
      .select('to_entry, relation, src:akasha_entries!akasha_relations_from_entry_fkey(name,type)')
      .in('to_entry', lot),
    db.from('akasha_relations')
      .select('from_entry, relation, tgt:akasha_entries!akasha_relations_to_entry_fkey(name,type)')
      .in('from_entry', lot),
  ]);
  if (ein) throw new Error(ein.message);
  if (eout) throw new Error(eout.message);
  for (const r of din) { if (!relIn.has(r.to_entry)) relIn.set(r.to_entry, []); relIn.get(r.to_entry).push({ relation: r.relation, name: r.src?.name, type: r.src?.type }); }
  for (const r of dout) { if (!relOut.has(r.from_entry)) relOut.set(r.from_entry, []); relOut.get(r.from_entry).push({ relation: r.relation, name: r.tgt?.name, type: r.tgt?.type }); }
  process.stderr.write(`\r  relations ${Math.min(i + 150, ids.length)}/${ids.length}`);
}
process.stderr.write('\n');

// inventaire des relations et des attributs disponibles sur ces fiches
const invRel = {}, invAttr = {};
for (const r of rows.values()) {
  for (const x of relIn.get(r.id) ?? []) invRel[`in:${x.relation}`] = (invRel[`in:${x.relation}`] ?? 0) + 1;
  for (const x of relOut.get(r.id) ?? []) invRel[`out:${x.relation}`] = (invRel[`out:${x.relation}`] ?? 0) + 1;
  for (const k of Object.keys(r.attributes ?? {})) invAttr[k] = (invAttr[k] ?? 0) + 1;
}

// couverture : combien de ces fiches ont AU MOINS un fait propre disponible
let avecRelIn = 0, avecRelOut = 0, avecAucune = 0;
const parGroupe = new Map();
for (const d of dupes) {
  const r = rows.get(d.slug); if (!r) continue;
  const ri = relIn.get(r.id) ?? [], ro = relOut.get(r.id) ?? [];
  if (ri.length) avecRelIn++;
  if (ro.length) avecRelOut++;
  if (!ri.length && !ro.length) avecAucune++;
  if (!parGroupe.has(d.emp)) parGroupe.set(d.emp, []);
  parGroupe.get(d.emp).push({ slug: d.slug, name: r.name, type: r.type, universe: r.universe, rarity: r.rarity, summary: r.summary,
    in: ri.slice(0, 4), out: ro.slice(0, 4), attrs: Object.fromEntries(Object.entries(r.attributes ?? {}).filter(([k]) => k !== 'descFr' && k !== 'descRaw' && k !== 'sections')) });
}

const groupes = [...parGroupe.entries()].map(([emp, membres]) => ({ emp, n: membres.length, membres }))
  .sort((a, b) => b.n - a.n);

const resume = {
  quand: new Date().toISOString(),
  fiches_dupliquees: dupes.length,
  rechargees: rows.size,
  disponibilite_du_fait_propre: {
    au_moins_une_relation_entrante: avecRelIn,
    au_moins_une_relation_sortante: avecRelOut,
    aucune_relation: avecAucune,
    part_sans_relation: +(avecAucune / dupes.length * 100).toFixed(1),
  },
  inventaire_relations: Object.fromEntries(Object.entries(invRel).sort((a, b) => b[1] - a[1])),
  inventaire_attributs: Object.fromEntries(Object.entries(invAttr).sort((a, b) => b[1] - a[1])),
  groupes_top10: groupes.slice(0, 10).map((g) => ({ emp: g.emp, n: g.n, echantillon: g.membres.slice(0, 3) })),
};
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const p = `data/audits/meta-partage-desambig-${stamp}.json`;
writeFileSync(p, JSON.stringify({ ...resume, groupes }, null, 2));
console.log(JSON.stringify(resume, null, 2).slice(0, 6000));
console.log('\nTRACE →', p);
