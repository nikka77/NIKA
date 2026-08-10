// scripts/audit-isolees-fandom.mjs — SONDE : ce que l'infobox Fandom sait des fiches isolées.
//
// POURQUOI (10/08/2026)
// Les deux audits précédents l'ont établi : sur 951 fiches isolées, 20 seulement sont sauvables
// avec ce que `attributes` contient déjà. Les 931 autres — surtout 354 personnages secondaires de
// One Piece — ne portent qu'un `role: "Personnage secondaire"` et un texte. Le texte est interdit
// (une mention n'est pas une relation). Reste la seule autre source autorisée : le wiki Fandom,
// via son api.php, dont l'INFOBOX est structurée (| affiliation = [[Beasts Pirates]]).
//
// Deux sauts, aucune invention :
//   1. page du personnage → paramètre d'infobox `affiliation` / `occupation` → cible ANGLAISE
//   2. page de la cible → `rname` (rōmaji) → rapprochée du `roman_name` de nos fiches
// Le rōmaji est le seul point de contact fiable : nos équipages sont nommés en français
// (« L’équipage aux Cent Bêtes ») mais portent `roman_name: "Hyakujū Kaizokudan"`.
//
// Ne modifie RIEN. Trace horodatée dans data/audits/. Sert à MESURER le taux d'erreur avant
// d'écrire quoi que ce soit (règle des vingt cas).
// Usage : node --env-file=.env.local scripts/audit-isolees-fandom.mjs [--univers="One Piece"] [--max=N]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const ARG = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const MAX = Number(ARG('max', 0));
const UNIVERS_FILTRE = ARG('univers', '');

/** Un wiki par univers. Le champ d'infobox porteur d'appartenance change de wiki en wiki. */
export const WIKIS = {
  'One Piece': { hote: 'onepiece.fandom.com', champs: ['affiliation', 'occupation', 'origin', 'residence'] },
  // Dragon Ball : `Homeworld` retiré après contrôle. La page « Pterodactyl » est celle d'une
  // ESPÈCE et liste Terre ET Sadala ; l'arête « Pteranodon habite Planète Sadala » serait fausse.
  // Sans lui, ce wiki ne rend plus rien d'exploitable — c'est la mesure, pas un renoncement.
  'Dragon Ball': { hote: 'dragonball.fandom.com', champs: ['Affiliation', 'affiliation', 'Occupation', 'occupation', 'Allegiance'] },
  'Naruto': { hote: 'naruto.fandom.com', champs: ['affiliation', 'occupation', 'team', 'clan'] },
  'Bleach': { hote: 'bleach.fandom.com', champs: ['affiliation', 'occupation', 'division', 'race', 'profession'] },
  "JoJo's Bizarre Adventure": { hote: 'jojo.fandom.com', champs: ['affiliation', 'occupation'] },
  'Hunter x Hunter': { hote: 'hunterxhunter.fandom.com', champs: ['affiliation', 'occupation', 'nen type'] },
  'Death Note': { hote: 'deathnote.fandom.com', champs: ['affiliation', 'occupation'] },
  'Initial D': { hote: 'initiald.fandom.com', champs: ['affiliation', 'team', 'occupation'] },
};

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};
export const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Lit les paramètres de PREMIER niveau du premier gabarit d'infobox d'un wikitexte.
 *  Écrit à la main : les gabarits imbriqués ({{Qref|…}}) cassent tout découpage naïf sur « | ». */
export function parametresInfobox(wikitexte) {
  const i = wikitexte.indexOf('{{');
  if (i < 0) return {};
  let prof = 0, j = i, fin = -1;
  for (; j < wikitexte.length - 1; j++) {
    if (wikitexte.startsWith('{{', j)) { prof++; j++; continue; }
    if (wikitexte.startsWith('}}', j)) { prof--; j++; if (!prof) { fin = j + 1; break; } }
  }
  if (fin < 0) return {};
  const corps = wikitexte.slice(i + 2, fin - 2);
  const morceaux = [];
  let prof2 = 0, prof3 = 0, courant = '';
  for (let k = 0; k < corps.length; k++) {
    if (corps.startsWith('{{', k)) { prof2++; courant += '{{'; k++; continue; }
    if (corps.startsWith('}}', k)) { prof2--; courant += '}}'; k++; continue; }
    if (corps.startsWith('[[', k)) { prof3++; courant += '[['; k++; continue; }
    if (corps.startsWith(']]', k)) { prof3--; courant += ']]'; k++; continue; }
    if (corps[k] === '|' && !prof2 && !prof3) { morceaux.push(courant); courant = ''; continue; }
    courant += corps[k];
  }
  morceaux.push(courant);
  const out = {};
  for (const m of morceaux.slice(1)) {
    const eq = m.indexOf('=');
    if (eq < 0) continue;
    out[m.slice(0, eq).trim()] = m.slice(eq + 1).trim();
  }
  return out;
}

