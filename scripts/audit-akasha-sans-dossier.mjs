// scripts/audit-akasha-sans-dossier.mjs — CHANTIER 6 : les fiches sans dossier, mesurées.
//
// POURQUOI (10/08/2026). Le carnet annonce 2 862 fiches sans aucune section. Avant d'en fabriquer,
// une question décide tout : y a-t-il de la MATIÈRE à découper ? Une fiche de deux phrases n'a pas
// besoin d'être coupée en sections — lui en fabriquer serait du remplissage, exactement ce que la
// vague 1 a passé son temps à défaire. Ce script mesure, il n'écrit RIEN en base.
//
// Il répond à quatre questions :
//   1. Combien de fiches sans dossier, par univers et par type (recompte, le carnet est daté) ?
//   2. Quelle est la distribution des longueurs de `attributes.descFr` sur cette population ?
//   3. À quoi ressemblent les 19 099 sections DÉJÀ écrites (idx, titre, source, longueur) ?
//   4. Les fiches qui ONT un dossier ont-elles AUSSI un descFr ? — c'est ce qui dit si « descFr
//      découpé en sections » produirait un doublon à l'écran ou une architecture normale.
//
// Usage : node --env-file=.env.local scripts/audit-akasha-sans-dossier.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();

// PAGINATION OBLIGATOIRE : un select nu s'arrête à 1000 lignes SANS ERREUR — ce piège a produit
// quatre chiffres faux cette semaine (règle 1 du carnet).
const page = async (table, sel, tri = 'id') => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).order(tri).range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const secs = await page('akasha_sections', 'entry_id, idx, titre, texte, source');

const parFiche = new Map();
for (const s of secs) {
  if (!parFiche.has(s.entry_id)) parFiche.set(s.entry_id, []);
  parFiche.get(s.entry_id).push(s);
}

const descFr = (e) => (typeof e.attributes?.descFr === 'string' ? e.attributes.descFr.trim() : '');
const sansDossier = entries.filter((e) => !parFiche.has(e.id));
const avecDossier = entries.filter((e) => parFiche.has(e.id));

// ── 2. Distribution des longueurs de descFr sur la population sans dossier ──────────────────
const TRANCHES = [[0, 0], [1, 200], [201, 400], [401, 600], [601, 1000], [1001, 2000], [2001, 5000], [5001, 1e9]];
const distribuer = (lot) => TRANCHES.map(([a, b]) => ({
  tranche: a === 0 && b === 0 ? 'vide' : b >= 1e9 ? `${a}+` : `${a}-${b}`,
  n: lot.filter((e) => { const L = descFr(e).length; return L >= a && L <= b; }).length,
}));

const riches = sansDossier.filter((e) => descFr(e).length > 600);

// Par univers / par type, restreint à la population sans dossier.
const grouper = (lot, cle) => {
  const m = {};
  for (const e of lot) {
    const k = e[cle] ?? '(vide)';
    m[k] ??= { fiches: 0, sansDescFr: 0, riches600: 0, longueurMediane: 0, _L: [] };
    m[k].fiches++;
    const L = descFr(e).length;
    if (!L) m[k].sansDescFr++;
    if (L > 600) m[k].riches600++;
    m[k]._L.push(L);
  }
  for (const v of Object.values(m)) {
    v._L.sort((a, b) => a - b);
    v.longueurMediane = v._L[Math.floor(v._L.length / 2)] ?? 0;
    delete v._L;
  }
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1].fiches - a[1].fiches));
};

// ── 3. Anatomie des sections existantes ─────────────────────────────────────────────────────
const longueursSec = secs.map((s) => (s.texte ?? '').length).sort((a, b) => a - b);
const q = (arr, p) => arr[Math.floor(arr.length * p)] ?? 0;
const sources = {};
for (const s of secs) sources[s.source ?? '(null)'] = (sources[s.source ?? '(null)'] ?? 0) + 1;
const titres = {};
for (const s of secs) { const t = (s.titre ?? '(null)').trim(); titres[t] = (titres[t] ?? 0) + 1; }
const titresTop = Object.entries(titres).sort((a, b) => b[1] - a[1]).slice(0, 40);
const idxFormes = {};
for (const s of secs) {
  const f = /^\d+$/.test(String(s.idx)) ? 'entier' : /^\d+\.\d+$/.test(String(s.idx)) ? 'n.n' : /^\d+(\.\d+){2,}$/.test(String(s.idx)) ? 'n.n.n' : 'autre';
  idxFormes[f] = (idxFormes[f] ?? 0) + 1;
}
const nbSectionsParFiche = [...parFiche.values()].map((v) => v.length).sort((a, b) => a - b);

// ── 4. Coexistence descFr × dossier ─────────────────────────────────────────────────────────
const coexistence = {
  avecDossier: avecDossier.length,
  avecDossierEtDescFr: avecDossier.filter((e) => descFr(e).length > 0).length,
  avecDossierEtDescFrLong600: avecDossier.filter((e) => descFr(e).length > 600).length,
  avecDossierSansDescFr: avecDossier.filter((e) => !descFr(e).length).length,
};

// ── Indices de découpabilité DANS le texte lui-même : sans intertitre ni rupture, un texte ne
// se découpe pas « depuis le texte » — il faudrait plaquer des titres, ce que la consigne interdit.
const marqueurs = (t) => ({
  // Un intertitre de wiki survivant : « == Histoire == » ou une ligne courte suivie d'un blanc.
  wikiTitre: /^\s*=+[^=\n]+=+\s*$/m.test(t),
  markdownTitre: /^\s*#{1,4}\s+\S/m.test(t),
  grasLigne: /^\s*\*\*[^*\n]{3,60}\*\*\s*:?\s*$/m.test(t),
  // Paragraphes séparés par une ligne vide : la seule vraie articulation d'un texte de prose.
  paragraphes: t.split(/\n\s*\n/).filter((p) => p.trim().length > 40).length,
  sautsSimples: (t.match(/\n/g) ?? []).length,
});
const richesMarqueurs = riches.map((e) => marqueurs(descFr(e)));
const compte = (pred) => richesMarqueurs.filter(pred).length;

