// scripts/ops-fill-toilettage.mjs — met en file les sections dont le FRANÇAIS cloche (02/08).
//
// Les juges du parc contrôlent l'ancrage aux faits : une section peut être parfaitement
// exacte et mal écrite — ils la valident, et ils ont raison, ce n'est pas leur métier.
// Mesuré sur Death Note : 20 sections appliquées sur 172 (12 %) portent des calques de
// l'anglais (« Ayant tombé amoureux », « est montré », « est vu », « il est révélé que »).
//
// La détection est un FILTRE, pas un juge : elle sur-sélectionne volontairement (un texte
// sain passé au correcteur en ressort à l'identique, avec "corrige": false, et rien n'est
// écrit — coût d'un faux positif : un appel). Ce qu'elle ne doit pas faire, c'est manquer.
//
// Usage : node --env-file=.env.local scripts/ops-fill-toilettage.mjs [--universe="Death Note"]
//         [--dry] [--limit=40] [--slug=misa-amane] [--tout]
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const TOUT = process.argv.includes('--tout');          // toiletter même sans marqueur détecté
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 40);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];
const SLUG = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];

// Marqueurs de traduction mécanique. Chacun a été VU dans nos textes, aucun n'est théorique.
const CALQUES = [
  [/\b(est|sont|était|étaient) (montré|montrée|montrés|montrées|vu|vue|vus|vues)\b/i, 'passif calqué (« is shown »)'],
  [/\bil est révélé que\b/i, '« it is revealed that »'],
  [/\bAyant (tombé|été montré)\b/i, 'participe fautif'],
  [/\bau travers de\b/i, '« through »'],
  [/\bdans l['’]ordre de\b/i, '« in order to »'],
  [/\bfinit par être\b/i, '« ends up being »'],
  [/\ben tant que tel\b/i, '« as such »'],
  // Mot anglais en -ing, MAIS jamais en tête de mot capitalisé : les titres d'œuvres et les
  // noms propres canon en sont pleins (« Change the WorLd », « Death Note: Another Note »).
  // Mesuré sur Death Note : le filtre « mot anglais » brut sélectionnait 55 sections sur 174,
  // dont l'écrasante majorité pour des titres et des répliques CITÉES — du bruit pur.
  [/\b[a-z]{3,}ing\b/, 'mot anglais en -ing'],
  [/\bse retrouve être\b/i, 'tournure lourde'],
  [/ {2,}|\s+[,.;]/, 'ponctuation mal espacée'],
];

const entrees = [];
for (let d = 0; ; d += 1000) {
  let q = supabase.from('akasha_entries').select('slug, name, universe, attributes')
    .not('attributes->sections', 'is', null).order('slug').range(d, d + 999);
  if (UNIVERSE) q = q.eq('universe', UNIVERSE);
  if (SLUG) q = q.eq('slug', SLUG);
  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }
  entrees.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

// Idempotence : une section déjà en attente de relecture ne repart pas en file.
const { data: pendantes } = await supabase.from('agent_results')
  .select('target_slug, payload').eq('task_type', 'toilettage_fr').eq('review_status', 'pending');
const dejaEnFile = new Set((pendantes ?? []).map((r) => `${r.target_slug}#${r.payload?.section_index}`));

const messages = [];
let vues = 0;
for (const e of entrees) {
  for (const s of e.attributes?.sections ?? []) {
    vues++;
    const texte = String(s.texte ?? '');
    if (texte.length < 200) continue;
    if (dejaEnFile.has(`${e.slug}#${s.i}`)) continue;
    const motifs = CALQUES.filter(([re]) => re.test(texte)).map(([, quoi]) => quoi);
    if (!motifs.length && !TOUT) continue;
    console.log(`  · ${e.slug.padEnd(24)} « ${String(s.titre).slice(0, 22).padEnd(22)} »  ${motifs.join(', ') || 'balayage complet'}`);
    messages.push({
      type: 'toilettage_fr',
      payload: {
        slug: e.slug, name: e.name, universe: e.universe,
        section_index: String(s.i), titre: s.titre, texte,
      },
    });
    if (messages.length >= LIMIT) break;
  }
  if (messages.length >= LIMIT) break;
}

console.log(`\n→ ${messages.length} section(s) à toiletter sur ${vues} inspectée(s)${UNIVERSE ? ` [${UNIVERSE}]` : ''}`);
if (DRY || !messages.length) { if (DRY) console.log('(à blanc — rien mis en file)'); process.exit(0); }

for (let i = 0; i < messages.length; i += 100) {
  const { error } = await supabase.rpc('ops_queue_send_batch', { messages: messages.slice(i, i + 100) });
  if (error) { console.error('mise en file :', error.message); process.exit(1); }
}
console.log(`✓ ${messages.length} section(s) en file`);
