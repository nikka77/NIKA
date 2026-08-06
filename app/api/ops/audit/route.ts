// app/api/ops/audit/route.ts — AUDIT À L'AVEUGLE du juge automatique.
// Verrouillé localhost (lib/ops/guard).
//
// Pourquoi : le taux « 51/51 approuvées » du 26/07 ne mesurait RIEN — ces approbations venaient
// du bouton « appliquer les valides », qui approuve par construction ce que le juge a validé.
// Tant que Dan n'a pas tranché SANS voir le verdict, on ignore ce que valent nos agents.
// C'est la calibration standard (JUDGe/NeurIPS 2026) : plafond réaliste ≈ 90 % (accord humain-humain).
//
// Stockage : ops_notes (source='audit', content=JSON) — pas de DDL à faire exécuter à Dan.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clientOps, clientSite } from '@/lib/ops/db.mjs';
import { opsAllowed } from '@/lib/ops/guard';
import { retirerDuGraphe } from '@/lib/akasha/relations';
import { retirerSections } from '@/lib/akasha/sections';

export const dynamic = 'force-dynamic';

const admin = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? clientOps()
    : null;
type Admin = NonNullable<ReturnType<typeof admin>>;

type Vote = { result_id: number; verdict_dan: 'exact' | 'a_corriger' | 'faux'; verdict_ia: string; task_type: string };

/** Kappa de Cohen : accord corrigé du hasard. Un accord brut de 80 % sur un juge qui dit
 *  toujours « valide » ne vaut rien — kappa le révèle (0 = hasard, 1 = parfait). */
function kappa(votes: Vote[]) {
  const n = votes.length;
  if (!n) return null;
  const cat = (v: string) => (v === 'exact' || v === 'valide' ? 'ok' : v === 'faux' || v === 'rejeter' ? 'ko' : 'moyen');
  const dan = votes.map((v) => cat(v.verdict_dan));
  const ia = votes.map((v) => cat(v.verdict_ia));
  const po = dan.filter((d, i) => d === ia[i]).length / n;
  const cats = ['ok', 'moyen', 'ko'];
  const pe = cats.reduce((s, c) =>
    s + (dan.filter((x) => x === c).length / n) * (ia.filter((x) => x === c).length / n), 0);
  return pe === 1 ? null : Math.round(((po - pe) / (1 - pe)) * 100) / 100;
}

async function votes(supabase: Admin): Promise<Vote[]> {
  const { data } = await supabase.from('ops_notes').select('content').eq('source', 'audit');
  // Le type de `data` remonte `never` quand le schéma généré ne connaît pas ops_notes (table de la
  // base de TRAVAIL, pas du site) : on annote la ligne au lieu de laisser l'inférence échouer.
  return ((data ?? []) as { content: string }[])
    .flatMap((n) => { try { return [JSON.parse(n.content) as Vote]; } catch { return []; } });
}