const rapport = {
  chantier: 'CHANTIER 6 — fiches sans dossier : y a-t-il de la matière ?',
  quand: new Date().toISOString(),
  ecritEnBase: 'RIEN — audit en lecture seule',
  totaux: {
    fiches: entries.length,
    sectionsExistantes: secs.length,
    fichesAvecDossier: avecDossier.length,
    fichesSansDossier: sansDossier.length,
    carnetAnnoncait: 2862,
  },
  gisement: {
    sansDossierEtDescFrVide: sansDossier.filter((e) => !descFr(e).length).length,
    sansDossierEtDescFrSup600: riches.length,
    sansDossierEtDescFrSup1000: sansDossier.filter((e) => descFr(e).length > 1000).length,
    sansDossierEtDescFrSup2000: sansDossier.filter((e) => descFr(e).length > 2000).length,
    distribution: distribuer(sansDossier),
  },
  marqueursDeDecoupeSurLesRiches: {
    total: riches.length,
    avecIntertitreWiki: compte((m) => m.wikiTitre),
    avecIntertitreMarkdown: compte((m) => m.markdownTitre),
    avecLigneEnGras: compte((m) => m.grasLigne),
    auMoins2Paragraphes: compte((m) => m.paragraphes >= 2),
    auMoins3Paragraphes: compte((m) => m.paragraphes >= 3),
    unSeulBlocSansSautDeLigne: compte((m) => m.sautsSimples === 0),
  },
  parUnivers: grouper(sansDossier, 'universe'),
  parType: grouper(sansDossier, 'type'),
  anatomieDesSectionsExistantes: {
    sections: secs.length,
    fiches: parFiche.size,
    sectionsParFiche: { min: nbSectionsParFiche[0], mediane: q(nbSectionsParFiche, 0.5), p90: q(nbSectionsParFiche, 0.9), max: nbSectionsParFiche.at(-1) },
    longueurTexte: { min: longueursSec[0], p10: q(longueursSec, 0.1), mediane: q(longueursSec, 0.5), p90: q(longueursSec, 0.9), max: longueursSec.at(-1) },
    formesDIdx: idxFormes,
    sources: Object.fromEntries(Object.entries(sources).sort((a, b) => b[1] - a[1])),
    titresLesPlusFrequents: titresTop,
    titresDistincts: Object.keys(titres).length,
  },
  coexistence,
  echantillonRiches: riches.slice(0, 12).map((e) => ({
    slug: e.slug, name: e.name, type: e.type, universe: e.universe,
    longueurDescFr: descFr(e).length,
    paragraphes: marqueurs(descFr(e)).paragraphes,
    extrait: descFr(e).slice(0, 300),
  })),
};

const sortie = path.join(ROOT, `data/audits/sans-dossier-trace-${rapport.quand.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));

const t = rapport.totaux, g = rapport.gisement;
console.log(`${t.fiches} fiches · ${t.sectionsExistantes} sections · avec dossier ${t.fichesAvecDossier} · SANS dossier ${t.fichesSansDossier} (carnet : ${t.carnetAnnoncait})`);
console.log(`\nGISEMENT — parmi les ${t.fichesSansDossier} sans dossier :`);
console.log(`  descFr vide      ${g.sansDossierEtDescFrVide}`);
console.log(`  descFr > 600 c   ${g.sansDossierEtDescFrSup600}`);
console.log(`  descFr > 1000 c  ${g.sansDossierEtDescFrSup1000}`);
console.log(`  descFr > 2000 c  ${g.sansDossierEtDescFrSup2000}`);
console.log('  distribution :', g.distribution.map((d) => `${d.tranche}:${d.n}`).join(' · '));
console.log('\nMARQUEURS DE DÉCOUPE sur les riches :', JSON.stringify(rapport.marqueursDeDecoupeSurLesRiches));
console.log('\nCOEXISTENCE descFr × dossier :', JSON.stringify(coexistence));
console.log('\nANATOMIE des sections existantes :');
console.log('  par fiche', JSON.stringify(rapport.anatomieDesSectionsExistantes.sectionsParFiche), '· longueur', JSON.stringify(rapport.anatomieDesSectionsExistantes.longueurTexte));
console.log('  idx', JSON.stringify(idxFormes));
console.log('  sources', JSON.stringify(rapport.anatomieDesSectionsExistantes.sources).slice(0, 600));
console.log('  titres distincts', rapport.anatomieDesSectionsExistantes.titresDistincts, '· top :', titresTop.slice(0, 15).map(([a, b]) => `${a}(${b})`).join(' · '));
console.log('\npar univers :');
for (const [u, v] of Object.entries(rapport.parUnivers)) console.log(`  ${u.padEnd(26)} ${String(v.fiches).padStart(5)} sans dossier · descFr vide ${String(v.sansDescFr).padStart(4)} · >600c ${String(v.riches600).padStart(4)} · médiane ${v.longueurMediane}`);
console.log('par type :');
for (const [ty, v] of Object.entries(rapport.parType)) console.log(`  ${ty.padEnd(14)} ${String(v.fiches).padStart(5)} sans dossier · descFr vide ${String(v.sansDescFr).padStart(4)} · >600c ${String(v.riches600).padStart(4)} · médiane ${v.longueurMediane}`);
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
