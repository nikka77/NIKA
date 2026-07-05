// scripts/seed-akasha-attacks.ts — ingère data/akasha-attacks.json (attaques/techniques nommées via
// Fandom + curation) dans le registre AKASHA. ADDITIF : crée les entités technique (type 'power') et
// les relations perso→technique ('maitrise'). Les `from` des relations sont des personnages DÉJÀ en base
// (One Piece / Dragon Ball / Bleach) → on récupère leurs ids avant d'upserter les relations.
// Run:      PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/seed-akasha-attacks.ts
// Dry-run:  PATH="/opt/homebrew/bin:$PATH" npx tsx scripts/seed-akasha-attacks.ts --dry-run
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { akashaEntrySchema, akashaRelationSeedSchema } from '../lib/akasha/schema';

const DRY = process.argv.includes('--dry-run');
const raw = JSON.parse(readFileSync(join(process.cwd(), 'data/akasha-attacks.json'), 'utf8')) as {
  entries?: unknown[]; entities?: unknown[]; relations: unknown[];
};
const rawEntities = raw.entities ?? raw.entries ?? [];

const entities = rawEntities.map((e, i) => {
  const parsed = akashaEntrySchema.safeParse(e);
  if (!parsed.success) {
    console.error(`✗ entité #${i} (${(e as { slug?: string }).slug}) invalide:`, parsed.error.issues);
    process.exit(1);
  }
  return parsed.data;
});
const relations = raw.relations.map((r) => akashaRelationSeedSchema.parse(r));
console.log(`✓ validation OK : ${entities.length} techniques, ${relations.length} relations`);

if (DRY) {
  const byU: Record<string, number> = {};
  for (const e of entities) byU[e.universe] = (byU[e.universe] || 0) + 1;
  console.log('  par univers:', JSON.stringify(byU));
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
  // 1) Upsert des techniques → ids.
  const { data: rows, error } = await sb
    .from('akasha_entries')
    .upsert(entities, { onConflict: 'slug' })
    .select('id, slug');
  if (error) { console.error('✗ entities:', error.message); process.exit(1); }
  const idBySlug = new Map((rows ?? []).map((r) => [r.slug as string, r.id as string]));
  console.log(`✓ ${rows?.length ?? 0} techniques upsertées`);

  // 2) Récupérer les ids des PERSONNAGES ciblés par les relations (déjà en base). Par lots de 200.
  const charSlugs = [...new Set(relations.map((r) => r.from))].filter((s) => !idBySlug.has(s));
  for (let i = 0; i < charSlugs.length; i += 200) {
    const chunk = charSlugs.slice(i, i + 200);
    const { data: cs, error: cErr } = await sb.from('akasha_entries').select('id, slug').in('slug', chunk);
    if (cErr) { console.error('✗ lookup persos:', cErr.message); process.exit(1); }
    for (const r of cs ?? []) idBySlug.set(r.slug as string, r.id as string);
  }
  const missing = charSlugs.filter((s) => !idBySlug.has(s));
  if (missing.length) console.warn(`  ⚠ ${missing.length} persos introuvables (relations ignorées): ${missing.slice(0, 8).join(', ')}`);

  // 3) Upsert des relations (dédoublonnées, extrémités résolues).
  const seenRel = new Set<string>();
  const relRows = relations
    .map((r) => {
      const from_entry = idBySlug.get(r.from);
      const to_entry = idBySlug.get(r.to);
      if (!from_entry || !to_entry || from_entry === to_entry) return null;
      const k = `${from_entry}|${r.relation}|${to_entry}`;
      if (seenRel.has(k)) return null;
      seenRel.add(k);
      return { from_entry, to_entry, relation: r.relation };
    })
    .filter((x): x is { from_entry: string; to_entry: string; relation: string } => x !== null);

  if (relRows.length) {
    const { data: rel, error: relErr } = await sb
      .from('akasha_relations')
      .upsert(relRows, { onConflict: 'from_entry,to_entry,relation' })
      .select('id');
    if (relErr) { console.error('✗ relations:', relErr.message); process.exit(1); }
    console.log(`✓ ${rel?.length ?? relRows.length} relations upsertées`);
  }
  console.log('✦ Seed AKASHA attaques terminé.');
}

main().catch((e) => { console.error('✗ seed-akasha-attacks:', e); process.exit(1); });
