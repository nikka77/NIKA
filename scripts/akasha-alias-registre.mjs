// scripts/akasha-alias-registre.mjs — LE REGISTRE D'ALIAS « TITRE DE WIKI → NOTRE FICHE ».
//
// POURQUOI (10/08/2026, vague 4)
// La vague 3 a sorti 35 isolées Naruto puis s'est arrêtée net : ses 26 liens restants visent des
// pages qui EXISTENT chez nous, sous un nom français que l'égalité de nom normalisé ne voit pas.
// Et le mur a un second versant que personne n'avait mesuré : 16 de nos 58 isolées ne sont même
// pas CHERCHABLES sur le wiki, parce que c'est NOTRE nom (« Vallée de la Fin », « Clan Karatachi »)
// qui sert de titre de requête. Le script ne les lit jamais et ne le dit pas.
//
// CE QUE CE FICHIER CONSTRUIT : `data/alias-cibles-naruto.json`, un registre titre-wiki → slug,
// où CHAQUE paire porte son témoin et l'adresse qui le prouve. Aucune distance de chaînes,
// aucune ressemblance : quatre témoins seulement, tous redemandables à la source.
//
//   T1 « redirection »   — le wiki renvoie ce titre vers une page dont notre fiche porte le nom.
//                          Compte la redirection DOUCE (`{{soft redirect|X}}`) autant que la dure :
//                          « Summon » est un soft redirect vers « Summoning Technique », et
//                          `action=parse&redirects=1` rend « Summon » sans rien dire. Un titre qui
//                          ne bouge pas n'est pas un titre sans cible (leçon du 10/08 : un 404 dit
//                          que l'adresse est périmée, pas que la ressource a disparu).
//   T2 « interlangue »   — la page anglaise DÉCLARE son équivalent français (`prop=langlinks`),
//                          et ce titre français (ou une redirection française vers lui) est égal,
//                          après `norm`, au nom de notre fiche, à sa parenthèse finale, à son
//                          `roman_name` ou à son slug. C'est le pont rōmaji des vagues 1-2, mais
//                          pris là où le wiki l'écrit lui-même au lieu d'un champ d'infobox —
//                          « Lightning Release » n'a AUCUNE infobox, son langlink fr dit « Raiton ».
//   T3 « alias-cures »   — la paire est DÉJÀ dans data/alias-cures.json, où chaque entrée a été
//                          sondée contre le wiki réel par ops-curer-alias.mjs. On la relit dans
//                          l'autre sens ; on ne la refait pas.
//   T4 « précédent »     — notre graphe porte déjà ≥ 10 arêtes de même nature vers cette fiche, et
//                          un tirage de 20 de leurs sources montre que le wiki leur donne
//                          exactement ce champ et cette valeur. Témoin MESURÉ, pas supposé : le
//                          taux est écrit dans la trace, et sous 95 % la paire est jetée.
//
// N'ÉCRIT RIEN EN BASE. Sort un fichier de registre + une trace horodatée dans data/audits/.
//
// PORTAGE DU 10/08 (vague 5) : le script est désormais PARAMÉTRÉ PAR UNIVERS. Rien de la mécanique
// n'a changé — seuls l'hôte du wiki, son jumeau francophone, le fichier de sortie et le GISEMENT
// (la trace de sonde d'où l'on tire les titres orphelins) deviennent des arguments. T4 reste
// spécifique à Narutopedia : lui seul range ses infobox dans une page « Infobox:<Titre> ».
//
// Usage :
//   node --env-file=.env.local scripts/akasha-alias-registre.mjs --sonde   (mesure, n'écrit pas le registre)
//   node --env-file=.env.local scripts/akasha-alias-registre.mjs           (écrit data/alias-cibles-naruto.json)
//   … --univers="One Piece" --trace=data/audits/isolees-html-one-piece-sonde-<horodate>.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { norm } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const ARG = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const SONDE = process.argv.includes('--sonde');
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');
const UNIVERS = ARG('univers', 'Naruto');
/** Un wiki anglais, son jumeau francophone, et le gisement par défaut (la trace de sonde de
 *  l'univers). `t4` dit si le témoin « précédent mesuré » sait lire ce wiki : il ne sait lire que
 *  la convention Semantic MediaWiki de Narutopedia (pages « Infobox:<Titre> »). */
