// scripts/akasha-sortir-isolees.mjs — SORTIR DES FICHES DE L'ISOLEMENT, EN DISANT D'OÙ VIENT CHAQUE ARÊTE.
//
// POURQUOI (10/08/2026)
// 951 fiches n'ont aucune arête. Trois audits successifs (data/audits/isolees-matiere-*,
// aretes-manquantes-*, isolees-fandom-sonde-*) ont mesuré ce qui existe vraiment :
//   · 20 isolées sont sauvables avec ce que `attributes` contient DÉJÀ (lot A) ;
//   · 86 de plus le sont via l'INFOBOX du wiki Fandom, seule autre source autorisée (lot B).
// Les 845 restantes ne portent qu'un `role: "Personnage secondaire"` et un texte libre — et un
// texte n'est pas une relation. On ne les touche pas.
//
// N'ÉCRIT QUE DANS `akasha_relations`. Ne touche jamais à `akasha_entries.attributes` :
// quatre autres chantiers y travaillent en parallèle.
//
// Usage :
//   node --env-file=.env.local scripts/akasha-sortir-isolees.mjs --dry     (trace seule)
//   node --env-file=.env.local scripts/akasha-sortir-isolees.mjs           (écrit)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { WIKIS, norm, parametresInfobox, ciblesDuParametre, wikitextes } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const DRY = process.argv.includes('--dry');
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  console.log(`  ${t} : ${out.length} lignes`);
  return out;
};

console.log('→ lecture de la base (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');

const degre = new Map();
const areteExistante = new Set();
for (const r of rels) {
  degre.set(r.from_entry, (degre.get(r.from_entry) ?? 0) + 1);
  degre.set(r.to_entry, (degre.get(r.to_entry) ?? 0) + 1);
  areteExistante.add(`${r.from_entry}|${r.to_entry}|${r.relation}`);
}
const estIsolee = (id) => !(degre.get(id) ?? 0);
const isolees = entries.filter((e) => estIsolee(e.id));
console.log(`\nAVANT : ${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées`);

/* ── Index de résolution PAR UNIVERS. Jamais à plat : les 5 arêtes inter-univers purgées le
   05/08 (data/audits/aretes-inter-univers-purgees.json) venaient exactement de là. ────────── */
const index = new Map();
const cleParPasse = (e, p) => (p === 0 ? e.name : p === 1 ? e.attributes?.roman_name : e.slug);
for (let passe = 0; passe < 3; passe++) {
  for (const e of entries) {
    const cle = norm(cleParPasse(e, passe));
    if (!cle) continue;
    if (!index.has(e.universe)) index.set(e.universe, new Map());
    const m = index.get(e.universe);
    const deja = m.get(cle);
    if (!deja) { m.set(cle, { passe, candidats: [e] }); continue; }
    if (deja.passe !== passe) continue;
    if (!deja.candidats.some((c) => c.id === e.id)) deja.candidats.push(e);
  }
}
const resoudre = (univers, valeur, typeAttendu = null) => {
  const cle = norm(valeur);
  if (!cle) return null;
  const t = index.get(univers)?.get(cle);
  if (!t) return null;
  if (t.candidats.length === 1) return t.candidats[0];
  const f = typeAttendu ? t.candidats.filter((c) => c.type === typeAttendu) : [];
  return f.length === 1 ? f[0] : null;      // homonyme non départagé → on renonce
};

/* ── LA NATURE N'EST PAS CHOISIE, ELLE EST LUE DANS LE GRAPHE EXISTANT ────────────────────────
   Mesuré sur les 16 388 arêtes en place (trace : data/audits/aretes-manquantes-*.json) :
     village   → habite 753   ·  monde  → habite 66      (personnage vers un lieu : il y vit)
     region    → appartient 92                            (lieu dans un lieu : contenance)
     crew 320 · organization 186 · equipe 188 · clan 68 · camp 16 → appartient  (adhésion)
     faction   → exerce 20 quand la cible est un métier (Pirate), appartient 38 sinon
   D'où la règle unique ci-dessous, qui redit ces quatre précédents et n'en invente aucun. */
