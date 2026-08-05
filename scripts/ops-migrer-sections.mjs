// scripts/ops-migrer-sections.mjs — migre les sections du JSONB vers la table akasha_sections.
//
// Décision 4 du plan minimal (05/08/2026). Se lance APRÈS la migration SQL :
//   DB_PASSWORD=… node scripts/apply-sql.cjs supabase/migrations/akasha_sections.sql
//
// Puis, dans cet ordre — chaque étape est vérifiable avant la suivante :
//   --dry       compte ce qui serait écrit, n'écrit rien
//   (rien)      copie le JSONB en lignes, sans jamais écraser une ligne existante
//   --verifier  recompte des DEUX côtés et signale la moindre section manquante
//   --purger    retire attributes.sections des fiches VÉRIFIÉES, une par une
//
// La purge ne se fait qu'après une vérification réussie de la fiche concernée : c'est la leçon
// des relations dormantes — mesurer, migrer, vérifier, purger. Jamais purger d'abord.
import { clientSite } from '../lib/ops/db.mjs';
import { poserSections, lireSections, trier } from '../lib/akasha/sections.ts';

const DRY = process.argv.includes('--dry');
const VERIFIER = process.argv.includes('--verifier');
const PURGER = process.argv.includes('--purger');
const s = clientSite();

// La table doit exister : sans elle, tout le reste n'a pas de sens et il faut le dire clairement.
{
  const { error } = await s.from('akasha_sections').select('id').limit(1);
  if (error) {
    console.error('✗ table akasha_sections absente. Appliquer d\'abord :');
    console.error('  DB_PASSWORD=… node scripts/apply-sql.cjs supabase/migrations/akasha_sections.sql');
    process.exit(1);
  }
}

const fiches = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await s.from('akasha_entries')
    .select('id, slug, attributes').not('attributes->sections', 'is', null)
    .order('id').range(d, d + 999);
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  fiches.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const total = fiches.reduce((n, f) => n + (Array.isArray(f.attributes?.sections) ? f.attributes.sections.length : 0), 0);
console.log(`${fiches.length} fiche(s) · ${total} section(s) dans le JSONB`);

if (VERIFIER) {
  let manquantes = 0, fichesIncompletes = 0, ok = 0;
  for (const f of fiches) {
    const dansJsonb = trier((f.attributes?.sections ?? []).filter((x) => String(x?.texte ?? '').trim()));
    const { data } = await s.from('akasha_sections').select('idx').eq('entry_id', f.id);
    const enTable = new Set((data ?? []).map((r) => String(r.idx)));
    const perdues = dansJsonb.filter((x) => !enTable.has(String(x.i)));
    if (perdues.length) { manquantes += perdues.length; fichesIncompletes++; if (fichesIncompletes <= 5) console.log(`  ⚠ ${f.slug} : ${perdues.length} section(s) absente(s) de la table`); }
    else ok++;
  }
  console.log(`VÉRIFICATION — ${ok} fiche(s) complètes · ${fichesIncompletes} incomplètes · ${manquantes} section(s) manquante(s)`);
  process.exit(manquantes ? 1 : 0);
}

if (PURGER) {
  let purgees = 0, refusees = 0;
  for (const f of fiches) {
    const dansJsonb = (f.attributes?.sections ?? []).filter((x) => String(x?.texte ?? '').trim());
    const { data } = await s.from('akasha_sections').select('idx').eq('entry_id', f.id);
    const enTable = new Set((data ?? []).map((r) => String(r.idx)));
    // GARDE : on ne purge que si la table porte TOUT ce que le JSONB portait.
    if (dansJsonb.some((x) => !enTable.has(String(x.i)))) { refusees++; continue; }
    const attributes = { ...(f.attributes ?? {}) };
    delete attributes.sections;
    delete attributes.sectionsSource;
    const { error } = await s.from('akasha_entries').update({ attributes }).eq('id', f.id);
    if (!error) purgees++;
    if ((purgees + refusees) % 500 === 0) console.log(`  … ${purgees + refusees}/${fiches.length}`);
  }
  console.log(`PURGE — ${purgees} fiche(s) allégée(s) · ${refusees} laissée(s) intacte(s) (table incomplète)`);
  process.exit(0);
}

let ecrites = 0, dejaLa = 0, echecs = 0;
for (const [i, f] of fiches.entries()) {
  const sections = (f.attributes?.sections ?? []).filter((x) => String(x?.texte ?? '').trim());
  if (!sections.length) continue;
  if (DRY) { ecrites += sections.length; continue; }
  try {
    const n = await poserSections(s, f.id, sections, f.attributes?.sectionsSource ?? 'migration JSONB 05/08');
    ecrites += n; dejaLa += sections.length - n;
  } catch (e) { echecs++; if (echecs <= 3) console.log(`  ✗ ${f.slug} : ${String(e.message ?? e).slice(0, 90)}`); }
  if ((i + 1) % 500 === 0) console.log(`  … ${i + 1}/${fiches.length} · ${ecrites} écrite(s)`);
}
console.log(`FINAL — ${ecrites} section(s) écrite(s) · ${dejaLa} déjà présente(s) · ${echecs} échec(s)${DRY ? ' (DRY)' : ''}`);
