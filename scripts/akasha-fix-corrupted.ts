// scripts/akasha-fix-corrupted.ts — corrige les 11 fiches Naruto qui affichent un message
// d'erreur d'API brut (validation de schéma) au lieu d'une vraie donnée, et supprime les 3
// entités de test de l'univers orphelin "Histoire / réel". Idempotent. Run :
//   PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/akasha-fix-corrupted.ts [--write]
import { createClient } from '@supabase/supabase-js';

const WRITE = process.argv.includes('--write');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(url, key);

// Le texte utile est TOUJOURS avant la première guillemet de la répétition d'erreur JSON
// (ex. `Personnage de l'univers Naruto — Enka Ninja"Enka Ninja" is not in the list...`) →
// on garde le préfixe propre, qui reste une phrase lisible.
function cleanCorrupted(s: string, addPeriod = true): string {
  const i = s.indexOf('"');
  let out = (i === -1 ? s : s.slice(0, i)).trim();
  if (addPeriod && out && !/[.!?]$/.test(out)) out += '.';
  return out;
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function main() {
  const summarySlugs = ['sabu', 'hinoki', 'chibi-naruto', 'manda-ii', 'himeyuri', 'raimei', 'suzuran', 'makibi', 'nazuna'];
  const { data: rows, error } = await sb.from('akasha_entries').select('id,slug,name,summary,description').in('slug', summarySlugs);
  if (error) throw error;

  console.log('=== Résumés corrompus (9) ===');
  for (const r of rows ?? []) {
    const cleaned = cleanCorrupted(r.summary as string);
    console.log(r.slug, '→', JSON.stringify(cleaned));
    if (WRITE) {
      const patch: Record<string, unknown> = { summary: cleaned };
      if (r.description === r.summary) patch.description = cleaned; // même corruption dupliquée
      await sb.from('akasha_entries').update(patch).eq('id', r.id);
    }
  }

  console.log('=== Noms corrompus (2) ===');
  const { data: badNames, error: e2 } = await sb.from('akasha_entries')
    .select('id,slug,name,summary,description,universe,type')
    .eq('universe', 'Naruto').ilike('name', '%is not in the list%');
  if (e2) throw e2;
  const { data: existing } = await sb.from('akasha_entries').select('slug');
  const usedSlugs = new Set((existing ?? []).map((e) => e.slug as string));

  for (const r of badNames ?? []) {
    const cleanName = cleanCorrupted(r.name as string, false);
    let newSlug = slugify(cleanName);
    if (usedSlugs.has(newSlug) && newSlug !== r.slug) newSlug = `${newSlug}-${(r.type as string).slice(0, 3)}`;
    usedSlugs.add(newSlug);
    const cleanSummary = typeof r.summary === 'string' && r.summary.includes('is not in the list') ? cleanCorrupted(r.summary) : r.summary;
    console.log(r.slug, '→ slug:', newSlug, '| name:', JSON.stringify(cleanName), '| summary:', JSON.stringify(cleanSummary));
    if (WRITE) {
      const patch: Record<string, unknown> = { name: cleanName, slug: newSlug, summary: cleanSummary };
      if (r.description === r.summary) patch.description = cleanSummary;
      await sb.from('akasha_entries').update(patch).eq('id', r.id);
    }
  }

  console.log('=== Univers de test "Histoire / réel" (3 entités) ===');
  const { data: testRows, error: e3 } = await sb.from('akasha_entries').select('id,slug,name').eq('universe', 'Histoire / réel');
  if (e3) throw e3;
  for (const r of testRows ?? []) console.log(r.slug, r.name);
  if (WRITE && testRows?.length) {
    const ids = testRows.map((r) => r.id);
    await sb.from('akasha_relations').delete().in('from_entry', ids);
    await sb.from('akasha_relations').delete().in('to_entry', ids);
    await sb.from('akasha_entries').delete().in('id', ids);
  }

  console.log(WRITE ? '✓ écrit en base' : '(dry-run — relancer avec --write)');
}
main();
