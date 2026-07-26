// app/api/ops/state/route.ts — état de la console OPS (file pgmq + résultats d'agents)
// et actions de review. Verrouillé localhost (lib/ops/guard).
import { NextResponse } from 'next/server';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { opsAllowed } from '@/lib/ops/guard';
import { AGENTS, type AgentEtat } from '@/lib/ops/agents';

export const dynamic = 'force-dynamic';

const admin = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!(await opsAllowed())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = admin();
  if (!supabase) return NextResponse.json({ error: 'supabase absent' }, { status: 500 });

  const [{ data: metrics }, { data: parType }, { data: results }] = await Promise.all([
    supabase.rpc('ops_queue_metrics'),
    supabase.rpc('ops_queue_by_type'),
    supabase
      .from('agent_results')
      .select(
        'id, task_type, target_slug, model, payload, result, status, review_status, error, created_at, auto_verdict, auto_motif, auto_model, auto_score',
      )
      .order('id', { ascending: false })
      .limit(120),
  ]);

  // santé des services locaux (le worker tourne sur la machine de Dan)
  const ping = async (url: string) => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
      return r.ok;
    } catch {
      return false;
    }
  };
  const [ollama, omniroute] = await Promise.all([
    ping('http://localhost:11434/api/version'),
    ping('http://localhost:20128/'),
  ]);

  // Modèle actuellement chargé côté Ollama = ce sur quoi le GPU travaille à la seconde près.
  // Swap macOS : « total = X used = Y » — le baromètre du ralentissement ressenti.
  let swap: { total: number; used: number } | null = null;
  try {
    // chemin absolu : /usr/sbin n'est pas dans le PATH du serveur Next lancé par launch.json
    const m = /total = ([\d.]+)M.*used = ([\d.]+)M/.exec(execSync('/usr/sbin/sysctl -n vm.swapusage', { timeout: 2000 }).toString());
    if (m) swap = { total: Math.round(Number(m[1])), used: Math.round(Number(m[2])) };
  } catch { /* indisponible : pilule absente */ }

  let modeleActif: string | null = null;
  try {
    const r = await fetch('http://localhost:11434/api/ps', { signal: AbortSignal.timeout(1500) });
    if (r.ok) modeleActif = (await r.json()).models?.[0]?.name ?? null;
  } catch { /* Ollama éteint */ }

  // État de chaque agent : file en attente + dernière production + ce qu'il fait maintenant.
  const enFile = new Map<string, number>(
    (parType ?? []).map((r: { task_type: string; en_attente: number }) => [r.task_type, Number(r.en_attente)]),
  );
  const recents = results ?? [];
  const agents: AgentEtat[] = AGENTS.map((a) => {
    const dernier = recents.find((r) => r.task_type === a.type);
    const file = enFile.get(a.type) ?? 0;
    const actif = Boolean(modeleActif && a.modele !== 'HHEM-2.1 (0,1 Md)' && file > 0);

    let etat: AgentEtat['etat'] = 'inactif';
    let action = 'aucune tâche en file';
    if (file > 0) {
      etat = actif ? 'travaille' : 'attente';
      action = actif
        ? `traite « ${dernier?.payload?.name ?? '…'} » · ${file} en file`
        : `${file} tâche(s) en file, worker à l'arrêt`;
    } else if (dernier) {
      action = `dernière : « ${dernier.payload?.name ?? dernier.target_slug} »`;
    }
    if (a.type === 'claude_console') action = 'prêt — tape une consigne ci-dessous';
    if (a.type === 'hhem_ancrage') {
      const notes = recents.filter((r) => r.auto_score != null).length;
      action = notes ? `${notes} production(s) notée(s)` : 'aucune note pour l’instant';
      etat = notes ? 'attente' : 'inactif';
    }
    return { ...a, etat, enFile: file, action, dernier: dernier?.created_at };
  });

  return NextResponse.json({
    queue: metrics?.[0] ?? { queue_length: 0, total_messages: 0 },
    results: recents,
    health: { ollama, omniroute, modeleActif, swap },
    agents,
  });
}

