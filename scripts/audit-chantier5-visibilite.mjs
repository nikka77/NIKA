// scripts/audit-chantier5-visibilite.mjs — CHANTIER 5 : « ce que la base porte » × « ce que la
// fiche montre ». LECTURE SEULE (travaille sur l'instantané local, aucune requête, aucune écriture).
//
// Les règles ci-dessous ne sont pas des suppositions : elles sont RECOPIÉES du code de rendu lu
// ligne à ligne le 10/08 —
//   app/learn/akasha/[slug]/page.tsx  (les 4 gabarits et leurs points de montage)
//   components/akasha/zone/CharacterZone.tsx        (BELONG_ATTRS, NATURES_LIENS, NATURES_APPARTENANCE)
//   components/akasha/zone/OrganizationZone.tsx     (members = relationsIn appartient)
//   components/akasha/zone/EntityZone.tsx           (PRIMARY_RELATION + secondary = TOUT, 2 sens)
//   components/akasha/EntityAttributes.tsx          (catch-all moins HIDDEN)
//
// Usage : node scripts/audit-chantier5-visibilite.mjs <instantané.json> <sortie.json>
import fs from 'node:fs';

const snap = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const sortie = process.argv[3];
const { entries, rels } = snap;

// ── Le routage réel (page.tsx) ───────────────────────────────────────────
const gabarit = (e) => {
  if (e.type === 'character') return 'CharacterZone';
  if (e.type === 'status') return 'OrganizationZone';
  const cat = e.attributes && typeof e.attributes.category === 'string' ? e.attributes.category : null;
  if ((e.type === 'power' || e.type === 'skill') && cat === 'Attaque') return 'Attaque';
  return 'EntityZone';
};

// ── ATTRIBUTS : qui affiche quoi ─────────────────────────────────────────
// EntityAttributes n'est monté QUE par les gabarits `Attaque` et `EntityZone` (page.tsx l.183 et
// l.241). Il affiche TOUTE clé sauf celles de HIDDEN → recopié tel quel :
const HIDDEN = new Set([
  'category', 'rosterLabel', 'eras', 'facts', 'quote', 'bio', 'trivia', 'abilities',
  'descRaw', 'descLang', 'descFr', 'is_signature', 'source',
  'descFrSource', 'sectionsSource', 'import_source', 'sourceUrl', 'purgeAudit',
  'descFrRetiree', 'descFrImpossible', 'descFrPurgee', 'resumeCorrige',
  'sections', 'forms', 'statLabels', 'gallery', 'animations', 'quotes',
  'villageSlug', 'clanSlug',
]);
// Clés lues nommément par les zones qui n'ont PAS EntityAttributes.
const LUES_CHARACTERZONE = new Set([
  // grappe Appartenances (BELONG_ATTRS + affiliation)
  'clan', 'village', 'organization', 'crew', 'faction', 'division', 'camp', 'partie',
  'race', 'nen', 'generation', 'rank', 'affiliation',
  // surface & canal
  'forms', 'family', 'favorites', 'statLabels', 'bio', 'descFr', 'nindo', 'nindoLabel',
  'voiceActors', 'age', 'height', 'weight', 'bloodType', 'birthdate', 'bounty', 'fruit',
]);
const LUES_ORGANIZATIONZONE = new Set(['scope', 'total_prime', 'bio', 'descFr']);
// Le gabarit Attaque lit en propre category (routage), is_signature, discipline, descFr — le reste
// passe par EntityAttributes.
const LUES_ATTAQUE_PROPRE = new Set(['category', 'is_signature', 'discipline', 'descFr']);
// EntityZone lit en propre 4 clés que EntityAttributes cache (l.105 eras, l.149 bio+descFr, l.171
// quote) — sans cette liste le calcul comptait 2 377 `descFr` « muettes » alors que la zone les
// affiche en tête de canal. Une clé HIDDEN n'est pas une clé invisible : elle est seulement absente
// du TABLEAU d'attributs.
const LUES_ENTITYZONE = new Set(['eras', 'bio', 'quote', 'descFr', 'forms']);
// `category` est rendue par le fil d'Ariane (components/akasha/Crumbs.tsx), monté par les QUATRE
// branches de page.tsx dès que `universe` est non nul — mesuré : 7 654 fiches sur 7 654 ont un
// univers, donc la clé est visible partout, y compris là où EntityAttributes la cache.
const VISIBLE_PARTOUT = new Set(['category']);