const WIKIS = {
  Naruto: {
    hote: 'naruto.fandom.com', hoteFr: 'naruto.fandom.com/fr', t4: true,
    trace: 'data/audits/isolees-html-naruto-sonde-2026-08-10T11-25-57-440Z.json',
  },
  'One Piece': {
    hote: 'onepiece.fandom.com', hoteFr: 'onepiece.fandom.com/fr', t4: false,
    trace: null,
  },
};
const cfg = WIKIS[UNIVERS];
if (!cfg) throw new Error(`univers « ${UNIVERS} » absent de WIKIS`);
const HOTE = cfg.hote;
const HOTE_FR = cfg.hoteFr;
const SORTIE = `data/alias-cibles-${UNIVERS.toLowerCase().replace(/\W+/g, '-')}.json`;
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(hote, params) {
  const u = `https://${hote}/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params });
  for (let essai = 0; essai < 3; essai++) {
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) { await dormir(700 * (essai + 1)); continue; }
      const j = await r.json();
      if (j?.error?.code === 'maxlag') { await dormir(5000); continue; }
      return j;
    } catch { await dormir(700 * (essai + 1)); }
  }
  // PANNE ≠ ABSENCE (leçon du 02/08, redite le 10/08) : on crie plutôt que de rendre « vide ».
  throw new Error(`${hote} injoignable : ${u.slice(0, 110)}`);
}

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;      // un select nu s'arrête à 1000 SANS erreur
  }
  console.log(`  ${t} : ${out.length} lignes`);
  return out;
};

console.log('→ lecture de la base (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const parId = new Map(entries.map((e) => [e.id, e]));
const degre = new Set();
for (const r of rels) { degre.add(r.from_entry); degre.add(r.to_entry); }
const isolees = entries.filter((e) => !degre.has(e.id));
console.log(`\nAVANT : ${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées `
  + `(dont ${isolees.filter((e) => e.universe === UNIVERS).length} en ${UNIVERS})`);

/* Index de résolution — jumeau de celui d'akasha-isolees-html.mjs, MÊME ordre de passes. */
const index = new Map();
for (let passe = 0; passe < 3; passe++) {
  for (const e of entries) {
    const cle = norm(passe === 0 ? e.name : passe === 1 ? e.attributes?.roman_name : e.slug);
    if (!cle) continue;
    if (!index.has(e.universe)) index.set(e.universe, new Map());
    const m = index.get(e.universe);
    const deja = m.get(cle);
    if (!deja) { m.set(cle, { passe, candidats: [e] }); continue; }
    if (deja.passe !== passe) continue;
    if (!deja.candidats.some((c) => c.id === e.id)) deja.candidats.push(e);
  }
}
const resoudre = (valeur) => {
  const t = index.get(UNIVERS)?.get(norm(valeur));
  return t && t.candidats.length === 1 ? t.candidats[0] : null;
};

/* Index des parenthèses finales : « Libération de la Foudre (Raiton) » → « raiton ». */
const parParenthese = new Map();
for (const e of entries) {
  if (e.universe !== UNIVERS) continue;
  const m = /\(([^()]+)\)\s*$/.exec(e.name ?? '');
  if (!m) continue;
  const k = norm(m[1]);
  if (!parParenthese.has(k)) parParenthese.set(k, []);
  parParenthese.get(k).push(e);
}

/* ═══ Le gisement : les titres que la vague 3 n'a pas su résoudre, relus dans sa trace ════════
   On ne réinvente pas la liste : on la reprend telle qu'elle a été MESURÉE. */
const TRACE_V3 = ARG('trace', cfg.trace);
if (!TRACE_V3) throw new Error('aucun gisement : passer --trace=data/audits/isolees-html-…-sonde-….json');
const v3 = JSON.parse(fs.readFileSync(path.join(ROOT, TRACE_V3), 'utf8'));
const cibles = new Map();
for (const x of v3.echecs) {
  if (!cibles.has(x.titreWiki)) cibles.set(x.titreWiki, { titre: x.titreWiki, liens: 0, champs: new Set(), sources: [] });
  const c = cibles.get(x.titreWiki);
  c.liens++; c.champs.add(x.champ); c.sources.push(x.de);
}
// « Summon » vient du champ `classification`, que la vague 3 n'avait pas déclaré : il est dans sa
// trace d'exploration, pas dans sa trace d'échecs. On l'ajoute nommément — c'est la cible la plus
// citée de tout le lot (14 liens mesurés le 10/08 à 08:52).
if (UNIVERS === 'Naruto' && !cibles.has('Summon')) cibles.set('Summon', { titre: 'Summon', liens: 14, champs: new Set(['classification']), sources: ['(trace explore 08-52)'] });

const liste = [...cibles.values()].sort((a, b) => b.liens - a.liens);
console.log(`\n→ ${liste.length} titres cibles orphelins · ${liste.reduce((s, c) => s + c.liens, 0)} liens`);

/* ═══ T1 + T2 : ce que le wiki DÉCLARE de chacun ═════════════════════════════════════════════ */
console.log('\n→ interrogation du wiki (catégories, langlinks, wikitexte)…');
const declare = new Map();
for (let i = 0; i < liste.length; i += 20) {
  const lot = liste.slice(i, i + 20).map((c) => c.titre);
  const j = await api(HOTE, {
    action: 'query', prop: 'langlinks|categories|revisions', lllang: 'fr', lllimit: '50',
    cllimit: '50', rvprop: 'content', rvslots: 'main', redirects: '1', titles: lot.join('|'),
  });
  const versDemande = new Map();
  for (const n of j.query?.normalized ?? []) versDemande.set(n.to, n.from);
  for (const n of j.query?.redirects ?? []) versDemande.set(n.to, versDemande.get(n.from) ?? n.from);
  for (const p of j.query?.pages ?? []) {
    const demande = versDemande.get(p.title) ?? p.title;
    const texte = p.revisions?.[0]?.slots?.main?.content ?? '';
    // REDIRECTION DOUCE : `{{soft redirect|X}}`. Le wiki l'emploie là où une vraie redirection
    // casserait sa sémantique — `redirects=1` ne la suit donc PAS, et le titre rendu ment.
    const doux = /\{\{\s*soft[ _]redirect\s*\|\s*([^}|]+?)\s*\}\}/i.exec(texte)?.[1] ?? null;
    declare.set(demande, {
      manquante: !!p.missing,
      titreRendu: p.title,
      redirigeVers: p.title !== demande ? p.title : null,
      softRedirect: doux,
      fr: p.langlinks?.[0]?.title ?? null,
      categories: (p.categories ?? []).map((c) => c.title.replace(/^Category:/, '')),
    });
  }
  await dormir(250);
}

// Les redirections FRANÇAISES vers chaque titre français déclaré (« Raiton » ← « Foudre »).
const frTitres = [...new Set([...declare.values()].map((d) => d.fr).filter(Boolean))];
const frAlias = new Map();          // titre fr canon → [tous ses titres fr]
if (frTitres.length) {
  for (let i = 0; i < frTitres.length; i += 20) {
    const j = await api(HOTE_FR, { action: 'query', prop: 'redirects', rdlimit: '50', redirects: '1', titles: frTitres.slice(i, i + 20).join('|') });
    for (const p of j.query?.pages ?? []) {
      if (p.missing) continue;
      frAlias.set(p.title, [p.title, ...(p.redirects ?? []).map((r) => r.title)]);
    }
    await dormir(250);
  }
}

/* ═══ T3 : ce que le curateur a déjà confirmé, relu à l'envers ═══════════════════════════════ */
const aliasCures = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/alias-cures.json'), 'utf8'));
const inverseCure = new Map();
for (const [notre, titre] of Object.entries(aliasCures[UNIVERS] ?? {})) {
  const k = norm(titre);
  if (!inverseCure.has(k)) inverseCure.set(k, []);
  inverseCure.get(k).push(notre);
}

/* ═══ T4 : le précédent du graphe, MESURÉ sur 20 sources ════════════════════════════════════
   Ne s'applique qu'aux cibles pour lesquelles notre graphe porte déjà ≥ 10 arêtes entrantes.
   On relit le wiki des sources existantes et on compte celles qui portent VRAIMENT le couple
   (champ, valeur) qu'on s'apprête à écrire. Sous 95 %, la paire est jetée. */
async function mesurerPrecedent(fiche, champ, valeurAttendue) {
  const entrantes = rels.filter((r) => r.to_entry === fiche.id);
  if (entrantes.length < 10) return { applicable: false, motif: `seulement ${entrantes.length} arête(s) entrante(s)` };
  const sources = entrantes.map((r) => parId.get(r.from_entry)).filter(Boolean);
  const pas = Math.max(1, Math.floor(sources.length / 20));
  const tirage = sources.filter((_, i) => i % pas === 0).slice(0, 20);
  let conformes = 0; const detail = [];
  for (let i = 0; i < tirage.length; i += 10) {
    const lot = tirage.slice(i, i + 10);
    // SENS SOURCE de l'alias : nos fiches françaises n'ont pas de page à leur nom sur le wiki
    // anglais. Sans ce passage, « Statue Démoniaque de la Voie Extérieure » comptait comme un
    // contre-exemple du précédent alors qu'elle porte « classification=Summon » sous son titre
    // anglais — le mur de la résolution faussait la mesure du mur de la résolution.
    const titreSource = (e) => aliasCures[UNIVERS]?.[e.name] ?? e.name;
    const j = await api(HOTE, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: lot.map(titreSource).join('|') });
    const versDemande = new Map();
    for (const n of j.query?.normalized ?? []) versDemande.set(n.to, n.from);
    for (const n of j.query?.redirects ?? []) versDemande.set(n.to, versDemande.get(n.from) ?? n.from);
    for (const p of j.query?.pages ?? []) {
      const demande = versDemande.get(p.title) ?? p.title;
      // Narutopedia porte ses infobox dans une page « Infobox:<Titre> » (Semantic MediaWiki) :
      // le wikitexte de l'article ne dit rien. On lit donc la page d'infobox elle-même.
      detail.push({ fiche: demande, page: p.title, manquante: !!p.missing });
    }
    await dormir(250);
  }
  // Second temps : les pages « Infobox:… » correspondantes.
  const titresInfobox = detail.filter((d) => !d.manquante).map((d) => `Infobox:${d.page}`);
  const valeurs = new Map();
  for (let i = 0; i < titresInfobox.length; i += 10) {
    const j = await api(HOTE, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titresInfobox.slice(i, i + 10).join('|') });
    for (const p of j.query?.pages ?? []) {
      if (p.missing) continue;
      valeurs.set(p.title.replace(/^Infobox:/, ''), p.revisions?.[0]?.slots?.main?.content ?? '');
    }
    await dormir(250);
  }
  const relus = [];
  for (const d of detail) {
    const txt = valeurs.get(d.page);
    if (txt == null) { relus.push({ fiche: d.fiche, valeur: null, conforme: false, motif: 'pas de page Infobox:' }); continue; }
    const rx = new RegExp(`\\|\\s*${champ}\\s*=\\s*([^\\n|]*)`, 'i');
    const v = rx.exec(txt)?.[1]?.trim() ?? null;
    const conforme = !!v && new RegExp(`\\b${valeurAttendue}\\b`, 'i').test(v.replace(/[[\]]/g, ''));
    if (conforme) conformes++;
    relus.push({ fiche: d.fiche, valeur: v, conforme });
  }
  const taux = relus.length ? conformes / relus.length : 0;
  return { applicable: true, aretes: entrantes.length, relus: relus.length, conformes, taux: Number(taux.toFixed(3)), detail: relus };
}

/* ═══ Verdict, cible par cible ═══════════════════════════════════════════════════════════════ */
const verdicts = [];
for (const c of liste) {
  const d = declare.get(c.titre) ?? {};
  const v = {
    titre: c.titre, liens: c.liens, champs: [...c.champs], sourcesExemples: c.sources.slice(0, 4),
    wiki: { titreRendu: d.titreRendu ?? null, redirigeVers: d.redirigeVers ?? null, softRedirect: d.softRedirect ?? null, fr: d.fr ?? null, categories: d.categories ?? [] },
    temoin: null, fiche: null, preuve: null, ficheChezNous: null,
  };

  // T1 — redirection (dure ou douce) vers une page dont notre fiche porte le nom.
  for (const [voie, titre] of [['redirection dure', d.redirigeVers], ['redirection douce', d.softRedirect]]) {
    if (v.temoin || !titre) continue;
    const f = resoudre(titre);
    if (!f) continue;
    v.temoin = `T1 ${voie}`; v.fiche = f;
    v.preuve = `https://${HOTE}/wiki/${encodeURIComponent(c.titre.replace(/ /g, '_'))} ${voie === 'redirection douce' ? `porte « {{soft redirect|${titre}}} »` : `redirige vers « ${titre} »`} ; notre fiche de ce nom : ${f.name} (${f.slug}, type ${f.type})`;
  }

  // T2 — interlangue : le wiki déclare l'équivalent français, et c'est notre nom.
  if (!v.temoin && d.fr) {
    for (const cand of frAlias.get(d.fr) ?? [d.fr]) {
      const k = norm(cand);
      const f = resoudre(cand) ?? ((parParenthese.get(k) ?? []).length === 1 ? parParenthese.get(k)[0] : null);
      if (!f) continue;
      v.temoin = 'T2 interlangue'; v.fiche = f;
      v.preuve = `https://${HOTE}/api.php?action=query&prop=langlinks&lllang=fr&titles=${encodeURIComponent(c.titre)} déclare fr = « ${d.fr} »`
        + (cand !== d.fr ? ` ; https://${HOTE_FR}/wiki/${encodeURIComponent(cand.replace(/ /g, '_'))} y redirige` : '')
        + ` ; égal (après normalisation) à ${norm(f.name) === k ? 'le nom' : 'la parenthèse'} de notre fiche ${f.name} (${f.slug}, type ${f.type})`;
      break;
    }
  }

  // T3 — la paire est déjà confirmée dans alias-cures.json.
  if (!v.temoin) {
    for (const notre of inverseCure.get(norm(c.titre)) ?? []) {
      const f = resoudre(notre);
      if (!f) continue;
      v.temoin = 'T3 alias-cures'; v.fiche = f;
      v.preuve = `data/alias-cures.json (Naruto) porte « ${notre} » → « ${c.titre} », paire sondée contre le wiki par scripts/ops-curer-alias.mjs ; notre fiche : ${f.name} (${f.slug}, type ${f.type})`;
      break;
    }
  }

  // Y a-t-il, malgré tout, une fiche PLAUSIBLE chez nous ? (pour le rapport, pas pour écrire)
  if (!v.fiche) {
    const parNom = resoudre(c.titre);
    v.ficheChezNous = parNom ? `${parNom.name} (${parNom.slug})` : null;
  }
  verdicts.push(v);
}

