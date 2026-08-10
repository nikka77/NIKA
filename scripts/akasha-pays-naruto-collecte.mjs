// scripts/akasha-pays-naruto-collecte.mjs — COLLECTE (sans écrire) LA MATIÈRE DES FICHES MANQUANTES.
//
// POURQUOI (10/08/2026)
// `akasha-isolees-html.mjs` lit bien 270 liens dans les infobox rendues de naruto.fandom.com mais
// ne pose 0 arête sur les champs d'appartenance : les cibles n'existent pas en base. Mesuré sur la
// sonde du 10/08 09:01 (data/audits/isolees-html-naruto-sonde-2026-08-10T09-01-45-784Z.json),
// tous champs d'appartenance confondus : 19 pays, 2 « Family », 1 « Gang », 1 « Group ».
//
// AVANT DE CRÉER, ON VÉRIFIE QUE ÇA N'EXISTE PAS AILLEURS SOUS UN AUTRE NOM. La sonde
// `akasha-sonde-gabarit-place.mjs` a déjà écarté trois cibles de cette liste pour cette raison :
//   · « Kagetsu Family » → « Clan Kagetsu » (status/kagetsu) existe ;
//   · « Summon »         → « Créature invoquée » (status/creature-invoquee) existe ;
//   · « Daimyō »         → « Daimyō (seigneur) » (status/daimyo-seigneur) existe.
// Les créer aurait fabriqué trois doublons dans un corpus qui en a déjà purgé 14 le 05/08.
//
// CE QUE CE SCRIPT FAIT : pour chaque cible restante, il va chercher chez la source
//   · le titre canonique (redirections suivies)          → action=query&redirects=1
//   · l'image de tête                                    → prop=pageimages (original)
//   · le premier paragraphe de l'article RENDU           → action=parse&prop=text
// et il écrit tout ça dans une trace. Aucune écriture en base, aucun texte rédigé ici : la matière
// d'abord, le jugement ensuite.
//
// Usage : node --env-file=.env.local scripts/akasha-pays-naruto-collecte.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { norm } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const HOTE = 'naruto.fandom.com';
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');
const CACHE = path.join(os.tmpdir(), 'nika-akasha-fandom-html');   // partagé avec akasha-isolees-html.mjs

/** Les cibles, et la fiche isolée qui les cite (relevé de la sonde du 10/08 09:01). */
const CIBLES = {
  'Land of Fire': ['kiyoyasu-kagetsu', 'makino-naruto', 'dengaku', 'tora', 'emi', 'shu-naruto', 'kusuma', 'goshiki', 'kazabune'],
  'Land of Redaku': ['penjira', 'ganno', 'fundaru', 'zansuru'],
  'Land of Waves': ['teguse', 'pochi', 'kaji'],
  'Land of Water': ['kajiki', 'iwana-citizen', 'taiki'],
  'Land of Ancestors': ['haori', 'shiro-land-of-ancestors'],
  'Land of Vegetables': ['momiji'],
  'Land of Forests': ['tsuzumi'],
  'Land of Sound': ['fuki-land-of-sound'],
  'Land of Tea': ['fukusuke-hikyakuya'],
  'Land of the Sea': ['hitode'],
  'Land of Honey': ['kayo'],
  'Land of Bean Jam': ['kayo'],
  'Land of Mountains': ['giant-eagle'],
  'Land of the Moon': ['korega'],
  'Land of Neck': ['shiromari'],
  'Land of Birds': ['komei'],
  'Land of That': ['shu-lord'],
  'Land of Lightning': ['tekkan'],
  'Land of Woods': ['kurozuka'],
  'Wagarashi Family': ['fukusuke-hikyakuya'],
  'Kanabun Gang': ['kanabun'],
  'Prajñā Group': ['kurozuka'],
};

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;      // un select nu s'arrête à 1000 SANS erreur
  }
  return out;
};

console.log('→ lecture de la base (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, description, attributes');
console.log(`  akasha_entries : ${entries.length} lignes`);
const naruto = entries.filter((e) => e.universe === 'Naruto');
const parSlug = new Map(entries.map((e) => [e.slug, e]));
const parNomNaruto = new Map();
for (const e of naruto) {
  for (const cle of [norm(e.name), norm(e.slug)]) if (cle && !parNomNaruto.has(cle)) parNomNaruto.set(cle, e);
}

const slugifier = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** HTML rendu, avec le même cache disque que `akasha-isolees-html.mjs` (hors dépôt). */
async function htmlRendu(titre) {
  fs.mkdirSync(CACHE, { recursive: true });
  const f = path.join(CACHE, `${HOTE}__${titre.replace(/[^\w.-]/g, '_')}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const u = `https://${HOTE}/api.php?action=parse&prop=text&format=json&formatversion=2&redirects=1&page=${encodeURIComponent(titre)}`;
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30_000) });
  const j = await r.json();
  const res = j.error ? { erreur: j.error.code } : { titre: j.parse.title, html: j.parse.text };
  fs.writeFileSync(f, JSON.stringify(res));
  return res;
}

const detague = (s) => String(s ?? '')
  .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '')       // appels de note [1] : bruit
  .replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