const natureDe = (source, cible) => {
  if (cible.type === 'profession') return 'exerce';
  if (cible.type === 'place' && source.type === 'character') return 'habite';
  return 'appartient';
};

const candidats = [];
const vues = new Set();
const pousser = (source, cible, relation, lot, preuve, source_url = null) => {
  if (!cible || source.id === cible.id) return false;
  if (source.universe !== cible.universe) return false;            // garde-fou inter-univers
  const cle = `${source.id}|${cible.id}|${relation}`;
  if (areteExistante.has(cle) || vues.has(cle)) return false;
  vues.add(cle);
  candidats.push({
    lot, from_entry: source.id, to_entry: cible.id, relation,
    de: source.name, deSlug: source.slug, deType: source.type,
    vers: cible.name, versSlug: cible.slug, versType: cible.type,
    univers: source.universe,
    sauveDe: estIsolee(source.id), sauveVers: estIsolee(cible.id),
    preuve, source_url,
  });
  return true;
};

/* ═══ LOT A — ce que `attributes` sait déjà, pour les seules arêtes qui touchent une isolée ═══ */
const CHAMPS_A = ['village', 'clan', 'clanSlug', 'organization', 'equipe', 'division', 'rank',
  'generation', 'faction', 'crew', 'race', 'saga', 'monde', 'nen', 'partie', 'col', 'camp',
  'category', 'element', 'region', 'material', 'discipline', 'occupation', 'origin', 'fruit',
  'affiliation', 'team', 'tools', 'abilities', 'signature', 'natureType', 'kekkeiGenkai',
  'classification', 'villageSlug'];
const valeursDe = (attrs, champ) => {
  const v = attrs?.[champ];
  if (typeof v === 'string') return v === 'inconnu' ? [] : [v];
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : (x?.name ?? x?.nom ?? null))).filter(Boolean);
  return [];
};
for (const e of entries) {
  for (const champ of CHAMPS_A) {
    for (const v of valeursDe(e.attributes, champ)) {
      const cible = resoudre(e.universe, v);
      if (!cible || cible.id === e.id) continue;
      if (!estIsolee(e.id) && !estIsolee(cible.id)) continue;      // hors chantier : on s'abstient
      pousser(e, cible, natureDe(e, cible), 'A',
        `akasha_entries[${e.slug}].attributes.${champ} = ${JSON.stringify(v)} ; une fiche de l'univers ${e.universe} porte ce nom exact : ${cible.name} (${cible.slug}, type ${cible.type})`);
    }
  }
  for (const m of (Array.isArray(e.attributes?.family) ? e.attributes.family : [])) {
    const cible = resoudre(e.universe, m?.slug, 'character') ?? resoudre(e.universe, m?.name, 'character');
    if (!cible || cible.id === e.id) continue;
    if (!estIsolee(e.id) && !estIsolee(cible.id)) continue;
    pousser(e, cible, 'famille',
      'A', `akasha_entries[${e.slug}].attributes.family contient {"rel":${JSON.stringify(m?.rel ?? null)},"name":${JSON.stringify(m?.name ?? null)},"slug":${JSON.stringify(m?.slug ?? null)}} ; fiche cible ${cible.slug}`);
  }
}
console.log(`\nLOT A (attributs déjà en base) : ${candidats.length} arêtes`);

/* ═══ LOT B — l'infobox du wiki Fandom, pour les isolées qui n'ont rien d'autre ══════════════
   Deux sauts, aucune invention :
     1) page du personnage → « | affiliation = [[Beasts Pirates]] »
     2) page « Beasts Pirates » → « | rname = ''Hyakujū Kaizokudan'' » → notre roman_name
   Le libellé d'un lien piped est IGNORÉ ([[King (Title)|King]] tombait sur le personnage King),
   et toute cible de type `character` est refusée : une appartenance n'est pas une personne. */
