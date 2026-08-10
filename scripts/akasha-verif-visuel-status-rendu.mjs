// scripts/akasha-verif-visuel-status-rendu.mjs — CHANTIER 2, le contrôle qui tranche.
//
// « Écrire une donnée n'est pas la livrer » (leçon du 10/08) : la charge RSC contient `image_url`
// même quand rien ne l'affiche, donc un `grep` de l'URL répond « présent » dans les DEUX cas.
// Le seul contrôle qui sépare l'avant de l'après est de chercher une balise <img> RENDUE dont le
// `src` EST le visuel de la fiche (leçon 260).
//
// LECTURE SEULE (base + HTTP local). Écrit une trace horodatée dans data/audits/.
// Usage : node --env-file=.env.local scripts/akasha-verif-visuel-status-rendu.mjs [--etat=avant|apres] [slug…]
import { writeFileSync, mkdirSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const BASE = process.env.NIKA_DEV_URL ?? 'http://localhost:3000';
const etat = process.argv.find((a) => a.startsWith('--etat='))?.slice(7) ?? 'mesure';
const slugsArg = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// Cinq fiches minimum, trois univers minimum (consigne du chantier) — choisies pour couvrir les
// TROIS natures de visuel mesurées et les deux régimes de puits (avec membres / sans membre).
const DEFAUT = [
  'l-equipage-de-big-mom',   // One Piece · pavillon (Jolly Roger) · 79 membres
  'l-equipage-du-chapeau-de-paille', // One Piece · pavillon · 16 membres
  'akatsuki',                // Naruto · emblème (nuage rouge) · 37 membres
  'uchiha',                  // Naruto · blason local /images/akasha/ref · 26 membres
  'team-8',                  // Naruto · photo de groupe 16:9 · 5 membres
  'gotei-13',                // Bleach · photo de groupe 16:9 · 48 membres
  'hommes-du-pilier',        // JoJo · photo de groupe · 0 membre (le puits est vide)
  'redsuns',                 // Initial D · logo · 4 membres
  'kira',                    // Death Note · plan de série · 4 membres
];
const slugs = slugsArg.length ? slugsArg : DEFAUT;

const db = clientSite();
const lignes = [];
for (const slug of slugs) {
  const { data, error } = await db
    .from('akasha_entries')
    .select('slug,name,type,universe,image_url')
    .eq('slug', slug)
    .limit(1);
  if (error) throw new Error(`${slug} : ${error.message}`);
  const e = data?.[0];
  if (!e) { lignes.push({ slug, erreur: 'fiche absente' }); continue; }

  const r = await fetch(`${BASE}/learn/akasha/${slug}`);
  const html = await r.text();

  // Toutes les balises <img> RENDUES et leur src (le HTML servi, pas la charge RSC).
  const srcs = [...html.matchAll(/<img\b[^>]*?\ssrc="([^"]*)"/g)].map((m) =>
    m[1].replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
  );
  const visuel = e.image_url ?? '';
  const rendu = srcs.filter((s) => s === visuel);

  lignes.push({
    slug,
    name: e.name,
    universe: e.universe,
    http: r.status,
    image_url: e.image_url,
    balisesImg: srcs.length,
    visuelRenduDansUneBaliseImg: rendu.length,
    // La charge RSC porte la valeur dans les deux cas — on le CONSIGNE pour que la preuve du
    // contraire soit lisible, jamais pour en tirer une conclusion.
    urlPresenteDansLeHtmlBrut: html.includes(visuel) || html.includes(visuel.replace(/'/g, '&#x27;')),
  });
  console.log(
    `${rendu.length ? '✔' : '✘'} ${slug} · ${e.universe} · <img> total ${srcs.length} · visuel rendu ${rendu.length} · url dans le HTML ${lignes.at(-1).urlPresenteDansLeHtmlBrut}`,
  );
}

const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync('data/audits', { recursive: true });
const chemin = `data/audits/visuels-status-rendu-${etat}-${horodatage}.json`;
writeFileSync(chemin, JSON.stringify({ horodatage, etat, base: BASE, lignes }, null, 2));
const ok = lignes.filter((l) => l.visuelRenduDansUneBaliseImg > 0).length;
console.log(`\n${ok}/${lignes.length} fiches rendent leur propre visuel dans une balise <img>`);
console.log(`trace : ${chemin}`);
