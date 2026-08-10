// scripts/ops-fusionner-doublons.mjs — FUSIONNER EN BASE QUATRE PAIRES JUGÉES UNE PAR UNE.
//
// POURQUOI (09/08/2026)
// Deux audits ont désigné des candidats — l'un par image partagée, l'autre par squelette
// phonétique du nom. Aucun des deux ne conclut : sur 8 groupes de romanisation, UN SEUL était un
// vrai doublon (Kakō ≠ Kakkō, Maron ≠ Marron, Scarlet ≠ Scarlett existent tous séparément sur les
// wikis ; les deux Wind Daimyō portent deux portraits différents parce que ce sont deux hommes).
// Les quatre paires ci-dessous ont donc été tranchées une par une, chacune sur une preuve nommée.
//
// CE QUE « FUSIONNER » VEUT DIRE ICI : la fiche survivante récupère les champs qui lui manquent,
// les arêtes du doublon sont repointées vers elle (en sautant les boucles et les doublons d'arête
// que la contrainte d'unicité refuserait), ses sections de dossier sont reprises si la survivante
// n'en a pas, puis la fiche doublon est SUPPRIMÉE. La trace écrite AVANT contient les deux fiches
// entières : la suppression reste réversible tant que ce fichier existe.
//
// Usage : node --env-file=.env.local scripts/ops-fusionner-doublons.mjs [--write]
import { writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const WRITE = process.argv.includes('--write');
const s = clientSite();

const FUSIONS = [
  { perdant: 'juushirou-ukitake', survivant: 'jushiro-ukitake',
    preuve: 'Même image MyAnimeList (33251) et même personnage — capitaine de la 13e division. Deux romanisations du même nom : « Jūshirō » contre « Juushirou », l\'allongement vocalique noté au macron d\'un côté, par la voyelle doublée de l\'autre. La déduplication par nom ne peut pas les rapprocher.' },
  { perdant: 'shunsui-jirou-sakuranosuke-kyouraku', survivant: 'shunsui-kyoraku',
    preuve: 'Même image MyAnimeList (91747). Nom complet contre nom d\'usage du même capitaine de la 8e division — aucun audit par nom ne peut voir cette paire, seule l\'image la trahit.' },
  { perdant: 'jet-skis', survivant: 'waver',
    preuve: 'Même image de wiki (Waver_Infobox) et descFr décrivant mot pour mot le même véhicule de Skypiea. « Waver » est le titre de l\'article ; « Jet-Skis » en est la description française.' },
  { perdant: 'pays-des-fleurs', survivant: 'kano-country',
    preuve: 'Même image de wiki (Kano_Country_Infobox), et le descFr du doublon le dit lui-même : « Le Pays des fleurs, connu sous le nom de Kano Country ». La survivante porte en plus le bon type (place, contre status) et le bon résumé — celui du doublon annonce « Équipage de pirates » pour un pays du West Blue.' },
];

const trace = { chantier: 'fusion de doublons', quand: new Date().toISOString(), write: WRITE, fusions: [] };

for (const f of FUSIONS) {
  const { data: paire } = await s.from('akasha_entries')
    .select('id, slug, name, type, universe, summary, description, image_url, attributes')
    .in('slug', [f.perdant, f.survivant]);
  const p = (paire ?? []).find((x) => x.slug === f.perdant);
  const k = (paire ?? []).find((x) => x.slug === f.survivant);
  const ligne = { ...f, fait: false };
  if (!p) { ligne.motif = 'doublon déjà absent'; console.log(`⏭ ${f.perdant} : déjà absent`); trace.fusions.push(ligne); continue; }
  if (!k) { ligne.motif = 'survivante introuvable — RIEN TOUCHÉ'; console.error(`✗ ${f.survivant} introuvable`); trace.fusions.push(ligne); continue; }

  const { data: secP } = await s.from('akasha_sections').select('*').eq('entry_id', p.id);
  const { data: secK } = await s.from('akasha_sections').select('id').eq('entry_id', k.id);
  const { data: relsP } = await s.from('akasha_relations').select('id, from_entry, to_entry, relation')
    .or(`from_entry.eq.${p.id},to_entry.eq.${p.id}`);
  const { data: relsK } = await s.from('akasha_relations').select('from_entry, to_entry, relation')
    .or(`from_entry.eq.${k.id},to_entry.eq.${k.id}`);
  ligne.avant = { perdant: p, survivant: k, sectionsPerdant: secP ?? [], aretesPerdant: relsP ?? [] };

  // ── champs : la survivante ne perd jamais ce qu'elle a, elle gagne ce qui lui manque.
  const patch = {};
  if (!k.image_url && p.image_url) patch.image_url = p.image_url;
  if (!k.summary && p.summary) patch.summary = p.summary;
  if (!k.description && p.description) patch.description = p.description;
  const fusionAttrs = { ...(p.attributes ?? {}), ...(k.attributes ?? {}) };
  if (JSON.stringify(fusionAttrs) !== JSON.stringify(k.attributes ?? {})) patch.attributes = fusionAttrs;
  ligne.patchSurvivant = patch;

  // ── arêtes : on repointe, sauf boucle sur soi et sauf arête que la survivante possède déjà.
  const dejaK = new Set((relsK ?? []).map((r) => `${r.from_entry === k.id ? 'out' : 'in'}|${r.from_entry === k.id ? r.to_entry : r.from_entry}|${r.relation}`));
  const aRepointer = [], aJeter = [];
  for (const r of relsP ?? []) {
    const sortante = r.from_entry === p.id;
    const autre = sortante ? r.to_entry : r.from_entry;
    if (autre === k.id) { aJeter.push({ ...r, motif: 'deviendrait une boucle sur la survivante' }); continue; }
    if (dejaK.has(`${sortante ? 'out' : 'in'}|${autre}|${r.relation}`)) { aJeter.push({ ...r, motif: 'la survivante porte déjà cette arête' }); continue; }
    aRepointer.push({ ...r, sortante, autre });
  }
  ligne.aretes = { repointees: aRepointer.length, jetees: aJeter.map((r) => ({ id: r.id, relation: r.relation, motif: r.motif })) };
  ligne.sections = { reprises: (secK ?? []).length === 0 ? (secP ?? []).length : 0,
    motif: (secK ?? []).length ? 'la survivante a déjà son dossier — celui du doublon reste dans la trace, pas en base' : undefined };

  console.log(`${WRITE ? '→' : '·'} ${f.perdant} → ${f.survivant} : ${Object.keys(patch).length} champ(s), ${aRepointer.length} arête(s) repointée(s), ${aJeter.length} jetée(s), ${ligne.sections.reprises} section(s)`);

  if (WRITE) {
    if (Object.keys(patch).length) await s.from('akasha_entries').update(patch).eq('id', k.id);
    for (const r of aRepointer) {
      await s.from('akasha_relations').update(r.sortante ? { from_entry: k.id } : { to_entry: k.id }).eq('id', r.id);
    }
    if (ligne.sections.reprises) {
      for (const sec of secP ?? []) {
        const { id, entry_id, ...reste } = sec;
        await s.from('akasha_sections').insert({ ...reste, entry_id: k.id });
      }
    }
    // La suppression emporte en cascade les ARÊTES (contrainte ON DELETE CASCADE), mais PAS les
    // sections : `akasha_sections.entry_id` n'en a pas. Vérifié le 10/08, à mes dépens — les
    // dossiers des deux capitaines Bleach absorbés sont restés en base, rattachés à des
    // identifiants disparus : 15 lignes que plus personne ne pouvait ni lire ni atteindre.
    // Le nettoyage est dans scripts/ops-reparer-vague3.mjs. Si ce script resert un jour :
    // supprimer explicitement les sections du perdant qui n'ont pas été reprises.
    await s.from('akasha_entries').delete().eq('id', p.id);
    ligne.fait = true;
  }
  trace.fusions.push(ligne);
}

await writeFile(new URL('../data/audits/fusion-doublons-trace.json', import.meta.url), JSON.stringify(trace, null, 1));
console.log(`\n${WRITE ? '' : '(à blanc — relancer avec --write) '}trace : data/audits/fusion-doublons-trace.json`);
