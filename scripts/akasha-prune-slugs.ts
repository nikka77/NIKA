// scripts/akasha-prune-slugs.ts — supprime des entités AKASHA obsolètes de Supabase (par slug),
// + les relations qui les référencent. Ciblé (PAS un prune global — Naruto & co. sont seedés ailleurs).
// Run: PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/akasha-prune-slugs.ts
import { createClient } from '@supabase/supabase-js';

// Slugs obsolètes à retirer de Supabase (seed = upsert-only, ne supprime pas).
const SLUGS = [
  'grand-pretre', // doublon de daishinkan (Grand Prêtre / Daishinkan)
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('✗ env manquantes (--env-file=.env.local).'); process.exit(1); }
const sb = createClient(url, key);

async function main() {
  const { data: rows, error: e1 } = await sb.from('akasha_entries').select('id, slug').in('slug', SLUGS);
  if (e1) { console.error('✗ select:', e1.message); process.exit(1); }
  const ids = (rows ?? []).map((r) => r.id);
  console.log(`Entités trouvées à supprimer : ${ids.length} / ${SLUGS.length}`);
  if (ids.length) {
    await sb.from('akasha_relations').delete().in('from_entry', ids);
    await sb.from('akasha_relations').delete().in('to_entry', ids);
    const { data: del, error: e2 } = await sb.from('akasha_entries').delete().in('slug', SLUGS).select('slug');
    if (e2) { console.error('✗ delete:', e2.message); process.exit(1); }
    console.log(`✓ supprimées : ${del?.length ?? 0} — ${(del ?? []).map((d) => d.slug).join(', ')}`);
  }
}
main();
