// scripts/audit-chantier5-liens-perdus.mjs — CHANTIER 5 : la mesure HONNÊTE des demi-liens.
//
// Compter « les arêtes dont la nature n'est pas lue » surestime : sur la fiche personnage, une
// arête `famille` ENTRANTE peut désigner quelqu'un que le databook (`attributes.family`) nomme
// déjà — c'est exactement le piège du 10/08 (« c'est vrai des seules qui doublent un ATTRIBUT »).
// Ce script compare donc, fiche par fiche, l'ensemble des NOMS que la zone rend réellement à
// l'ensemble des noms que le graphe lui attache : l'écart est ce que le lecteur ne peut PAS
// atteindre depuis cette page.
//
// Aucune écriture, aucune requête Supabase.
// Usage : node scripts/audit-chantier5-liens-perdus.mjs <instantané.json> <sortie.json>
import fs from 'node:fs';

const snap = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const sortie = process.argv[3];
const { entries, rels } = snap;
const byId = new Map(entries.map((e) => [e.id, e]));

const gabarit = (e) => {
  if (e.type === 'character') return 'CharacterZone';
  if (e.type === 'status') return 'OrganizationZone';
  const cat = e.attributes && typeof e.attributes.category === 'string' ? e.attributes.category : null;
  if ((e.type === 'power' || e.type === 'skill') && cat === 'Attaque') return 'Attaque';
  return 'EntityZone';
};
const BELONG_ATTRS = ['clan', 'village', 'organization', 'crew', 'faction', 'division', 'camp', 'partie', 'race', 'nen', 'generation', 'rank'];
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : str(v) ? [v] : []);
const bas = (s) => String(s).toLowerCase();

// Arêtes indexées par fiche
const out = new Map(); const inn = new Map();
for (const r of rels) {
  const s = byId.get(r.from_entry); const t = byId.get(r.to_entry);
  if (!s || !t) continue;
  (out.get(s.id) ?? out.set(s.id, []).get(s.id)).push({ rel: r.relation, o: t });
  (inn.get(t.id) ?? inn.set(t.id, []).get(t.id)).push({ rel: r.relation, o: s });
}

const perdus = [];
const parNature = {};        // `${relation}|${sens}|${gabarit}` -> nombre d'arêtes perdues
const fichesTouchees = {};   // même clé -> Set de slugs
const exemples = {};

for (const e of entries) {
  const g = gabarit(e);
  const a = e.attributes ?? {};
  const O = out.get(e.id) ?? []; const I = inn.get(e.id) ?? [];
  if (!O.length && !I.length) continue;

  // ── L'ensemble des NOMS que la page rend réellement, par gabarit ──
  const rendus = new Set();
  if (g === 'CharacterZone') {
    for (const m of Array.isArray(a.family) ? a.family : []) if (m && typeof m === 'object' && m.name) rendus.add(bas(m.name));
    for (const k of BELONG_ATTRS) { const v = str(a[k]); if (v) rendus.add(bas(v)); }
    for (const aff of list(a.affiliation).slice(0, 3)) rendus.add(bas(aff));
    for (const r of O) if (['maitrise', 'famille', 'allie', 'mentor', 'eleve', 'ennemi', 'rival', 'appartient', 'habite', 'exerce'].includes(r.rel)) rendus.add(bas(r.o.name));
    for (const r of I) if (['mentor', 'eleve', 'allie', 'ennemi', 'rival', 'famille'].includes(r.rel)) rendus.add(bas(r.o.name));
  } else if (g === 'OrganizationZone') {
    for (const r of I) if (r.rel === 'appartient' && (r.o.type === 'character' || r.o.type === 'artifact')) rendus.add(bas(r.o.name));
  } else if (g === 'Attaque') {
    for (const r of I) if (r.rel === 'maitrise' && r.o.type === 'character') rendus.add(bas(r.o.name));
  } else {
    for (const r of O) rendus.add(bas(r.o.name));
    for (const r of I) rendus.add(bas(r.o.name));
  }

  const noter = (r, sens) => {
    if (rendus.has(bas(r.o.name))) return; // déjà atteignable par un autre chemin de la même page
    const k = `${r.rel}|${sens}|${g}`;
    parNature[k] = (parNature[k] ?? 0) + 1;
    (fichesTouchees[k] ??= new Set()).add(e.slug);
    (exemples[k] ??= []).length < 3 && exemples[k].push(`${e.slug} (${e.type}) ${sens === 'entrant' ? '←' : '→'} ${r.rel} ${r.o.slug} (${r.o.type})`);
    perdus.push({ fiche: e.slug, type: e.type, gabarit: g, sens, relation: r.rel, autreBout: r.o.slug });
  };
  if (g === 'CharacterZone') {
    for (const r of O) if (!['maitrise', 'famille', 'allie', 'mentor', 'eleve', 'ennemi', 'rival', 'appartient', 'habite', 'exerce'].includes(r.rel)) noter(r, 'sortant');
    for (const r of I) if (!['mentor', 'eleve', 'allie', 'ennemi', 'rival', 'famille'].includes(r.rel)) noter(r, 'entrant');
  } else if (g === 'OrganizationZone') {
    for (const r of O) noter(r, 'sortant');
    for (const r of I) if (!(r.rel === 'appartient' && (r.o.type === 'character' || r.o.type === 'artifact'))) noter(r, 'entrant');
  } else if (g === 'Attaque') {
    for (const r of O) noter(r, 'sortant');
    for (const r of I) if (!(r.rel === 'maitrise' && r.o.type === 'character')) noter(r, 'entrant');
  }
}

const tableau = Object.entries(parNature).map(([k, n]) => {
  const [relation, sens, gab] = k.split('|');
  return { relation, sens, gabarit: gab, aretesPerdues: n, fichesTouchees: fichesTouchees[k].size, exemples: exemples[k] };
}).sort((a, b) => b.aretesPerdues - a.aretesPerdues);

const total = perdus.length;
const fichesUniques = new Set(perdus.map((p) => p.fiche)).size;
fs.writeFileSync(sortie, JSON.stringify({
  quand: new Date().toISOString(),
  instantane: process.argv[2],
  methode: "une arête est PERDUE quand le nom de son autre bout n'apparaît nulle part dans ce que la zone rend pour cette fiche (dédup par nom, comme le composant)",
  socle: { fiches: entries.length, aretes: rels.length },
  total, fichesUniques,
  tableau,
}, null, 1));
console.log(`arêtes perdues (autre bout inatteignable depuis la page) : ${total} sur ${rels.length} · ${fichesUniques} fiches touchées`);
for (const t of tableau) console.log(`  ${String(t.aretesPerdues).padStart(5)}  ${t.relation.padEnd(18)} ${t.sens.padEnd(8)} ${t.gabarit.padEnd(18)} (${t.fichesTouchees} fiches)`);
console.log(`écrit → ${sortie}`);
