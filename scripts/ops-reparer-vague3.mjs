// scripts/ops-reparer-vague3.mjs — LES TROIS DÉFAUTS PROUVÉS DE LA VAGUE 3, ET UN QUI EST DE MOI.
//
// 1. QUINZE SECTIONS ORPHELINES, ET C'EST MA FAUTE (09/08 → constaté le 10/08).
//    En fusionnant quatre doublons j'ai écrit, dans ops-fusionner-doublons.mjs : « La suppression
//    emporte en cascade ce qui resterait attaché (arêtes jetées, sections). » C'était vrai pour les
//    arêtes, faux pour les sections : `akasha_sections.entry_id` n'a pas de cascade. Les dossiers
//    des deux capitaines Bleach absorbés sont restés en base, rattachés à des identifiants qui
//    n'existent plus — 15 lignes que plus personne ne peut ni lire ni atteindre. Les deux fiches
//    survivantes ont déjà leur propre dossier complet (11 et 10 sections) : il n'y a rien à
//    récupérer, seulement à balayer. J'aurais dû le vérifier au lieu de l'écrire.
//
// 2. `battle-franky` COMMENCE PAR LA BARRE D'ONGLETS DE SA PAGE SOURCE.
//    « Battle Franky BF-36 BF-37 BF-38 Les Battles Franky (バトルフランキー…) » — les quatre premiers
//    mots ne sont pas de la prose, ce sont les libellés des onglets de l'article Fandom, avalés par
//    l'extracteur. Le texte vrai commence à « Les Battles Franky ». On coupe l'ornement, on ne
//    réécrit rien.
//
// 3. `Kanabun Gang` PORTE UN NOM ANGLAIS ALORS QUE LE CORPUS EN A UN FRANÇAIS.
//    La fiche de Kanabun lui-même dit « Kanabun est le chef du gang Kanabun » et celle de Tsukado
//    « Le Gang Kanabun, qui profitait de leur affrontement… ». La garde « zéro invention » du
//    chantier avait pourtant validé la forme anglaise : elle cherchait le nom dans
//    `JSON.stringify(attributes)`, qui embarque les champs anglais stockés en base. Une chaîne
//    STOCKÉE par le corpus n'est pas une forme EMPLOYÉE par le corpus.
//
// Usage : node --env-file=.env.local scripts/ops-reparer-vague3.mjs [--write]
import { writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const WRITE = process.argv.includes('--write');
const s = clientSite();
const trace = { chantier: 'réparations de la vague 3', quand: new Date().toISOString(), write: WRITE };

// ── 1. sections orphelines ──────────────────────────────────────────────────
{
  const ids = new Set();
  for (let d = 0; ; d += 1000) {
    const { data } = await s.from('akasha_entries').select('id').range(d, d + 999);
    (data ?? []).forEach((r) => ids.add(r.id));
    if ((data?.length ?? 0) < 1000) break;
  }
  const secs = [];
  for (let d = 0; ; d += 1000) {
    const { data } = await s.from('akasha_sections').select('id, entry_id, idx, titre').range(d, d + 999);
    secs.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  const orphelines = secs.filter((x) => !ids.has(x.entry_id));
  trace.sectionsOrphelines = { compte: orphelines.length, lignes: orphelines };
  if (WRITE && orphelines.length) {
    for (let i = 0; i < orphelines.length; i += 100) {
      await s.from('akasha_sections').delete().in('id', orphelines.slice(i, i + 100).map((x) => x.id));
    }
  }
  console.log(`1. sections orphelines : ${orphelines.length} ${WRITE ? 'supprimée(s)' : 'trouvée(s)'}`);
}

// ── 2. barre d'onglets avalée dans un descFr ────────────────────────────────
{
  const { data: r } = await s.from('akasha_entries').select('id, slug, attributes').eq('slug', 'battle-franky').maybeSingle();
  const avant = String(r?.attributes?.descFr ?? '');
  // On coupe SUR LA PREMIÈRE VRAIE PHRASE, repérée par sa majuscule d'article — pas sur un nombre
  // de caractères, qui ne vaudrait que pour cette fiche.
  const i = avant.search(/Les Battles Franky/);
  if (r && i > 0) {
    const apres = avant.slice(i).trim();
    trace.battleFranky = { avant: avant.slice(0, 120), apres: apres.slice(0, 120), retire: avant.slice(0, i).trim() };
    if (WRITE) await s.from('akasha_entries').update({ attributes: { ...r.attributes, descFr: apres } }).eq('id', r.id);
    console.log(`2. battle-franky : « ${avant.slice(0, i).trim()} » retiré en tête`);
  } else console.log('2. battle-franky : rien à retirer (déjà corrigé ou texte différent)');
}

// ── 3. nom anglais là où le corpus en a un français ─────────────────────────
{
  const { data: r } = await s.from('akasha_entries').select('id, slug, name').eq('slug', 'kanabun-gang').maybeSingle();
  if (r && r.name !== 'Gang Kanabun') {
    trace.kanabun = { avant: r.name, apres: 'Gang Kanabun', attestation: 'kanabun : « chef du gang Kanabun » · tsukado : « Le Gang Kanabun, qui profitait de leur affrontement »' };
    if (WRITE) await s.from('akasha_entries').update({ name: 'Gang Kanabun' }).eq('id', r.id);
    console.log('3. kanabun-gang : « Kanabun Gang » → « Gang Kanabun »');
  } else console.log('3. kanabun-gang : déjà en français');
}

await writeFile(new URL(`../data/audits/reparations-vague3-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, import.meta.url), JSON.stringify(trace, null, 1));
console.log(`\n${WRITE ? '' : '(à blanc — relancer avec --write) '}trace écrite`);