/** Cibles d'un paramètre : uniquement les [[liens]] — le texte libre autour est ignoré.
 *  « [[Beasts Pirates#Gifters|Gifter]] » → cible « Beasts Pirates#Gifters », libellé « Gifter » :
 *  on garde les DEUX, la section (#…) étant coupée pour le premier saut. */
export function ciblesDuParametre(valeur) {
  const out = [];
  for (const m of String(valeur ?? '').matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
    const brut = m[1].trim();
    const titre = brut.split('#')[0].trim();
    const ancre = brut.includes('#') ? brut.split('#').slice(1).join('#').trim() : null;
    if (!titre || /^(File|Image|Category|Wikipedia|w:)/i.test(titre)) continue;
    out.push({ titre, ancre, libelle: (m[2] ?? '').trim() || null });
  }
  return out;
}

/** MediaWiki accepte 50 titres par requête. Sans lot, 700 fiches = 700 allers-retours. */
export async function wikitextes(hote, titres) {
  const out = new Map();
  for (let i = 0; i < titres.length; i += 50) {
    const lot = titres.slice(i, i + 50);
    const url = `https://${hote}/api.php?action=query&prop=revisions&rvprop=content&rvslots=main`
      + `&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(lot.join('|'))}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' } });
    if (!r.ok) { console.error(`  ✗ ${hote} lot ${i}: HTTP ${r.status}`); continue; }
    const j = await r.json();
    // `normalized` + `redirects` : le titre demandé n'est pas forcément celui rendu.
    const alias = new Map();
    const fragments = new Map();
    for (const n of j.query?.normalized ?? []) alias.set(n.to, n.from);
    for (const n of j.query?.redirects ?? []) {
      alias.set(n.to, alias.get(n.from) ?? n.from);
      // `tofragment` = la redirection vise une SECTION. La page atteinte parle alors d'autre chose :
      // « Konpira » (le sabre) redirige vers « Gion#Weapons » — l'infobox lue serait celle de Gion.
      if (n.tofragment) fragments.set(alias.get(n.to) ?? n.to, `${n.to}#${n.tofragment}`);
    }
    for (const p of j.query?.pages ?? []) {
      const demande = alias.get(p.title) ?? p.title;
      if (p.missing || !p.revisions?.[0]) { out.set(demande, null); continue; }
      out.set(demande, { titre: p.title, texte: p.revisions[0].slots.main.content, fragment: fragments.get(demande) ?? null });
    }
    process.stdout.write(`\r  ${hote} : ${Math.min(i + 50, titres.length)}/${titres.length}`);
    await new Promise((r2) => setTimeout(r2, 250));   // courtoisie envers le wiki
  }
  console.log('');
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('→ lecture de la base (paginée)…');
  const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
  const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
  const deg = new Set();
  for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
  let isolees = entries.filter((e) => !deg.has(e.id));
  if (UNIVERS_FILTRE) isolees = isolees.filter((e) => e.universe === UNIVERS_FILTRE);
  if (MAX) isolees = isolees.slice(0, MAX);
  console.log(`${isolees.length} fiches isolées à sonder`);

  // Index de résolution par univers : name, roman_name, slug.
  const index = new Map();
  for (const e of entries) {
    if (!index.has(e.universe)) index.set(e.universe, new Map());
    const m = index.get(e.universe);
    for (const cle of [norm(e.name), norm(e.attributes?.roman_name), norm(e.slug)]) {
      if (!cle) continue;
      if (!m.has(cle)) m.set(cle, []);
      if (!m.get(cle).some((c) => c.id === e.id)) m.get(cle).push(e);
    }
  }

  const rapport = { quand: new Date().toISOString(), parUnivers: {} };
  for (const [univers, cfg] of Object.entries(WIKIS)) {
    const lot = isolees.filter((e) => e.universe === univers);
    if (!lot.length) continue;
    console.log(`\n──── ${univers} (${lot.length} isolées) ────`);
    const pages = await wikitextes(cfg.hote, lot.map((e) => e.name));

    let sansPage = 0, sansInfobox = 0, sansChamp = 0;
    const brut = [];        // { fiche, champ, cible anglaise, libellé }
    for (const e of lot) {
      const p = pages.get(e.name);
      if (!p) { sansPage++; continue; }
      const params = parametresInfobox(p.texte);
      if (!Object.keys(params).length) { sansInfobox++; continue; }
      let trouve = 0;
      for (const champ of cfg.champs) {
        for (const c of ciblesDuParametre(params[champ])) { brut.push({ e, champ, ...c }); trouve++; }
      }
      if (!trouve) sansChamp++;
    }
    console.log(`  page absente ${sansPage} · sans infobox ${sansInfobox} · infobox sans champ utile ${sansChamp} · cibles brutes ${brut.length}`);

    // Saut 1 : la cible anglaise correspond-elle directement à une de nos fiches ?
    const idx = index.get(univers) ?? new Map();
    const resolus = [], aResoudre = new Set();
    for (const b of brut) {
      // Le LIBELLÉ du lien est écarté : « [[King (Title)|King]] » désigne le titre royal, mais son
      // libellé « King » tombait sur le personnage King de l'équipage de Kaidō. Titre seul.
      const direct = idx.get(norm(b.titre));
      if (direct?.length === 1) { resolus.push({ ...b, cible: direct[0], voie: 'nom anglais direct' }); continue; }
      if (direct?.length > 1) { resolus.push({ ...b, cible: null, voie: `homonyme (${direct.map((d) => d.type).join('/')})` }); continue; }
      aResoudre.add(b.titre);
    }
    console.log(`  saut 1 (nom direct) : ${resolus.filter((r) => r.cible).length} résolues · ${aResoudre.size} titres à traduire`);

    // Saut 2 : rōmaji de la page cible → roman_name de nos fiches.
    const pagesCibles = await wikitextes(cfg.hote, [...aResoudre]);
    const romaji = new Map();
    for (const [t, p] of pagesCibles) {
      if (!p) continue;
      const par = parametresInfobox(p.texte);
      const r = par.rname ?? par.romaji ?? par.unnamed ?? null;
      const jp = par.jname ?? par.kanji ?? null;
      if (r) romaji.set(t, String(r).replace(/'{2,}/g, '').replace(/<[^>]+>/g, '').split(/[;(]/)[0].trim());
      else if (jp) romaji.set(t, null);
    }
    for (const b of brut) {
      if (resolus.some((r) => r.e.id === b.e.id && r.titre === b.titre && r.champ === b.champ)) continue;
      const rj = romaji.get(b.titre);
      const hit = rj ? idx.get(norm(rj)) : null;
      if (hit?.length === 1) resolus.push({ ...b, cible: hit[0], voie: `rōmaji « ${rj} »` });
      else resolus.push({ ...b, cible: null, voie: rj ? `rōmaji « ${rj} » sans fiche` : 'aucune traduction' });
    }

    // Une appartenance, un métier, une origine, une résidence ne sont JAMAIS une personne.
    // « Hocker --affiliation--> Chouchou (le chien de l'animalerie) » est vrai sur le wiki et faux
    // comme arête : on refuse en bloc les cibles de type `character`.
    for (const r of resolus) if (r.cible?.type === 'character') { r.voie = `cible personne refusée (${r.cible.name})`; r.cible = null; }
    const ok = resolus.filter((r) => r.cible && r.cible.id !== r.e.id);
    const fiches = new Set(ok.map((r) => r.e.id));
    console.log(`  RÉSOLU : ${ok.length} arêtes candidates · ${fiches.size} / ${lot.length} isolées sortiraient`);
    const voies = {};
    for (const r of resolus) voies[r.cible ? r.voie.split(' «')[0] : `ÉCHEC: ${r.voie.split(' «')[0]}`] = (voies[r.cible ? r.voie.split(' «')[0] : `ÉCHEC: ${r.voie.split(' «')[0]}`] ?? 0) + 1;
    console.log('  voies :', Object.entries(voies).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · '));
    console.log('  12 exemples :');
    for (const r of ok.slice(0, 12)) console.log(`    · ${r.e.name} --[${r.champ}: ${r.titre}${r.ancre ? '#' + r.ancre : ''}]--> ${r.cible.name}(${r.cible.type})   [${r.voie}]`);

    rapport.parUnivers[univers] = {
      isolees: lot.length, sansPage, sansInfobox, sansChamp, ciblesBrutes: brut.length,
      aretesCandidates: ok.length, isoleesSortables: fiches.size, voies,
      echantillon: ok.slice(0, 40).map((r) => ({ de: r.e.name, deSlug: r.e.slug, champ: r.champ, titreWiki: r.titre, ancre: r.ancre, vers: r.cible.name, versType: r.cible.type, voie: r.voie })),
      echecs: resolus.filter((r) => !r.cible).slice(0, 40).map((r) => ({ de: r.e.name, champ: r.champ, titreWiki: r.titre, motif: r.voie })),
    };
  }

  const sortie = path.join(ROOT, `data/audits/isolees-fandom-sonde-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));
  console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
}
