// scripts/akasha-fix-naruto-residue.ts — nettoie les résidus de scraping restants sur Naruto :
// "Land of X" non traduit (249 fiches), fragments MediaWiki bruts "File:....svg" (8 fiches),
// affiliations placeholder cassées "Land of This/That" (4 fiches). Idempotent. Run :
//   PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/akasha-fix-naruto-residue.ts [--write]
import { createClient } from '@supabase/supabase-js';

const WRITE = process.argv.includes('--write');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const LAND_FR: Record<string, string> = {
  'Land of Fire': 'Pays du Feu', 'Land of Water': "Pays de l'Eau", 'Land of Wind': 'Pays du Vent',
  'Land of Earth': 'Pays de la Terre', 'Land of Lightning': 'Pays de la Foudre', 'Land of Snow': 'Pays de la Neige',
  'Land of Waves': 'Pays des Vagues', 'Land of Tea': 'Pays du Thé', 'Land of Iron': 'Pays du Fer',
  'Land of Vegetables': 'Pays des Légumes', 'Land of Sound': 'Pays du Son', 'Land of Rivers': 'Pays des Rivières',
  'Land of Birds': 'Pays des Oiseaux', 'Land of Hot Water': "Pays de l'Eau Chaude", 'Land of Demons': 'Pays des Démons',
  'Land of the Moon': 'Pays de la Lune', 'Land of the Sea': 'Pays de la Mer', 'Land of the Sky': 'Pays du Ciel',
  'Land of Silence': 'Pays du Silence', 'Land of Frost': 'Pays du Givre', 'Land of Honey': 'Pays du Miel',
  'Land of Noodles': 'Pays des Nouilles', 'Land of Bamboo': 'Pays du Bambou', 'Land of Fangs': 'Pays des Crocs',
  'Land of Forests': 'Pays des Forêts', 'Land of Woods': 'Pays des Bois', 'Land of Valleys': 'Pays des Vallées',
  'Land of Mountains': 'Pays des Montagnes', 'Land of Stone': 'Pays de la Pierre', 'Land of Neck': 'Pays du Cou',
  'Land of Ancestors': 'Pays des Ancêtres', 'Land of Calm Seas': 'Pays des Mers Calmes',
  'Land of Haze': 'Pays de la Brume Légère', 'Land of Redaku': 'Pays de Redaku',
};
// Trié par longueur décroissante pour que "Land of Calm Seas" matche avant un éventuel préfixe partiel.
const LAND_KEYS = Object.keys(LAND_FR).sort((a, b) => b.length - a.length);

function clean(s: string): string {
  let out = s;
  // 1) Fragments MediaWiki bruts : "File:....svg " (le nom de fichier contient des espaces,
  // ex. "File:Land of Haze Symbol.svg" → match non-greedy jusqu'au PREMIER ".svg").
  out = out.replace(/File:.*?\.svg\s*/g, '');
  // 2) Placeholder cassé "Land of This/That" (pas un vrai pays) → clause retirée proprement.
  out = out.replace(/\s*—\s*Land of (This|That)\.?/g, '.').replace(/\s*·\s*Land of (This|That)\b/g, '');
  // 3) Traduction des pays réels.
  for (const en of LAND_KEYS) out = out.split(en).join(LAND_FR[en]);
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

async function main() {
  let from = 0, scanned = 0, changed = 0;
  const rows: { id: string; slug: string; summary: string; description: string | null }[] = [];
  while (true) {
    const { data } = await sb.from('akasha_entries').select('id,slug,summary,description').eq('universe', 'Naruto')
      .or('summary.ilike.%Land of%,summary.ilike.%File:%').range(from, from + 999);
    if (!data || !data.length) break;
    rows.push(...(data as typeof rows));
    scanned += data.length;
    if (data.length < 1000) break;
    from += 1000;
  }

  for (const r of rows) {
    const newSummary = clean(r.summary);
    if (newSummary === r.summary) continue;
    changed++;
    if (changed <= 6) console.log(r.slug, '→', JSON.stringify(newSummary));
    if (WRITE) {
      const patch: Record<string, unknown> = { summary: newSummary };
      if (r.description === r.summary) patch.description = newSummary;
      await sb.from('akasha_entries').update(patch).eq('id', r.id);
    }
  }
  console.log(`${changed}/${scanned} fiches nettoyées.`, WRITE ? '✓ écrit' : '(dry-run — relancer avec --write)');
}
main();
