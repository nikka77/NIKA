// app/api/ops/state/route.ts — état de la console OPS (file pgmq + résultats d'agents)
// et actions de review. Verrouillé localhost (lib/ops/guard).
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { opsAllowed } from '@/lib/ops/guard';

export const dynamic = 'force-dynamic';

const admin = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!(await opsAllowed())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = admin();
  if (!supabase) return NextResponse.json({ error: 'supabase absent' }, { status: 500 });

  const [{ data: metrics }, { data: results }] = await Promise.all([
    supabase.rpc('ops_queue_metrics'),
    supabase
      .from('agent_results')
      .select('id, task_type, target_slug, model, payload, result, status, review_status, error, created_at')
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

  return NextResponse.json({
    queue: metrics?.[0] ?? { queue_length: 0, total_messages: 0 },
    results: results ?? [],
    health: { ollama, omniroute },
  });
}

/** Actions de review : approuver (→ écrit en base) ou rejeter un résultat. */
export async function POST(req: Request) {
  if (!(await opsAllowed())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = admin();
  if (!supabase) return NextResponse.json({ error: 'supabase absent' }, { status: 500 });

  const { id, action } = (await req.json()) as { id: number; action: 'approve' | 'reject' };
  const { data: row } = await supabase.from('agent_results').select('*').eq('id', id).single();
  if (!row) return NextResponse.json({ error: 'introuvable' }, { status: 404 });

  if (action === 'reject') {
    await supabase
      .from('agent_results')
      .update({ review_status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    return NextResponse.json({ ok: true });
  }

  // approve : applique le résultat sur la fiche AKASHA (fusion dans attributes)
  const { data: entry } = await supabase
    .from('akasha_entries')
    .select('attributes')
    .eq('slug', row.target_slug)
    .single();
  if (!entry) return NextResponse.json({ error: 'fiche introuvable' }, { status: 404 });

  const patch: Record<string, unknown> = { ...(entry.attributes ?? {}) };
  if (row.task_type === 'fandom_descfr' || row.task_type === 'flavor_akasha') {
    patch.descFr = row.result?.descFr;
    patch.descFrSource = row.model;
  } else if (row.task_type === 'akasha_attrs') {
    // « inconnu » = la source ne dit rien → on n'écrase rien
    for (const [k, v] of Object.entries(row.result ?? {})) if (v && v !== 'inconnu') patch[k] = v;
  }

  const { error } = await supabase.from('akasha_entries').update({ attributes: patch }).eq('slug', row.target_slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from('agent_results')
    .update({ review_status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id);
  return NextResponse.json({ ok: true });
}
