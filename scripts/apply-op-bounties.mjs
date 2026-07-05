// scripts/apply-op-bounties.mjs — applique data/op-bounties-curated.json à data/akasha-universes.json
// SANS relancer le build complet (qui re-fetch toutes les API). Même logique que le post-pass du build :
// override canon curé (slug → entier Berrys) + normalisation du format des primes existantes.
// Ensuite : reseed via scripts/seed-akasha-universes.ts pour propager en base (runtime = Supabase).
//   PATH="/opt/homebrew/bin:$PATH" node scripts/apply-op-bounties.mjs [--dry-run]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DRY = process.argv.includes('--dry-run');
const DATA = 'data/akasha-universes.json';
const CURATED = 'data/op-bounties-curated.json';

if (!existsSync(CURATED)) { console.error(`✗ ${CURATED} manquant.`); process.exit(1); }
const overrides = JSON.parse(readFileSync(CURATED, 'utf8'));
const doc = JSON.parse(readFileSync(DATA, 'utf8'));
const entries = doc.entries || [];

const fmtBerrys = (n) => `${Number(n).toLocaleString('de-DE')} Berrys`;
const slugSeen = new Set(entries.filter((e) => e.universe === 'One Piece' && e.type === 'character').map((e) => e.slug));

// Garde-fou : tout slug curé doit exister en base (sinon faute de frappe → prime perdue).
const missing = Object.keys(overrides).filter((s) => !s.startsWith('_') && !slugSeen.has(s));
if (missing.length) console.warn(`⚠ ${missing.length} slug(s) curé(s) absent(s) du registre OP :`, missing.join(', '));

const added = [], fixed = [], normalized = [];
for (const e of entries) {
  if (e.universe !== 'One Piece' || e.type !== 'character') continue;
  if (overrides[e.slug] != null) {
    const before = e.attributes.bounty ?? null;
    const after = fmtBerrys(overrides[e.slug]);
    if (before == null) added.push(`${e.slug} → ${after}`);
    else if (before !== after) fixed.push(`${e.slug} : ${before} → ${after}`);
    e.attributes.bounty = after;
  } else if (e.attributes.bounty != null) {
    const v = parseInt(String(e.attributes.bounty).replace(/[^\d]/g, ''), 10);
    if (v > 0) { const f = fmtBerrys(v); if (f !== e.attributes.bounty) { normalized.push(`${e.slug} : ${e.attributes.bounty} → ${f}`); e.attributes.bounty = f; } }
  }
}

console.log(`\n── AJOUTÉES (${added.length}) ──`); added.forEach((l) => console.log('  + ' + l));
console.log(`\n── CORRIGÉES (${fixed.length}) ──`); fixed.forEach((l) => console.log('  ~ ' + l));
console.log(`\n── FORMAT NORMALISÉ (${normalized.length}) ──`); normalized.forEach((l) => console.log('  · ' + l));

const total = entries.filter((e) => e.universe === 'One Piece' && e.type === 'character' && e.attributes.bounty != null).length;
console.log(`\n✦ Primes OP après application : ${total} têtes mises à prix.`);

if (DRY) { console.log('· dry-run : data/akasha-universes.json non modifié.'); process.exit(0); }
// Écrit minifié (single-line) pour coller au format committé (diff minimal, pas de reformat massif).
writeFileSync(DATA, JSON.stringify(doc));
console.log(`✓ ${DATA} écrit. Reseed : PATH=… npx tsx --env-file=.env.local scripts/seed-akasha-universes.ts`);
