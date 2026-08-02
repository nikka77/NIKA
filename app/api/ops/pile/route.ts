// app/api/ops/pile/route.ts — LES PILES, paginées et triées (01/08/2026).
//
// Pourquoi une route à part : la console chargeait les 120 dernières lignes et affichait tout
// dans une seule page — 367 fiches à relire et 321 écartées l'étiraient sur plus de trois
// écrans avant que Dan n'atteigne son travail, et les compteurs mentaient sur le stock réel.
// Chaque bac vit maintenant sur sa page, avec une vraie pagination et son compte exact.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '@/lib/ops/db.mjs';
import { opsAllowed } from '@/lib/ops/guard';

export const dynamic = 'force-dynamic';

const admin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
};

const CHAMPS =
  'id, task_type, target_slug, model, payload, result, status, review_status, error, created_at, ' +
  'auto_verdict, auto_motif, auto_model, auto_score, auto2_verdict, auto2_motif, auto2_model, ' +
  'arbitre_verdict, arbitre_motif, arbitre_model, auto_applique';

/** Les bacs, avec leur filtre et l'ordre qui a du sens POUR CE BAC.
 *  « à relire » et « douteuses » sont du travail : on y remonte ce qui mérite l'œil.
 *  Les trois autres sont de la consultation : le plus récent d'abord suffit. */
const BACS = {
  relire: { titre: 'À relire', filtre: (q: any) => q.eq('review_status', 'pending').eq('status', 'done') },
  douteuses: { titre: 'Preuve douteuse', filtre: (q: any) => q.eq('review_status', 'pending').eq('status', 'suspect') },
  ecartees: { titre: 'Écartées par les gardes', filtre: (q: any) => q.eq('review_status', 'pending').eq('status', 'refused') },
  approuvees: { titre: 'Approuvées', filtre: (q: any) => q.eq('review_status', 'approved') },
  rejetees: { titre: 'Rejetées', filtre: (q: any) => q.eq('review_status', 'rejected') },
} as const;
export type Bac = keyof typeof BACS;

const PAR_PAGE = 40;

export async function GET(req: Request) {
  if (!(await opsAllowed())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = admin();
  if (!supabase) return NextResponse.json({ error: 'supabase absent' }, { status: 500 });

  const url = new URL(req.url);
  const bac = (url.searchParams.get('bac') ?? 'relire') as Bac;
  const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
  const univers = url.searchParams.get('univers');
  const def = BACS[bac] ?? BACS.relire;

  // Le compte EXACT d'abord : c'est lui qui s'affiche, jamais la taille de la page.
  let cQ = supabase.from('agent_results').select('*', { count: 'exact', head: true }).neq('task_type', 'review_local');
  cQ = def.filtre(cQ);
  if (univers) cQ = cQ.eq('payload->>universe', univers);
  const { count } = await cQ;

  let q = supabase.from('agent_results').select(CHAMPS).neq('task_type', 'review_local');
  q = def.filtre(q);
  if (univers) q = q.eq('payload->>universe', univers);
  const { data, error } = await q.order('id', { ascending: false }).range(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Les univers présents dans le bac, pour le filtre — un seul aller-retour, compté à part
  // parce qu'un GROUP BY n'existe pas côté PostgREST sans RPC.
  const { data: tousUnivers } = await supabase.from('agent_results')
    .select('payload').neq('task_type', 'review_local').limit(1000)
    .then((r) => ({ data: r.data }));
  const universDispo = [...new Set((tousUnivers ?? [])
    .map((r: { payload: { universe?: string } | null }) => r.payload?.universe)
    .filter(Boolean) as string[])].sort();

  return NextResponse.json({
    bac, titre: def.titre, page, parPage: PAR_PAGE,
    total: count ?? 0, results: data ?? [], universDispo,
  });
}
