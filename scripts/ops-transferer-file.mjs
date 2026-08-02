// scripts/ops-transferer-file.mjs — déménage la file pgmq de Supabase vers la base VPS
// (migration du 03/08, incident egress). Chaque message est AUTONOME (payload avec source
// incluse) : les transférer épargne des heures de re-découpe Fandom.
//
// Lecture patiente : Supabase sous restrictions répond par à-coups (39 s, Cloudflare 522) —
// on réessaie sans fin, chaque lot gagné est archivé côté source (idempotent, relançable).
// Usage : node --env-file=.env.local scripts/ops-transferer-file.mjs [--max=10000]
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';

const MAX = Number(process.argv.find((a) => a.startsWith('--max='))?.split('=')[1] ?? 20000);
const source = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { fetch: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(120_000) }) },
});
const dest = clientOps();

let transferes = 0, tours = 0, echecs = 0;
while (transferes < MAX) {
  tours++;
  let lot = null;
  try {
    // vt d'une heure : le temps du transfert, personne d'autre ne relit ces messages.
    // Lots de 50 : sous restriction, la passerelle REST coupe (522) avant qu'un UPDATE de
    // 500 lignes ne finisse — un petit lot a une chance de passer sous le timeout Cloudflare.
    const { data, error } = await source.rpc('ops_queue_read_couloir', { p_vt: 3600, p_qty: 50, p_types: null });
    if (error) throw new Error(error.message);
    lot = data ?? [];
  } catch (e) {
    echecs++;
    console.log(`  tour ${tours} : lecture source en échec (${String(e.message ?? e).slice(0, 60)}) — pause 30 s [${echecs} échec(s)]`);
    await new Promise((r) => setTimeout(r, 30_000));
    continue;
  }
  if (!lot.length) { console.log('  file source vide — transfert terminé'); break; }

  const { error: eSend } = await dest.rpc('ops_queue_send_batch', { messages: lot.map((m) => m.message) });
  if (eSend) { console.log(`  ✗ envoi VPS : ${eSend.message.slice(0, 80)} — on retentera ce lot (vt le rendra)`); continue; }

  // Archive côté source — persistant, best-effort : si ça rate, le vt d'1 h nous laisse le
  // temps de relancer sans double-transfert immédiat ; un doublon éventuel est bénin (le
  // worker re-produit une section identique, l'application est idempotente par index).
  try {
    await source.rpc('ops_queue_archive_batch', { message_ids: lot.map((m) => m.msg_id) });
  } catch { console.log('  ⚠ archive source ratée pour ce lot (transféré quand même)'); }

  transferes += lot.length;
  console.log(`  … ${transferes} transféré(s) (tour ${tours})`);
}
const { data: m } = await dest.rpc('ops_queue_metrics');
console.log(`FINAL — ${transferes} message(s) transférés · file VPS : ${JSON.stringify(m)}`);
