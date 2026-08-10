// scripts/akasha-sonde-trous.mjs — CHANTIER 2 : à quoi ressemblent VRAIMENT les trous ?
// Lecture seule, paginée. Sort des exemples nommés pour chaque poche, afin de décider si combler
// est un GAIN ou une redite. Zéro écriture.
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const PAGE = 1000;
async function pagine(table, cols) {
  const out = [];
  for (let d = 0; ; d += PAGE) {
    const { data, error } = await db.from(table).select(cols).order('id', { ascending: true }).range(d, d + PAGE - 1);
    if (error) throw new Error(`${table} @${d} : ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

const entries = await pagine('akasha_entries', 'id, slug, name, type, universe, category:attributes->>category');
const rels = await pagine('akasha_relations', 'id, relation, from_entry, to_entry');
const parId = new Map(entries.map((e) => [e.id, e]));

const nom = (id) => { const e = parId.get(id); return e ? `${e.name} (${e.slug}, ${e.type}, ${e.universe})` : '?'; };

// ── A. `appartient` character → character : qui reçoit le plus ? ──
console.log('=== A. appartient character→character (1198 arêtes) : les CIBLES les plus reliées ===');
const cibles = new Map();
for (const r of rels) {
  if (r.relation !== 'appartient') continue;
  const f = parId.get(r.from_entry), t = parId.get(r.to_entry);
  if (f?.type !== 'character' || t?.type !== 'character') continue;
  const l = cibles.get(r.to_entry) ?? [];
  l.push(f.name);
  cibles.set(r.to_entry, l);
}
const triCibles = [...cibles].sort((a, b) => b[1].length - a[1].length);
console.log(`${cibles.size} fiches personnage reçoivent au moins une arête appartient d'un autre personnage.`);
for (const [id, sources] of triCibles.slice(0, 20)) {
  console.log(`  ${String(sources.length).padStart(4)} ← ${nom(id)}   ex. ${sources.slice(0, 3).join(', ')}`);
}
const distrib = new Map();
for (const [, l] of triCibles) { const b = l.length >= 12 ? '12+' : l.length >= 6 ? '6-11' : l.length >= 2 ? '2-5' : '1'; distrib.set(b, (distrib.get(b) ?? 0) + 1); }
console.log('  distribution :', [...distrib].map(([k, v]) => `${k}:${v}`).join(' · '));

// ── B. `possede` sortant depuis un personnage ──
console.log('\n=== B. possede character→* (705 arêtes) : les PORTEURS les plus équipés ===');
const porteurs = new Map();
for (const r of rels) {
  if (r.relation !== 'possede') continue;
  const f = parId.get(r.from_entry), t = parId.get(r.to_entry);
  if (f?.type !== 'character') continue;
  const l = porteurs.get(r.from_entry) ?? [];
  l.push(`${t.name}[${t.type}]`);
  porteurs.set(r.from_entry, l);
}
console.log(`${porteurs.size} personnages possèdent au moins un objet — et leur fiche n'en dit RIEN.`);
for (const [id, objets] of [...porteurs].sort((a, b) => b[1].length - a[1].length).slice(0, 15)) {
  console.log(`  ${String(objets.length).padStart(3)}  ${nom(id)} → ${objets.slice(0, 5).join(', ')}`);
}

// ── C. OrganizationZone : les arêtes SORTANTES d'un status ──
console.log('\n=== C. status → * (sortantes, invisibles sur OrganizationZone) ===');
const sortStatus = new Map();
for (const r of rels) {
  const f = parId.get(r.from_entry), t = parId.get(r.to_entry);
  if (f?.type !== 'status') continue;
  const l = sortStatus.get(r.from_entry) ?? [];
  l.push(`${r.relation}→${t.name}[${t.type}]`);
  sortStatus.set(r.from_entry, l);
}
console.log(`${sortStatus.size} fiches organisation portent au moins une arête sortante.`);
for (const [id, ar] of [...sortStatus].sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
  console.log(`  ${String(ar.length).padStart(3)}  ${nom(id)} : ${ar.slice(0, 5).join(', ')}`);
}

// ── D. OrganizationZone : les entrantes NON lues (hors appartient/character et appartient/artifact) ──
console.log('\n=== D. status ← * (entrantes NON lues par OrganizationZone) ===');
const inStatus = new Map();
for (const r of rels) {
  const f = parId.get(r.from_entry), t = parId.get(r.to_entry);
  if (t?.type !== 'status') continue;
  if (r.relation === 'appartient' && (f.type === 'character' || f.type === 'artifact')) continue;
  const l = inStatus.get(r.to_entry) ?? [];
  l.push(`${f.name}[${f.type}] ${r.relation}→`);
  inStatus.set(r.to_entry, l);
}
console.log(`${inStatus.size} fiches organisation reçoivent au moins une arête qu'elles ne rendent pas.`);
for (const [id, ar] of [...inStatus].sort((a, b) => b[1].length - a[1].length).slice(0, 15)) {
  console.log(`  ${String(ar.length).padStart(3)}  ${nom(id)} : ${ar.slice(0, 4).join(' | ')}`);
}

// ── E. Le reste des trous CharacterZone (entrants exotiques) ──
console.log('\n=== E. entrants exotiques sur une fiche personnage ===');
for (const rel of ['ange', 'dieu_destruction', 'kaio_shin', 'maitrise', 'habite', 'exerce', 'appartient']) {
  const ex = rels.filter((r) => {
    const f = parId.get(r.from_entry), t = parId.get(r.to_entry);
    return r.relation === rel && t?.type === 'character' && f?.type !== 'character' && f?.type !== 'skill';
  });
  if (ex.length) console.log(`  ${rel} : ${ex.length} — ex. ${ex.slice(0, 3).map((r) => `${nom(r.from_entry).split(' (')[0]} → ${nom(r.to_entry).split(' (')[0]}`).join(' ; ')}`);
}

// ── F. Les 22 arêtes invisibles des DEUX côtés ──
console.log('\n=== F. invisibles des DEUX côtés ===');
for (const r of rels) {
  const f = parId.get(r.from_entry), t = parId.get(r.to_entry);
  if (!f || !t) continue;
  const inv = (r.relation === 'possede' && f.type === 'character' && t.type === 'character')
    || (r.relation === 'appartient' && f.type === 'status' && t.type === 'status');
  if (inv) console.log(`  ${r.relation}  ${f.name} [${f.type}] → ${t.name} [${t.type}]  (${f.universe})`);
}
