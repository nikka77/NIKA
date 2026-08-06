// scripts/ops-purger-sections-etrangeres.mjs — RETIRE les sections tirées de la mauvaise page.
//
// Pourquoi le double verdict ne pouvait pas les attraper : le juge compare la production à SA
// SOURCE. Si la source est l'article d'un autre, une production fidèle est fidèle — et il
// approuve. « Détective » a hérité de quatre sections de L, « Shūichi Aizawa » de deux sections
// sur la symbolique de la pomme chez Takeshi Obata, « Noriko » d'une comédie musicale brésilienne.
// Aucune erreur de rédaction là-dedans : l'erreur est en amont, dans le choix de l'article.
//
// La garde d'identité (fandom.mjs, identiteEntre) la refuse désormais AVANT le découpage, mais
// tout ce qui a été produit avant elle est déjà en base. Ce script rejoue la garde sur la source
// de chaque section publiée et retire celles dont l'article est étranger à la fiche.
//
// Il ne juge pas le texte, il juge la PROVENANCE — donc en code, sans un seul appel de modèle :
//   « meme »     Shidoh ≡ Sidoh, SPK ≡ Special Provision for Kira  → gardée
//   « alias »    Mail Jeevas ≡ Matt, prouvé par les champs de nommage de l'article → gardée
//   « indecis »  un mot commun, pas de preuve → gardée (on ne détruit pas sur un doute)
//   « etranger » aucun lien → RETIRÉE de la fiche, résultat marqué rejeté
//
// Usage : node --env-file=.env.local scripts/ops-purger-sections-etrangeres.mjs [--dry] [--universe="Death Note"]
import { clientOps, clientSite } from '../lib/ops/db.mjs';
import { retirerSections } from '../lib/akasha/sections.ts';
import { identiteEntre, fetchFandomProse } from './lib/fandom.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];

// Les sections qui comptent : celles déjà publiées (approved) et celles qui le seront (pending).
// Les rejetées sont déjà hors de la fiche — inutile de les rejuger.
const lignes = [];
for (let d = 0; ; d += 1000) {
  let q = supabase.from('agent_results')
    .select('id, target_slug, payload, review_status')
    .eq('task_type', 'fiche_section').in('review_status', ['approved', 'pending'])
    .order('id').range(d, d + 999);
  if (UNIVERSE) q = q.eq('payload->>universe', UNIVERSE);
  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }
  lignes.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

// Une seule vérification par SOURCE (fiche × article), pas par section : « Détective » a quatre
// sections du même article, c'est la même question posée quatre fois.
const sources = new Map();
for (const r of lignes) {
  const cle = `${r.target_slug}|${r.payload?.universe}|${r.payload?.name}|${r.payload?.fandomTitle}`;
  if (!sources.has(cle)) sources.set(cle, []);
  sources.get(cle).push(r);
}
console.log(`${lignes.length} section(s) · ${sources.size} source(s) à vérifier${UNIVERSE ? ` [${UNIVERSE}]` : ''}`);

const aPurger = [];
let gardees = 0;
for (const [cle, rows] of sources) {
  const [slug, universe, name, titre] = cle.split('|');
  if (!titre || titre === 'undefined') continue;
  const page = await fetchFandomProse(universe, titre, { maxChars: 6000 });
  const verdict = identiteEntre(name, titre, page?.text ?? '');
  if (verdict !== 'etranger') { gardees += rows.length; continue; }
  aPurger.push({ slug, name, titre, rows });
  console.log(`  ✗ ${slug.padEnd(26)} « ${name} » → article « ${titre} » — ${rows.length} section(s)`);
}

console.log(`\n${gardees} section(s) confirmée(s) · ${aPurger.reduce((n, x) => n + x.rows.length, 0)} à retirer sur ${aPurger.length} fiche(s)`);
if (DRY || !aPurger.length) { if (DRY) console.log('(à blanc — rien retiré)'); process.exit(0); }

let retirees = 0;
for (const { slug, titre, rows } of aPurger) {
  // 1) La fiche publique d'abord : c'est elle que lit Dan. UNE SECTION = UNE LIGNE de
  //    akasha_sections (05/08) : on retire LES lignes visées (entry_id, idx), jamais un
  //    tableau entier. Sans index on ne retire RIEN — retirerSections sans index effacerait
  //    TOUTES les sections de la fiche, y compris celles d'autres producteurs.
  const { data: e } = await clientSite().from('akasha_entries').select('id').eq('slug', slug).single();
  const indices = [...new Set(rows.map((r) => String(r.payload?.section_index ?? '')).filter(Boolean))];
  if (e?.id && indices.length) {
    // Un retrait qui échoue laisse les résultats en l'état : rejeter quand même mettrait la
    // fiche hors de portée du prochain passage (le scan ignore les « rejected ») — la section
    // resterait en base pour toujours, sans trace. On réessaiera au prochain run.
    try { retirees += await retirerSections(clientSite(), e.id, indices); }
    catch (err) { console.error(`  ✗ ${slug} : ${String(err.message ?? err).slice(0, 90)}`); continue; }
  }
  // 2) Puis les résultats : rejetés avec le motif, pour qu'aucun verdict tardif ne les réapplique
  //    (verrouEtAppliquer n'agit que sur du « pending ») et que la trace reste lisible dans /ops.
  await supabase.from('agent_results')
    .update({ review_status: 'rejected', reviewed_at: new Date().toISOString(), error: `source étrangère : article « ${titre} »` })
    .in('id', rows.map((r) => r.id));
}
console.log(`✓ ${retirees} section(s) retirée(s) des fiches · ${aPurger.reduce((n, x) => n + x.rows.length, 0)} résultat(s) rejeté(s)`);