/* T4 — appliqué nommément à « Summon », la seule cible à gros précédent (40 arêtes).
   IL PASSE AVANT T1, ET C'EST VOULU. La redirection douce du wiki envoie « Summon » sur
   « Summoning Technique » parce que Narutopedia n'a pas d'article pour le CONCEPT ; nous, si :
   « Créature invoquée » (status, category=Classification) porte déjà 40 arêtes « appartient »
   de cette exacte population. Suivre le soft redirect écrirait « Giant Panda appartient à
   Summoning Technique » — un lien dans le bon champ mais un fait du mauvais type (leçon du
   10/08 sur le champ `users`). Le tiroir par défaut est celui qui existait. */
const summon = cfg.t4 ? verdicts.find((v) => v.titre === 'Summon') : null;
if (summon) {
  const cible = entries.find((e) => e.universe === UNIVERS && e.slug === 'creature-invoquee');
  if (cible) {
    console.log('\n→ T4 : mesure du précédent « classification = Summon » → « Créature invoquée »…');
    const m = await mesurerPrecedent(cible, 'classification', 'Summon');
    summon.precedent = m;
    console.log(`   ${m.applicable ? `${m.conformes}/${m.relus} sources portent « classification = Summon » (${(m.taux * 100).toFixed(0)} %) sur ${m.aretes} arêtes en place` : m.motif}`);
    if (m.applicable && m.taux >= 0.95) {
      summon.temoinEcarte = summon.temoin ? `${summon.temoin} → ${summon.fiche.name} (écarté : le soft redirect vise l'article de la TECHNIQUE, pas le tiroir de classification)` : null;
      summon.temoin = 'T4 précédent mesuré'; summon.fiche = cible;
      summon.preuve = `notre graphe porte déjà ${m.aretes} arêtes « appartient » vers ${cible.name} (${cible.slug}) ; sur ${m.relus} de leurs sources relues sur ${HOTE}, ${m.conformes} portent « classification=Summon » dans leur page Infobox: (${(m.taux * 100).toFixed(0)} %)`
        + (summon.wiki.softRedirect ? ` ; et https://${HOTE}/wiki/Summon est un « {{soft redirect|${summon.wiki.softRedirect}}} », donc un titre de classification que le wiki n'a pas doté d'article` : '');
    } else {
      summon.rejet = `précédent sous le seuil de 95 % (${(m.taux * 100).toFixed(0)} %) — paire jetée`;
    }
  }
}

