// scripts/sonde-wiki-fr.mjs — SONDE (lecture seule) : le wiki FRANCOPHONE connaît-il nos noms ?
//
// POURQUOI. Le connecteur d'images interroge le wiki ANGLOPHONE. Or 437 fiches sans visuel portent
// un nom FRANÇAIS curé (« Île Confiture », « L'équipage des Cuisiniers », « Fruit du Dresseur ») :
// le titre exact n'existe pas en anglais, le slug ne porte pas le nom d'origine, et le script
// s'interdit — à raison — la recherche plein texte. D'où 521 « sans page wiki » qui ne sont pas
// une absence de page mais une absence de TRADUCTION.
//
// Chaque univers a pourtant son wiki francophone (onepiece.fandom.com/fr, naruto.fandom.com/fr…),
// où nos noms sont précisément les titres d'articles. Et ces articles déclarent leur équivalent
// anglais par `prop=langlinks` — une correspondance écrite par le wiki lui-même, pas devinée par
// moi. C'est le témoin d'identité qui manquait : notre nom ≡ titre FR (exact), et le wiki FR
// désigne lui-même la page EN. Reste à vérifier que l'image existe et se charge.
//
// Usage : node --env-file=.env.local scripts/sonde-wiki-fr.mjs [nombre]
import { readFile } from 'node:fs/promises';

const N = Number(process.argv[2] ?? 25);
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const API_FR = {
  'One Piece': 'https://onepiece.fandom.com/fr/api.php',
  'Naruto': 'https://naruto.fandom.com/fr/api.php',
  'Bleach': 'https://bleach.fandom.com/fr/api.php',
  'Dragon Ball': 'https://dragonball.fandom.com/fr/api.php',
};

const rapport = JSON.parse(await readFile(
  new URL('../data/audits/images-fandom-dry-2026-08-10.json', import.meta.url), 'utf8'));

// On sonde les « sans page wiki » dont le nom est manifestement français (accent, ou article/mot
// français initial) : ce sont exactement ceux que l'anglais ne pouvait pas résoudre.
const FRANCAIS = /[àâäéèêëîïôöùûüçœ]|^(Île|Îles|Royaume|Village|L’|L'|Le |La |Les |Fruit|Bateau|Colline|Planète|Grand|Archipel|Équipage|Cimetière|Pays|Mont|Forêt|Baie|Tour|Palais|Port|Nuage|Épée|Armée|Ordre|Cité)/;
const cas = rapport.restees_sans_image
  .filter((x) => x.etat === 'sans-page' && API_FR[x.universe] && FRANCAIS.test(x.name))
  .slice(0, N);

const j = async (u) => (await fetch(u, { headers: UA, signal: AbortSignal.timeout(25_000) })).json();
const dort = (ms) => new Promise((s) => setTimeout(s, ms));

console.log(`sonde sur ${cas.length} noms français (sur ${rapport.restees_sans_image.filter((x) => x.etat === 'sans-page' && API_FR[x.universe] && FRANCAIS.test(x.name)).length} éligibles)\n`);
let page = 0, image = 0, lien = 0;
for (const c of cas) {
  const u = `${API_FR[c.universe]}?action=query&prop=pageimages|langlinks&piprop=original|thumbnail`
    + `&pithumbsize=720&lllang=en&format=json&formatversion=2&redirects=1&titles=${encodeURIComponent(c.name)}`;
  const r = await j(u);
  const p = r?.query?.pages?.[0];
  if (!p || p.missing) { console.log(`  ✗ ${c.universe} | ${c.name} : aucune page sur le wiki FR`); await dort(250); continue; }
  page++;
  const img = p.thumbnail?.source ?? null;
  const en = p.langlinks?.[0]?.title ?? null;
  if (img) image++;
  if (en) lien++;
  console.log(`  ${img ? '✓' : '~'} ${c.universe} | ${c.name} → FR « ${p.title} »`);
  console.log(`      lien en: ${en ?? '(aucun)'}   image: ${img ? `${p.original?.width}×${p.original?.height} ${img.slice(0, 95)}` : '(aucune)'}`);
  await dort(250);
}
console.log(`\npage FR trouvée : ${page}/${cas.length} · avec image : ${image} · avec lien anglais : ${lien}`);
