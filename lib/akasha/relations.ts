// lib/akasha/relations.ts — pont entre l'usine IA (agent_results.result.relations) et le GRAPHE,
// c'est-à-dire la table akasha_relations : la SEULE que le site interroge (lib/akasha/queries.ts).
//
// Vécu du 01/08 : 138 productions « historien des relations », 24 appliquées, 0 ligne de graphe.
// L'application écrivait dans akasha_entries.attributes.relations, que AUCUN composant ne lit —
// du travail de GPU jeté. Ce module ferme la boucle, dans les deux sens : poser ET retirer.
//
// Importable des deux côtés : depuis Next (`@/lib/akasha/relations`) et depuis les scripts .mjs
// (`../lib/akasha/relations.ts`, Node ≥ 22.18 retire les types tout seul). D'où la contrainte :
// ce fichier ne contient QUE de la syntaxe effaçable — pas d'enum, pas de namespace.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Natures produites par l'agent (enum figée dans scripts/agent-worker.mjs) → natures du graphe.
 *  `null` = volontairement NON versée : « autre » ne dit pas de quoi il s'agit, et une arête sans
 *  sémantique pollue les rails du site (« Allié·es », « Membres »…) sans rien apprendre. */
export const NATURE_VERS_GRAPHE: Record<string, string | null> = {
  'famille': 'famille',
  'mentor': 'mentor',
  'élève': 'eleve',
  'allié': 'allie',
  'ennemi': 'ennemi',
  'rival': 'rival',
  // Les quatre nuances d'appartenance retombent sur la MÊME arête : le graphe dit que le lien
  // existe, la nuance (passé/actuel, chef/subalterne) reste dans le résumé de la production.
  'ancien équipage': 'appartient',
  'équipage actuel': 'appartient',
  'subordonné': 'appartient',
  'supérieur': 'appartient',
  'autre': null,
};

/** Les natures qui signifient « l'histoire de ce personnage est racontée » — le test d'idempotence
 *  de scripts/ops-fill-relations.mjs.
 *  `appartient` en est VOLONTAIREMENT exclu : les seeders d'équipages/organisations en ont posé
 *  1 900 en masse, et 204 des 400 personnages majeurs en portent une. S'en servir comme preuve
 *  ferait passer l'agent à côté de presque tous les héros — ceux dont l'histoire vaut le plus.
 *  Même raison pour `maitrise` (5 018 liens perso→technique) : une attaque n'est pas un passé. */
export const NATURES_HISTOIRE = ['famille', 'mentor', 'eleve', 'allie', 'ennemi', 'rival'];

/** Nature de l'usine → nature du graphe, ou `null` si on n'en tire rien.
 *  NFC obligatoire : le JSON d'un modèle local arrive parfois en NFD (« élève » = e + ́ ),
 *  et la clé littérale de la table ci-dessus est alors ratée en silence. */
export function natureVersGraphe(nature: unknown): string | null {
  if (typeof nature !== 'string') return null;
  return NATURE_VERS_GRAPHE[nature.normalize('NFC').trim().toLowerCase()] ?? null;
}

/** Clé de rapprochement d'un nom libre : minuscules, accents retirés, ponctuation → espace.
 *  Recette IDENTIQUE à scripts/build-akasha-op-links.mjs — deux normalisations qui divergent,
 *  ce sont deux graphes qui divergent. */
