// scripts/akasha-prune-slugs.ts — supprime des entités AKASHA obsolètes de Supabase (par slug),
// + les relations qui les référencent. Ciblé (PAS un prune global — Naruto & co. sont seedés ailleurs).
// Run: PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/akasha-prune-slugs.ts
import { createClient } from '@supabase/supabase-js';

// Doublons (curé vs miné) désormais fusionnés dans data/akasha-universes.json — à retirer de la base.
const SLUGS = [
  'espada-bleach', 'namek-dragon-ball', 'zoldyck-hunter-x-hunter',
  'mont-akina-initial-d', 'mont-akagi-initial-d', 'mont-myogi-initial-d',
  'thousand-sunny-one-piece', 'marine-one-piece', 'fruit-de-la-chaleur-one-piece',
  'fruit-du-felin-version-tigre-a-dents-de-sabre-one-piece', 'fruit-de-la-dissolution-one-piece',
  'alabasta-one-piece', 'ile-des-hommes-poissons-one-piece', 'corbeau-one-piece',
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
