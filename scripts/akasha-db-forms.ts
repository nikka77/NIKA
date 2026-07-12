// scripts/akasha-db-forms.ts — injecte les ÉVOLUTIONS (attribut `forms`) sur les entités
// personnages Dragon Ball, à partir de lib/akasha/db-forms.ts. Les cartes TCG (CharacterCard
// + ArcFrieze) affichent alors le sélecteur de transformations. Idempotent. Run :
//   PATH="/opt/homebrew/bin:$PATH" npx tsx scripts/akasha-db-forms.ts [--write]
import fs from 'node:fs';
import { DB_FORMS } from '../lib/akasha/db-forms';

const WRITE = process.argv.includes('--write');
const d = JSON.parse(fs.readFileSync('data/akasha-universes.json', 'utf8')) as { entries: any[] };
const bySlug = new Map(d.entries.map((e) => [e.slug, e]));

let done = 0; const miss: string[] = [];
for (const [slug, forms] of Object.entries(DB_FORMS)) {
  const e = bySlug.get(slug);
  if (!e) { miss.push(slug); continue; }
  const base = e.image_url as string | null;
  const arr = forms.map((f) => ({
    label: f.name,
    url: f.img ?? base ?? '',
    caption: `Puissance ≈ ${f.power}`,
  })).filter((f) => f.url);
  if (arr.length < 2) continue;
  e.attributes = { ...(e.attributes || {}), forms: arr };
  done++;
}

if (WRITE) fs.writeFileSync('data/akasha-universes.json', JSON.stringify(d, null, 2));
console.log(JSON.stringify({ personnages_avec_formes: done, introuvables: miss, mode: WRITE ? 'WRITE' : 'dry-run' }, null, 1));
