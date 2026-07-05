// scripts/mine-op-descraw.mjs — PILOTE One Piece : mine les descriptions brutes (descRaw) pour en
// extraire des FAITS STRUCTURÉS (Fruit du Démon + type, taille, affiliations, famille) → relations
// et attributs de graphe. DRY-RUN par défaut : lit data/akasha-universes.json, ne touche PAS la base,
// écrit un rapport data/akasha-op-mined.json pour revue.
//
//   node scripts/mine-op-descraw.mjs            → dry-run + rapport
//   node scripts/mine-op-descraw.mjs --show=20  → dry-run + 20 exemples détaillés
//
// Objectif du pilote (validé avec Dan) : prouver la chaîne NETTOYAGE → EXTRACTION sur l'univers le plus
// riche ET le plus pollué avant de généraliser. Aucune écriture DB tant que le rendement n'est pas validé.
import { readFileSync, writeFileSync } from 'node:fs';

const SHOW = parseInt((process.argv.find((a) => a.startsWith('--show=')) || '').split('=')[1] || '0', 10);
const UNIVERSE = 'One Piece';

// ── 1) NETTOYAGE (garde-fou avant tout parse ET avant traduction FR) ──
// Décode les entités HTML, retire la métadonnée de provenance « Source: http… », normalise l'espace.
function cleanRaw(s) {
  if (!s) return '';
  let t = String(s)
    .replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
  t = t.replace(/\bSource:\s*https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim();
  return t;
}

// Champ « Clé: valeur » en tête de bio (insensible casse), valeur = jusqu'au prochain champ connu ou fin.
const FIELD_STOP = '(?=\\s+(?:Height|Weight|Age|Birth|Blood|Affiliation|Affiliations|Devil Fruit|Occupation|Bounty|Epithet|Status|Residence|Relatives|Family|Alias|Japanese|Romanized|Official|Debut|First|Race|Gender|Position|Rank|Crew)\\b|$)';
function field(raw, key) {
  const re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*(.+?)' + FIELD_STOP, 'i');
  const m = raw.match(re);
  return m ? m[1].trim().replace(/[;,.]$/, '') : null;
}

// ── 2) EXTRACTEURS ──
const FRUIT_TYPES = ['Paramecia', 'Zoan', 'Logia'];
function extract(entry) {
  const raw = cleanRaw(entry.attributes?.descRaw);
  if (!raw) return null;
  const out = { slug: entry.slug, name: entry.name, attrs: {}, rels: [] };

  // Taille → attribut numérique height_cm (format quasi identique partout : « Height: 172 cm »).
  const hm = raw.match(/Height:\s*(?:[\d.]+\s*cm[^)]*\()?\s*(\d{2,3})\s*cm/i) || raw.match(/Height:\s*(\d{2,3})\s*cm/i);
  if (hm) out.attrs.height_cm = parseInt(hm[1], 10);

  // Fruit du Démon → attribut + relation vers l'entité fruit (collection « Fruit du Démon » déjà en base).
  const NONE = /^(none|unknown|n\/a|aucun|-)$/i;
  const fruit = field(raw, 'Devil Fruit') || field(raw, 'True Devil Fruit');
  if (fruit && !NONE.test(fruit.trim())) {
    const clean = fruit.replace(/\((?:Human-Human|Rubber-Rubber|[^)]*)\)/g, '').replace(/no Mi.*$/i, 'no Mi').trim().replace(/[)\].,;]+$/, '');
    if (clean.length > 2 && !NONE.test(clean)) {
      out.attrs.devil_fruit = clean.slice(0, 60);
      out.rels.push({ relation: 'mange-fruit', toName: clean.slice(0, 60), _kind: 'fruit' });
    }
  }
  // Type de fruit → axe de pouvoir signature (Paramecia / Zoan / Logia).
  const ftype = FRUIT_TYPES.find((t) => new RegExp('Devil Fruit Type:\\s*' + t, 'i').test(raw) || (out.attrs.devil_fruit && new RegExp('\\b' + t + '\\b').test(raw.slice(0, 400))));
  if (ftype) out.attrs.devil_fruit_type = ftype;

  // Affiliations → relations vers l'équipage/faction + rôle (« Straw Hat Pirates (Captain) »). Le champ
  // mélange équipages ET lieux/résidences → on RÉSOUT chaque cible contre le graphe et on retype selon
  // le type de l'entité trouvée (place → réside, sinon appartient). Cible non résolue = ignorée (on
  // n'invente pas de nœud).
  const aff = field(raw, 'Affiliations') || field(raw, 'Affiliation');
  if (aff) {
    for (const part of aff.split(/;|,(?![^(]*\))/)) {
      const m = part.trim().match(/^([^(]+?)(?:\s*\(([^)]+)\))?\)?$/);
      if (m && m[1]) {
        const nm = m[1].trim().replace(/[)\].,;]+$/, '');
        if (nm.length > 2 && nm.length < 60) out.rels.push({ relation: 'appartient', toName: nm, role: m[2] ? m[2].trim() : null, _kind: 'aff' });
      }
    }
  }

  // Famille → relations parenté typée (« Relatives: Dragon (father), Garp (grandfather) »).
  const fam = field(raw, 'Relatives') || field(raw, 'Family');
  if (fam) {
    for (const m of fam.matchAll(/([A-ZÀ-Ú][\w.'’ -]{2,40}?)\s*\(([^)]+?)\)/g)) {
      const rel = m[2].toLowerCase();
      const type = /father|mother|parent|dad|mom/.test(rel) ? 'parent' : /son|daughter|child/.test(rel) ? 'enfant'
        : /brother|sister|sibling/.test(rel) ? 'fratrie' : /grand/.test(rel) ? 'grand-parent' : /wife|husband|spouse/.test(rel) ? 'conjoint' : 'famille';
      out.rels.push({ relation: type, toName: m[1].trim(), note: m[2].trim() });
    }
  }

  return (Object.keys(out.attrs).length || out.rels.length) ? out : null;
}

// ── 3) RUN (dry) ──
const data = JSON.parse(readFileSync('data/akasha-universes.json', 'utf8'));
const opChars = data.entries.filter((e) => e.universe === UNIVERSE && e.type === 'character');
const withDesc = opChars.filter((e) => e.attributes?.descRaw);
// Résolution des cibles de relations contre le graphe OP (nom normalisé → entité). On n'invente PAS
// de nœud : une cible non résolue est comptée mais pas injectée. Une cible de type 'place' → « réside ».
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// Graphe FR/romaji vs descRaw EN → on indexe par NOM, par roman_name, ET par alias EN curés (top volume).
// Affiliation EN (descRaw) → SLUG de l'entité graphe (FR). Curé sur les crews/factions à fort volume ;
// slugs déterministes (slugify du nom FR) donc stables au rebuild. À enrichir au vrai run selon le
// classement des cibles non résolues. On résout par slug direct (voir SLUG_ALIASES ci-dessous).
const SLUG_ALIASES = {
  'straw hat pirates': 'chapeau-de-paille', 'straw hats': 'chapeau-de-paille', 'straw hat grand fleet': 'chapeau-de-paille',
  'red hair pirates': 'l-equipage-du-roux', 'roger pirates': 'l-equipage-des-pirates-roger',
  'whitebeard pirates': 'l-equipage-de-barbe-blanche', 'blackbeard pirates': 'l-equipage-de-barbe-noire',
  'donquixote pirates': 'l-equipage-de-don-quichotte', 'kid pirates': 'l-equipage-de-kid',
  'heart pirates': 'l-equipage-du-hearth', 'sun pirates': 'l-equipage-des-pirates-du-soleil',
  'foxy pirates': 'l-equipage-de-foxy', 'arlong pirates': 'l-equipage-d-arlong',
  'buggy pirates': 'l-equipage-du-clown', 'alvida pirates': 'l-equipage-d-alvida',
  'rumbar pirates': 'l-equipage-du-rumbar', 'kuja pirates': 'l-equipage-des-kuja',
};
const nameToEntry = new Map();
const slugToEntry = new Map();
for (const e of data.entries) if (e.universe === UNIVERSE) {
  nameToEntry.set(norm(e.name), e);
  slugToEntry.set(e.slug, e);
  if (e.attributes?.roman_name) nameToEntry.set(norm(e.attributes.roman_name), e);
}
const resolve = (name) => {
  const k = norm(name);
  if (SLUG_ALIASES[k] && slugToEntry.has(SLUG_ALIASES[k])) return slugToEntry.get(SLUG_ALIASES[k]);
  return nameToEntry.get(k) || null;
};

const mined = [];
const unresolved = { fruit: new Map(), aff: new Map() };
const stat = { height_cm: 0, devil_fruit: 0, devil_fruit_type: 0, rel_appartient: 0, rel_reside: 0, rel_famille: 0, rel_fruit: 0, dropped: 0 };
const typeHist = {};
for (const e of withDesc) {
  const m = extract(e);
  if (!m) continue;
  if (m.attrs.height_cm) stat.height_cm++;
  if (m.attrs.devil_fruit) stat.devil_fruit++;
  if (m.attrs.devil_fruit_type) { stat.devil_fruit_type++; typeHist[m.attrs.devil_fruit_type] = (typeHist[m.attrs.devil_fruit_type] || 0) + 1; }
  // Résout + retype + filtre les relations.
  const kept = [];
  for (const r of m.rels) {
    const tgt = resolve(r.toName);
    if (!tgt) {
      const bag = unresolved[r._kind === 'fruit' ? 'fruit' : 'aff'];
      bag.set(r.toName, (bag.get(r.toName) || 0) + 1);
      stat.dropped++;
      continue;
    }
    if (tgt.slug === e.slug) { stat.dropped++; continue; } // pas d'auto-relation
    // Relations alignées sur le vocabulaire UI (RELATION_LABELS) : perso→fruit = maîtrise, perso→lieu = habite.
    if (r._kind === 'fruit') { r.relation = 'maitrise'; stat.rel_fruit++; }
    else if (r._kind === 'aff') { r.relation = tgt.type === 'place' ? 'habite' : 'appartient'; r.relation === 'habite' ? stat.rel_reside++ : stat.rel_appartient++; }
    else stat.rel_famille++;
    kept.push({ relation: r.relation, to: tgt.slug, toName: tgt.name, role: r.role || undefined, note: r.note || undefined });
  }
  m.rels = kept;
  if (Object.keys(m.attrs).length || kept.length) mined.push(m);
}

// Delta : combien de ces attributs sont NOUVEAUX (pas déjà dans le graphe) ?
const alreadyHeight = withDesc.filter((e) => e.attributes.height || e.attributes.height_cm).length;
const alreadyCrew = opChars.filter((e) => e.attributes?.crew).length;

console.log(`\n=== PILOTE MINING One Piece (dry-run) ===`);
console.log(`Persos OP : ${opChars.length} | avec descRaw : ${withDesc.length} | ayant produit ≥1 fait : ${mined.length}`);
console.log(`\nAttributs extraits :`);
console.log(`  height_cm        : ${stat.height_cm}  (attr 'crew' déjà présent sur ${alreadyCrew}, height quasi 0 avant)`);
console.log(`  devil_fruit      : ${stat.devil_fruit}`);
console.log(`  devil_fruit_type : ${stat.devil_fruit_type}  → ${JSON.stringify(typeHist)}  ← AXE DE POUVOIR SIGNATURE`);
console.log(`\nRelations extraites (cibles RÉSOLUES contre le graphe) :`);
console.log(`  appartient (équipage/faction) : ${stat.rel_appartient}`);
console.log(`  réside (lieu)                 : ${stat.rel_reside}`);
console.log(`  mange-fruit                   : ${stat.rel_fruit}`);
console.log(`  parenté (famille)             : ${stat.rel_famille}`);
console.log(`  ignorées (cible introuvable)  : ${stat.dropped}`);
const topUnres = (bag) => [...bag.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}×${v}`).join(', ');
console.log(`\nTop cibles NON résolues (à créer/mapper plus tard) :`);
console.log(`  affiliations : ${topUnres(unresolved.aff)}`);
console.log(`  fruits       : ${topUnres(unresolved.fruit)}`);

if (SHOW) {
  console.log(`\n=== ${SHOW} exemples ===`);
  for (const m of mined.slice(0, SHOW)) {
    console.log(`\n• ${m.name} (${m.slug})`);
    if (Object.keys(m.attrs).length) console.log(`   attrs: ${JSON.stringify(m.attrs)}`);
    for (const r of m.rels) console.log(`   rel:  ${r.relation} → ${r.toName} (${r.to})${r.role ? ' ['+r.role+']' : ''}${r.note ? ' ('+r.note+')' : ''}`);
  }
}

writeFileSync('data/akasha-op-mined.json', JSON.stringify({ universe: UNIVERSE, stat, typeHist, mined }, null, 1));
console.log(`\n✓ rapport → data/akasha-op-mined.json (${mined.length} fiches minées)`);

// ── APPLY : écrit en base (MERGE des attributs sans écraser + upsert des relations). ──
// À lancer sur données PROPRES (après rebuild final + reseed) : node --env-file=.env.local scripts/mine-op-descraw.mjs --apply
if (process.argv.includes('--apply')) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('✗ env Supabase manquant (--env-file=.env.local)'); process.exit(1); }
  const h = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  const rows = await (await fetch(`${url}/rest/v1/akasha_entries?universe=eq.${encodeURIComponent(UNIVERSE)}&select=id,slug,attributes`, { headers: h })).json();
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));
  const attrsBySlug = new Map(rows.map((r) => [r.slug, r.attributes || {}]));
  // 1) MERGE des attributs (n'écrase JAMAIS une valeur existante du build).
  let upd = 0;
  for (const m of mined) {
    if (!Object.keys(m.attrs).length) continue;
    const cur = attrsBySlug.get(m.slug); if (!cur) continue;
    const merged = { ...cur }; let changed = false;
    for (const [k, v] of Object.entries(m.attrs)) if (merged[k] == null || merged[k] === '') { merged[k] = v; changed = true; }
    if (!changed) continue;
    const r = await fetch(`${url}/rest/v1/akasha_entries?slug=eq.${encodeURIComponent(m.slug)}`, { method: 'PATCH', headers: h, body: JSON.stringify({ attributes: merged }) });
    if (r.ok) upd++;
  }
  // 2) Relations (résolues en ids, dédoublonnées, upsert).
  const relRows = []; const seen = new Set();
  for (const m of mined) for (const r of m.rels) {
    const from = idBySlug.get(m.slug), to = idBySlug.get(r.to);
    if (!from || !to || from === to) continue;
    const k = `${from}|${r.relation}|${to}`; if (seen.has(k)) continue; seen.add(k);
    relRows.push({ from_entry: from, to_entry: to, relation: r.relation });
  }
  let relOk = 0;
  for (let i = 0; i < relRows.length; i += 200) {
    const r = await fetch(`${url}/rest/v1/akasha_relations?on_conflict=from_entry,to_entry,relation`, { method: 'POST', headers: { ...h, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(relRows.slice(i, i + 200)) });
    if (r.ok) relOk += relRows.slice(i, i + 200).length;
    else console.warn('  ⚠ relations chunk:', r.status, (await r.text()).slice(0, 120));
  }
  console.log(`✓ APPLY : ${upd} fiches enrichies (attributs mergés), ${relOk}/${relRows.length} relations upsertées`);
} else {
  console.log('(pas d\'--apply : aucune écriture DB)');
}
