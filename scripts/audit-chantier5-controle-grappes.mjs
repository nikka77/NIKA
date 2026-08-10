// scripts/audit-chantier5-controle-grappes.mjs — CHANTIER 5 : ÉPREUVE DU MODÈLE.
//
// Le modèle de visibilité (audit-chantier5-visibilite.mjs) est une RECOPIE du code de rendu ; il
// peut donc se tromper exactement là où j'ai mal lu. Ce script le met à l'épreuve d'une façon
// falsifiable : il prédit, depuis le graphe, les COMPTEURS que CharacterZone imprime en titre de
// grappe (« Techniques · N », « Famille · N », « Liens · N ») et les compare au HTML SERVI,
// scripts retirés. Un écart = mon modèle est faux, pas la page.
//
// Aucune écriture, aucune requête Supabase.
// Usage : node scripts/audit-chantier5-controle-grappes.mjs <instantané.json> <sortie.json> <slug> [...]
import fs from 'node:fs';

const snap = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const sortie = process.argv[3];
const slugs = process.argv.slice(4);
const { entries, rels } = snap;
const byId = new Map(entries.map((e) => [e.id, e]));
const bySlug = new Map(entries.map((e) => [e.slug, e]));

const BELONG_ATTRS = ['clan', 'village', 'organization', 'crew', 'faction', 'division', 'camp', 'partie', 'race', 'nen', 'generation', 'rank'];
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : str(v) ? [v] : []);

const texteVisible = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x2F;/g, '/')
  .replace(/\s+/g, ' ');

const res = [];
for (const slug of slugs) {
  const e = bySlug.get(slug);
  if (!e) { console.log(`ABSENT ${slug}`); continue; }
  const a = e.attributes ?? {};
  const out = rels.filter((r) => r.from_entry === e.id).map((r) => ({ rel: r.relation, t: byId.get(r.to_entry) })).filter((x) => x.t);
  const inn = rels.filter((r) => r.to_entry === e.id).map((r) => ({ rel: r.relation, t: byId.get(r.from_entry) })).filter((x) => x.t);

  const atk = out.filter((r) => r.rel === 'maitrise');
  const famille = [];
  const noms = new Set();
  if (Array.isArray(a.family)) for (const m of a.family) if (m && typeof m === 'object' && m.rel && m.name) { famille.push(m.name); noms.add(String(m.name).toLowerCase()); }
  // Les DEUX sens depuis le correctif du 10/08 (famille est réflexive) — même ordre que le
  // composant : relationsOut puis relationsIn, dédup par nom.
  for (const r of [...out, ...inn]) if (r.rel === 'famille' && !noms.has(r.t.name.toLowerCase())) { noms.add(r.t.name.toLowerCase()); famille.push(r.t.name); }

  const NAT = { allie: 'Allié', mentor: 'Mentor', eleve: 'Élève', ennemi: 'Ennemi', rival: 'Rival' };
  const liens = [
    ...out.filter((r) => NAT[r.rel]).map((r) => ({ l: NAT[r.rel], n: r.t.name })),
    ...inn.filter((r) => r.rel === 'mentor' || r.rel === 'eleve').map((r) => ({ l: r.rel === 'mentor' ? 'Élève' : 'Mentor', n: r.t.name })),
    ...inn.filter((r) => ['allie', 'ennemi', 'rival'].includes(r.rel)).map((r) => ({ l: NAT[r.rel], n: r.t.name })),
  ].filter((x, i, t) => t.findIndex((y) => y.n === x.n && y.l === x.l) === i).slice(0, 24);

  const belong = [];
  for (const k of BELONG_ATTRS) { const v = str(a[k]); if (v) belong.push(v); }
  for (const aff of list(a.affiliation).slice(0, 3)) belong.push(aff);
  const dejaDit = new Set(belong.map((b) => b.toLowerCase()));
  const APP = { appartient: 'Appartient à', habite: 'Réside', exerce: 'Exerce' };
  const appLiees = out.filter((r) => APP[r.rel] && !dejaDit.has(r.t.name.toLowerCase()))
    .map((r) => ({ l: APP[r.rel], n: r.t.name }))
    .filter((x, i, t) => t.findIndex((y) => y.n === x.n) === i).slice(0, 12);

  // Ce que le modèle dit INVISIBLE sur cette page :
  const invisibles = [
    ...out.filter((r) => !['maitrise', 'famille', 'allie', 'mentor', 'eleve', 'ennemi', 'rival', 'appartient', 'habite', 'exerce'].includes(r.rel)).map((r) => `→ ${r.rel} ${r.t.slug}`),
    ...inn.filter((r) => !['mentor', 'eleve', 'allie', 'ennemi', 'rival'].includes(r.rel)).map((r) => `← ${r.rel} ${r.t.slug}`),
  ];

  const rep = await fetch(`http://localhost:3000/learn/akasha/${slug}`, { signal: AbortSignal.timeout(60_000) });
  const txt = texteVisible(await rep.text());
  const lu = (t) => { const m = txt.match(new RegExp(`${t} · (\\d+)`)); return m ? Number(m[1]) : null; };
  const attendu = { Techniques: atk.length, Famille: famille.length, Liens: liens.length };
  const servi = { Techniques: lu('Techniques'), Famille: lu('Famille'), Liens: lu('Liens') };
  const accord = Object.keys(attendu).every((k) => (attendu[k] === 0 ? servi[k] === null : servi[k] === attendu[k]));
  console.log(`${accord ? 'ACCORD  ' : 'ÉCART   '} ${slug} attendu=${JSON.stringify(attendu)} servi=${JSON.stringify(servi)} invisibles=${invisibles.length}`);
  res.push({ slug, attendu, servi, accord, appartenancesLiees: appLiees, aretesInvisibles: invisibles });
}
fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), cas: res }, null, 1));
const ok = res.filter((r) => r.accord).length;
console.log(`accord ${ok}/${res.length}`);
console.log(`écrit → ${sortie}`);
