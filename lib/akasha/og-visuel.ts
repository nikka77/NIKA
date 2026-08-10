// lib/akasha/og-visuel.ts — LE VISUEL QUE L'IMAGE OpenGraph PEUT VRAIMENT AFFICHER.
//
// POURQUOI CE FICHIER EXISTE (mesuré le 10/08/2026, traces `data/audits/og-*`).
//
// `next/og` (ici next@16.2.6 → node_modules/next/dist/compiled/@vercel/og/index.node.js) n'accepte
// qu'une LISTE FERMÉE de formats. Elle est lisible dans le bundle, symbole `qI` :
//     [image/png, image/apng, image/jpeg, image/gif, image/svg+xml]
// `image/webp` et `image/avif` sont bien RECONNUS par son détecteur de magie (`Al`) mais absents
// de la liste : `Ts()` jette alors, mot pour mot, « Unsupported image type: image/webp ».
// Contrairement à ce qu'on pouvait croire, le GIF est ACCEPTÉ — ce n'est pas lui le problème.
//
// Le problème est ailleurs, et il touchait presque tout le registre : les CDN qui hébergent nos
// visuels servent du WebP QUOI QU'ON DEMANDE. Mesuré sur 75 tirages (25 par hôte), en-tête
// `Accept` et User-Agent indifférents :
//     static.wikia.nocookie.net  4 087 fiches → image/webp pour du .png, du .jpg ET du .gif
//     cdn.myanimelist.net        2 632 fiches → image/webp
//     dragonball-api.com            64 fiches → image/webp
//     chemin relatif local          121 fiches → satori jette « Image source must be an absolute
//                                                 URL », ce qui TUE la réponse entière (réponse
//                                                 vide, curl 52 — pas même une carte sans portrait)
// Le corpus compte 6 904 fiches à visuel. Sondage exhaustif de la seule classe qui pouvait
// échapper au transcodage — les 19 fiches à `.svg` : UNE SEULE (`land-of-that`, dont l'URL ne
// demande aucun redimensionnement) revient en `image/svg+xml` ; les 18 autres, qui passent par le
// redimensionneur, reviennent en WebP. Ajouté aux 75 tirages ci-dessus et aux 48 de la première
// passe, aucun autre visuel sondé n'arrivait dans un format accepté — le cadre partagé sur
// WhatsApp, Discord et X était vide.
//
// CE QUE FAIT CE MODULE. Il ne touche pas la donnée — `image_url` reste ce qu'elle est. Il
// réécrit l'ADRESSE demandée au moment du rendu, vérifie les octets reçus, et ne rend une image
// que s'il a CONSTATÉ un format accepté. Sinon il rend `null`, et l'appelant retombe sur la tuile
// stylisée à icône : un repli vaut mieux qu'un cadre vide.
//
// Réécritures, chacune mesurée à 25/25 sur son hôte (trace `data/audits/og-repli-*.json`) :
//   · *.wikia.nocookie.net  → `format=png` (le CDN sert alors l'original ou la vignette déjà
//                             demandée, en PNG ; sur une source .gif ANIMÉE il rend le GIF, qui
//                             est refusé plus bas — voir le commentaire de `ACCEPTES`) ;
//   · cdn.myanimelist.net   → `.webp` devient `.jpg` (le même fichier existe en JPEG) ;
//   · chemin relatif        → passé par l'optimiseur d'images du site avec un `Accept` qui exclut
//                             webp et avif, ce qui lui fait rendre du JPEG (seule voie mesurée
//                             pour ces 121 fichiers, qui n'existent qu'en .webp dans `public/`).
// Aucune de ces réécritures n'est supposée : chacune est retentée puis VÉRIFIÉE sur les octets,
// et l'adresse d'origine reste toujours le dernier candidat.

import { SITE_URL } from '@/lib/site';

/** La liste fermée de satori — MOINS le GIF, et ce retrait est le résultat le plus contre-intuitif
 *  de la mesure. satori ACCEPTE le GIF (il est dans `qI`), mais resvg, qui peint ensuite le SVG
 *  que satori a produit, n'en dessine RIEN : le cadre revient vide, sans la moindre erreur.
 *  Éprouvé à l'octet le 10/08/2026, même gabarit 400×400 sur fond noir :
 *      GIF `NakeBenihime` (856 Ko)  → 4 157 octets de PNG rendu, soit un cadre vide
 *      PNG `Ninja_Info_Cards`       → 273 994 octets, l'image est là
 *  Un format « accepté » qui ne se peint pas est exactement le défaut qu'on répare ici : mieux
 *  vaut le refuser franchement et montrer la tuile à icône.
 *  `image/apng` n'a pas besoin d'être listé : notre détecteur le voit comme du PNG (même
 *  signature de huit octets) et resvg en peint l'image de base. */