/* ═══ Rapport ════════════════════════════════════════════════════════════════════════════════ */
console.log('\n=== VERDICT, CIBLE PAR CIBLE ===');
let cures = 0, liensCures = 0;
for (const v of verdicts) {
  if (v.temoin) { cures++; liensCures += v.liens; }
  const etat = v.temoin ? `✓ ${v.temoin} → ${v.fiche.name} (${v.fiche.slug})` : `✗ pas de témoin`;
  console.log(`\n· « ${v.titre} » — ${v.liens} lien(s), champ ${v.champs.join('+')}`);
  console.log(`    ${etat}`);
  console.log(`    wiki : rendu « ${v.wiki.titreRendu} »${v.wiki.softRedirect ? ` · soft redirect → « ${v.wiki.softRedirect} »` : ''}${v.wiki.fr ? ` · fr « ${v.wiki.fr} »` : ' · pas de langlink fr'} · catégories ${v.wiki.categories.slice(0, 3).join(', ') || '—'}`);
  if (v.preuve) console.log(`    preuve : ${v.preuve}`);
  if (!v.temoin) console.log(`    fiche chez nous : ${v.ficheChezNous ?? 'AUCUNE de ce nom'}`);
}
console.log(`\n${cures} / ${verdicts.length} cibles curées · ${liensCures} / ${liste.reduce((s, c) => s + c.liens, 0)} liens débloqués`);

