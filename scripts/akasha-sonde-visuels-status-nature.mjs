// scripts/akasha-sonde-visuels-status-nature.mjs — CHANTIER 2, deuxième mesure : QUE MONTRE
// l'image des fiches `status` ? Un pavillon carré, un emblème détouré et une photo de groupe
// n'appellent pas le même cadre — la décision d'affichage se prend sur la nature du visuel, pas
// sur sa présence.
//
// LECTURE SEULE côté base. Télécharge chaque visuel dans le bac à sable pour MESURER ses
// dimensions réelles (leçon 230 : sur un CDN d'images, l'erreur se sert en 200 avec des pixels
// dedans — la dimension dit la vérité, pas le code HTTP). Trace horodatée dans data/audits/.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { clientSite } from '../lib/ops/db.mjs';

const BAC = process.argv.find((a) => a.startsWith('--bac='))?.slice(6) ?? '/tmp/akasha-status-visuels';
const PAGE = 1000;
const UA = 'NIKA-AKASHA-audit/1.0 (contact: tulbured06@gmail.com)';

async function lireTout(db, table, colonnes) {
  const out = [];
  for (let d = 0; ; d += PAGE) {
    const { data, error } = await db.from(table).select(colonnes).range(d, d + PAGE - 1);
    if (error) throw new Error(`${table} @${d} : ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/** Dimensions par `sips` (macOS, aucune dépendance à installer). Rend null si illisible. */
function mesurer(chemin) {
  try {
    const txt = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'hasAlpha', chemin], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const w = /pixelWidth:\s*(\d+)/.exec(txt)?.[1];
    const h = /pixelHeight:\s*(\d+)/.exec(txt)?.[1];
    const a = /hasAlpha:\s*(\w+)/.exec(txt)?.[1];
    if (!w || !h) return null;
    return { w: Number(w), h: Number(h), alpha: a === 'yes' };
  } catch {
    return null;
  }
}

const db = clientSite();
const toutes = await lireTout(db, 'akasha_entries', 'id,slug,name,type,universe,image_url,attributes');
console.log(`corpus paginé : ${toutes.length} fiches`);
const cibles = toutes.filter(
  (e) => e.type === 'status' && typeof e.image_url === 'string' && e.image_url.trim() !== '',
);
console.log(`status avec visuel : ${cibles.length}`);

mkdirSync(BAC, { recursive: true });
const lignes = [];
let n = 0;
for (const e of cibles) {
  n += 1;
  const url = e.image_url;
  const local = url.startsWith('/');
  // Le nom de fichier de la source EST la phrase-preuve de ce que montre l'image (« Jolly_Roger »,
  // « Infobox », « OriginalCaptains »…). On le garde MOT POUR MOT.
  const nomFichier = decodeURIComponent(url.split('/revision/')[0].split('/').pop() ?? '');
  const ext = (nomFichier.split('.').pop() ?? '').toLowerCase();
  const dest = `${BAC}/${e.slug}.${ext || 'bin'}`;
  if (!existsSync(dest)) {
    try {
      if (local) {
        writeFileSync(dest, readFileSync(`public${url}`));
      } else {
        const r = await fetch(url, { headers: { 'User-Agent': UA } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      }
    } catch (err) {
      lignes.push({ slug: e.slug, name: e.name, universe: e.universe, url, nomFichier, erreur: String(err.message ?? err) });
      continue;
    }
  }
  const dim = mesurer(dest);
  lignes.push({
    slug: e.slug,
    name: e.name,
    universe: e.universe,
    scope: typeof e.attributes?.scope === 'string' ? e.attributes.scope : null,
    url,
    nomFichier,
    fichier: dest,
    ...(dim ?? { erreur: 'dimensions illisibles' }),
    ratio: dim ? Number((dim.w / dim.h).toFixed(3)) : null,
  });
  if (n % 40 === 0) console.log(`  … ${n}/${cibles.length}`);
}

const ok = lignes.filter((l) => l.w);
const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync('data/audits', { recursive: true });
const chemin = `data/audits/visuels-status-nature-${horodatage}.json`;
writeFileSync(chemin, JSON.stringify({ horodatage, corpusScanné: toutes.length, cibles: cibles.length, mesurés: ok.length, lignes }, null, 2));

// Répartition brute des formats — aucune classification n'est décidée ici, on donne la matière.
const tranches = { 'très large ≥1.6': 0, 'large 1.15-1.6': 0, 'carré 0.85-1.15': 0, 'portrait 0.6-0.85': 0, 'très portrait <0.6': 0 };
for (const l of ok) {
  const r = l.ratio;
  if (r >= 1.6) tranches['très large ≥1.6'] += 1;
  else if (r >= 1.15) tranches['large 1.15-1.6'] += 1;
  else if (r >= 0.85) tranches['carré 0.85-1.15'] += 1;
  else if (r >= 0.6) tranches['portrait 0.6-0.85'] += 1;
  else tranches['très portrait <0.6'] += 1;
}
console.log('\nformes :', tranches);
console.log('alpha :', ok.filter((l) => l.alpha).length, '/', ok.length);
console.log('échecs :', lignes.filter((l) => l.erreur).length);
console.log(`\nbac : ${BAC}\ntrace : ${chemin}`);
