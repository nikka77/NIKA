// scripts/akasha-apply-missing-images.ts — applique les URLs Fandom trouvées (Niveau 2 #15)
// aux entités sans image_url (30 artefacts DB, 3 lieux JoJo, 4 HxH, 2 Death Note, 2 OP).
// Run : PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/akasha-apply-missing-images.ts [--write]
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const WRITE = process.argv.includes('--write');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const urls: Record<string, string> = JSON.parse(
  readFileSync('/private/tmp/claude-501/-Users-macbookprom1pro-Library-Mobile-Documents-com-apple-CloudDocs-NIKA/73519b13-c4e5-440f-b8a2-232885609da2/scratchpad/akasha_image_urls.json', 'utf8')
);

// [slug, titre Fandom]
const MAP: [string, string][] = [
  ['anneau-du-temps', 'Time Ring'],
  ['armure-saiyan', 'Battle Armor'],
  ['baton-magique', 'Power Pole'],
  ['mafuba-flacon', 'Evil Containment Wave'],
  ['cape-turban-piccolo', 'Weighted Clothing'],
  ['capsule-hoi-poi', 'Capsule'],
  ['dogi-ecole-tortue', 'Turtle School Uniform'],
  ['dragon-balls-de-namek', 'Namekian Dragon Ball'],
  ['eau-ultra-divine', 'Ultra Divine Water'],
  ['epee-de-lespoir', 'Sword of Hope'],
  ['epee-de-trunks', 'Brave Sword'],
  ['bansho-sen', 'Bansho Fan'],
  ['graine-de-larbre-de-force', 'Tree of Might'],
  ['senzu', 'Senzu Bean'],
  ['katchin', 'Katchin'],
  ['machine-a-remonter-le-temps', 'Time Machine'],
  ['metamo-ring', 'Metamo-Ring'],
  ['kinto-un', 'Flying Nimbus'],
  ['ocarina-de-tapion', "Hero's Flute"],
  ['potara', 'Potara'],
  ['radar-dragon', 'Dragon Radar'],
  ['scouter', 'Scouter'],
  ['super-dragon-balls', 'Super Dragon Ball'],
  ['vaisseau-capsule-corp', 'Capsule Corporation Spaceship'],
  ['vaisseau-attaque-saiyan', 'Attack Ball'],
  ['veste-lestee', 'Weighted Clothing'],
  ['z-epee', 'Z Sword'],
  ['green-dolphin', 'Green Dolphin Street Prison'],
  ['morioh', 'Morioh'],
  ['greed-island', 'Greed Island'],
  ['mont-kukuru', 'Kukuroo Mountain'],
  ['ile-de-la-baleine', 'Whale Island'],
  ['tour-celeste', 'Heavens Arena'],
  ['monde-shinigami', 'Shinigami Realm'],
  ['wammys-house', "The Wammy's House"],
  ['laugh-tale', 'Laugh Tale'],
  ['mary-geoise', 'Mary Geoise'],
];

async function main() {
  let ok = 0, missing = 0, notFound = 0;
  for (const [slug, title] of MAP) {
    const url = urls[title];
    if (!url) { console.log(`⚠ pas d'URL pour ${slug} (${title})`); missing++; continue; }
    const { data: rows } = await sb.from('akasha_entries').select('id,image_url').eq('slug', slug);
    const row = rows?.[0];
    if (!row) { console.log(`⚠ slug introuvable en base : ${slug}`); notFound++; continue; }
    if (row.image_url) { console.log(`✓ ${slug} : déjà une image, ignoré`); continue; }
    console.log(`${WRITE ? '→' : '(dry)'} ${slug} = ${url}`);
    if (WRITE) await sb.from('akasha_entries').update({ image_url: url }).eq('id', row.id);
    ok++;
  }
  console.log(`\n${ok} appliquées, ${missing} sans URL, ${notFound} slugs introuvables.`);
  console.log(WRITE ? '✓ écrit en base' : '(dry-run — relancer avec --write)');

  const dropped = ['dragon-balls', 'boule-4-etoiles', 'dragon-balls-etoile-noire', 'le-caire'];
  console.log(`\nSans image (aucune page Fandom fiable trouvée) : ${dropped.join(', ')}`);
}
main();
