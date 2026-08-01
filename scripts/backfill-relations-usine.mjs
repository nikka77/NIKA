// scripts/backfill-relations-usine.mjs — rejoue vers le GRAPHE (table akasha_relations) les
// productions « historien des relations » DÉJÀ approuvées avant que l'application ne sache le faire.
// Usage : node --env-file=.env.local scripts/backfill-relations-usine.mjs [--dry] [--limit=N]
//
// Pourquoi ce script existe : l'application n'écrivait que dans akasha_entries.attributes.relations,
// que personne ne lit. Les fiches approuvées entre-temps sont donc du travail payé et invisible ;
// elles ne repasseront jamais en review (idempotence oblige), il faut aller les rechercher.
// Additif et idempotent : upsert sur (from_entry, to_entry, relation), aucune entrée créée.
import { createClient } from '@supabase/supabase-js';
import { indexerUnivers, lignesDeGraphe, poserAuGraphe, natureVersGraphe, normaliserNom } from '../lib/akasha/relations.ts';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);

/** Pagination obligatoire : PostgREST plafonne à 1 000 lignes. Sans elle, un backfill « complet »
 *  qui ignore silencieusement la 1 001ᵉ production a l'air d'avoir réussi. */
async function toutesLesProductions() {
  const out = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await supabase
      .from('agent_results')
      .select('id, target_slug, result, payload')
      .eq('task_type', 'akasha_relations')
      .eq('review_status', 'approved')
      .order('id', { ascending: true })
      .range(debut, debut + 999);
    if (error) { console.error('✗ lecture agent_results :', error.message); process.exit(1); }
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

const productions = await toutesLesProductions();
console.log(`${productions.length} production(s) approuvée(s) scannée(s)${LIMIT ? ` · limite ${LIMIT}` : ''}`);
const aRejouer = LIMIT ? productions.slice(0, LIMIT) : productions;

// Les fiches source, en une passe (id + univers) : une requête par production serait absurde.
const slugs = [...new Set(aRejouer.map((p) => p.target_slug))];
const ficheParSlug = new Map();
for (let i = 0; i < slugs.length; i += 300) {
  const { data } = await supabase.from('akasha_entries').select('id, slug, universe').in('slug', slugs.slice(i, i + 300));
  for (const f of data ?? []) ficheParSlug.set(f.slug, f);
}

const cacheIndex = new Map();
let liensLus = 0, lignesTotal = 0, dejaEnBase = 0, creees = 0;
const motifs = new Map();
const detailNonResolues = [];
const rapprochements = [];

for (const p of aRejouer) {
  const relations = p.result?.relations ?? [];
  liensLus += relations.length;
  const fiche = ficheParSlug.get(p.target_slug);
  if (!fiche) {
    // Fiche disparue depuis (dédoublonnage, prune) : la production n'a plus de point d'accroche.
    motifs.set('fiche source absente', (motifs.get('fiche source absente') ?? 0) + relations.length);
    console.log(`  ⚠ #${p.id} ${p.target_slug} — fiche source introuvable`);
    continue;
  }

  const index = await indexerUnivers(supabase, fiche.universe, cacheIndex);
  const { lignes, ignorees, resolues } = lignesDeGraphe(fiche.id, relations, index);
  // Rapprochement souple (nom inversé, macron) : à imprimer en clair, c'est le seul endroit où
  // une erreur de résolution peut se voir avant d'entrer dans le graphe.
  for (const r of resolues) if (normaliserNom(r.avec) !== normaliserNom(r.vers)) rapprochements.push(`${r.avec} → ${r.vers}`);
  for (const ig of ignorees) {
    const cle = ig.motif.startsWith('nature') ? 'nature non versée' : ig.motif;
    motifs.set(cle, (motifs.get(cle) ?? 0) + 1);
    if (cle === 'cible absente du registre') detailNonResolues.push(`${ig.avec} [${fiche.universe}]`);
  }
  lignesTotal += lignes.length;

  if (!lignes.length) { console.log(`  · #${p.id} ${p.target_slug} — 0 arête`); continue; }

  // Ce qui existe DÉJÀ (seeds curés, passages précédents) : à rapporter séparément, sinon le
  // bilan laisse croire qu'on a créé des arêtes qu'on n'a fait que reconnaître.
  const { data: avant } = await supabase
    .from('akasha_relations').select('to_entry, relation')
    .eq('from_entry', fiche.id).in('to_entry', lignes.map((l) => l.to_entry));
  const presentes = new Set((avant ?? []).map((r) => `${r.relation}|${r.to_entry}`));
  const nouvelles = lignes.filter((l) => !presentes.has(`${l.relation}|${l.to_entry}`));
  dejaEnBase += lignes.length - nouvelles.length;

  if (DRY) {
    creees += nouvelles.length;
    const detail = relations
      .map((r) => `${r.avec} (${r.nature}→${natureVersGraphe(r.nature) ?? '✗'})`)
      .join(', ');
    console.log(`  · #${p.id} ${p.target_slug} [${fiche.universe}] — ${lignes.length} arête(s), ${nouvelles.length} nouvelle(s) : ${detail}`);
  } else {
    const bilan = await poserAuGraphe(supabase, { resultId: p.id, slug: p.target_slug, relations }, cacheIndex);
    creees += bilan.creees;
    console.log(`  ✓ #${p.id} ${p.target_slug} — ${bilan.posees} posée(s), ${bilan.creees} créée(s)`);
  }
}

console.log(`\n=== BILAN ${DRY ? '(À BLANC — rien écrit)' : '(APPLIQUÉ)'} ===`);
console.log(`productions rejouées : ${aRejouer.length} · liens lus : ${liensLus}`);
console.log(`arêtes versables : ${lignesTotal} — dont ${creees} nouvelle(s), ${dejaEnBase} déjà en base`);
for (const [m, n] of [...motifs.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ignoré · ${m} : ${n}`);
if (rapprochements.length) {
  console.log(`  rapprochements souples (${rapprochements.length}) À RELIRE : ${rapprochements.join(' | ')}`);
}
if (detailNonResolues.length) {
  console.log(`  cibles non résolues (${detailNonResolues.length}) : ${detailNonResolues.slice(0, 20).join(' | ')}`);
}
if (DRY) console.log('\n→ relancer sans --dry pour appliquer.');
