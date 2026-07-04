// scripts/seed-akasha-universes.ts — ingère data/akasha-universes.json (7 univers : Bleach,
// Dragon Ball, Hunter x Hunter, JoJo, Initial D, Death Note, One Piece) dans le registre AKASHA.
// Le JSON est généré par scripts/build-akasha-universes.mjs (config FR curée + images Jikan/APIs dédiées).
// Validation Zod (par type) avant écriture. Idempotent (upsert par slug / triplet de relation) —
// ADDITIF : ne touche pas aux entrées Naruto.
// Run:      PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/seed-akasha-universes.ts
// Dry-run:  PATH="/opt/homebrew/bin:$PATH" npx tsx scripts/seed-akasha-universes.ts --dry-run
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { akashaEntrySchema, akashaRelationSeedSchema } from '../lib/akasha/schema';

const DRY = process.argv.includes('--dry-run');
const raw = JSON.parse(readFileSync(join(process.cwd(), 'data/akasha-universes.json'), 'utf8')) as {
  entries: unknown[];
  relations: unknown[];
};

const entries = raw.entries.map((e, i) => {
  const parsed = akashaEntrySchema.safeParse(e);
  if (!parsed.success) {
    console.error(`✗ entrée #${i} (${(e as { slug?: string }).slug}) invalide:`, parsed.error.issues);
    process.exit(1);
  }
  return parsed.data;
});
const relations = raw.relations.map((r) => akashaRelationSeedSchema.parse(r));
console.log(`✓ validation OK : ${entries.length} entrées, ${relations.length} relations`);

if (DRY) {
  const byType: Record<string, number> = {};
  for (const e of entries) byType[e.type] = (byType[e.type] || 0) + 1;
  console.log('  par type:', JSON.stringify(byType));
  console.log('· dry-run : aucune écriture en base.');
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (--env-file=.env.local).');
  process.exit(1);
}
const sb = createClient(url, key);

async function main() {
  const { data: rows, error } = await sb
    .from('akasha_entries')
    .upsert(entries, { onConflict: 'slug' })
    .select('id, slug');
  if (error) {
    console.error('✗ entries:', error.message);
    process.exit(1);
  }
  const idBySlug = new Map((rows ?? []).map((r) => [r.slug as string, r.id as string]));
  console.log(`✓ ${rows?.length ?? 0} entrées upsertées`);

  const seenRel = new Set<string>();
  const relRows = relations
    .map((r) => {
      const from_entry = idBySlug.get(r.from);
      const to_entry = idBySlug.get(r.to);
      if (!from_entry || !to_entry) {
        console.warn(`  ⚠ relation ignorée (slug introuvable): ${r.from} → ${r.to}`);
        return null;
      }
      // Dédoublonnage (from|rel|to) : un doublon dans le même chunk fait échouer l'upsert
      // Postgres (« ON CONFLICT DO UPDATE command cannot affect row a second time »).
      const k = `${from_entry}|${r.relation}|${to_entry}`;
      if (seenRel.has(k) || from_entry === to_entry) return null;
      seenRel.add(k);
      return { from_entry, to_entry, relation: r.relation };
    })
    .filter((x): x is { from_entry: string; to_entry: string; relation: string } => x !== null);

  if (relRows.length) {
    const { data: rel, error: relErr } = await sb
      .from('akasha_relations')
      .upsert(relRows, { onConflict: 'from_entry,to_entry,relation' })
      .select('id');
    if (relErr) {
      console.error('✗ relations:', relErr.message);
      process.exit(1);
    }
    console.log(`✓ ${rel?.length ?? relRows.length} relations upsertées`);
  }

  console.log('✦ Seed AKASHA univers terminé.');
}

main().catch((e) => {
  console.error('✗ seed-akasha-universes:', e);
  process.exit(1);
});