const visible = (cle, g) => {
  if (VISIBLE_PARTOUT.has(cle)) return true;
  if (g === 'CharacterZone') return LUES_CHARACTERZONE.has(cle);
  if (g === 'OrganizationZone') return LUES_ORGANIZATIONZONE.has(cle);
  if (g === 'Attaque') return LUES_ATTAQUE_PROPRE.has(cle) || !HIDDEN.has(cle);
  return LUES_ENTITYZONE.has(cle) || !HIDDEN.has(cle);
};

const peuplee = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
};

// La COLONNE image_url : quels gabarits la rendent ? (CharacterZone l.62 et EntityZone l.161 oui,
// OrganizationZone et le gabarit Attaque n'y touchent JAMAIS — vérifié au grep sur les 4 fichiers.)
const imageParGabarit = {};
for (const e of entries) {
  if (!e.image_url || !String(e.image_url).trim()) continue;
  const g = gabarit(e);
  imageParGabarit[g] = (imageParGabarit[g] ?? 0) + 1;
}

const parCle = new Map();
for (const e of entries) {
  const g = gabarit(e);
  const a = e.attributes && typeof e.attributes === 'object' ? e.attributes : {};
  for (const [k, v] of Object.entries(a)) {
    if (!peuplee(v)) continue;
    if (!parCle.has(k)) parCle.set(k, { cle: k, peuplees: 0, vues: 0, muettes: 0, muettesParGabarit: {}, exemples: [] });
    const c = parCle.get(k);
    c.peuplees += 1;
    if (visible(k, g)) c.vues += 1;
    else {
      c.muettes += 1;
      c.muettesParGabarit[g] = (c.muettesParGabarit[g] ?? 0) + 1;
      if (c.exemples.length < 3) {
        const s = typeof v === 'string' ? v.slice(0, 70) : JSON.stringify(v).slice(0, 70);
        c.exemples.push(`${e.slug} (${e.type}/${g}) = ${s}`);
      }
    }
  }
}
const clesMuettes = [...parCle.values()].filter((c) => c.muettes > 0).sort((a, b) => b.muettes - a.muettes);

// ── ARÊTES : rendue ou non, à CHAQUE bout ────────────────────────────────
const OUT_CHARACTERZONE = new Set(['maitrise', 'famille', 'allie', 'mentor', 'eleve', 'ennemi', 'rival', 'appartient', 'habite', 'exerce']);
const IN_CHARACTERZONE = new Set(['mentor', 'eleve', 'allie', 'ennemi', 'rival']);

const renduSortant = (g, rel) => {
  if (g === 'CharacterZone') return OUT_CHARACTERZONE.has(rel);
  if (g === 'OrganizationZone') return false;      // OrganizationZone ne lit AUCUNE relationsOut
  if (g === 'Attaque') return false;               // le gabarit Attaque ne lit AUCUNE relationsOut
  return true;                                     // EntityZone : `secondary` prend tout relationsOut
};
const renduEntrant = (g, rel, typeSource) => {
  if (g === 'CharacterZone') return IN_CHARACTERZONE.has(rel);
  if (g === 'OrganizationZone') return rel === 'appartient' && (typeSource === 'character' || typeSource === 'artifact');
  if (g === 'Attaque') return rel === 'maitrise' && typeSource === 'character';
  return true;                                     // EntityZone : primary + secondary couvrent tout
};