/** Les premiers paragraphes de l'article, hors infobox et hors bandeaux.
 *  On coupe le HTML AVANT le premier <h2> (fin de l'introduction) et on jette tout ce qui est
 *  encore dans une table/aside : sinon les légendes d'infobox passent pour du texte d'article. */
function introDe(html) {
  let zone = html.split(/<h2\b/i)[0];
  zone = zone.replace(/<table[\s\S]*?<\/table>/gi, ' ').replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ').replace(/<div\b[^>]*class="[^"]*\b(notice|mw-collapsible|toc)\b[^"]*"[\s\S]*?<\/div>/gi, ' ');
  const paras = [...zone.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => detague(m[1])).filter((t) => t.length > 40);
  return paras;
}

console.log(`\n→ collecte de ${Object.keys(CIBLES).length} cibles sur ${HOTE}…`);
const fiches = [];
for (const [titre, citants] of Object.entries(CIBLES)) {
  // 1) titre canonique + image de tête, en une requête
  const u = `https://${HOTE}/api.php?action=query&format=json&formatversion=2&redirects=1`
    + `&prop=pageimages|info&piprop=original|thumbnail&pithumbsize=1200&inprop=url&titles=${encodeURIComponent(titre)}`;
  const j = await (await fetch(u, { headers: UA, signal: AbortSignal.timeout(30_000) })).json();
  const p = j.query?.pages?.[0];
  const redirige = j.query?.redirects?.[0]?.to ?? null;

  // 2) intro de l'article rendu
  const r = await htmlRendu(titre);
  const paras = r.erreur ? [] : introDe(r.html);

  const slug = slugifier(p?.title ?? titre);
  // GARDE ANTI-DOUBLON, deux fois : par slug exact, et par nom normalisé (c'est ce filet qui a
  // sorti « Clan Kagetsu » et « Créature invoquée » de la liste).
  const collisionSlug = parSlug.get(slug) ?? null;
  const collisionNom = parNomNaruto.get(norm(titre)) ?? parNomNaruto.get(norm(p?.title ?? titre)) ?? null;

  fiches.push({
    titreDemande: titre,
    titreCanonique: p?.title ?? null,
    manquante: !!p?.missing,
    redirige,
    url: p?.fullurl ?? `https://${HOTE}/wiki/${encodeURIComponent(titre.replace(/ /g, '_'))}`,
    slugPropose: slug,
    slugNormalise: norm(slug),
    titreNormalise: norm(titre),
    resolutionOk: norm(slug) === norm(titre),   // condition pour que le lien de l'infobox tombe
    image: p?.original?.source ?? p?.thumbnail?.source ?? null,
    imageDim: p?.original ? `${p.original.width}×${p.original.height}` : null,
    collisionSlug: collisionSlug && { slug: collisionSlug.slug, name: collisionSlug.name, type: collisionSlug.type },
    collisionNom: collisionNom && { slug: collisionNom.slug, name: collisionNom.name, type: collisionNom.type },
    citants,
    introSource: paras.slice(0, 3),
  });
  process.stdout.write(`\r  ${fiches.length}/${Object.keys(CIBLES).length}`);
  await dormir(200);
}
console.log('');

const sortie = path.join(ROOT, `data/audits/pays-naruto-collecte-${HORODATE}.json`);
fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), hote: HOTE, fiches }, null, 1));

console.log('\n=== CONTRÔLES ===');
console.log(`pages absentes   : ${fiches.filter((f) => f.manquante).map((f) => f.titreDemande).join(', ') || 'aucune'}`);
console.log(`redirections     : ${fiches.filter((f) => f.redirige).map((f) => `${f.titreDemande} → ${f.redirige}`).join(' · ') || 'aucune'}`);
console.log(`slug ≠ titre     : ${fiches.filter((f) => !f.resolutionOk).map((f) => `${f.titreDemande} (slug ${f.slugPropose})`).join(' · ') || 'aucun — tous résolvables'}`);
console.log(`collision slug   : ${fiches.filter((f) => f.collisionSlug).map((f) => `${f.slugPropose} déjà pris par « ${f.collisionSlug.name} »`).join(' · ') || 'aucune'}`);
console.log(`collision nom    : ${fiches.filter((f) => f.collisionNom).map((f) => `${f.titreDemande} ≈ « ${f.collisionNom.name} » (${f.collisionNom.slug})`).join(' · ') || 'aucune'}`);
console.log(`sans image       : ${fiches.filter((f) => !f.image).map((f) => f.titreDemande).join(', ') || 'aucune'}`);
console.log(`sans intro lue   : ${fiches.filter((f) => !f.introSource.length).map((f) => f.titreDemande).join(', ') || 'aucune'}`);
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);

console.log('\n=== MATIÈRE COLLECTÉE ===');
for (const f of fiches) {
  console.log(`\n──────── ${f.titreDemande}${f.titreCanonique !== f.titreDemande ? ` → « ${f.titreCanonique} »` : ''}`);
  console.log(`slug ${f.slugPropose} · image ${f.image ? f.imageDim : 'AUCUNE'} · ${f.url}`);
  for (const t of f.introSource) console.log(`  ¶ ${t}`);
}
