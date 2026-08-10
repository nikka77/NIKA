// scripts/verifier-og-rendu.mjs — ON OUVRE L'IMAGE, ON NE RELIT PAS LE CODE.
//
// Le correctif se juge sur le pixel rendu par la route OpenGraph, pas sur la lecture du fichier
// qui l'a produit. Ce script demande l'image OG de chaque fiche tirée, découpe le RECTANGLE DE
// LA CARTE (le cadre de droite, 300×430 à partir de 850,100 dans les 1200×630) et y compte les
// PIXELS DE BORD : ceux dont le voisin de gauche s'écarte de plus de 24 niveaux de gris.
//
// Premier critère essayé — le nombre de couleurs distinctes — a produit un FAUX DÉFAUT : la fiche
// `tate` (planche noir et blanc de One Piece) n'a que 790 couleurs et tombait sous le seuil, alors
// que son portrait est parfaitement rendu, vérifié à l'œil. Une image en trait est pauvre en
// couleurs et riche en bords ; un cadre vide est un dégradé, donc l'inverse exact. Étalonnage,
// tous les cas ouverts et regardés :
//     cadre vide (l'état d'avant le correctif, trois exemples) ....      0 pixel de bord
//     repli à icône (⚡ Bleach, 🗡️ One Piece) ................... 655 et 750
//     dessin plat (SVG « Pays de Ça », emblème local `nara`) ..... 3 004
//     photographie (Ninja Info Cards) ........................... 11 260
//     planche en trait (`tate`) ................................. 26 923
// D'où la règle, et elle ne tranche QU'UNE question : 0 bord = CADRE VIDE, le défaut qu'on
// répare ; tout le reste = une carte qui montre quelque chose. Ne pas essayer d'en tirer la
// distinction « icône de repli » / « visuel » : essayé, faux — `susanoo` (image large, donc bande
// visible courte) rend 563 pixels de bord, MOINS que l'icône ⚡ (655), et son visuel est pourtant
// bien là, vérifié à l'œil. Le compte des fiches réparées se mesure ailleurs, sur le format servi
// (scripts/recensement-og-servables.mjs), pas sur une silhouette de pixels.
//
// Lecture seule ; n'écrit que sa trace horodatée dans data/audits/.
import { clientSite } from '../lib/ops/db.mjs';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.OG_BASE ?? 'http://localhost:3000';
const HORODATAGE = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = `data/audits/og-rendu-${HORODATAGE}.json`;

const hote = (u) => (u.startsWith('http') ? (() => { try { return new URL(u).host; } catch { return '(illisible)'; } })() : '(relatif)');

const sb = clientSite();
const lignes = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await sb.from('akasha_entries').select('id,slug,universe,type,image_url').order('id').range(d, d + 999);
  if (error) throw error;
  lignes.push(...data);
  if (data.length < 1000) break;
}
const avec = lignes.filter((l) => l.image_url && String(l.image_url).trim());
const sans = lignes.filter((l) => !l.image_url || !String(l.image_url).trim());

// Échantillon : 30 par hôte, plus TOUTES les fiches à .gif (la classe la plus piégeuse),
// plus 8 fiches sans visuel du tout (pour vérifier que le repli d'origine tient toujours).
const parHote = {};
for (const l of avec) (parHote[hote(l.image_url)] ||= []).push(l);
const ech = [];
for (const tab of Object.values(parHote)) {
  const pas = Math.max(1, Math.floor(tab.length / 30));
  for (let i = 0; i < tab.length && ech.filter((e) => hote(e.image_url) === hote(tab[0].image_url)).length < 30; i += pas) ech.push(tab[i]);
}
for (const l of avec) if (/\.gif(?=$|\/|\?)/i.test(l.image_url) && !ech.includes(l)) ech.push(l);
for (let i = 0; i < sans.length && i < 8 * Math.max(1, Math.floor(sans.length / 8)); i += Math.max(1, Math.floor(sans.length / 8))) ech.push(sans[i]);

const resultats = [];
for (const l of ech) {
  const t0 = Date.now();
  let r;
  try {
    r = await fetch(`${BASE}/learn/akasha/${l.slug}/opengraph-image`, { signal: AbortSignal.timeout(120000) });
  } catch (e) {
    resultats.push({ slug: l.slug, hote: l.image_url ? hote(l.image_url) : '(sans visuel)', verdict: 'REPONSE VIDE / ERREUR RESEAU', erreur: String(e).slice(0, 140), ms: Date.now() - t0 });
    process.stderr.write('X');
    continue;
  }
  if (!r.ok) {
    resultats.push({ slug: l.slug, hote: l.image_url ? hote(l.image_url) : '(sans visuel)', verdict: `HTTP ${r.status}`, ms: Date.now() - t0 });
    process.stderr.write('X');
    continue;
  }
  const png = Buffer.from(await r.arrayBuffer());
  const { data, info } = await sharp(png).extract({ left: 850, top: 100, width: 300, height: 430 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let bords = 0;
  const w = info.width, h = info.height, ch = info.channels;
  for (let y = 0; y < h; y++) for (let x = 1; x < w; x++) if (Math.abs(data[(y * w + x) * ch] - data[(y * w + x - 1) * ch]) > 24) bords++;
  const verdict = bords === 0 ? 'CADRE VIDE' : 'carte qui montre quelque chose';
  resultats.push({ slug: l.slug, universe: l.universe, hote: l.image_url ? hote(l.image_url) : '(sans visuel)', image_url: l.image_url, bords, verdict, octets: png.length, ms: Date.now() - t0 });
  process.stderr.write(verdict === 'CADRE VIDE' ? '!' : '.');
}

const parVerdict = resultats.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
mkdirSync('data/audits', { recursive: true });
writeFileSync(TRACE, JSON.stringify({ horodatage: new Date().toISOString(), base: BASE, echantillon: resultats.length, parVerdict, resultats }, null, 2));

console.log(`\n=== ${resultats.length} images OG demandées et regardées ===`);
for (const [v, n] of Object.entries(parVerdict).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${v}`);
console.log('\n  par hôte :');
const ph = {};
for (const r of resultats) { (ph[r.hote] ||= {}); ph[r.hote][r.verdict] = (ph[r.hote][r.verdict] || 0) + 1; }
for (const [h, v] of Object.entries(ph)) console.log(`    ${h.padEnd(30)} ${Object.entries(v).map(([k, n]) => `${k}: ${n}`).join(' · ')}`);
const lents = resultats.filter((r) => r.ms > 4000).sort((a, b) => b.ms - a.ms).slice(0, 5);
if (lents.length) console.log('\n  les plus lentes : ' + lents.map((r) => `${r.slug} ${(r.ms / 1000).toFixed(1)} s`).join(' · '));
console.log(`\ntrace : ${TRACE}`);