const byId = new Map(entries.map((e) => [e.id, e]));
const aretes = new Map();
let nulPart = 0;
const exemplesNulPart = [];
for (const r of rels) {
  const src = byId.get(r.from_entry);
  const dst = byId.get(r.to_entry);
  if (!src || !dst) continue;
  const gs = gabarit(src);
  const gd = gabarit(dst);
  const okOut = renduSortant(gs, r.relation);
  const okIn = renduEntrant(gd, r.relation, src.type);
  if (!aretes.has(r.relation)) aretes.set(r.relation, { relation: r.relation, total: 0, sortantRendu: 0, entrantRendu: 0, aucunBout: 0, trousOut: {}, trousIn: {}, exemples: [] });
  const n = aretes.get(r.relation);
  n.total += 1;
  if (okOut) n.sortantRendu += 1; else n.trousOut[gs] = (n.trousOut[gs] ?? 0) + 1;
  if (okIn) n.entrantRendu += 1; else n.trousIn[gd] = (n.trousIn[gd] ?? 0) + 1;
  if (!okOut && !okIn) {
    n.aucunBout += 1;
    nulPart += 1;
    if (n.exemples.length < 3) n.exemples.push(`${src.slug} (${src.type}/${gs}) —${r.relation}→ ${dst.slug} (${dst.type}/${gd})`);
    if (exemplesNulPart.length < 25) exemplesNulPart.push(`${src.slug} —${r.relation}→ ${dst.slug}`);
  }
}
const aretesListe = [...aretes.values()].sort((a, b) => (b.total - b.sortantRendu) + (b.total - b.entrantRendu) - ((a.total - a.sortantRendu) + (a.total - a.entrantRendu)));

// ── Fiches dont AUCUNE arête n'est rendue sur leur propre page ───────────
const fichesArete = new Map(); // slug -> { portees, rendues }
for (const r of rels) {
  const src = byId.get(r.from_entry); const dst = byId.get(r.to_entry);
  if (!src || !dst) continue;
  for (const [e, sens] of [[src, 'out'], [dst, 'in']]) {
    const g = gabarit(e);
    const ok = sens === 'out' ? renduSortant(g, r.relation) : renduEntrant(g, r.relation, src.type);
    if (!fichesArete.has(e.slug)) fichesArete.set(e.slug, { slug: e.slug, type: e.type, gabarit: g, portees: 0, rendues: 0 });
    const f = fichesArete.get(e.slug);
    f.portees += 1;
    if (ok) f.rendues += 1;
  }
}
const fichesMuettes = [...fichesArete.values()].filter((f) => f.portees > 0 && f.rendues === 0);
const fichesMuettesParGabarit = {};
for (const f of fichesMuettes) fichesMuettesParGabarit[`${f.gabarit} · ${f.type}`] = (fichesMuettesParGabarit[`${f.gabarit} · ${f.type}`] ?? 0) + 1;

// ── Troncatures de CharacterZone (les caps 14 / 24 / 12) ────────────────
let tronqTech = 0, tronqLiens = 0, tronqAppart = 0;
for (const e of entries) {
  if (e.type !== 'character') continue;
  const out = rels.filter((r) => r.from_entry === e.id);
  const inn = rels.filter((r) => r.to_entry === e.id);
  const nTech = out.filter((r) => r.relation === 'maitrise').length;
  if (nTech > 14) tronqTech += 1;
  const nLiens = out.filter((r) => ['allie', 'mentor', 'eleve', 'ennemi', 'rival'].includes(r.relation)).length
    + inn.filter((r) => ['mentor', 'eleve', 'allie', 'ennemi', 'rival'].includes(r.relation)).length;
  if (nLiens > 24) tronqLiens += 1;
  const nApp = out.filter((r) => ['appartient', 'habite', 'exerce'].includes(r.relation)).length;
  if (nApp > 12) tronqAppart += 1;
}

fs.writeFileSync(sortie, JSON.stringify({
  quand: new Date().toISOString(),
  instantane: process.argv[2],
  socle: { fiches: entries.length, aretes: rels.length },
  imageUrlParGabarit: { ...imageParGabarit, rendue: ['CharacterZone', 'EntityZone'], jamaisRendue: ['OrganizationZone', 'Attaque'] },
  clesMuettes,
  aretes: aretesListe,
  aretesNulPart: nulPart,
  exemplesNulPart,
  fichesSansAucuneAreteRendue: { total: fichesMuettes.length, parGabarit: fichesMuettesParGabarit, exemples: fichesMuettes.slice(0, 30) },
  troncaturesCharacterZone: { techniquesAuDela14: tronqTech, liensAuDela24: tronqLiens, appartenancesAuDela12: tronqAppart },
}, null, 1));
console.log(`clés à fiches muettes: ${clesMuettes.length} · arêtes rendues à AUCUN bout: ${nulPart} · fiches sans aucune arête rendue: ${fichesMuettes.length}`);
console.log(`écrit → ${sortie}`);
