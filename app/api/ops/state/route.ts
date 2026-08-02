// app/api/ops/state/route.ts — état de la console OPS (file pgmq + résultats d'agents)
// et actions de review. Verrouillé localhost (lib/ops/guard).
import { NextResponse } from 'next/server';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { clientOps, clientSite } from '@/lib/ops/db.mjs';
import { opsAllowed } from '@/lib/ops/guard';
import { AGENTS, type AgentEtat } from '@/lib/ops/agents';
// .mjs de données pures, partagé avec le worker Node — une seule source pour les plafonds.
import { LIMITES_FOURNISSEURS } from '@/lib/ops/limites.mjs';

type Limite = { requetes: number; jetons: number; fenetre: number; parJour?: number; jetonsParJour?: number };
import { poserAuGraphe, type IndexUnivers } from '@/lib/akasha/relations';

export const dynamic = 'force-dynamic';

const admin = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? clientOps()
    : null;

export async function GET(req: Request) {
  const complet = new URL(req.url).searchParams.get('bloc') === 'lent';
  // ?bloc=lent absent → réponse LÉGÈRE (pas les 16 counts d'univers). Le client demande le
  // bloc lent toutes les 4 requêtes : même fraîcheur perçue, 70 % de requêtes en moins.

  if (!(await opsAllowed())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = admin();
  if (!supabase) return NextResponse.json({ error: 'supabase absent' }, { status: 500 });

  // Comptes SERVEUR exacts : le kanban n'affiche que 120 lignes, mais les boutons de lot
  // agissent sur toute la base — les libellés doivent annoncer la portée réelle (audit du
  // 01/08 : le dialogue disait « 18 fiches » et le lot en aurait écrit 107).
  // Les comptes de chaque bac : la console n'affiche plus les fiches (elles ont leurs pages),
  // elle en montre le volume et y renvoie. Cinq counts légers valent mieux que 120 lignes
  // chargées pour rien à chaque tick.
  const bac = (f: (q: any) => any) => f(supabase.from('agent_results')
    .select('*', { count: 'exact', head: true }).neq('task_type', 'review_local'));
  const [{ count: nRelire }, { count: nDouteuses }, { count: nEcartees }, { count: nApprouvees }, { count: nRejetees }] =
    await Promise.all([
      bac((q: any) => q.eq('review_status', 'pending').eq('status', 'done')),
      bac((q: any) => q.eq('review_status', 'pending').eq('status', 'suspect')),
      bac((q: any) => q.eq('review_status', 'pending').eq('status', 'refused')),
      bac((q: any) => q.eq('review_status', 'approved')),
      bac((q: any) => q.eq('review_status', 'rejected')),
    ]);
  const { count: nEchecs } = await bac((q: any) => q.eq('review_status', 'pending').eq('status', 'failed'));

  const [{ count: pendingTotal }, { count: validesTotal }] = await Promise.all([
    supabase.from('agent_results').select('*', { count: 'exact', head: true })
      .eq('review_status', 'pending').in('status', ['done', 'suspect']),
    supabase.from('agent_results').select('*', { count: 'exact', head: true })
      .eq('review_status', 'pending').eq('auto_verdict', 'valide')
      .eq('auto2_verdict', 'valide').eq('status', 'done')
      .or('arbitre_verdict.is.null,arbitre_verdict.eq.valide'),
  ]);

  const [{ data: metrics }, { data: parType }, { data: results }] = await Promise.all([
    supabase.rpc('ops_queue_metrics'),
    supabase.rpc('ops_queue_by_type'),
    supabase
      .from('agent_results')
      .select(
        'id, task_type, target_slug, model, payload, result, status, review_status, error, created_at, auto_verdict, auto_motif, auto_model, auto_score, auto2_verdict, auto2_motif, auto2_model, arbitre_verdict, arbitre_motif, arbitre_model, auto_applique',
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

  // La flotte d'abord : c'est ELLE qui dit si l'usine travaille — l'ancien critère (le modèle
  // chargé dans l'Ollama LOCAL) affichait « worker à l'arrêt » avec 115 tâches en file pendant
  // que le VPS traitait à 40/h (mesuré le 01/08 : le GPU du Mac au repos ≠ usine arrêtée).
  const { data: workers } = await supabase
    .from('ops_workers').select('id, hote, role, detail, derniere_activite')
    .order('derniere_activite', { ascending: false });
  const usineVivante = (workers ?? []).some((w) =>
    w.role === 'agents' && Date.now() - new Date(w.derniere_activite as string).getTime() < 180_000);

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
    const actif = Boolean(usineVivante && a.modele !== 'HHEM-2.1 (0,1 Md)' && file > 0);

    let etat: AgentEtat['etat'] = 'inactif';
    let action = 'aucune tâche en file';
    if (file > 0) {
      etat = actif ? 'travaille' : 'attente';
      action = actif
        ? `traite « ${dernier?.payload?.name ?? '…'} » · ${file} en file`
        : `${file} tâche(s) en file, aucun nœud vivant`;
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

  // ── LA FLOTTE (L23-L25) — la console était restée centrée sur le Mac alors que l'usine vit
  // maintenant sur plusieurs nœuds : VPS 24/7, GPU local, salves de campagne. Un battement de
  // moins de 3 min = nœud vivant ; « ollama » dans le détail = il a un GPU.
  const flotte = (workers ?? []).map((w) => ({
    id: w.id as string,
    role: w.role as string,
    detail: (w.detail ?? '') as string,
    gpu: String(w.detail ?? '').includes('ollama'),
    vuA: w.derniere_activite as string,   // l'âge se calcule au RENDU — un snapshot vieillit mal dans un onglet sans focus
    ageSec: Math.round((Date.now() - new Date(w.derniere_activite as string).getTime()) / 1000),
  })).filter((w) => w.ageSec < 86_400);

  // ── LES COULOIRS — quel modèle a encore du budget, lequel a fermé son guichet du jour.
  // C'est LE tableau de bord qui manquait : en une journée on a vu Groq plafonner à 2 000
  // jetons/jour et llama-70b mourir à midi, sans que rien ne le montre à l'écran.
  // Les plafonds viennent de lib/ops/limites.mjs, le MÊME fichier que lit le worker. Ils étaient
  // recopiés ici à la main jusqu'au 02/08, et les deux copies ont divergé le jour même : la
  // console annonçait « nvidia — fermé, requêtes épuisées » alors que le worker venait de rouvrir
  // le couloir, et j'ai cherché la panne du mauvais côté. Un tableau de bord qui ment envoie
  // chercher au mauvais endroit — il coûte plus cher que pas de tableau de bord du tout.
  // On ne garde que les entrées PAR MODÈLE (avec un « / ») : les autres sont les replis par
  // fournisseur, qui ne correspondent à aucun couloir réellement emprunté.
  const PLAFONDS = Object.fromEntries(
    Object.entries(LIMITES_FOURNISSEURS as Record<string, Limite>)
      .filter(([cle]) => cle.includes('/'))
      .map(([cle, l]) => [cle, { parJour: l.parJour, parMinute: l.requetes, jetonsParJour: l.jetonsParJour }]),
  ) as Record<string, { parJour?: number; parMinute: number; jetonsParJour?: number }>;
  const { data: quotas } = await supabase.from('ops_quotas').select('fournisseur, requetes, jetons, fenetre_debut');
  const parCle = new Map((quotas ?? []).map((q) => [q.fournisseur as string, q]));
  const couloirs = Object.entries(PLAFONDS).map(([cle, lim]) => {
    const jour = parCle.get(`${cle}:jour`);
    const perimee = !jour || Date.now() - new Date(jour.fenetre_debut as string).getTime() > 86_400_000;
    const consomme = perimee ? 0 : Number(jour?.requetes ?? 0);
    const jetons = perimee ? 0 : Number(jour?.jetons ?? 0);
    // Deux guichets ferment un couloir : les requêtes ET les jetons. Ignorer le second
    // affichait gpt-oss « 783/800 » grand ouvert alors que ses 2 000 jetons/jour étaient
    // brûlés depuis le matin (audit du 01/08).
    const fermeJetons = lim.jetonsParJour ? jetons >= lim.jetonsParJour : false;
    const fermeRequetes = lim.parJour ? consomme >= lim.parJour : false;
    return {
      cle, court: cle.split('/').pop() as string,
      payant: cle.startsWith('deepinfra/'),
      parJour: lim.parJour ?? null,
      consomme,
      restant: lim.parJour ? Math.max(0, lim.parJour - consomme) : null,
      ferme: fermeRequetes || fermeJetons,
      motifFermeture: fermeJetons ? 'jetons épuisés' : fermeRequetes ? 'requêtes épuisées' : null,
    };
  });

  // ── L'ARBITRE CLAUDE en temps réel (assaut du 02/08) : verdicts de l'heure et file de lots.
  const [{ count: claudeHeure }, { data: fileLots }] = await Promise.all([
    supabase.from('agent_results').select('*', { count: 'exact', head: true })
      .ilike('arbitre_motif', '⚖ Claude%').gte('arbitre_at', new Date(Date.now() - 3600_000).toISOString()),
    supabase.rpc('ops_queue_by_type'),
  ]);
  const litigesEnFile = (fileLots ?? []).reduce((n: number, x: { task_type: string; en_attente: number }) =>
    n + (x.task_type === 'arbitrage_claude' ? Number(x.en_attente)
      : x.task_type === 'arbitrage_claude_lot' ? Number(x.en_attente) * 10 : 0), 0);

  // ── LE JURY RÉEL — qui a rendu les verdicts de la dernière heure. Un jury sur le papier ne
  // vaut rien : ce qui compte est le modèle qui a effectivement tranché.
  const depuisH = new Date(Date.now() - 3_600_000).toISOString();
  const { data: verdicts } = await supabase.from('agent_results')
    .select('auto_model, auto2_model, auto_at, auto2_at').or(`auto_at.gte.${depuisH},auto2_at.gte.${depuisH}`).order('id', { ascending: false }).limit(400);
  // Chaque verdict est compté sur SON horodatage : le .or() ramène la ligne dès qu'UN des
  // deux est récent, et compter les deux gonflait le tally de ~20 % (mesuré : 100 affichés
  // pour 81 réels côté juge n°1).
  const compte = (champ: 'auto_model' | 'auto2_model', at: 'auto_at' | 'auto2_at') => {
    const m: Record<string, number> = {};
    for (const v of verdicts ?? []) {
      const k = v[champ] as string | null;
      const t = v[at] as string | null;
      if (!k || !t || t < depuisH) continue;
      m[k.split('/').pop() as string] = (m[k.split('/').pop() as string] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([nom, n]) => ({ nom, n }));
  };
  const jury = { juge1: compte('auto_model', 'auto_at'), juge2: compte('auto2_model', 'auto2_at') };

  // ── CADENCE — productions abouties dans l'heure, le seul chiffre qui dit si ça avance.
  const { count: cadence } = await supabase.from('agent_results')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', depuisH).neq('task_type', 'review_local')
    .in('status', ['done', 'suspect']);   // une heure de refus de garde ne doit pas s'afficher verte

  // ── COUVERTURE PAR UNIVERS — l'objectif final, univers par univers. Deux comptes légers
  // chacun (pas de scan) : total, et combien portent déjà une description française.
  const UNIVERS = ['Naruto', 'One Piece', 'Dragon Ball', 'Bleach', "JoJo's Bizarre Adventure",
    'Hunter x Hunter', 'Death Note', 'Initial D'];
  // « avecDossier » ajouté le 02/08 : la jauge ne montrait que descFr alors que la production
  // du jour (sections L26) n'y apparaît pas — 279 sections Death Note publiées et un compteur
  // immobile. Un tableau de bord doit mesurer l'objectif COURANT, pas celui d'hier.
  // PERSONNAGES d'abord (02/08, correction de Dan) : toutes entrées confondues, la jauge
  // devenait absurde — « 77 dossiers » pour 74 fiches Death Note, 30 dossiers pour 26 persos
  // Initial D (les voitures comptaient). La jauge mesure les FICHES personnages ; le reste
  // (jutsu, lieux, autos…) part dans « autres », visible mais séparé.
  // Plafond DUR sur la couverture (03/08) : ces 48 counts vivent sur SUPABASE (le site),
  // pas sur la base de travail — sous restrictions egress ils pendaient sans fin et gelaient
  // le tick lent, donc toute la console. 6 s ou rien : le client garde la dernière valeur.
  const avecPlafond = <T,>(p: Promise<T>): Promise<T | null> =>
    Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), 6_000))]);
  const univers = !complet ? null : await avecPlafond(Promise.all(UNIVERS.map(async (u) => {
    const base = () => clientSite().from('akasha_entries').select('*', { count: 'exact', head: true }).eq('universe', u);
    const [{ count: total }, { count: avecFr }, { count: avecDossier },
      { count: aTotal }, { count: aFr }, { count: aDossier }] = await Promise.all([
      base().eq('type', 'character'),
      base().eq('type', 'character').not('attributes->>descFr', 'is', null),
      base().eq('type', 'character').not('attributes->sections', 'is', null),
      base().neq('type', 'character'),
      base().neq('type', 'character').not('attributes->>descFr', 'is', null),
      base().neq('type', 'character').not('attributes->sections', 'is', null),
    ]);
    return { nom: u, total: total ?? 0, avecFr: avecFr ?? 0, avecDossier: avecDossier ?? 0,
      autres: { total: aTotal ?? 0, avecFr: aFr ?? 0, avecDossier: aDossier ?? 0 } };
  })));

  return NextResponse.json({
    queue: metrics?.[0] ?? { queue_length: 0, total_messages: 0 },
    flotte, couloirs, jury, cadence: cadence ?? 0, univers,
    arbitreClaude: { verdictsHeure: claudeHeure ?? 0, litigesEnFile },
    pendingTotal: pendingTotal ?? 0, validesTotal: validesTotal ?? 0,
    bacs: { relire: nRelire ?? 0, douteuses: nDouteuses ?? 0, ecartees: nEcartees ?? 0,
            approuvees: nApprouvees ?? 0, rejetees: nRejetees ?? 0, echecs: nEchecs ?? 0 },
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

  // Lot : applique les productions au CRITÈRE DE L'USINE — double verdict unanime, statut
  // done strict, et jamais contre l'arbitre. Resserré le 01/08 : l'ancien filtre (juge n°1
  // seul, suspect accepté) aurait écrit 107 fiches en en annonçant 18, dont 79 avec le juge
  // n°2 CONTRE et 41 où l'arbitre avait tranché contre — l'audit l'a mesuré sur pièces.
  // L'override d'une fiche refusée par le jury reste possible, mais À L'UNITÉ : un lot doit
  // être aussi exigeant que l'automate qu'il remplace.
  if (action === 'approve_all_valid') {
    const { data: rows } = await supabase
      .from('agent_results')
      .select('id')
      .eq('review_status', 'pending')
      .eq('auto_verdict', 'valide')
      .eq('auto2_verdict', 'valide')
      .eq('status', 'done')
      .or('arbitre_verdict.is.null,arbitre_verdict.eq.valide');
    let applied = 0;
    // Un seul index d'univers pour tout le lot : sans lui, 40 approbations One Piece = 40 scans
    // paginés du registre. Le cache meurt avec la requête (jamais de vue périmée entre deux clics).
    const cacheIndex = new Map<string, IndexUnivers>();
    for (const r of rows ?? []) {
      const res = await applyResult(supabase, r.id, cacheIndex);
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
async function applyResult(supabase: Admin, id: number, cacheIndex?: Map<string, IndexUnivers>): Promise<boolean> {
  const { data: row } = await supabase.from('agent_results').select('*').eq('id', id).single();
  if (!row) return false;

  const { data: entry } = await clientSite().from('akasha_entries')
    .select('attributes')
    .eq('slug', row.target_slug)
    .single();
  if (!entry) return false;

  const patch: Record<string, unknown> = { ...(entry.attributes ?? {}) };
  let versGraphe: Array<Record<string, string>> | null = null;
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
    versGraphe = rel;
  } else if (row.task_type === 'toilettage_fr' && !(row.payload as Record<string, string>)?.section_index) {
    // Toilettage d'une DESCRIPTION (Naruto/One Piece : leur prose est descFr, pas des sections).
    if (!row.result?.texte) return false;
    patch.descFr = row.result.texte;
    patch.descFrSource = `${row.model} (toilettage)`;
  } else if (row.task_type === 'fiche_section' || row.task_type === 'toilettage_fr') {
    // MIROIR DE L'AUTO-APPLICATION (02/08) : sans ces deux branches, « Appliquer » sur une
    // section marquait la production approuvée SANS RIEN ÉCRIRE — seul le worker savait poser
    // une section. Le bouton mentait, exactement comme les neuf chiffres de la console le 01/08.
    // Une section se REMPLACE par son indice (le toilettage réécrit celle qui existe déjà).
    const p = (row.payload ?? {}) as Record<string, string>;
    const i = p.section_index;
    const texte = row.result?.texte as string | undefined;
    // Le toilettage ne renvoie pas de titre : il garde celui de la section qu'il corrige.
    const titre = (row.task_type === 'toilettage_fr' ? p.titre : row.result?.titre) as string | undefined;
    if (!i || !texte) return false;
    const dejaLa = (Array.isArray(patch.sections) ? patch.sections : []) as Array<Record<string, string>>;
    patch.sections = [...dejaLa.filter((s) => String(s.i) !== String(i)), { i: String(i), titre, texte }]
      .sort((a, b) => Number(a.i) - Number(b.i));
    patch.sectionsSource = row.model;
  }

  const { error } = await clientSite().from('akasha_entries').update({ attributes: patch }).eq('slug', row.target_slug);
  if (error) return false;

  // Sans cette seconde écriture, l'usine tournait pour rien : le site ne connaît QUE la table
  // akasha_relations (lib/akasha/queries.ts), et rien ne lit attributes.relations — 138 productions
  // pour 0 ligne de graphe au 01/08. attributes.relations reste écrit pour la prose (période,
  // résumé), que le graphe ne sait pas porter ; les arêtes, elles, vont enfin où on les regarde.
  if (versGraphe) {
    try {
      await poserAuGraphe(supabase, { resultId: id, slug: row.target_slug, relations: versGraphe }, cacheIndex);
    } catch (e) {
      // Le graphe est un BONUS de l'application : si l'upsert casse, la fiche reste écrite et
      // approuvée. Le backfill (scripts/backfill-relations-usine.mjs) rattrapera le retard.
      console.error('[ops] graphe non posé pour', row.target_slug, e);
    }
  }

  await supabase
    .from('agent_results')
    .update({ review_status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id);
  return true;
}
