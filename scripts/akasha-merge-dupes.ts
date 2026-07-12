// scripts/akasha-merge-dupes.ts — fusionne les 6 paires de doublons stricts identifiées par
// l'audit (deux passes de seed différentes). Repointe TOUTES les relations du slug supprimé vers
// le slug conservé (en dédupliquant si une relation équivalente existe déjà), puis supprime
// l'entité en trop. Idempotent (relançable sans effet si déjà fusionné). Run :
//   PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/akasha-merge-dupes.ts [--write]
import { createClient } from '@supabase/supabase-js';

const WRITE = process.argv.includes('--write');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// [slug à GARDER, slug à SUPPRIMER]
const PAIRS: [string, string][] = [
  ['getsuga-tensho', 'atk-bl-getsuga-tensho'],
  ['kaio-ken', 'atk-db-kaio-ken'],
  ['kamehameha', 'atk-db-kamehameha'],
  ['kusanagi', 'sabre-de-kusanagi'],
  ['bankai', 'atk-bl-bankai'],
  ['garlic-junior', 'garlic-jr'],
  ['mary-geoise', 'mary-geoise-op'],
];

async function mergeOne(keepSlug: string, dropSlug: string) {
  const { data: rows } = await sb.from('akasha_entries').select('id,slug,name').in('slug', [keepSlug, dropSlug]);
  const keep = rows?.find((r) => r.slug === keepSlug);
  const drop = rows?.find((r) => r.slug === dropSlug);
  if (!keep) { console.log(`⚠ ${keepSlug}: introuvable, ignoré`); return; }
  if (!drop) { console.log(`✓ ${dropSlug}: déjà fusionné/absent`); return; }

  const { data: outRel } = await sb.from('akasha_relations').select('id,relation,to_entry').eq('from_entry', drop.id);
  const { data: inRel } = await sb.from('akasha_relations').select('id,relation,from_entry').eq('to_entry', drop.id);
  const { data: keepOut } = await sb.from('akasha_relations').select('relation,to_entry').eq('from_entry', keep.id);
  const { data: keepIn } = await sb.from('akasha_relations').select('relation,from_entry').eq('to_entry', keep.id);
  const keepOutSet = new Set((keepOut ?? []).map((r) => `${r.relation}:${r.to_entry}`));
  const keepInSet = new Set((keepIn ?? []).map((r) => `${r.relation}:${r.from_entry}`));

  let moved = 0, dupSkipped = 0;
  for (const r of outRel ?? []) {
    const k = `${r.relation}:${r.to_entry}`;
    if (keepOutSet.has(k) || r.to_entry === keep.id) { if (WRITE) await sb.from('akasha_relations').delete().eq('id', r.id); dupSkipped++; }
    else { if (WRITE) await sb.from('akasha_relations').update({ from_entry: keep.id }).eq('id', r.id); moved++; }
  }
  for (const r of inRel ?? []) {
    const k = `${r.relation}:${r.from_entry}`;
    if (keepInSet.has(k) || r.from_entry === keep.id) { if (WRITE) await sb.from('akasha_relations').delete().eq('id', r.id); dupSkipped++; }
    else { if (WRITE) await sb.from('akasha_relations').update({ to_entry: keep.id }).eq('id', r.id); moved++; }
  }

  console.log(`${keepSlug} ← ${dropSlug} : ${moved} relations repointées, ${dupSkipped} doublons supprimés`);
  if (WRITE) await sb.from('akasha_entries').delete().eq('id', drop.id);
}

async function main() {
  for (const [keep, drop] of PAIRS) await mergeOne(keep, drop);
  console.log(WRITE ? '✓ fusions écrites' : '(dry-run — relancer avec --write)');
}
main();
