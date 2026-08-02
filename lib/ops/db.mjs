// lib/ops/db.mjs — LES DEUX BASES DE NIKA OPS (03/08/2026, incident egress Supabase).
//
// · clientOps()  → la base de TRAVAIL : file pgmq, agent_results, ops_workers, quotas…
//   Sur le VPS Hetzner via PostgREST (NIKA_OPS_URL), même dialecte REST que Supabase —
//   c'est pour ça que le code n'a pas changé, seule l'URL bouge. Trafic non compté.
// · clientSite() → la base du SITE : akasha_entries et tout ce qui est PUBLIÉ.
//   Reste sur Supabase ; l'usine n'y passe plus que pour écrire une publication finale.
//
// Sans NIKA_OPS_URL (dev local, avant migration), les deux clients pointent au même
// endroit qu'avant : aucun comportement ne change tant que l'env n'est pas posée.
import { createClient } from '@supabase/supabase-js';

let _ops = null;
let _site = null;

export function clientOps() {
  if (!_ops) {
    _ops = createClient(
      process.env.NIKA_OPS_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NIKA_OPS_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
  }
  return _ops;
}

export function clientSite() {
  if (!_site) {
    _site = createClient(
      process.env.NIKA_SITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NIKA_SITE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
  }
  return _site;
}