export async function GET() {
  if (!(await opsAllowed())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = admin();
  if (!supabase) return NextResponse.json({ error: 'supabase absent' }, { status: 500 });

  const dejaVus = new Set((await votes(supabase)).map((v) => v.result_id));

  // Échantillon : TOUT ce que le juge a validé — y compris ce qui est déjà appliqué en base.
  // Auditer l'appliqué a deux vertus : ça mesure le juge ET ça retrouve les erreurs déjà en prod.
  const { data: pool } = await supabase
    .from('agent_results')
    .select('id, task_type, target_slug, model, payload, result, status, review_status, auto_verdict, auto_score')
    .eq('auto_verdict', 'valide')
    .in('status', ['done', 'suspect'])
    .order('id', { ascending: false })
    .limit(200);

  const restants = (pool ?? []).filter((r) => !dejaVus.has(r.id));
  const v = await votes(supabase);
  const accord = v.length ? v.filter((x) => x.verdict_dan === 'exact').length / v.length : null;

  return NextResponse.json({
    // le verdict du juge est RETIRÉ de la fiche envoyée : l'aveugle, c'est tout l'intérêt
    fiche: restants[0] ? { ...restants[0], auto_verdict: undefined, auto_score: undefined } : null,
    restants: restants.length,
    juges: v.length,
    accord: accord == null ? null : Math.round(accord * 100),
    kappa: kappa(v),
    desaccords: v.filter((x) => x.verdict_dan !== 'exact').length,
  });
}

export async function POST(req: Request) {
  if (!(await opsAllowed())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = admin();
  if (!supabase) return NextResponse.json({ error: 'supabase absent' }, { status: 500 });

  // `juge` : qui a tranché — 'dan' (défaut) ou 'claude' (audit délégué du 26/07). La provenance
  // reste dans les données : un accord mesuré doit dire CONTRE QUOI il a été mesuré.
  const { result_id, verdict_dan, juge, motif } = (await req.json()) as
    { result_id: number; verdict_dan: Vote['verdict_dan']; juge?: string; motif?: string };
  const { data: row } = await supabase.from('agent_results').select('*').eq('id', result_id).single();
  if (!row) return NextResponse.json({ error: 'introuvable' }, { status: 404 });

  await supabase.from('ops_notes').insert({
    source: 'audit',
    content: JSON.stringify({ result_id, verdict_dan, verdict_ia: row.auto_verdict, task_type: row.task_type, juge: juge ?? 'dan', motif }),
  });

  // Dan dit « faux » sur une fiche DÉJÀ appliquée → on retire ce que l'agent avait ajouté.
  // Le retour arrière est exact : les remplisseurs ne ciblent QUE des champs vides,
  // donc annuler = remettre à vide (aucune donnée humaine ne peut être écrasée).
  let annule = false;
  let arcsRetires = 0;
  let sectionsRetirees = 0;
  if (verdict_dan === 'faux' && row.review_status === 'approved') {
    const { data: entry } = await clientSite().from('akasha_entries').select('id, attributes').eq('slug', row.target_slug).single();
    if (entry) {
      if (row.task_type === 'fiche_section') {
        // UNE SECTION VIT DANS akasha_sections, jamais dans attributes (05/08) : annuler,
        // c'est retirer LA ligne posée (entry_id, idx) — le pendant exact de retirerDuGraphe
        // pour les arêtes. Sans index dans le payload on ne retire RIEN : retirerSections
        // sans index effacerait TOUTES les sections de la fiche, celles des autres
        // producteurs comprises.
        const idx = row.payload?.section_index;
        if (idx != null && String(idx).length)
          sectionsRetirees = await retirerSections(clientSite(), entry.id, [String(idx)]);
      } else {
        const patch: Record<string, unknown> = { ...(entry.attributes ?? {}) };
        if (row.task_type === 'akasha_relations') {
          delete patch.relations; delete patch.relationsSource;
          // Le nettoyage du GRAPHE est la moitié qui compte : effacer attributes.relations sans
          // retirer les arêtes laisserait la fiche jugée FAUSSE peupler les rails du site pour
          // toujours, invisible en console. Une annulation à moitié faite est pire que rien.
          arcsRetires = (await retirerDuGraphe(supabase, {
            resultId: result_id, slug: row.target_slug, relations: row.result?.relations,
          })).supprimees;
        }
        else if (row.task_type === 'akasha_attrs') {
          for (const k of Object.keys(row.result ?? {})) if (!k.endsWith('_preuve')) delete patch[k];
        } else { delete patch.descFr; delete patch.descFrSource; }
        await clientSite().from('akasha_entries').update({ attributes: patch }).eq('slug', row.target_slug);
      }
      await supabase.from('agent_results').update({ review_status: 'rejected' }).eq('id', result_id);
      annule = true;
    }
  }

  const v = await votes(supabase);
  return NextResponse.json({
    ok: true,
    annule,
    arcsRetires,
    sectionsRetirees,
    juges: v.length,
    accord: Math.round((v.filter((x) => x.verdict_dan === 'exact').length / v.length) * 100),
    kappa: kappa(v),
  });
}