const ACCEPTES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);

/** Plafond de poids, et ce n'est PAS un choix de confort : satori encode l'image en base64 DANS
 *  le SVG qu'il donne à resvg, et l'analyseur XML de resvg refuse un document de plus de dix
 *  millions d'octets. Constaté sur `atk-bl-desgarron` (GIF de 9,8 Mo → SVG de 13 Mo) :
 *      « glib: XML parse error … Resource limit exceeded: Buffer size limit exceeded »
 *  et la réponse partait VIDE, comme avant le correctif. 6,5 Mo d'octets bruts font 8,7 Mo une
 *  fois encodés — la marge tient. Au-dessus, la tuile à icône. Mesuré sur les 14 fiches à GIF du
 *  corpus : 6 d'entre elles passent ce plafond (Bleach, animations de 6,8 à 9,8 Mo). */
const PLAFOND_OCTETS = Math.floor(6.5 * 1024 * 1024);
const DELAI_MS = 9000;

/** Détection de magie transcrite de `Al()` du bundle @vercel/og, pour juger avec SON critère et
 *  pas un autre — notamment sur le SVG, que satori ne reconnaît qu'au prologue `<?xml`. */
function magie(buf: ArrayBuffer): string | null {
  const A = new Uint8Array(buf);
  if ([255, 216, 255].every((e, t) => A[t] === e)) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((e, t) => A[t] === e)) return 'image/png';
  if ([71, 73, 70, 56].every((e, t) => A[t] === e)) return 'image/gif';
  if ([82, 73, 70, 70].every((e, t) => A[t] === e) && [87, 69, 66, 80].every((e, t) => A[t + 8] === e)) return 'image/webp';
  if ([60, 63, 120, 109, 108].every((e, t) => A[t] === e)) return 'image/svg+xml';
  return null;
}

function base64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}

/** Les adresses à essayer, dans l'ordre. L'adresse d'origine ferme toujours la marche : si un
 *  jour le CDN cesse de transcoder, elle redevient la bonne réponse sans qu'on ait à y toucher. */
export function candidatsOg(brut: string): string[] {
  const out: string[] = [];
  if (!brut.startsWith('http')) {
    const chemin = brut.startsWith('/') ? brut : `/${brut}`;
    // `q` doit valoir 75 : Next 16 n'autorise que les qualités déclarées dans `images.qualities`,
    // dont la valeur par défaut est [75], et répond 400 pour toute autre — mesuré, q=80 rendait
    // 400 et la fiche retombait sur l'icône alors que le fichier était parfaitement servable.
    out.push(`${SITE_URL}/_next/image?url=${encodeURIComponent(chemin)}&w=1080&q=75`);
    out.push(SITE_URL + chemin);
    return out;
  }
  let u: URL;
  try { u = new URL(brut); } catch { return []; }
  if (u.host === 'wikia.nocookie.net' || u.host.endsWith('.wikia.nocookie.net')) {
    const png = new URL(u.toString());
    png.searchParams.set('format', 'png');
    out.push(png.toString());
  } else if (u.host === 'cdn.myanimelist.net' && /\.webp$/i.test(u.pathname)) {
    const jpg = new URL(u.toString());
    jpg.pathname = jpg.pathname.replace(/\.webp$/i, '.jpg');
    out.push(jpg.toString());
  }
  out.push(u.toString());
  return out;
}

/**
 * Rend une `data:` URI que satori sait décoder, ou `null` s'il n'y a rien de servable.
 *
 * On renvoie les OCTETS et pas l'adresse : c'est la seule façon de garantir que satori voit bien
 * ce qu'on vient de vérifier, et non ce qu'un CDN aurait décidé de servir à la requête suivante.
 */
export async function visuelOg(brut: string | null | undefined): Promise<string | null> {
  const src = (brut ?? '').trim();
  if (!src) return null;
  if (src.startsWith('data:')) return src;

  for (const adresse of candidatsOg(src)) {
    try {
      const r = await fetch(adresse, {
        headers: { Accept: 'image/png,image/jpeg,image/svg+xml' },
        signal: AbortSignal.timeout(DELAI_MS),
      });
      if (!r.ok) continue;
      const buf = await r.arrayBuffer();
      if (buf.byteLength === 0 || buf.byteLength > PLAFOND_OCTETS) continue;
      const type = magie(buf);
      if (!type || !ACCEPTES.has(type)) continue;
      return `data:${type};base64,${base64(buf)}`;
    } catch {
      // Une adresse qui ne répond pas n'est pas une ressource disparue : on essaie la suivante,
      // et à défaut l'appelant montre la tuile à icône.
    }
  }
  return null;
}