const registre = {};
for (const v of verdicts) {
  if (!v.temoin) continue;
  registre[v.titre] = { slug: v.fiche.slug, nom: v.fiche.name, type: v.fiche.type, temoin: v.temoin, preuve: v.preuve };
}

const trace = path.join(ROOT, `data/audits/alias-registre-${SONDE ? 'sonde' : 'ecriture'}-${HORODATE}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: 'registre d\'alias titre-de-wiki → fiche (vague 4)', quand: new Date().toISOString(),
  mode: SONDE ? 'sonde' : 'écriture du registre', ecritEnBase: false,
  sourceDuGisement: TRACE_V3,
  mesure: { fiches: entries.length, aretes: rels.length, isolees: isolees.length, isoleesNaruto: isolees.filter((e) => e.universe === UNIVERS).length },
  ciblesOrphelines: liste.length, liensOrphelins: liste.reduce((s, c) => s + c.liens, 0),
  curees: cures, liensCures, verdicts,
}, null, 1));
console.log(`\ntrace AVANT écriture : ${path.relative(ROOT, trace)}`);

if (SONDE) { console.log('--sonde : registre non écrit.'); process.exit(0); }
const fichier = path.join(ROOT, SORTIE);
fs.writeFileSync(fichier, JSON.stringify({
  _lisezMoi: 'Registre titre-de-wiki → fiche AKASHA. Chaque paire porte son témoin et son adresse. '
    + 'Construit par scripts/akasha-alias-registre.mjs le ' + new Date().toISOString().slice(0, 10)
    + '. Ne pas éditer à la main : relancer le script, qui redemande chaque témoin à la source.',
  [UNIVERS]: registre,
}, null, 1) + '\n');
console.log(`registre écrit : ${path.relative(ROOT, fichier)} (${Object.keys(registre).length} paires)`);
