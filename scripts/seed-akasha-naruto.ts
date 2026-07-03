// scripts/seed-akasha-naruto.ts — ingère data/akasha-naruto.json dans le registre AKASHA.
// Le JSON est généré par scripts/build-akasha-naruto.mjs (faits + images Dattebayo API, résumés FR maison).
// Validation Zod (par type) avant écriture. Idempotent (upsert par slug / triplet de relation).
// Run:      PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/seed-akasha-naruto.ts
// Dry-run:  PATH="/opt/homebrew/bin:$PATH" npx tsx scripts/seed-akasha-naruto.ts --dry-run   (valide seulement)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { akashaEntrySchema, akashaRelationSeedSchema } from '../lib/akasha/schema';

const DRY = process.argv.includes('--dry-run');
const raw = JSON.parse(readFileSync(join(process.cwd(), 'data/akasha-naruto.json'), 'utf8')) as {
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
  // Upserts par LOTS : l'import de masse dépasse 1 000 entrées — un payload unique serait fragile.
  const CHUNK = 200;
  const idBySlug = new Map<string, string>();
  for (let i = 0; i < entries.length; i += CHUNK) {
    const { data: rows, error } = await sb
      .from('akasha_entries')
      .upsert(entries.slice(i, i + CHUNK), { onConflict: 'slug' })
      .select('id, slug');
    if (error) {
      console.error(`✗ entries (lot ${Math.floor(i / CHUNK) + 1}):`, error.message);
      process.exit(1);
    }
    for (const r of rows ?? []) idBySlug.set(r.slug as string, r.id as string);
  }
  console.log(`✓ ${idBySlug.size} entrées upsertées`);

  const relRows = relations
    .map((r) => {
      const from_entry = idBySlug.get(r.from);
      const to_entry = idBySlug.get(r.to);
      if (!from_entry || !to_entry) {
        console.warn(`  ⚠ relation ignorée (slug introuvable): ${r.from} → ${r.to}`);
        return null;
      }
      return { from_entry, to_entry, relation: r.relation };
    })
    .filter((x): x is { from_entry: string; to_entry: string; relation: string } => x !== null);

  let relCount = 0;
  for (let i = 0; i < relRows.length; i += CHUNK) {
    const { data: rel, error: relErr } = await sb
      .from('akasha_relations')
      .upsert(relRows.slice(i, i + CHUNK), { onConflict: 'from_entry,to_entry,relation' })
      .select('id');
    if (relErr) {
      console.error(`✗ relations (lot ${Math.floor(i / CHUNK) + 1}):`, relErr.message);
      process.exit(1);
    }
    relCount += rel?.length ?? 0;
  }
  if (relRows.length) console.log(`✓ ${relCount} relations upsertées`);

  console.log('✦ Seed AKASHA Naruto terminé.');
}

main().catch((e) => {
  console.error('✗ seed-akasha-naruto:', e);
  process.exit(1);
});
