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
  // L26 : l'expert des sections longues — il ne résume pas, il développe un chapitre.
  fiche_section: 'Rédacteur des sections',
  akasha_attrs: 'Taxonomiste',
  akasha_relations: 'Historien des relations',
};

/** « Archiviste des techniques de Naruto », « Biographe des personnages de Bleach »… */
export const nomExpert = (taskType, universe) =>
  `${ROLES[taskType]?.nom ?? NOMS_HORS_ROLES[taskType] ?? 'Expert'} de ${universe ?? "l'univers"}`;

/* ── Experts de NICHE (L19) : découverts dans les données, jamais décrétés ─
   Une entrée dont un attribut (village, clan, race, saga, element…) est partagé par
   ≥ SEUIL_NICHE entrées relève d'un expert de niche : « Expert Konohagakure (Naruto) ».
   Le worker interroge la niche à la volée (caches en mémoire de processus). */
const SEUIL_NICHE = 8;
const CLES_NICHE_EXCLUES = new Set(['bio', 'history', 'summary', 'description', 'nindo', 'image', 'image_url', 'url', 'quote', 'era', 'descLang', 'source', 'role', 'about_hash', 'sex', 'age', 'height', 'weight', 'birthday', 'birthdate', 'blood_type', 'status', 'villageSlug', 'rosterLabel']);
const valeurNiche = (v) => typeof v === 'string' && v.length >= 2 && v.length <= 60 && !/[.!?]\s/.test(v);
const cacheTailles = new Map();      // "u␟k␟v" → nombre d'entrées du groupe
const cacheMembres = new Map();      // "u␟k␟v" → noms (pour les exemplaires ciblés)

/** La niche la plus spécifique (groupe qualifié le PLUS PETIT) couvrant cette entrée. */
export async function expertNiche(supabase, universe, name) {
  if (!universe || !name) return null;
  try {
    const { data } = await supabase.from('akasha_entries')
      .select('attributes').eq('universe', universe).eq('name', name).limit(1);
    const attrs = data?.[0]?.attributes ?? {};
    const candidats = [];
    for (const [k, v] of Object.entries(attrs)) {
      if (CLES_NICHE_EXCLUES.has(k) || !valeurNiche(v)) continue;
      const id = `${universe}␟${k}␟${v}`;
      if (!cacheTailles.has(id)) {
        const { count } = await supabase.from('akasha_entries')
          .select('id', { count: 'exact', head: true })
          .eq('universe', universe).eq(`attributes->>${k}`, v);
        cacheTailles.set(id, count ?? 0);
      }
      if (cacheTailles.get(id) >= SEUIL_NICHE) candidats.push({ axe: k, valeur: v, membres: cacheTailles.get(id), id });
    }
    if (!candidats.length) return null;
    // le plus PETIT groupe qualifié = la spécialité la plus pointue (clan Uchiha avant Konohagakure)
    const n = candidats.sort((a, b) => a.membres - b.membres)[0];
    if (!cacheMembres.has(n.id)) {
      const { data: m } = await supabase.from('akasha_entries')
        .select('name').eq('universe', universe).eq(`attributes->>${n.axe}`, n.valeur).limit(20);
      cacheMembres.set(n.id, (m ?? []).map((x) => x.name));
    }
    return { nom: `Expert ${n.valeur}`, axe: n.axe, valeur: n.valeur, membres: n.membres, noms: cacheMembres.get(n.id) };
  } catch { return null; }             // la niche ne bloque jamais la production
}

/** Mémoire d'un expert (type × univers) : exemplaires approuvés + leçons des verdicts.
    Si `nomsCluster` est fourni, les exemplaires viennent d'abord du même groupe de niche. */
export async function memoireExpert(supabase, taskType, universe, nomsCluster) {
  if (!universe) return '';
  try {
    // Le champ de PROSE dépend du rôle : une section rend { titre, texte }, une fiche { descFr }.
    // Filtrer en dur sur descFr rendait la mémoire vide pour tout rôle qui n'en produit pas —
    // on livrait alors un expert « à mémoire » qui n'apprenait rien (défaut relevé le 01/08).
    const champProse = taskType === 'fiche_section' ? 'texte' : 'descFr';
    // Les requêtes Supabase sont MUTABLES : une fabrique par tentative, jamais de réutilisation.
    const fabriqueEx = () => supabase.from('agent_results')
      .select('payload, result')
      .eq('task_type', taskType).eq('payload->>universe', universe)
      .eq('review_status', 'approved').not(`result->${champProse}`, 'is', null)
      .order('id', { ascending: false }).limit(2);
    let exemplaires = null;
    if (nomsCluster?.length) {
      const { data } = await fabriqueEx().in('payload->>name', nomsCluster.slice(0, 20));
      if (data?.length) exemplaires = data;   // priorité au même groupe de niche
    }
    if (!exemplaires) exemplaires = (await fabriqueEx()).data ?? [];
    const lec = await supabase.from('agent_results')
      .select('auto_motif, auto2_motif')
      .eq('task_type', taskType).eq('payload->>universe', universe)
      .or('auto_verdict.eq.a_corriger,auto2_verdict.eq.a_corriger,review_status.eq.rejected')
      .order('id', { ascending: false }).limit(3);
    const exemples = exemplaires
      .map((r) => `- (${r.payload?.name}${r.payload?.section_titre ? ` · ${r.payload.section_titre}` : ''}) `
        + `« ${String(r.result?.[champProse] ?? '').slice(0, 260)} »`);
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
