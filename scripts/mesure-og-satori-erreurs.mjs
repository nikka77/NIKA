// scripts/mesure-og-satori-erreurs.mjs — CE QUE @vercel/og DIT, MOT POUR MOT (lecture seule).
//
// On appelle directement le bundle installé par Next (pas une réimplémentation) sur quatre
// visuels réels du corpus, pour lire l'erreur exacte plutôt que la déduire.
import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';

const CAS = {
  'fandom .gif (bleach, Desgarrón)': 'https://static.wikia.nocookie.net/bleach/images/d/dc/Desgarr%C3%B3n.gif/revision/latest?cb=20160427172717&path-prefix=en',
  'fandom .png (naruto)': 'https://static.wikia.nocookie.net/naruto/images/6/63/Ninja_Info_Cards.png/revision/latest/scale-to-width-down/720?cb=20240918030751',
  'mal .webp': 'https://cdn.myanimelist.net/images/characters/7/41195.webp?s=18ec692f9f9c64e5bd708e3fad954e84',
  'fandom .svg non redimensionné': 'https://static.wikia.nocookie.net/naruto/images/a/ae/Land_of_That_Symbol.svg/revision/latest?cb=20160520162425',
  'chemin relatif (fichier local)': '/images/akasha/ref/hozuki.webp',
};

for (const [nom, src] of Object.entries(CAS)) {
  const erreurs = [];
  const vraiErr = console.error;
  console.error = (...a) => erreurs.push(a.join(' '));
  let verdict;
  try {
    const r = new ImageResponse(
      { type: 'div', props: { style: { display: 'flex', width: '100%', height: '100%', background: '#111' }, children: { type: 'img', props: { src, width: 300, height: 300 } } } },
      { width: 600, height: 300 },
    );
    const buf = await r.arrayBuffer();
    verdict = `rendu OK, ${buf.byteLength} octets de PNG`;
  } catch (e) {
    verdict = `JETÉ → ${e.message}`;
  }
  console.error = vraiErr;
  console.log(`\n· ${nom}`);
  console.log(`  ${verdict}`);
  for (const e of erreurs) console.log(`  console.error → ${e}`);
}