/** Actions de review : approuver (→ écrit en base) ou rejeter un résultat. */
export async function POST(req: Request) {
  if (!(await opsAllowed())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = admin();
  if (!supabase) return NextResponse.json({ error: 'supabase absent' }, { status: 500 });

  const { id, action } = (await req.json()) as { id: number; action: 'approve' | 'reject' | 'approve_all_valid' | 'purge_failed' };

  // Lot : applique toutes les productions que le relecteur local a jugées « valide ».
  // Dan garde la décision (c'est lui qui clique), mais en une fois au lieu de N.
  if (action === 'approve_all_valid') {
    const { data: rows } = await supabase
      .from('agent_results')
      .select('id')
      .eq('review_status', 'pending')
      .eq('auto_verdict', 'valide')
      .in('status', ['done', 'suspect']);
    let applied = 0;
    for (const r of rows ?? []) {
      const res = await applyResult(supabase, r.id);
      if (res) applied++;
    }
    return NextResponse.json({ ok: true, applied, total: rows?.length ?? 0 });
  }

  if (action === 'purge_failed') {
    // Les échecs TECHNIQUES (HTTP, quota, réseau) n'apprennent rien en review : on les purge en lot.
    // Les refus de GARDE (status refused) restent : eux documentent pourquoi une fiche est écartée.
    const { data: purged } = await supabase
      .from('agent_results')
      .delete()
      .eq('review_status', 'pending')
      .eq('status', 'failed')
      .select('id');
    return NextResponse.json({ ok: true, purged: purged?.length ?? 0 });
  }

  if (action === 'reject') {
    await supabase
      .from('agent_results')
      .update({ review_status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    return NextResponse.json({ ok: true });
  }

  const ok = await applyResult(supabase, id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'application impossible' }, { status: 500 });
}

/** Applique un résultat d'agent sur la fiche AKASHA, puis le marque approuvé. */
type Admin = NonNullable<ReturnType<typeof admin>>;
async function applyResult(supabase: Admin, id: number): Promise<boolean> {
  const { data: row } = await supabase.from('agent_results').select('*').eq('id', id).single();
  if (!row) return false;

  const { data: entry } = await supabase
    .from('akasha_entries')
    .select('attributes')
    .eq('slug', row.target_slug)
    .single();
  if (!entry) return false;

  const patch: Record<string, unknown> = { ...(entry.attributes ?? {}) };
  const ROLES_DESCFR = ['fandom_descfr', 'flavor_akasha', 'fiche_technique', 'fiche_artefact', 'fiche_lieu', 'fiche_lexique'];
  if (ROLES_DESCFR.includes(row.task_type)) {
    patch.descFr = row.result?.descFr;
    patch.descFrSource = row.model;
  } else if (row.task_type === 'akasha_attrs') {
    // « inconnu » = la source ne dit rien → on n'écrase jamais une valeur existante ;
    // les champs « _preuve » restent dans agent_results, pas dans la fiche.
    for (const [k, v] of Object.entries(row.result ?? {}))
      if (v && v !== 'inconnu' && !k.endsWith('_preuve')) patch[k] = v;
  } else if (row.task_type === 'akasha_relations') {
    // L'histoire entre personnages (Law ↔ Don Quichotte…) ; les preuves restent dans agent_results.
    const rel = (row.result?.relations ?? []) as Array<Record<string, string>>;
    if (!rel.length) return false;
    patch.relations = rel.map(({ avec, nature, periode, resume }) => ({ avec, nature, periode, resume }));
    patch.relationsSource = row.model;
  }

  const { error } = await supabase.from('akasha_entries').update({ attributes: patch }).eq('slug', row.target_slug);
  if (error) return false;

  await supabase
    .from('agent_results')
    .update({ review_status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id);
  return true;
}