const nAvantB = candidats.length;
const journalB = { pagesAbsentes: [], sansChamp: [], refus: [] };
for (const [univers, cfg] of Object.entries(WIKIS)) {
  const lot = isolees.filter((e) => e.universe === univers);
  if (!lot.length) continue;
  console.log(`\n──── ${univers} · ${lot.length} isolées · ${cfg.hote} ────`);
  const pages = await wikitextes(cfg.hote, lot.map((e) => e.name));
  // GARDE 2 — une page réclamée par PLUSIEURS de nos fiches n'identifie aucune d'elles : les cinq
  // quintuplées sirènes redirigent toutes vers « Medaka Mermaid Quintuplets ». On refuse le groupe.
  const compteurPage = new Map();
  for (const e of lot) { const p = pages.get(e.name); if (p) compteurPage.set(p.titre, (compteurPage.get(p.titre) ?? 0) + 1); }
  const brut = [];
  for (const e of lot) {
    const p = pages.get(e.name);
    if (!p) { journalB.pagesAbsentes.push(`${univers} · ${e.name}`); continue; }
    // GARDE 1 — redirection vers une SECTION : la page atteinte n'est pas celle de notre fiche.
    if (p.fragment) { journalB.refus.push(`${e.name} : redirection de section vers ${p.fragment}`); continue; }
    if (compteurPage.get(p.titre) > 1) { journalB.refus.push(`${e.name} : page « ${p.titre} » partagée par ${compteurPage.get(p.titre)} de nos fiches`); continue; }
    const params = parametresInfobox(p.texte);
    let n = 0;
    for (const champ of cfg.champs) {
      for (const c of ciblesDuParametre(params[champ])) {
        brut.push({ e, champ, ...c, url: `https://${cfg.hote}/wiki/${encodeURIComponent(p.titre.replace(/ /g, '_'))}`,
          ligne: `| ${champ} = ${String(params[champ]).replace(/\{\{Qref[^}]*\}\}/gi, '').trim().slice(0, 160)}` });
        n++;
      }
    }
    if (!n) journalB.sansChamp.push(`${univers} · ${e.name}`);
  }
  const aTraduire = new Set();
  const direct = new Map();
  for (const b of brut) {
    const hit = resoudre(univers, b.titre);
    if (hit) direct.set(b, hit); else aTraduire.add(b.titre);
  }
  const pagesCibles = aTraduire.size ? await wikitextes(cfg.hote, [...aTraduire]) : new Map();
  const romaji = new Map();
  for (const [t, p] of pagesCibles) {
    if (!p) continue;
    // GARDE 1 aussi au SECOND saut : « Okobore Town » redirige vers « Kuri#Okobore Town », donc son
    // rname lu (« Kuri ») est celui de la RÉGION, pas de la ville. Le lien tombait juste par hasard ;
    // le mécanisme, lui, désignait autre chose que la cible. On refuse.
    if (p.fragment) { journalB.refus.push(`cible « ${t} » : redirection de section vers ${p.fragment}`); continue; }
    const par = parametresInfobox(p.texte);
    if (par.rname) romaji.set(t, { valeur: String(par.rname).replace(/'{2,}/g, '').replace(/<[^>]+>/g, '').split(/[;(]/)[0].trim(), ligne: `| rname = ${String(par.rname).slice(0, 80)}` });
  }
  for (const b of brut) {
    let cible = direct.get(b) ?? null;
    let preuve = `${b.url} · infobox « ${b.ligne} » → [[${b.titre}]] ; fiche de même nom dans l'univers ${univers}`;
    if (!cible) {
      const rj = romaji.get(b.titre);
      if (!rj) continue;
      cible = resoudre(univers, rj.valeur);
      if (!cible) continue;
      preuve = `${b.url} · infobox « ${b.ligne} » → [[${b.titre}]] ; https://${cfg.hote}/wiki/${encodeURIComponent(b.titre.replace(/ /g, '_'))} donne « ${rj.ligne} » → roman_name « ${rj.valeur} » = fiche ${cible.slug}`;
    }
    if (cible.type === 'character') { journalB.refus.push(`${b.e.name} --${b.champ}--> ${cible.name} (cible personne)`); continue; }
    pousser(b.e, cible, natureDe(b.e, cible), 'B', preuve, b.url);
  }
}
console.log(`\nLOT B (infobox Fandom) : ${candidats.length - nAvantB} arêtes`);

/* ── Ce que ça change, mesuré avant d'écrire ─────────────────────────────────────────────── */
const sauvees = new Set();
for (const c of candidats) { if (c.sauveDe) sauvees.add(c.from_entry); if (c.sauveVers) sauvees.add(c.to_entry); }
const parLot = {}, parNature = {}, parUniv = {};
for (const c of candidats) {
  parLot[c.lot] = (parLot[c.lot] ?? 0) + 1;
  parNature[c.relation] = (parNature[c.relation] ?? 0) + 1;
  parUniv[c.univers] = (parUniv[c.univers] ?? 0) + 1;
}
console.log(`\n=== BILAN AVANT ÉCRITURE ===`);
console.log(`arêtes candidates : ${candidats.length}   (${Object.entries(parLot).map(([k, v]) => `lot ${k}=${v}`).join(' · ')})`);
console.log(`par nature : ${Object.entries(parNature).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
console.log(`par univers : ${Object.entries(parUniv).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
console.log(`isolées sorties : ${sauvees.size}  →  ${isolees.length} - ${sauvees.size} = ${isolees.length - sauvees.size} resteraient`);

// TRACE AVANT ÉCRITURE, chemin horodaté (leçon du 08/08 : un contrôle relancé a effacé 42 preuves).
const trace = path.join(ROOT, `data/audits/sortie-isolees-trace-${HORODATE}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: 'sortir les fiches isolées du graphe AKASHA', quand: new Date().toISOString(), dry: DRY,
  avant: { fiches: entries.length, aretes: rels.length, isolees: isolees.length },
  attendu: { aretes: candidats.length, isoleesSorties: sauvees.size, isoleesRestantes: isolees.length - sauvees.size },
  parLot, parNature, parUniv,
  journalB: { pagesAbsentes: journalB.pagesAbsentes.length, sansChampUtile: journalB.sansChamp.length, ciblesPersonneRefusees: journalB.refus },
  candidats,
}, null, 1));
console.log(`\ntrace AVANT écriture : ${path.relative(ROOT, trace)}`);

if (DRY) { console.log('\n--dry : rien écrit.'); process.exit(0); }

/* ── Écriture. Seule table touchée : akasha_relations. ───────────────────────────────────── */
let ecrites = 0, erreurs = 0;
for (let i = 0; i < candidats.length; i += 200) {
  const lot = candidats.slice(i, i + 200).map((c) => ({ from_entry: c.from_entry, to_entry: c.to_entry, relation: c.relation }));
  const { data, error } = await db.from('akasha_relations')
    .upsert(lot, { onConflict: 'from_entry,to_entry,relation', ignoreDuplicates: true })
    .select('id');
  if (error) { console.error(`  ✗ lot ${i} : ${error.message}`); erreurs += lot.length; continue; }
  ecrites += data?.length ?? 0;
  process.stdout.write(`\r  écrites ${ecrites}/${candidats.length}`);
}
console.log('');

const apresRels = await page('akasha_relations', 'from_entry, to_entry');
const deg2 = new Set();
for (const r of apresRels) { deg2.add(r.from_entry); deg2.add(r.to_entry); }
const isoApres = entries.filter((e) => !deg2.has(e.id)).length;
console.log(`\nAPRÈS : ${apresRels.length} arêtes · ${isoApres} isolées  (avant ${rels.length} / ${isolees.length})`);

const exec = path.join(ROOT, `data/audits/sortie-isolees-exec-${HORODATE}.json`);
fs.writeFileSync(exec, JSON.stringify({
  quand: new Date().toISOString(), tentees: candidats.length, ecrites, erreurs,
  avant: { aretes: rels.length, isolees: isolees.length },
  apres: { aretes: apresRels.length, isolees: isoApres },
  baisseIsolees: isolees.length - isoApres,
}, null, 1));
console.log(`trace d'exécution : ${path.relative(ROOT, exec)}`);
