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
      // SEULES LES PRODUCTIONS COMPTENT (08/08). Ce garde répond à « ce travail est-il déjà fait
      // et en attente de relecture ? ». Une ligne `failed` ou `refused` n'est PAS du travail en
      // attente : c'est une impasse. Les compter revenait à condamner définitivement toute entité
      // ayant échoué une fois — y compris pour une cause depuis réparée. Mesuré le jour même :
      // sur 2 152 tâches redevenues rejouables, 2 142 étaient bloquées par leur propre échec, et
      // les remplisseurs ne trouvaient plus AUCUN candidat.
      .in('status', ['done', 'suspect'])
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

/** Entités qu'une GARDE a refusées sur le fond, et qu'il est inutile de recommander.
 *
 *  POURQUOI (10/08/2026)
 *  Le garde ci-dessus ne compte que les productions en attente — décision du 08/08, et elle était
 *  juste : compter les `failed` condamnait à vie toute entité ayant heurté un couloir fermé. Mais
 *  elle a laissé une porte ouverte que personne n'a refermée : un `refused` ne bloque rien non
 *  plus. Or un refus n'est pas un échec. Un échec dit « le transport a lâché », un refus dit
 *  « la garde a regardé le contenu et il ne convient pas » : page Fandom absente, article d'une
 *  AUTRE entité, page d'œuvre ou de liste. Aucune de ces causes ne se répare en réessayant.
 *
 *  Mesuré ce jour, et c'est ce qui a motivé cette fonction : 11 682 refus en 24 heures pour
 *  419 entités distinctes — soit 78 tentatives chacune, une toutes les 20 minutes, indéfiniment.
 *  L'usine passait 88 % de son temps, et de ses quotas, à redemander ce qu'elle venait de refuser.
 *
 *  LE QUARANTAINE SE LÈVE. Ces entités redeviennent commandables dès qu'un chantier répare la
 *  cause — un alias curé, une page créée. Il suffit de clore leurs lignes de refus
 *  (`review_status` ≠ 'pending'), ce que fait scripts/ops-lever-quarantaine.mjs.
 *
 *  @param {import('@supabase/supabase-js').SupabaseClient} sb  base de TRAVAIL (clientOps)
 *  @param {string|string[]|null} types  type(s) de tâche ; null = tous
 *  @returns {Promise<Set<string>>} */
export async function refusesParLaGarde(sb, types = null) {
  const vus = new Set();
  const liste = types == null ? null : (Array.isArray(types) ? types : [types]);
  for (let d = 0; ; d += 1000) {
    // PAS DE FILTRE SUR `review_status`, et c'est le cœur du correctif. Premier essai : j'avais
    // recopié le `.eq('review_status', 'pending')` du garde voisin — il ne voyait alors que 167
    // lignes sur 47 991. Les refus sont CLOS à la seconde où ils sont écrits (100 % en `rejected`,
    // mesuré) : chercher un refus « en attente » revient à chercher ce qui n'existe pas. Un refus
    // est un fait acquis, pas un dossier ouvert.
    let q = sb.from('agent_results').select('target_slug, error')
      .eq('status', 'refused')
      .order('id', { ascending: true }).range(d, d + 999);
    if (liste) q = q.in('task_type', liste);
    const { data, error } = await q;
    if (error) throw new Error(`garde des refus indisponible : ${error.message}`);
    for (const r of data ?? []) if (r.target_slug && !leve(r.error)) vus.add(r.target_slug);
    if ((data?.length ?? 0) < 1000) break;
  }
  return vus;
}

/** Une ligne `refused` qui ne refuse PLUS rien.
 *  Deux cas, et le second m'a sauté aux yeux en lisant les motifs réels : le marqueur de levée
 *  (« ↻ »), et surtout les 1 846 lignes dont le motif dit « relancée en production » — un alias
 *  curé, une source retrouvée. Celles-là sont des SUCCÈS enregistrés dans la colonne des refus.
 *  Les compter aurait mis en quarantaine les entités qu'un chantier venait justement de réparer. */
function leve(motif) {
  const m = String(motif ?? '');
  return m.startsWith('↻') || /relanc[ée]e? en production/i.test(m);
}
