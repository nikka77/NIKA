// scripts/lib/deja-en-file.mjs — LE garde d'idempotence des remplisseurs, en un seul exemplaire.
//
// POURQUOI (07/08/2026, audit de curation)
// Les remplisseurs commandent du travail à l'usine. Sans garde, ils recommandent à chaque passage
// ce qui attend déjà d'être relu — le timer tourne toutes les 20 minutes, et la même fiche part
// indéfiniment. Mesuré ce matin : 97 productions pour la seule entité `anton-the-great`, une toutes
// les 20 minutes sans discontinuer pendant 32 heures, et 4 076 productions écartées en 30 heures —
// un mois après le commit « écartées à ZÉRO ».
//
// Le garde EXISTAIT pourtant dans quatre des neuf remplisseurs. Il était aveugle : un `.select()`
// nu plafonne à 1 000 lignes chez PostgREST, or la pile `pending` en compte plus de 11 000. Il
// voyait donc les 1 000 premières et laissait repartir tout le reste — la panne silencieuse type,
// exactement celle qui avait déjà masqué les 800 fiches d'ops-fill-fiches le 01/08.
//
// D'où cette fonction unique et PAGINÉE : un remplisseur neuf l'importe au lieu de recopier une
// requête qu'on corrigera une fois sur deux.
//
// Usage :
//   import { dejaEnFile } from './lib/deja-en-file.mjs';
//   const vus = await dejaEnFile(clientOps(), 'fandom_descfr');       // un type
//   const vus = await dejaEnFile(clientOps(), ['fiche_section', 'toilettage_fr']);   // plusieurs
//   candidats.filter((e) => !vus.has(e.slug))

/** Slugs qui ont DÉJÀ une production en attente de relecture pour ce(s) type(s) de tâche.
 *  @param {import('@supabase/supabase-js').SupabaseClient} sb  client de la base de TRAVAIL (clientOps)
 *  @param {string|string[]|null} types  type(s) de tâche ; null = tous les types confondus
 *  @returns {Promise<Set<string>>} */
export async function dejaEnFile(sb, types = null) {
  const vus = new Set();
  const liste = types == null ? null : (Array.isArray(types) ? types : [types]);
  for (let d = 0; ; d += 1000) {
    let q = sb.from('agent_results').select('target_slug')
      .eq('review_status', 'pending')
      .order('id', { ascending: true })
      .range(d, d + 999);
    if (liste) q = q.in('task_type', liste);
    const { data, error } = await q;
    // ON CRIE : un garde qui échoue en silence est pire que pas de garde — il fait croire que
    // la vérification a eu lieu. L'appelant doit s'arrêter plutôt que de recommander à l'aveugle.
    if (error) throw new Error(`garde d'idempotence indisponible : ${error.message}`);
    for (const r of data ?? []) if (r.target_slug) vus.add(r.target_slug);
    if ((data?.length ?? 0) < 1000) break;
  }
  return vus;
}