export function normaliserNom(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Clé SOUPLE : tokens triés d'un nom dont les voyelles longues sont aplaties.
 *  Elle absorbe les deux pièges mesurés le 01/08 sur les 24 fiches approuvées :
 *   · l'ordre — le registre One Piece stocke « Teach Marshall D. », l'agent écrit « Marshall D. Teach » ;
 *   · le macron — « Sōsuke Aizen » en base (NFD → « sosuke ») contre « Sousuke Aizen » chez l'agent.
 *  Elle NE rattrape PAS les noms partiels (« Naruto » pour « Naruto Uzumaki », « Goku » pour
 *  « Goku SSJ ») : ces cibles-là sont ambiguës, et une arête fausse coûte plus qu'une arête absente. */
export function cleSouple(s: unknown): string {
  const aplati = normaliserNom(s)
    .replace(/ou/g, 'o')
    .replace(/([aeiou])\1/g, '$1');
  return aplati.split(' ').filter(Boolean).sort().join(' ');
}

/** Slug canonique d'un nom (même recette que les seeders AKASHA). */
export function slugifier(s: unknown): string {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Ce qu'une nature de relation EXIGE de sa cible. Sert uniquement à garder la passe « nom
 *  partiel » : une relation personnelle ne peut pas pointer sur une organisation, et
 *  réciproquement. Mesuré le 05/08 : sans cette garde, « ennemi de Big Mom » résolvait sur
 *  « L'équipage de Big Mom », et « équipage actuel : Foxy Pirates » sur « Foxy Pirates' Referee ».
 *  Les natures absentes de cette table (supérieur, subordonné…) acceptent les deux : un supérieur
 *  peut être une personne comme une institution. */
const NATURE_ATTEND_TYPE: Record<string, 'character' | 'groupe'> = {
  'famille': 'character', 'mentor': 'character', 'élève': 'character',
  'allié': 'character', 'ennemi': 'character', 'rival': 'character',
  'ancien équipage': 'groupe', 'équipage actuel': 'groupe',
};

/** Registre d'alias INVERSÉ : titre du wiki (normalisé) → nom NIKA, par univers.
 *  Chargé une fois, à la lecture du module. Ce module ne part jamais au navigateur (seuls deux
 *  routes serveur et les scripts .mjs l'importent) ; le try/catch garantit malgré tout une
 *  dégradation propre — sans registre, on retombe exactement sur le comportement d'avant. */
const ALIAS_INVERSE: Map<string, string> = (() => {
  const m = new Map<string, string>();
  try {
    const brut = JSON.parse(readFileSync(join(process.cwd(), 'data', 'alias-cures.json'), 'utf8')) as
      Record<string, Record<string, string>>;
    for (const [univers, paires] of Object.entries(brut))
      for (const [nomNika, titreWiki] of Object.entries(paires))
        m.set(`${univers}|${normaliserNom(titreWiki)}`, nomNika);
  } catch { /* registre absent : la résolution garde ses quatre passes d'origine */ }
  return m;
})();

export type RelationUsine = { avec?: unknown; nature?: unknown; [k: string]: unknown };
export type LigneGraphe = { from_entry: string; to_entry: string; relation: string };
type EntreeIndexee = { id: string; slug: string; name: string; type?: string };

export type IndexUnivers = {
  univers: string;
  taille: number;
  /** Nom libre → entrée du MÊME univers, ou null. Aucun rattrapage flou : une cible ambiguë est
   *  perdue, jamais devinée (un faux lien coûte plus cher qu'un lien manquant).
   *  `nature` (facultative) arme la garde de type sur la passe « nom partiel ». */
  resoudre: (nom: unknown, nature?: unknown) => EntreeIndexee | null;
};

type ClientAdmin = SupabaseClient;

/** Index des entrées d'un univers, prêt à résoudre les cibles `avec` de l'usine.
 *  Pagination obligatoire : PostgREST plafonne à 1 000 lignes et plusieurs univers dépassent —
 *  sans elle on « ne résout pas » des cibles qui existent pourtant, tout en ayant l'air de marcher. */
export async function indexerUnivers(
  supabase: ClientAdmin,
  univers: string,
  cache?: Map<string, IndexUnivers>,
): Promise<IndexUnivers> {
  const dejaLa = cache?.get(univers);
  if (dejaLa) return dejaLa;

  const lignes: { id: string; slug: string; name: string; type: string; roman: string | null }[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await supabase
      .from('akasha_entries')
      .select('id, slug, name, type, roman:attributes->>roman_name')
      .eq('universe', univers)
      .range(debut, debut + 999);
    if (error) throw new Error(`index univers « ${univers} » : ${error.message}`);
    const page = (data ?? []) as typeof lignes;
    lignes.push(...page);
    if (page.length < 1000) break;
  }

  // Quatre passes, par confiance décroissante : nom normalisé → roman_name → slug → clé souple.
  // `Map.set` sans écrasement : le PREMIER inscrit gagne, l'ordre de la base fait foi.
  const parNom = new Map<string, EntreeIndexee>();
  const parRoman = new Map<string, EntreeIndexee>();
  const parSlug = new Map<string, EntreeIndexee>();
  const parSouple = new Map<string, EntreeIndexee>();
  // Garde-fou de la passe souple : une clé que DEUX entrées différentes revendiquent est retirée,
  // jamais arbitrée. « Dragon Claw » et « Claw Dragon » ont le même jeu de tokens — dans le doute,
  // on ne relie rien (le registre contient des paires comme ça, mesurées le 01/08).
  const soupleAmbigu = new Set<string>();
  for (const l of lignes) {
    const e: EntreeIndexee = { id: l.id, slug: l.slug, name: l.name, type: l.type };
    const n = normaliserNom(l.name);
    if (n && !parNom.has(n)) parNom.set(n, e);
    const r = normaliserNom(l.roman);
    if (r && !parRoman.has(r)) parRoman.set(r, e);
    if (!parSlug.has(l.slug)) parSlug.set(l.slug, e);
    for (const brut of [l.name, l.roman]) {
      const s = cleSouple(brut);
      if (!s) continue;
      const tenant = parSouple.get(s);
      if (!tenant) parSouple.set(s, e);
      else if (tenant.id !== e.id) soupleAmbigu.add(s);
    }
  }
  for (const s of soupleAmbigu) parSouple.delete(s);

  // Cinquième et sixième passes (05/08) — mesurées sur les 1 204 cibles que l'usine n'avait pas
  // su résoudre : le registre d'alias en récupère 144 (784 arêtes) et le nom PARTIEL 159 de plus.
  //
  // 5. REGISTRE D'ALIAS INVERSÉ. Nos fiches portent le nom français ou japonais, l'agent écrit
  //    parfois le titre anglais du wiki (« Straw Hat Pirates » cité 113 fois pour une fiche qui
  //    s'appelle « L'équipage du Chapeau de Paille »). data/alias-cures.json contient déjà la
  //    correspondance, vérifiée contre la page réelle par trois sceptiques indépendants.
  //
  // 6. NOM PARTIEL, mais SEULEMENT s'il est unique ET de la bonne NATURE. La règle d'origine
  //    refusait tout nom partiel « parce qu'ambigu » ; c'est vrai quand plusieurs entrées
  //    répondent, faux quand une seule le fait. Le vrai danger n'était pas la partialité mais le
  //    CHANGEMENT DE NATURE : « ennemi de Big Mom » tombait sur « L'équipage de Big Mom », et
  //    « équipage actuel : Foxy Pirates » sur « Foxy Pirates' Referee ». D'où la garde : une
  //    relation personnelle exige un personnage, une relation de groupe exige une organisation.
  const parPartiel = new Map<string, EntreeIndexee[]>();
  for (const l of lignes) {
    const e: EntreeIndexee = { id: l.id, slug: l.slug, name: l.name, type: l.type };
    for (const mot of new Set(normaliserNom(l.name).split(' ').filter((m) => m.length > 2)))
      parPartiel.set(mot, [...(parPartiel.get(mot) ?? []), e]);
  }

  const index: IndexUnivers = {
    univers,
    taille: lignes.length,
    resoudre(nom, nature) {
      const n = normaliserNom(nom);
      if (!n) return null;
      const sur = parNom.get(n) ?? parRoman.get(n) ?? parSlug.get(slugifier(nom)) ?? parSouple.get(cleSouple(nom));
      if (sur) return sur;

      const parAlias = ALIAS_INVERSE.get(`${univers}|${n}`);
      if (parAlias) {
        const e = parNom.get(normaliserNom(parAlias));
        if (e) return e;
      }

      // Le nom partiel ne vaut que sur UN mot significatif et UNE seule entrée candidate.
      const mots = n.split(' ').filter((m) => m.length > 2);
      if (mots.length !== 1) return null;
      const cands = parPartiel.get(mots[0]) ?? [];
      if (cands.length !== 1) return null;
      const c = cands[0];
      const attendu = NATURE_ATTEND_TYPE[String(nature ?? '').normalize('NFC').trim().toLowerCase()];
      if (attendu === 'character' && c.type !== 'character') return null;
      if (attendu === 'groupe' && c.type === 'character') return null;
      return c;
    },
  };
  cache?.set(univers, index);
  return index;
}

/** Lignes de graphe déduites d'UNE production. Toute cible non résolue est ignorée en silence :
 *  on ne crée JAMAIS une entrée pour faire tenir une arête (un nœud inventé pourrit le registre). */
export function lignesDeGraphe(
  idSource: string,
  relations: RelationUsine[] | null | undefined,
  index: IndexUnivers,
): {
  lignes: LigneGraphe[];
  ignorees: { avec: string; motif: string }[];
  /** Journal de résolution, pour que le backfill montre à Dan CE QUI a été rapproché de quoi
   *  (« Marshall D. Teach » → « Teach Marshall D. ») : une passe souple doit rester relisible. */
  resolues: { avec: string; vers: string; relation: string }[];
} {
  const lignes: LigneGraphe[] = [];
  const ignorees: { avec: string; motif: string }[] = [];
  const resolues: { avec: string; vers: string; relation: string }[] = [];
  const vues = new Set<string>();

  for (const r of relations ?? []) {
    const avec = String(r?.avec ?? '');
    const relation = natureVersGraphe(r?.nature);
    if (!relation) { ignorees.push({ avec, motif: `nature « ${String(r?.nature)} » non versée` }); continue; }
    // La nature accompagne le nom : c'est elle qui garde la passe « nom partiel » contre les
    // changements d'espèce (une personne prise pour son équipage, et réciproquement).
    const cible = index.resoudre(avec, r?.nature);
    if (!cible) { ignorees.push({ avec, motif: 'cible absente du registre' }); continue; }
    // Une fiche qui se lie à elle-même (homonymie de résolution) : arête sans intérêt et boucle
    // visuelle sur la page — le seeder historique l'écarte déjà, on fait pareil.
    if (cible.id === idSource) { ignorees.push({ avec, motif: 'cible = source' }); continue; }
    const cle = `${relation}|${cible.id}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    lignes.push({ from_entry: idSource, to_entry: cible.id, relation });
    resolues.push({ avec, vers: cible.name, relation });
  }
  return { lignes, ignorees, resolues };
}

/** Fiche + index de son univers, en une fois (les deux appelants en ont toujours besoin ensemble). */
async function contexte(supabase: ClientAdmin, slug: string, cache?: Map<string, IndexUnivers>) {
  const { data: fiche } = await supabase
    .from('akasha_entries')
    .select('id, universe')
    .eq('slug', slug)
    .maybeSingle();
  if (!fiche) return null;
  const index = await indexerUnivers(supabase, (fiche as { universe: string }).universe, cache);
  return { id: (fiche as { id: string }).id, index };
}

/** Journal des arêtes RÉELLEMENT créées par une application, dans ops_notes (pas de DDL à faire
 *  exécuter à Dan — même astuce que l'audit à l'aveugle).
 *
 *  Pourquoi un journal plutôt que « recalculer puis supprimer » : la table contient déjà 44 `allie`
 *  et 34 `rival` CURÉS (seeds Naruto/One Piece). Si l'usine repose une arête qui existait déjà,
 *  l'upsert ne fait rien — mais une annulation naïve, elle, effacerait la ligne curée. Le journal
 *  enregistre la différence : on ne retire que ce qu'on a soi-même ajouté. */
const SOURCE_JOURNAL = 'graphe_usine';

/** Pose au graphe les relations d'une production approuvée. Renvoie de quoi tracer la boucle. */
export async function poserAuGraphe(
  supabase: ClientAdmin,
  params: { resultId: number; slug: string; relations: RelationUsine[] | null | undefined },
  cache?: Map<string, IndexUnivers>,
): Promise<{ posees: number; creees: number; ignorees: { avec: string; motif: string }[] }> {
  const ctx = await contexte(supabase, params.slug, cache);
  if (!ctx) return { posees: 0, creees: 0, ignorees: [] };

  const { lignes, ignorees } = lignesDeGraphe(ctx.id, params.relations, ctx.index);
  if (!lignes.length) return { posees: 0, creees: 0, ignorees };

  // Ce qui existait AVANT : la soustraction donne les arêtes dont nous sommes responsables.
  const { data: avant } = await supabase
    .from('akasha_relations')
    .select('to_entry, relation')
    .eq('from_entry', ctx.id)
    .in('to_entry', lignes.map((l) => l.to_entry));
  const dejaLa = new Set(((avant ?? []) as { to_entry: string; relation: string }[])
    .map((r) => `${r.relation}|${r.to_entry}`));
  const creees = lignes.filter((l) => !dejaLa.has(`${l.relation}|${l.to_entry}`));

  const { error } = await supabase
    .from('akasha_relations')
    .upsert(lignes, { onConflict: 'from_entry,to_entry,relation' });
  if (error) throw new Error(`upsert akasha_relations : ${error.message}`);

  if (creees.length) {
    await supabase.from('ops_notes').insert({
      source: SOURCE_JOURNAL,
      content: JSON.stringify({ result_id: params.resultId, slug: params.slug, creees }),
    });
  }
  return { posees: lignes.length, creees: creees.length, ignorees };
}

/** Miroir exact de `poserAuGraphe` : retire du graphe ce que l'application avait posé.
 *  Deux régimes, et le second est un pis-aller assumé :
 *   · journal présent → on supprime EXACTEMENT les arêtes créées (rien de curé n'est touché) ;
 *   · journal absent (arêtes posées avant ce module) → on recalcule les lignes et on les supprime,
 *     au risque d'emporter une arête curée identique. Mieux vaut ça qu'une relation fantôme :
 *     une fiche jugée FAUSSE qui continue de peupler les rails du site est le pire des deux. */
export async function retirerDuGraphe(
  supabase: ClientAdmin,
  params: { resultId: number; slug: string; relations: RelationUsine[] | null | undefined },
  cache?: Map<string, IndexUnivers>,
): Promise<{ supprimees: number; regime: 'journal' | 'recalcul' | 'rien' }> {
  // Pagination : le journal grossit d'une ligne par production appliquée, il finira par dépasser
  // le plafond de 1 000 de PostgREST — et une note manquée, c'est un repli par recalcul à tort.
  const notes: { id: number; content: string; done: boolean }[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data } = await supabase
      .from('ops_notes').select('id, content, done').eq('source', SOURCE_JOURNAL).range(debut, debut + 999);
    const page = (data ?? []) as typeof notes;
    notes.push(...page);
    if (page.length < 1000) break;
  }

  const aRetirer: LigneGraphe[] = [];
  const notesConsommees: number[] = [];
  let dejaSoldee = false;
  for (const n of notes) {
    try {
      const j = JSON.parse(n.content) as { result_id: number; creees: LigneGraphe[] };
      if (j.result_id !== params.resultId) continue;
      // Note SOLDÉE : cette production a déjà été annulée. Ne surtout pas retomber en recalcul —
      // ce serait supprimer des arêtes que quelqu'un d'autre a reposées depuis (ou une arête curée
      // homonyme). Un double clic sur « faux » ne doit rien coûter.
      if (n.done) { dejaSoldee = true; continue; }
      aRetirer.push(...(j.creees ?? []));
      notesConsommees.push(n.id);
    } catch { /* note illisible : elle ne concerne personne */ }
  }

  if (!notesConsommees.length && dejaSoldee) return { supprimees: 0, regime: 'rien' };
  const regime: 'journal' | 'recalcul' | 'rien' = notesConsommees.length ? 'journal' : 'recalcul';

  if (regime === 'recalcul') {
    const ctx = await contexte(supabase, params.slug, cache);
    if (!ctx) return { supprimees: 0, regime: 'rien' };
    aRetirer.push(...lignesDeGraphe(ctx.id, params.relations, ctx.index).lignes);
  }
  if (!aRetirer.length) return { supprimees: 0, regime: 'rien' };

  // Suppression ligne à ligne : le triplet est la clé, et PostgREST n'a pas de « delete where IN
  // (tuple) ». Les volumes sont minuscules (≤ 6 arêtes par production).
  let supprimees = 0;
  for (const l of aRetirer) {
    const { data } = await supabase
      .from('akasha_relations')
      .delete()
      .eq('from_entry', l.from_entry)
      .eq('to_entry', l.to_entry)
      .eq('relation', l.relation)
      .select('id');
    supprimees += data?.length ?? 0;
  }
  // Journal soldé : une seconde annulation ne doit pas re-supprimer des arêtes reposées depuis.
  if (notesConsommees.length) await supabase.from('ops_notes').update({ done: true }).in('id', notesConsommees);

  return { supprimees, regime };
}
