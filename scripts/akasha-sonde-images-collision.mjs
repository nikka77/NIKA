// scripts/akasha-sonde-images-collision.mjs — L'IMAGE PROPOSÉE EST-ELLE DÉJÀ CELLE DE QUELQU'UN ?
//
// POURQUOI : `prop=pageimages` rend l'image de TÊTE de la page, qui n'est pas forcément une image
// DU sujet. Sur « Wagarashi Family » c'est « Kyūroku_Wagarashi.png » — le portrait d'un personnage
// que la base possède déjà. Coller ce portrait sur la fiche du clan, c'est refabriquer les
// « portraits usurpés » sortis du corpus le 09/08. On compare donc chaque image proposée au parc
// d'images existant, par URL entière ET par nom de fichier. N'écrit RIEN.
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const TRACE = process.argv.find((a) => a.startsWith('--collecte='))?.split('=')[1];
if (!TRACE) throw new Error('usage : --collecte=data/audits/pays-naruto-collecte-<horodate>.json');

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};
const entries = await page('akasha_entries', 'slug, name, type, universe, image_url');
const fichierDe = (u) => {
  const m = /\/images\/[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)/i.exec(String(u ?? ''));
  try { return m ? decodeURIComponent(m[1]).toLowerCase() : null; } catch { return m[1].toLowerCase(); }
};
const parUrl = new Map(); const parFichier = new Map();
for (const e of entries) {
  if (!e.image_url) continue;
  if (!parUrl.has(e.image_url)) parUrl.set(e.image_url, []);
  parUrl.get(e.image_url).push(e);
  const f = fichierDe(e.image_url);
  if (f) { if (!parFichier.has(f)) parFichier.set(f, []); parFichier.get(f).push(e); }
}
console.log(`parc d'images : ${parUrl.size} URL distinctes · ${parFichier.size} noms de fichier distincts`);

const { fiches } = JSON.parse(fs.readFileSync(TRACE, 'utf8'));
console.log(`\n=== ${fiches.length} images proposées ===`);
for (const f of fiches) {
  if (!f.image) { console.log(`  ${f.titreDemande.padEnd(20)} : AUCUNE image chez la source`); continue; }
  const nomFichier = fichierDe(f.image);
  const memeUrl = parUrl.get(f.image) ?? [];
  const memeFichier = (parFichier.get(nomFichier) ?? []).filter((e) => !memeUrl.includes(e));
  const verdict = memeUrl.length || memeFichier.length ? '⚠ DÉJÀ PRISE' : 'libre';
  console.log(`  ${f.titreDemande.padEnd(20)} : ${verdict.padEnd(13)} fichier « ${nomFichier} »`);
  for (const e of [...memeUrl, ...memeFichier]) console.log(`        ↳ portée par ${e.type}/${e.slug} « ${e.name} »`);
}
