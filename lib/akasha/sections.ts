// lib/akasha/sections.ts — LE seul chemin de lecture et d'écriture des sections de dossier.
//
// Pourquoi ce module existe (05/08/2026, décision 4 du plan minimal) : les sections vivaient dans
// `akasha_entries.attributes.sections`, un tableau JSONB réécrit EN ENTIER à chaque pose. Deux
// écrivains simultanés — l'usine et un blitz fenêtre, ce qui arrive tous les jours — se perdaient
// mutuellement leur travail en silence. La table `akasha_sections` donne une ligne par section,
// avec une contrainte d'unicité (entry_id, idx) : l'idempotence devient structurelle.
//
// Importable des deux côtés (Next et scripts .mjs) : syntaxe effaçable uniquement, comme
// lib/akasha/relations.ts.
import type { SupabaseClient } from '@supabase/supabase-js';

export type Section = { i: string; titre?: string; texte: string };

/** FILET, plus un repli. La migration a tourné le 05/08 : 19 545 sections copiées, 4 645 fiches
 *  vérifiées une par une, puis le JSONB vidé (0 fiche sur 7 691 le porte encore). `attributsFiche`
 *  n'est donc plus jamais utilisé en pratique — il reste accepté pour qu'une restauration
 *  d'instantané antérieur au 05/08 s'affiche quand même, sans page blanche. */
let tableDisponible: boolean | null = null;

async function laTableRepond(supabase: SupabaseClient): Promise<boolean> {
  if (tableDisponible !== null) return tableDisponible;
  const { error } = await supabase.from('akasha_sections').select('id').limit(1);
  tableDisponible = !error;
  return tableDisponible;
}

/** Sections d'une fiche, triées par index. `attributsFiche` sert au repli JSONB. */
export async function lireSections(
  supabase: SupabaseClient,
  entryId: string,
  attributsFiche?: Record<string, unknown> | null,
): Promise<Section[]> {
  if (await laTableRepond(supabase)) {
    const { data } = await supabase
      .from('akasha_sections').select('idx, titre, texte').eq('entry_id', entryId);
    const lignes = (data ?? []) as { idx: string; titre: string | null; texte: string }[];
    if (lignes.length) return trier(lignes.map((l) => ({ i: l.idx, titre: l.titre ?? undefined, texte: l.texte })));
  }
  const brut = attributsFiche?.sections;
  return Array.isArray(brut) ? trier(brut as Section[]) : [];
}

/** Tri par index de wiki : « 2.10 » vient après « 2.9 », ce qu'un tri de chaînes rate. */
export function trier(sections: Section[]): Section[] {
  const cle = (s: Section) => String(s.i ?? '').split('.').map((n) => Number(n) || 0);
  return [...sections].sort((a, b) => {
    const x = cle(a), y = cle(b);
    for (let k = 0; k < Math.max(x.length, y.length); k++) {
      const d = (x[k] ?? 0) - (y[k] ?? 0);
      if (d) return d;
    }
    return 0;
  });
}

/** Pose des sections SANS jamais en écraser une déjà présente.
 *
 *  `ignoreDuplicates` s'appuie sur la contrainte d'unicité : une section déjà posée est laissée
 *  telle quelle, jamais remplacée. C'est la règle du 03/08 — l'usine publie en parallèle et sa
 *  version est passée par le double jury ; un blitz n'écrase pas un travail déjà validé — mais
 *  elle devient ici une garantie de la BASE au lieu d'une discipline de script.
 *
 *  @returns le nombre de sections réellement écrites.
 */
export async function poserSections(
  supabase: SupabaseClient,
  entryId: string,
  sections: Section[],
  source: string,
  /** `true` UNIQUEMENT pour le toilettage, qui corrige une section existante et doit donc
   *  l'écraser. Toute production neuve laisse `false` : ne jamais recouvrir un travail déjà validé. */
  remplacer = false,
): Promise<number> {
  const lignes = sections
    .filter((s) => s && String(s.texte ?? '').trim())
    .map((s) => ({ entry_id: entryId, idx: String(s.i), titre: s.titre ?? null, texte: String(s.texte), source }));
  if (!lignes.length) return 0;

  const { data, error } = await supabase
    .from('akasha_sections')
    .upsert(lignes, { onConflict: 'entry_id,idx', ignoreDuplicates: !remplacer })
    .select('id');
  if (error) throw new Error(`pose de sections : ${error.message}`);
  return (data ?? []).length;
}

/** Retire les sections d'une fiche — le pendant de `poserSections`, pour les purges d'audit
 *  (une fiche jugée fausse doit pouvoir être défaite exactement). */
export async function retirerSections(
  supabase: SupabaseClient,
  entryId: string,
  index?: string[],
): Promise<number> {
  let q = supabase.from('akasha_sections').delete().eq('entry_id', entryId);
  if (index?.length) q = q.in('idx', index);
  const { data, error } = await q.select('id');
  if (error) throw new Error(`retrait de sections : ${error.message}`);
  return (data ?? []).length;
}
