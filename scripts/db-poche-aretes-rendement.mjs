// Chantier 4 — étape B : RENDEMENT CHAMP PAR CHAMP.
// Pour chaque champ d'infobox du wiki Dragon Ball : combien de ses cibles se rattachent à une fiche
// EXISTANTE de notre corpus, par un pont citable, et l'arête serait-elle VISIBLE sur la fiche source ?
// Lecture seule. Aucun champ décrété d'avance : on mesure les 40 champs relevés en étape A.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { infoboxDuWikitexte } from './audit-isolees-gisement-4univers.mjs';
import { ciblesDuParametre } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const HOTE = 'dragonball.fandom.com';
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const normRoman = (s) => norm(s).replace(/ou/g, 'o').replace(/uu/g, 'u').replace(/oo/g, 'o');
function variantesMacron(nom) {
  let sorties = [nom];
  for (const [w, m] of [['ou', 'ō'], ['oo', 'ō'], ['uu', 'ū']]) {
    const suiv = new Set();
    for (const s of sorties) { suiv.add(s); if (s.toLowerCase().includes(w)) suiv.add(s.replace(new RegExp(w, 'g'), m)); }
    sorties = [...suiv].slice(0, 8);
  }
  return sorties.filter((s) => s !== nom);
}
function titreSourceCite(descFrSource) {
  const s = String(descFrSource ?? '');
  const i = s.lastIndexOf('·');
  if (i < 0) return null;
  let t = s.slice(i + 1).trim();
  if (/^mentions?\s*:/i.test(t) || t.includes(',')) return null;
  const url = t.match(/\/wiki\/([^\s,]+)$/);
  if (url) return decodeURIComponent(url[1]).replace(/_/g, ' ');
  if (/^https?:/.test(t)) return null;
  return t.replace(/\s*\([A-Za-z' ]*Wiki\)\s*$/i, '').trim() || null;
}
async function pagesDe(titres) {
  const out = new Map();
  for (let i = 0; i < titres.length; i += 50) {
    const url = `https://${HOTE}/api.php?${new URLSearchParams({
      action: 'query', prop: 'revisions|langlinks', rvprop: 'content', rvslots: 'main',
      lllang: 'fr', lllimit: 'max', redirects: '1', format: 'json', formatversion: '2',
      titles: titres.slice(i, i + 50).join('|'),
    })}`;
    const r = await fetch(url, { headers: UA });
    await new Promise((x) => setTimeout(x, 200));
    if (!r.ok) { console.error(`  ✗ lot ${i} HTTP ${r.status}`); continue; }
    const j = await r.json();
    const origine = new Map(), fragment = new Map();
    for (const n of j.query?.normalized ?? []) origine.set(n.to, n.from);
    for (const n of j.query?.redirects ?? []) {
      const dem = origine.get(n.from) ?? n.from;
      origine.set(n.to, dem);
      if (n.tofragment) fragment.set(dem, `${n.to}#${n.tofragment}`);
    }
    for (const p of j.query?.pages ?? []) {
      const dem = origine.get(p.title) ?? p.title;
      out.set(dem, p.missing ? null : {
        titre: p.title, texte: p.revisions?.[0]?.slots?.main?.content ?? '',
        fragment: fragment.get(dem) ?? null, fr: p.langlinks?.[0]?.title ?? null,
      });
    }
  }
  return out;
}

const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const deg = new Set();
for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const dejaLa = new Set(rels.map((r) => `${r.from_entry}>${r.to_entry}>${r.relation}`));
const isolees = entries.filter((e) => !deg.has(e.id) && e.universe === 'Dragon Ball');
const memeUnivers = entries.filter((e) => e.universe === 'Dragon Ball');
console.log(`${isolees.length} isolées Dragon Ball · corpus univers ${memeUnivers.length}`);

// index de résolution intra-univers (pont 1 : nom identique / romanisation repliée / slug / roman_name)
const idx = new Map();
for (const e of memeUnivers) {
  for (const cle of [norm(e.name), normRoman(e.name), norm(e.slug), norm(e.attributes?.roman_name)]) {
    if (!cle) continue;
    if (!idx.has(cle)) idx.set(cle, []);
    if (!idx.get(cle).some((c) => c.id === e.id)) idx.get(cle).push(e);
  }
}
// pont 3 : notre fiche cite sa page source anglaise
const parSourceCitee = new Map();
for (const e of memeUnivers) {
  const t = titreSourceCite(e.attributes?.descFrSource);
  if (!t) continue;
  const cle = norm(t);
  if (!parSourceCitee.has(cle)) parSourceCitee.set(cle, []);
  parSourceCitee.get(cle).push(e);
}

// ── pages sources des isolées ──
const candidats = new Map();
for (const e of isolees) {
  candidats.set(e.name, e);
  const src = titreSourceCite(e.attributes?.descFrSource);
  if (src && !candidats.has(src)) candidats.set(src, e);
  for (const v of variantesMacron(e.name)) if (!candidats.has(v)) candidats.set(v, e);
}
const pages = await pagesDe([...candidats.keys()]);
const lues = new Map();
for (const [titre, e] of candidats) {
  if (lues.has(e.id)) continue;
  const p = pages.get(titre);
  if (p && !p.fragment) lues.set(e.id, { e, p });
}
console.log(`→ ${lues.size} pages sources lues`);

// ── extraction brute : TOUS les champs ──
const brut = [];
for (const { e, p } of lues.values()) {
  const ib = infoboxDuWikitexte(p.texte);
  for (const [champ, val] of Object.entries(ib.params)) {
    for (const c of ciblesDuParametre(val)) {
      brut.push({ e, champ, cible: c.titre, gabarit: ib.nom, titreSource: p.titre, valeur: String(val).slice(0, 200) });
    }
  }
}
console.log(`→ ${brut.length} cibles brutes, ${new Set(brut.map((b) => b.champ)).size} champs`);

// ── résolution : pont 1, puis pont 2 (interlangue fr), puis pont 3 ──
const aPonter = new Set();
for (const b of brut) {
  const hit = idx.get(norm(b.cible)) ?? idx.get(normRoman(b.cible));
  if (hit?.length === 1) { b.vers = hit[0]; b.pont = 'nom identique'; }
  else if (hit?.length > 1) b.refus = 'homonyme en base';
  else aPonter.add(b.cible);
}
console.log(`→ ${aPonter.size} cibles à ponter (interlangue / source citée)`);
const pagesCibles = aPonter.size ? await pagesDe([...aPonter]) : new Map();
const pont = new Map();
for (const [t, p] of pagesCibles) {
  if (!p || p.fragment) continue;
  if (p.fr) {
    const c = memeUnivers.filter((e) => norm(e.name) === norm(p.fr));
    if (c.length === 1) { pont.set(t, { e: c[0], voie: 'lien interlangue', detail: `${HOTE} déclare fr = « ${p.fr} » pour « ${p.titre} »` }); continue; }
  }
  const c2 = parSourceCitee.get(norm(t)) ?? [];
  if (c2.length === 1) pont.set(t, { e: c2[0], voie: 'source citée en base', detail: `notre fiche « ${c2[0].name} » déclare descFrSource nommant « ${t} »` });
}
for (const b of brut) {
  if (b.vers || b.refus) continue;
  const p = pont.get(b.cible);
  if (p) { b.vers = p.e; b.pont = p.voie; b.detailPont = p.detail; }
  else b.refus = pagesCibles.get(b.cible) ? 'cible sans équivalent en base' : 'page cible absente du wiki';
}

// ── tally par champ ──
const parChamp = {};
for (const b of brut) {
  const c = (parChamp[b.champ] ??= { cibles: 0, resolues: 0, fichesSources: new Set(), fichesResolues: new Set(), typesCible: {}, exemplesOk: [], exemplesKo: {} });
  c.cibles++; c.fichesSources.add(b.e.id);
  if (b.vers) {
    c.resolues++; c.fichesResolues.add(b.e.id);
    c.typesCible[b.vers.type] = (c.typesCible[b.vers.type] ?? 0) + 1;
    if (c.exemplesOk.length < 8) c.exemplesOk.push({ de: b.e.name, deType: b.e.type, cible: b.cible, vers: b.vers.name, versType: b.vers.type, pont: b.pont, titreSource: b.titreSource });
  } else {
    c.exemplesKo[b.refus] = (c.exemplesKo[b.refus] ?? 0) + 1;
  }
}
const tableau = Object.entries(parChamp).map(([champ, v]) => ({
  champ, cibles: v.cibles, resolues: v.resolues,
  fichesSources: v.fichesSources.size, fichesResolues: v.fichesResolues.size,
  rendement: v.cibles ? +(v.resolues / v.cibles * 100).toFixed(1) : 0,
  typesCible: v.typesCible, refus: v.exemplesKo, exemples: v.exemplesOk,
})).sort((a, b) => b.resolues - a.resolues || b.cibles - a.cibles);

const trace = path.join(ROOT, `data/audits/poche-db-aretes-rendement-${STAMP}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: 'chantier 4 — étape B : rendement champ par champ (wiki Dragon Ball → notre corpus)',
  quand: new Date().toISOString(), mode: 'MESURE (lecture seule, réseau)',
  isolees: isolees.length, pagesSourcesLues: lues.size, ciblesBrutes: brut.length,
  tableau,
}, null, 1));
console.log('trace →', path.relative(ROOT, trace));
console.log('\nCHAMP                       cibles  résolues  rend.%  fichesSrc  fichesRés  typesCible');
for (const t of tableau.slice(0, 24)) {
  console.log(`${t.champ.padEnd(26)} ${String(t.cibles).padStart(5)} ${String(t.resolues).padStart(9)} ${String(t.rendement).padStart(7)} ${String(t.fichesSources).padStart(10)} ${String(t.fichesResolues).padStart(10)}   ${JSON.stringify(t.typesCible)}`);
}
