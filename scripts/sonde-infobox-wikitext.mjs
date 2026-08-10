// scripts/sonde-infobox-wikitext.mjs — SONDE (lecture seule) : la page existe, `pageimages` ne
// rend rien — le wikitext porte-t-il quand même une image d'infobox ?
//
// POURQUOI. 156 fiches sur les 818 sans visuel ont une page de wiki RÉSOLUE dont `prop=pageimages`
// ne rend aucune vignette. `pageimages` n'est pas la vérité du wiki : c'est un index calculé par
// une extension MediaWiki, qui saute régulièrement les infobox portables (`<infobox>` XML de
// Fandom) et les articles courts. Le nom de fichier, lui, est écrit noir sur blanc dans le
// wikitext. On ne DEVINE donc rien : on lit la ligne, on cite la ligne, et on demande son URL
// à l'API (`prop=imageinfo`) — jamais une adresse reconstruite à la main (leçon du 09/08).
//
// Usage : node --env-file=.env.local scripts/sonde-infobox-wikitext.mjs [nombre]
import { wikiApi } from './lib/fandom.mjs';

const N = Number(process.argv[2] ?? 12);
const rapport = JSON.parse(await (await import('node:fs/promises')).readFile(
  new URL('../data/audits/images-fandom-dry-2026-08-10.json', import.meta.url), 'utf8'));

const cas = rapport.restees_sans_image
  .filter((x) => x.etat === 'sans-image' && /n’a pas d’image d’infobox/.test(x.pourquoi) && x.titre_resolu)
  .slice(0, N);

const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const j = async (u) => (await fetch(u, { headers: UA, signal: AbortSignal.timeout(25_000) })).json();

/** La ligne d'image d'une infobox, citée mot pour mot. Trois formes vues sur Fandom. */
function ligneImage(txt) {
  // 1. infobox portable : <image source="image"><default>Fichier.png</default></image>
  //    ou, bien plus fréquent, le paramètre passé dans l'appel de modèle.
  for (const re of [
    /^\s*\|\s*image\d*\s*=\s*([^\n|<{}]+?)\s*$/im,          // | image = Fichier.png
    /^\s*\|\s*image\s*=\s*\[\[(?:File|Image):\s*([^\]|]+)/im, // | image = [[File:Fichier.png|...]]
    /<image[^>]*>\s*<default>\s*([^<]+?)\s*<\/default>/i,     // <image><default>Fichier.png</default>
  ]) {
    const m = txt.match(re);
    if (m) return { fichier: m[1].trim(), ligne: m[0].trim().slice(0, 160) };
  }
  return null;
}

console.log(`sonde sur ${cas.length} cas\n`);
let avec = 0;
for (const c of cas) {
  const api = wikiApi(c.universe);
  const u = `${api}?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2`
    + `&redirects=1&titles=${encodeURIComponent(c.titre_resolu)}`;
  const r = await j(u);
  const txt = r?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? '';
  const li = ligneImage(txt);
  if (!li) { console.log(`  ✗ ${c.universe} | ${c.name} → « ${c.titre_resolu} » : aucune ligne d'image dans le wikitext`); continue; }
  // L'URL vient de l'API, jamais d'une reconstruction : `iiurlwidth` rend la vignette officielle.
  const f = `${api}?action=query&prop=imageinfo&iiprop=url|size&iiurlwidth=720&format=json&formatversion=2`
    + `&titles=${encodeURIComponent('File:' + li.fichier)}`;
  const ri = await j(f);
  const p = ri?.query?.pages?.[0];
  const info = p?.imageinfo?.[0];
  if (!info) { console.log(`  ~ ${c.universe} | ${c.name} : fichier « ${li.fichier} » annoncé mais introuvable`); continue; }
  avec++;
  console.log(`  ✓ ${c.universe} | ${c.name} → « ${c.titre_resolu} »`);
  console.log(`      preuve wikitext : ${li.ligne}`);
  console.log(`      ${info.thumbwidth ?? info.width}×${info.thumbheight ?? info.height}  ${(info.thumburl ?? info.url).slice(0, 120)}`);
  await new Promise((s) => setTimeout(s, 250));
}
console.log(`\n${avec}/${cas.length} ont une image nommée dans leur wikitext`);
