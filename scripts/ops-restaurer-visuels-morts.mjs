// scripts/ops-restaurer-visuels-morts.mjs — UNE ADRESSE PÉRIMÉE N'EST PAS UNE IMAGE DISPARUE.
//
// POURQUOI (10/08/2026)
// Un chantier de la vague 2 a sondé les visuels, trouvé 17 adresses qui répondent 404, et conclu
// « plus aucune image juste » : il a mis `image_url` à NULL sur les 17. Or les fichiers sont
// toujours là. Fandom range ses fichiers dans un dossier dérivé d'un hachage du nom, et ce
// préfixe CHANGE quand le fichier est réimporté :
//
//   Cactus_Island_Infobox.png : /images/3/3d/… (mort) → /images/8/8e/… (vivant, 1750×634)
//   Gecko_Islands_Infobox.png : /images/c/cb/… (mort) → /images/9/90/… (vivant, 1251×499)
//   Alubarna_Infobox.png      : /images/7/73/… (mort) → /images/9/9a/… (vivant, 1674×884)
//
// Le nom du fichier, lui, n'a pas bougé. Il suffisait de le DEMANDER au wiki
// (`prop=imageinfo` sur `File:<nom>`) au lieu de conclure de son silence. Une case vidée par erreur
// coûte plus cher qu'une case vide : elle efface la trace de ce qu'on avait, et une fiche de
// personnage s'est retrouvée avec un trou de 468×585 pixels au milieu.
//
// CE QUE FAIT CE SCRIPT : pour chaque fiche vidée, il reprend le NOM DE FICHIER de l'ancienne
// adresse, demande au wiki l'adresse courante, plafonne la vignette à 720 px, VÉRIFIE qu'elle se
// charge vraiment (le CDN sert son carton d'erreur en HTTP 200 — on lit donc la taille, pas le
// code), et n'écrit que là. Aucune adresse n'est reconstruite à la main : c'est exactement l'erreur
// que j'ai commise le 09/08.
//
// Usage : node --env-file=.env.local scripts/ops-restaurer-visuels-morts.mjs [--write]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const WRITE = process.argv.includes('--write');
const s = clientSite();

const API = {
  'One Piece': 'https://onepiece.fandom.com/api.php',
  Naruto: 'https://naruto.fandom.com/api.php',
  Bleach: 'https://bleach.fandom.com/api.php',
  'Dragon Ball': 'https://dragonball.fandom.com/api.php',
  'Hunter x Hunter': 'https://hunterxhunter.fandom.com/api.php',
  "JoJo's Bizarre Adventure": 'https://jojo.fandom.com/api.php',
  'Death Note': 'https://deathnote.fandom.com/api.php',
  'Initial D': 'https://initiald.fandom.com/api.php',
};

// On repart des traces du chantier qui a vidé : c'est là que vit l'ancienne adresse, seule source
// du NOM de fichier. La base, elle, ne porte plus rien.
const journaux = readdirSync(new URL('../data/audits/', import.meta.url))
  .filter((f) => f.startsWith('visuels-morts-') && !f.includes('trace'));
const vides = new Map();
for (const f of journaux) {
  const d = JSON.parse(readFileSync(new URL(`../data/audits/${f}`, import.meta.url), 'utf8'));
  for (const x of d.journal ?? []) if (x.avant) vides.set(x.slug, x);
}
console.log(`${vides.size} fiche(s) vidée(s) retrouvée(s) dans ${journaux.length} journal(aux)\n`);

const nomFichier = (url) => {
  const m = String(url).match(/\/images\/[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

async function adresseCourante(universe, fichier) {
  const api = API[universe];
  if (!api) return { motif: `pas de wiki connu pour « ${universe} »` };
  const u = `${api}?action=query&prop=imageinfo&iiprop=url|size&iiurlwidth=720&format=json&titles=${encodeURIComponent('File:' + fichier)}`;
  const r = await fetch(u, { headers: { 'User-Agent': 'NIKA-akasha/1.0' }, signal: AbortSignal.timeout(25_000) });
  if (!r.ok) return { motif: `wiki HTTP ${r.status}` };
  const d = await r.json();
  const page = Object.values(d?.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) return { motif: 'le fichier n’existe plus sur le wiki' };
  const ii = (page.imageinfo ?? [])[0];
  const url = ii?.thumburl ?? ii?.url;
  return url ? { url, taille: `${ii.width}×${ii.height}` } : { motif: 'aucune adresse rendue' };
}

/** Le CDN d'images sert son carton d'erreur en HTTP 200 : on lit la TAILLE, pas le code. */
async function seCharge(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(25_000) });
    if (!r.ok) return { ok: false, motif: `HTTP ${r.status}` };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 2048) return { ok: false, motif: `${buf.length} octets — carton d’erreur` };
    return { ok: true, octets: buf.length };
  } catch (e) { return { ok: false, motif: String(e.message ?? e).slice(0, 60) }; }
}

const trace = { chantier: 'restauration des visuels vidés à tort', quand: new Date().toISOString(), write: WRITE, cas: [] };
let restaures = 0;
for (const [slug, x] of vides) {
  const { data: r } = await s.from('akasha_entries').select('id, slug, name, universe, image_url').eq('slug', slug).maybeSingle();
  if (!r) { trace.cas.push({ slug, motif: 'fiche absente' }); continue; }
  if (r.image_url) { trace.cas.push({ slug, motif: 'porte déjà une image — rien touché' }); continue; }
  const fichier = nomFichier(x.avant);
  if (!fichier) { trace.cas.push({ slug, motif: 'nom de fichier illisible dans l’ancienne adresse' }); continue; }
  const cur = await adresseCourante(r.universe, fichier);
  if (!cur.url) { trace.cas.push({ slug, fichier, motif: cur.motif }); console.log(`✗ ${slug.padEnd(24)} ${cur.motif}`); continue; }
  const chargee = await seCharge(cur.url);
  if (!chargee.ok) { trace.cas.push({ slug, fichier, url: cur.url, motif: `ne se charge pas — ${chargee.motif}` }); console.log(`✗ ${slug.padEnd(24)} ne se charge pas (${chargee.motif})`); continue; }
  if (WRITE) await s.from('akasha_entries').update({ image_url: cur.url }).eq('id', r.id);
  restaures++;
  trace.cas.push({ slug, nom: r.name, fichier, avant: x.avant, apres: cur.url, taille: cur.taille, octets: chargee.octets, applique: WRITE });
  console.log(`✓ ${slug.padEnd(24)} ${cur.taille.padEnd(11)} ${Math.round(chargee.octets / 1024)} Ko`);
}

trace.restaures = restaures;
const nom = `visuels-restaures-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(new URL(`../data/audits/${nom}`, import.meta.url), JSON.stringify(trace, null, 1));
console.log(`\n${restaures} visuel(s) ${WRITE ? 'restauré(s)' : 'restaurables'} · trace : data/audits/${nom}`);
