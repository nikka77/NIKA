// Chantier 4 — ARÊTES : que sert VRAIMENT dragonball.fandom.com pour nos 146 isolées ?
// Étape A : reconnaissance CHAMP PAR CHAMP, aucune écriture, aucun champ décrété d'avance.
// Leçon 238 : ne jamais lire « le premier gabarit » ; chercher pour de vrai avant de dire « absente ».
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
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
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
  t = t.replace(/\s*\((?:[A-Za-z' ]*Wiki|Dragon Ball Wiki)\)\s*$/i, '').trim();
  return t || null;
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
async function chercher(terme) {
  const url = `https://${HOTE}/api.php?${new URLSearchParams({
    action: 'query', list: 'search', srsearch: terme, srlimit: '3', srnamespace: '0',
    format: 'json', formatversion: '2',
  })}`;
  const r = await fetch(url, { headers: UA });
  await new Promise((x) => setTimeout(x, 200));
  if (!r.ok) return [];
  const j = await r.json();
  return (j.query?.search ?? []).map((s) => s.title);
}

// ── corpus ──
const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const deg = new Set();
for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const isolees = entries.filter((e) => !deg.has(e.id) && e.universe === 'Dragon Ball');
console.log(`${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées Dragon Ball`);

// TÉMOIN (leçon 238-4) : l'hôte répond-il ?
const temoin = await pagesDe(['Goku']);
console.log(`témoin « Goku » : ${temoin.get('Goku') ? `servi (${temoin.get('Goku').texte.length} octets)` : 'ABSENT — hôte suspect'}`);

// ── résolution des titres ──
const candidats = new Map();  // titre demandé → fiche
for (const e of isolees) {
  candidats.set(e.name, e);
  const src = titreSourceCite(e.attributes?.descFrSource);
  if (src && !candidats.has(src)) candidats.set(src, e);
  for (const v of variantesMacron(e.name)) if (!candidats.has(v)) candidats.set(v, e);
}
console.log(`→ ${candidats.size} titres candidats pour ${isolees.length} isolées`);
const pages = await pagesDe([...candidats.keys()]);

const parFiche = new Map();
for (const [titre, e] of candidats) {
  if (parFiche.has(e.id)) continue;
  const p = pages.get(titre);
  if (p && !p.fragment) parFiche.set(e.id, { e, p, titreDemande: titre });
}
console.log(`→ ${parFiche.size}/${isolees.length} pages trouvées par titre direct`);

// list=search pour les manquantes (leçon 238-3 : un titre qui rate ne prouve pas l'absence)
const manquantes = isolees.filter((e) => !parFiche.has(e.id));
const trouveesParRecherche = [];
for (const e of manquantes) {
  const hits = await chercher(`${e.name} Dragon Ball`);
  if (!hits.length) { trouveesParRecherche.push({ slug: e.slug, name: e.name, hits: [] }); continue; }
  trouveesParRecherche.push({ slug: e.slug, name: e.name, hits });
}
const aRecuperer = [...new Set(trouveesParRecherche.flatMap((t) => t.hits))];
const pages2 = aRecuperer.length ? await pagesDe(aRecuperer) : new Map();

// ── tally CHAMP PAR CHAMP ──
const gabarits = {};
const champs = {};      // champ → { fiches, valeursNonVides, liens, exemples[] }
const noteChamp = (champ, val, e, gabarit, titre) => {
  const c = (champs[champ] ??= { fiches: 0, avecLien: 0, liens: 0, exemples: [] });
  c.fiches++;
  const cibles = ciblesDuParametre(val);
  if (cibles.length) { c.avecLien++; c.liens += cibles.length; }
  if (c.exemples.length < 6) c.exemples.push({ de: e.name, titre, gabarit, valeur: String(val).slice(0, 160), cibles: cibles.map((x) => x.titre) });
};

const fichesLues = [];
for (const { e, p, titreDemande } of parFiche.values()) {
  const ib = infoboxDuWikitexte(p.texte);
  gabarits[ib.nom ?? '(aucun)'] = (gabarits[ib.nom ?? '(aucun)'] ?? 0) + 1;
  for (const [champ, val] of Object.entries(ib.params)) if (String(val).trim()) noteChamp(champ, val, e, ib.nom, p.titre);
  fichesLues.push({ slug: e.slug, name: e.name, type: e.type, titreWiki: p.titre, titreDemande, gabarit: ib.nom, nbChamps: ib.nb, fr: p.fr });
}

const rapport = {
  chantier: 'chantier 4 — étape A : rendement CHAMP PAR CHAMP du wiki Dragon Ball sur les isolées',
  quand: new Date().toISOString(),
  mode: 'MESURE (lecture seule, réseau)',
  hote: HOTE,
  temoinGoku: temoin.get('Goku') ? 'servi' : 'absent',
  base: { fiches: entries.length, aretes: rels.length, isoleesDragonBall: isolees.length },
  resolution: {
    titresCandidats: candidats.size,
    pagesParTitreDirect: parFiche.size,
    sansPageParTitre: manquantes.length,
    rechercheListSearch: trouveesParRecherche.filter((t) => t.hits.length).length,
    rechercheSansAucunHit: trouveesParRecherche.filter((t) => !t.hits.length).length,
  },
  gabarits,
  champs: Object.fromEntries(Object.entries(champs).sort((a, b) => b[1].avecLien - a[1].avecLien || b[1].fiches - a[1].fiches)),
  fichesLues,
  recherche: trouveesParRecherche,
  pagesRecherchees: [...pages2.entries()].map(([t, p]) => ({ titre: t, trouvee: !!p, gabarit: p ? infoboxDuWikitexte(p.texte).nom : null })),
};
const trace = path.join(ROOT, `data/audits/poche-db-aretes-sondeA-${STAMP}.json`);
fs.writeFileSync(trace, JSON.stringify(rapport, null, 1));
console.log('trace →', path.relative(ROOT, trace));
console.log('\nGABARITS :', JSON.stringify(gabarits, null, 1));
console.log('\nCHAMPS (triés par nb de fiches où le champ porte AU MOINS un lien) :');
for (const [c, v] of Object.entries(rapport.champs).slice(0, 30)) {
  console.log(`  ${String(c).padEnd(26)} fiches=${String(v.fiches).padStart(3)}  avecLien=${String(v.avecLien).padStart(3)}  liens=${String(v.liens).padStart(4)}`);
}
