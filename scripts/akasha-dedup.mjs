// scripts/akasha-dedup.mjs — fusionne les entités doublons d'AKASHA (même univers + type + nom normalisé).
// Cause : build-akasha-universes.mjs suffixe le slug par univers en cas de collision (curé vs miné) → 2 entités
// du même nom, tous types SAUF character (déjà géré par dedupeChars). On garde le « primaire » (le plus référencé,
// sans suffixe), on y fusionne les champs manquants, on repointe les relations, on supprime les redondants.
// Réutilisable (import { dedupeByName }) + CLI. Usage : node scripts/akasha-dedup.mjs [--write]
import fs from 'node:fs';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Dédoublonne entries par (universe|type|nom normalisé) ; repointe relations. Retourne {entries, relations, removed}. */
export function dedupeByName(entries, relations = []) {
  const refCount = (slug) => relations.filter((r) => r.from === slug || r.to === slug).length;
  const groups = new Map();
  for (const e of entries) { const k = `${e.universe}|${e.type}|${norm(e.name)}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }

  const remap = new Map();
  for (const [, g] of groups) {
    if (g.length < 2) continue;
    g.sort((a, b) => refCount(b.slug) - refCount(a.slug) || (a.slug.length - b.slug.length) || ((b.summary || '').length - (a.summary || '').length));
    const keep = g[0];
    for (const e of g.slice(1)) {
      if (!keep.image_url && e.image_url) keep.image_url = e.image_url;
      if (!keep.summary && e.summary) { keep.summary = e.summary; keep.description = e.description || e.summary; }
      keep.attributes = { ...(e.attributes || {}), ...(keep.attributes || {}) };
      remap.set(e.slug, keep.slug);
    }
  }

  let newRels = relations.map((r) => ({ ...r, from: remap.get(r.from) || r.from, to: remap.get(r.to) || r.to })).filter((r) => r.from !== r.to);
  const seen = new Set();
  newRels = newRels.filter((r) => { const k = `${r.from}|${r.to}|${r.relation}`; if (seen.has(k)) return false; seen.add(k); return true; });

  return { entries: entries.filter((e) => !remap.has(e.slug)), relations: newRels, removed: [...remap.keys()] };
}

// ── CLI ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const WRITE = process.argv.includes('--write');
  const P = 'data/akasha-universes.json';
  const d = JSON.parse(fs.readFileSync(P, 'utf8'));
  const r = dedupeByName(d.entries, d.relations || []);
  console.log(`Entités: ${d.entries.length} → ${r.entries.length} (−${r.removed.length})`);
  console.log(`Relations: ${(d.relations || []).length} → ${r.relations.length}`);
  console.log('Supprimés:', r.removed.join(', ') || '(aucun)');
  if (WRITE) { d.entries = r.entries; d.relations = r.relations; fs.writeFileSync(P, JSON.stringify(d, null, 2)); console.log('✓ écrit', P); }
  else console.log('(rapport seul — --write pour appliquer)');
}
