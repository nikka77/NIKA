// scripts/lib/akasha-experts.mjs — l'IDENTITÉ et la MÉMOIRE des experts (L18, demande Dan 28/07).
// Un expert = (univers × spécialité) : « l'Archiviste des techniques de Naruto » n'est pas
// « l'Archiviste des techniques de Bleach ». Il devient meilleur par sa MÉMOIRE : ses fiches
// APPROUVÉES (exemplaires qui ont passé la porte qualité) et les MOTIFS de ses erreurs jugées
// (leçons), réinjectés dans chaque prompt. La base de données EST le support d'apprentissage —
// pas de fichiers .html : chaque cycle production → double verdict → review/audit l'enrichit,
// et le site rend déjà ces fiches en pages HTML publiques.
import { ROLES } from './akasha-roles.mjs';

const NOMS_HORS_ROLES = {
  fandom_descfr: 'Biographe des personnages',
  akasha_attrs: 'Taxonomiste',
  akasha_relations: 'Historien des relations',
};

/** « Archiviste des techniques de Naruto », « Biographe des personnages de Bleach »… */
export const nomExpert = (taskType, universe) =>
  `${ROLES[taskType]?.nom ?? NOMS_HORS_ROLES[taskType] ?? 'Expert'} de ${universe ?? "l'univers"}`;

/** Mémoire d'un expert (type × univers) : exemplaires approuvés + leçons des verdicts. */
export async function memoireExpert(supabase, taskType, universe) {
  if (!universe) return '';
  try {
    const [ex, lec] = await Promise.all([
      supabase.from('agent_results')
        .select('payload, result')
        .eq('task_type', taskType).eq('payload->>universe', universe)
        .eq('review_status', 'approved').not('result->descFr', 'is', null)
        .order('id', { ascending: false }).limit(2),
      supabase.from('agent_results')
        .select('auto_motif, auto2_motif')
        .eq('task_type', taskType).eq('payload->>universe', universe)
        .or('auto_verdict.eq.a_corriger,auto2_verdict.eq.a_corriger,review_status.eq.rejected')
        .order('id', { ascending: false }).limit(3),
    ]);
    const exemples = (ex.data ?? [])
      .map((r) => `- (${r.payload?.name}) « ${String(r.result?.descFr ?? '').slice(0, 260)} »`);
    const lecons = [...new Set((lec.data ?? [])
      .flatMap((r) => [r.auto_motif, r.auto2_motif]).filter(Boolean)
      .map((m) => String(m).slice(0, 110)))].slice(0, 3);
    if (!exemples.length && !lecons.length) return '';
    return [
      exemples.length ? `TES FICHES DÉJÀ APPROUVÉES (garde ce niveau et ce ton) :\n${exemples.join('\n')}` : '',
      lecons.length ? `LEÇONS DE TES ERREURS PASSÉES (ne les répète pas) :\n${lecons.map((l) => `- ${l}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');
  } catch { return ''; }   // la mémoire ne doit JAMAIS bloquer la production
}
