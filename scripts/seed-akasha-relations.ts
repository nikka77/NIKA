// scripts/seed-akasha-relations.ts — seed ADDITIF de relations dont les DEUX extrémités existent déjà
// en base (liens perso→Fruit, perso→technique…). Lit un ou plusieurs JSON { relations: [{from,to,relation}] }
// (slugs), résout tous les slugs → ids, upsert idempotent. Ne crée aucune entité.
// Run: PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/seed-akasha-relations.ts data/akasha-op-links.json data/akasha-attacks-users.json
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { akashaRelationSeedSchema } from '../lib/akasha/schema';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!files.length) { console.error('✗ usage: seed-akasha-relations.ts <fichier.json> [...]'); process.exit(1); }

const relations = [];
for (const f of files) {
  if (!existsSync(f)) { console.warn(`  ⚠ ${f} absent, ignoré`); continue; }
  const raw = JSON.parse(readFileSync(f, 'utf8')) as { relations: unknown[] };
  for (const r of raw.relations || []) relations.push(akashaRelationSeedSchema.parse(r));
  console.log(`  ${f} : ${(raw.relations || []).length} relations`);
}
console.log(`✓ ${relations.length} relations à seeder`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('✗ env Supabase manquant (--env-file=.env.local).'); process.exit(1); }
const sb = createClient(url, key);

async function main() {
  const slugs = [...new Set(relations.flatMap((r) => [r.from, r.to]))];
  const idBySlug = new Map<string, string>();
  for (let i = 0; i < slugs.length; i += 300) {
    const { data, error } = await sb.from('akasha_entries').select('id, slug').in('slug', slugs.slice(i, i + 300));
    if (error) { console.error('✗ lookup:', error.message); process.exit(1); }
    for (const r of data ?? []) idBySlug.set(r.slug as string, r.id as string);
  }
  const missing = slugs.filter((s) => !idBySlug.has(s));
  if (missing.length) console.warn(`  ⚠ ${missing.length} slugs absents (relations ignorées): ${missing.slice(0, 8).join(', ')}`);

  const seen = new Set<string>();
  const rows = relations
    .map((r) => {
      const from_entry = idBySlug.get(r.from), to_entry = idBySlug.get(r.to);
      if (!from_entry || !to_entry || from_entry === to_entry) return null;
      const k = `${from_entry}|${r.relation}|${to_entry}`;
      if (seen.has(k)) return null; seen.add(k);
      return { from_entry, to_entry, relation: r.relation };
    })
    .filter((x): x is { from_entry: string; to_entry: string; relation: string } => x !== null);

  let ok = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await sb.from('akasha_relations').upsert(rows.slice(i, i + 500), { onConflict: 'from_entry,to_entry,relation' }).select('id');
    if (error) { console.error('✗ relations:', error.message); process.exit(1); }
    ok += data?.length ?? 0;
  }
  console.log(`✓ ${ok} relations upsertées (sur ${rows.length} valides)`);
}
main().catch((e) => { console.error('✗ seed-akasha-relations:', e); process.exit(1); });
