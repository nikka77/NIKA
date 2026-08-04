// scripts/ops-sonde-schema.mjs — LA SONDE : le schéma manquant doit CRIER, pas se taire.
//
// POURQUOI (05/08/2026, décision 2 du plan minimal)
// Le null guard `supabase ? await supabase.from(…) : { data: null }` est appliqué partout par
// convention. Il couvre l'absence de CLIENT — jamais l'absence de TABLE. Résultat mesuré sur ce
// projet : 14 tables du schéma n'ont jamais existé en base, et tout ce qui les touchait échouait
// EN SILENCE pendant des semaines ; trois flux métier tournaient en 500 sans que rien ne le dise ;
// après la migration de la base de travail, le remplisseur de relations échouait en boucle des
// heures durant (« Could not find the table public.akasha_relations ») sans alerter personne.
//
// Cette sonde interroge les deux bases pour de vrai et SORT EN ERREUR au premier manque. Elle est
// faite pour être lancée au démarrage de l'usine, en CI, et à la main après toute migration.
//
// Usage : node --env-file=.env.local scripts/ops-sonde-schema.mjs [--silencieux]
import { clientOps, clientSite } from '../lib/ops/db.mjs';

const SILENCIEUX = process.argv.includes('--silencieux');
const dire = (s) => { if (!SILENCIEUX) console.log(s); };

/** Ce que chaque base DOIT porter. Les colonnes listées sont celles dont l'absence casse
 *  silencieusement quelque chose — pas l'intégralité du schéma, qui dériverait sans qu'on la
 *  maintienne. Une liste qu'on ne tient pas à jour est pire qu'une liste courte et vraie. */
const ATTENDU = {
  travail: {
    client: clientOps,
    quoi: 'base de TRAVAIL (VPS) — la file, les productions, les verdicts, la flotte',
    tables: {
      agent_results: ['id', 'task_type', 'target_slug', 'payload', 'result', 'status',
        'review_status', 'auto_verdict', 'auto2_verdict', 'arbitre_verdict', 'arbitre_motif', 'error'],
      ops_notes: ['id', 'source', 'content', 'done'],
      ops_workers: ['id', 'role', 'derniere_activite'],
      ops_quotas: ['fournisseur', 'requetes'],
    },
    rpc: ['ops_queue_by_type', 'ops_queue_send_batch'],
  },
  site: {
    client: clientSite,
    quoi: 'base du SITE (Supabase) — ce que les pages publiques lisent',
    tables: {
      akasha_entries: ['id', 'slug', 'type', 'name', 'universe', 'summary', 'attributes'],
      akasha_relations: ['id', 'from_entry', 'to_entry', 'relation'],
    },
  },
};

/** Invariants de DONNÉES — pas de structure, mais tout aussi silencieux quand ils cassent. */
const INVARIANTS = [
  {
    nom: 'aucune arête ne dort dans akasha_entries.attributes.relations',
    pourquoi: 'une arête vit dans akasha_relations, la seule table que le site interroge ; '
      + 'le JSONB en a retenu 7 955 invisibles jusqu\'au 05/08',
    async verifier() {
      const { count, error } = await clientSite()
        .from('akasha_entries').select('id', { count: 'exact', head: true })
        .not('attributes->relations', 'is', null);
      if (error) return `lecture impossible : ${error.message}`;
      return count ? `${count} fiche(s) portent encore le champ — lancer ops-verser-relations-jsonb.mjs --purger` : null;
    },
  },
];

let manques = 0;

for (const [nom, base] of Object.entries(ATTENDU)) {
  dire(`\n── ${nom.toUpperCase()} — ${base.quoi}`);
  let sb;
  try { sb = base.client(); } catch (e) { console.error(`  ✗ client indisponible : ${String(e.message ?? e).slice(0, 90)}`); manques++; continue; }
  if (!sb) { console.error('  ✗ client null (variables d\'environnement absentes ?)'); manques++; continue; }

  for (const [table, colonnes] of Object.entries(base.tables)) {
    // On demande EXACTEMENT les colonnes attendues : PostgREST répond 42703 si l'une manque,
    // ce qu'un `select('*')` n'aurait jamais révélé.
    const { error } = await sb.from(table).select(colonnes.join(',')).limit(1);
    if (error) { console.error(`  ✗ ${table} — ${error.message.slice(0, 110)}`); manques++; }
    else dire(`  ✓ ${table} (${colonnes.length} colonnes)`);
  }
  for (const fn of base.rpc ?? []) {
    // On appelle sans argument. PostgREST distingue deux échecs qu'il faut surtout NE PAS
    // confondre : « Could not find the function public.X in the schema cache » = elle n'existe
    // pas ; « …public.X WITHOUT PARAMETERS in the schema cache » = elle existe, mais pas en
    // version sans argument — c'est le cas de toutes nos fonctions de file, et ce n'est pas un
    // manque. (Première version de cette sonde : faux positif sur ops_queue_send_batch.)
    const { error } = await sb.rpc(fn);
    const existeMaisSignature = error && /without parameters/i.test(error.message);
    const absente = error && !existeMaisSignature && /not find|does not exist|42883|PGRST202/i.test(error.message);
    if (absente) { console.error(`  ✗ rpc ${fn} — ${error.message.slice(0, 100)}`); manques++; }
    else dire(`  ✓ rpc ${fn}${existeMaisSignature ? ' (présente, appelée sans argument)' : ''}`);
  }
}

dire('\n── INVARIANTS DE DONNÉES');
for (const inv of INVARIANTS) {
  const souci = await inv.verifier();
  if (souci) { console.error(`  ✗ ${inv.nom}\n     ${souci}\n     (pourquoi : ${inv.pourquoi})`); manques++; }
  else dire(`  ✓ ${inv.nom}`);
}

if (manques) {
  console.error(`\n✗✗ SONDE EN ÉCHEC — ${manques} manque(s). L'usine ne doit pas démarrer sur un schéma incomplet :`);
  console.error('   c\'est exactement ce qui a fait échouer des flux entiers en silence pendant des semaines.');
  process.exit(1);
}
dire('\n✓ schéma conforme');
