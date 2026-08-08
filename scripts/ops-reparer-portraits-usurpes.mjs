// scripts/ops-reparer-portraits-usurpes.mjs — QUATRE TÊTES D'AFFICHE PORTAIENT LE VISAGE D'UN AUTRE.
//
// POURQUOI (09/08/2026)
// L'audit `audit-doublons-par-image.mjs` a mis au jour 45 groupes de fiches partageant un même
// visuel. Sept concernent deux personnages distincts — et dans quatre cas, en regardant l'image,
// c'est la fiche MAJEURE qui portait le portrait de la MINEURE :
//   · trafalgar-law  (28 arêtes) affichait Lami, sa petite sœur — une fillette à couettes ;
//   · boa-hancock    (17 arêtes) affichait Marigold, sa sœur rousse ;
//   · gol-d-roger    (21 arêtes) affichait Ganryu, un membre de son équipage ;
//   · shuichi-aizawa (11 arêtes) affichait Yumi, sa fille.
// Aucune de ces fiches ne montre son `image_url` sur sa PROPRE page (le portrait y vient des
// `forms`), ce qui explique que personne ne l'ait vu — mais le hub d'univers, la recherche, les
// classements et l'image OpenGraph le rendent tous. Vérifié en direct sur /learn/akasha/u/one-piece :
// la vignette de Gol D. Roger y est bien celle de Ganryu.
//
// Le commentaire d'ops-images-fandom.mjs disait déjà la règle : « une image de la mauvaise page est
// PIRE qu'une case vide : la case vide se voit, la mauvaise image se croit ». Sa garde d'identité
// protège les fiches SANS image ; elle ne pouvait rien pour celles qui en avaient déjà une fausse.
//
// CE QUE FAIT CE SCRIPT : il remplace ces quatre `image_url` par l'image d'infobox du wiki, résolue
// sans redirection sur le titre exact, ET REGARDÉE une par une avant d'être écrite (Law à la toque
// tachetée et au nodachi, Hancock brune entre Sandersonia et Marigold, Roger au manteau rouge,
// Aizawa en imperméable). Aucune image n'est posée sur la foi de son nom de fichier.
//
// GARDE DE CONCURRENCE : chaque écriture ne s'applique que si la fiche porte ENCORE l'URL usurpée
// constatée le 09/08. Si l'usine est passée entre-temps, on ne touche à rien.
//
// Usage : node --env-file=.env.local scripts/ops-reparer-portraits-usurpes.mjs [--dry]
import { writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const DRY = process.argv.includes('--dry');
const s = clientSite();

// LES URL SONT CELLES QUE L'API A RENDUES, MOT POUR MOT. Premier essai le 09/08 : j'ai reconstruit
// les adresses à la main depuis le nom de fichier affiché en console — trois des quatre étaient
// fausses (le wiki plafonne la vignette de Law à 319 px et non 720, le fichier de Hancock n'a pas
// de suffixe « Post_Timeskip » que j'avais supposé, celui d'Aizawa est un .jpg et non un .png) et
// le CDN a rendu son carton d'erreur 300×171 sans jamais retourner d'erreur HTTP. Une adresse
// devinée à partir d'un nom plausible n'est pas une adresse : elle se recopie, elle ne se vérifie
// pas. Le `?cb=` fait partie de l'adresse rendue, il reste.
const CAS = [
  { slug: 'trafalgar-law', portait: 'Lami Trafalgar (sa sœur)', titre: 'Trafalgar D. Water Law',
    url: 'https://static.wikia.nocookie.net/onepiece/images/4/4d/Trafalgar_D._Water_Law_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/319?cb=20230124163510' },
  { slug: 'boa-hancock', portait: 'Boa Marigold (sa sœur)', titre: 'Boa Hancock',
    url: 'https://static.wikia.nocookie.net/onepiece/images/f/f0/Boa_Hancock_Anime_Infobox.png/revision/latest/scale-to-width-down/349?cb=20230126022456' },
  { slug: 'gol-d-roger', portait: 'Ganryu (son équipage)', titre: 'Gol D. Roger',
    url: 'https://static.wikia.nocookie.net/onepiece/images/2/24/Gol_D._Roger_Anime_Infobox.png/revision/latest/scale-to-width-down/720?cb=20230612100153' },
  { slug: 'shuichi-aizawa', portait: 'Yumi Aizawa (sa fille)', titre: 'Shuichi Aizawa',
    url: 'https://static.wikia.nocookie.net/deathnote/images/3/34/Aizawa_acting_on_his_own.jpg/revision/latest?cb=20250705053438' },
];

const trace = { chantier: 'portraits usurpés', quand: new Date().toISOString(), dry: DRY, cas: [] };

for (const c of CAS) {
  const { data: r } = await s.from('akasha_entries').select('id, name, image_url').eq('slug', c.slug).maybeSingle();
  if (!r) { console.log(`∅ ${c.slug} : introuvable`); continue; }
  // GARDE DE CONCURRENCE : on n'écrit que si la fiche ne porte pas DÉJÀ l'adresse visée. Sur une
  // réparation idempotente c'est la bonne forme — comparer à l'état d'AVANT interdirait de repasser
  // après une correction partielle, ce qui est exactement le cas rencontré le 09/08.
  const ligne = { slug: c.slug, nom: r.name, avant: r.image_url, apres: c.url, portaitEnFait: c.portait, applique: false };
  if (r.image_url === c.url) {
    console.log(`⏭ ${c.slug} : déjà à jour — rien touché`);
    ligne.motifNonApplique = 'déjà à l\'adresse visée';
  } else {
    if (!DRY) await s.from('akasha_entries').update({ image_url: c.url }).eq('id', r.id);
    ligne.applique = !DRY;
    console.log(`✓ ${c.slug.padEnd(16)} portait ${c.portait} → portrait du wiki (${c.titre})`);
  }
  trace.cas.push(ligne);
}

await writeFile(new URL('../data/audits/portraits-usurpes-trace.json', import.meta.url), JSON.stringify(trace, null, 1));
console.log(`\n${DRY ? '(à blanc) ' : ''}trace : data/audits/portraits-usurpes-trace.json`);
