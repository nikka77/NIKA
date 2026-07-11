// scripts/akasha-apply-enrich.mjs — applique les deltas d'enrichissement (data/akasha-enrich.mjs)
// directement sur data/akasha-universes.json (réseau-free), avant reseed. Idempotent (skip si déjà présent).
import fs from 'node:fs';
import { applyEnrichment, OP_PLACES, DB_ARTIFACTS } from '../data/akasha-enrich.mjs';

const P = 'data/akasha-universes.json';
const d = JSON.parse(fs.readFileSync(P, 'utf8'));
const before = d.entries.length;

// Rapport de collision (slugs curés déjà pris par une autre entité)
const existing = new Set(d.entries.map((e) => e.slug));
const collided = [...OP_PLACES, ...DB_ARTIFACTS].map((t) => t[0]).filter((s) => existing.has(s));
if (collided.length) console.log('ℹ slugs homonymes déjà pris → ajoutés avec suffixe -lieu/-relique:', collided.join(', '));

const r = applyEnrichment(d.entries);
fs.writeFileSync(P, JSON.stringify(d, null, 2));

const by = (f) => d.entries.filter(f).length;
console.log(`✓ entités ajoutées: ${r.added} (${before} → ${d.entries.length})`);
console.log(`✓ tags posés: nen=${r.nen} · saga=${r.saga} · race=${r.race}`);
console.log('  OP places:', by((e) => e.universe === 'One Piece' && e.type === 'place'),
            '· DB artifacts:', by((e) => e.universe === 'Dragon Ball' && e.type === 'artifact'));
const tally = (uni, key) => { const m = {}; for (const e of d.entries) if (e.universe === uni && e.attributes?.[key]) m[e.attributes[key]] = (m[e.attributes[key]] || 0) + 1; return m; };
console.log('  HxH nen:', tally('Hunter x Hunter', 'nen'));
console.log('  DB saga:', tally('Dragon Ball', 'saga'));
console.log('  Bleach race:', tally('Bleach', 'race'));
