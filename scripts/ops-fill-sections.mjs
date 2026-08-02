// scripts/ops-fill-sections.mjs — DÉCOUPE une page canon en sections et les met en file (L26).
//
// L'idée de Dan, mesurée avant d'être suivie : plutôt qu'un agent qui lit toute une page, un
// agent PAR SECTION. Les chiffres qui l'imposent — page de Naruto Uzumaki : 246 738 caractères,
// 83 sections ; notre fenêtre de 6 000 en montrait 2,4 % et la fiche produite en rendait 0,3 %.
// Une section fait ~3 000 caractères : elle tient sans troncature, porte un sujet homogène, et
// se juge contre SA PROPRE source — le contrôleur voit enfin 100 % de ce que le contrôlé a lu.
//
// Le découpage n'est pas deviné : c'est celui du wiki (prop=sections). On suit sa structure.
//
// Usage : node --env-file=.env.local scripts/ops-fill-sections.mjs --universe="Death Note"
//         [--dry] [--limit=20] [--slug=sharingan] [--max-sections=12] [--refaire]
import { createClient } from '@supabase/supabase-js';
import { fetchFandomSections } from './lib/fandom.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const REFAIRE = process.argv.includes('--refaire');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 10);
const MAX_SECTIONS = Number(process.argv.find((a) => a.startsWith('--max-sections='))?.split('=')[1] ?? 12);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];
const SLUG = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];

// PAGINATION : Supabase plafonne à 1 000 lignes, et la base en compte 7 691.
const entrees = [];
for (let d = 0; ; d += 1000) {
  let q = supabase.from('akasha_entries')
    .select('slug, name, type, universe, summary, attributes')
    .order('attributes->favorites', { ascending: false, nullsFirst: false })
    .range(d, d + 999);
  if (UNIVERSE) q = q.eq('universe', UNIVERSE);
  if (SLUG) q = q.eq('slug', SLUG);
  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }
  entrees.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

// Idempotence : on ne redemande pas une fiche déjà sectionnée, ni une déjà en attente de review.
const { data: pendantes } = await supabase.from('agent_results')
  .select('target_slug').eq('task_type', 'fiche_section').eq('review_status', 'pending');
const dejaEnFile = new Set((pendantes ?? []).map((r) => r.target_slug));

const candidates = entrees
  .filter((e) => (REFAIRE || !e.attributes?.sections?.length) && !dejaEnFile.has(e.slug))
  .slice(0, LIMIT);

console.log(`${candidates.length} fiche(s) à découper${UNIVERSE ? ` [${UNIVERSE}]` : ''}`);
if (!candidates.length) process.exit(0);

const messages = [];
let sansSource = 0, mauvaiseEntite = 0;
for (const e of candidates) {
  const page = await fetchFandomSections(e.universe, e.name, { maxSections: MAX_SECTIONS });
  // Identité refusée à la source (02/08) : douze sections d'un article qui parle d'un autre
  // sujet coûtaient douze productions ET douze relectures, pour finir rejetées une à une.
  if (page?.refus) { mauvaiseEntite++; console.log(`  ✗ ${e.name.padEnd(26)} ${page.refus}`); continue; }
  if (!page?.sections?.length) { sansSource++; continue; }
  // Le SOMMAIRE part avec chaque section : l'agent sait ce que les autres traitent et ne
  // marche pas sur leurs plates-bandes. Sans lui, cinq plumes indépendantes se répètent.
  const sommaire = page.sections.map((s) => s.titre).join(', ');
  console.log(`  · ${e.name.padEnd(26)} ${page.sections.length} section(s) : ${sommaire.slice(0, 70)}`);
  for (const s of page.sections) {
    messages.push({
      type: 'fiche_section',
      payload: {
        slug: e.slug, name: e.name, type: e.type, universe: e.universe, summary: e.summary,
        section_index: s.index, section_titre: s.titre, section_texte: s.texte,
        fandomTitle: page.title, fandomUrl: page.url, sommaire,
        // Alias PROUVÉ (champs de nommage) : le juge doit savoir que « Gelus » et « Jealous »
        // sont le même être, sinon il rejette la production pour erreur d'identité — 30 des
        // 172 sections en attente de Death Note ont été refusées exactement pour ça.
        ...(page.alias ? { alias_de: page.alias } : {}),
      },
    });
  }
}

console.log(`\n→ ${messages.length} section(s) au total · ${sansSource} fiche(s) sans source exploitable · ${mauvaiseEntite} refusée(s) pour mauvaise entité`);
if (DRY || !messages.length) { if (DRY) console.log('(à blanc — rien mis en file)'); process.exit(0); }

// Envoi par paquets : un lot de 400 sections dépasse la taille d'un appel RPC confortable.
let envoyees = 0;
for (let i = 0; i < messages.length; i += 100) {
  const { error } = await supabase.rpc('ops_queue_send_batch', { messages: messages.slice(i, i + 100) });
  if (error) { console.error('mise en file :', error.message); process.exit(1); }
  envoyees += messages.slice(i, i + 100).length;
}
console.log(`✓ ${envoyees} section(s) en file`);
