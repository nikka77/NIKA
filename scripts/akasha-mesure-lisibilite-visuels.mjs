// scripts/akasha-mesure-lisibilite-visuels.mjs — QUI NE SE VOIT PAS SUR LE FOND DU SITE ?
//
// POURQUOI. Les six lecteurs de `image_url` peignent TOUS l'image en `objectFit: contain` sur un
// cadre `var(--bg2)` = #09152A = rgb(9,21,42), avec pour seul fond un HALO qui n'est que la même
// image floutée à `brightness(0.45)` — donc encore plus sombre qu'elle. Un glyphe quasi noir posé
// là est en base, il est juste, et personne ne le voit. Ce script MESURE cette invisibilité au lieu
// de la juger à l'œil.
//
// MÉTHODE. Pour chaque visuel : décodage réel des octets SERVIS (sharp), composition de chaque
// pixel sur #09152A en tenant compte de l'alpha (`c = c_img·a + c_fond·(1−a)`), luminance relative
// WCAG puis rapport de contraste vs le fond. On en tire :
//   · `contraste_max`   — le point le plus lisible de toute l'image ;
//   · `couverture_1_5`  — la part de la surface qui atteint un contraste de 1,5 (« de l'encre ») ;
//   · `p99`, `p95`      — pour distinguer « sombre » de « invisible ».
// Le verdict `illisible` ne se prononce que si l'image n'a nulle part de quoi se détacher.
//
// CE SCRIPT N'ÉCRIT RIEN EN BASE. Il mesure et trace, la réparation est un second script — pour que
// la mesure d'AVANT survive à la réparation.
//
// Usage : node --env-file=.env.local scripts/akasha-mesure-lisibilite-visuels.mjs [--concurrence=12]
//         [--cache=/chemin] [--limite=0] [--suffixe=avant]
import { writeFile, mkdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { clientSite } from '../lib/ops/db.mjs';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const CONC = Number(arg('concurrence', 12));
const LIMITE = Number(arg('limite', 0));
const SUFFIXE = arg('suffixe', '');
const CACHE = arg('cache', '/private/tmp/claude-501/-Users-macbookprom1pro-Library-Mobile-Documents-com-apple-CloudDocs-NIKA/17f2db71-7c38-4eb1-aad2-72e629329d0d/scratchpad/visuels-cache');
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const PUBLIC = new URL('../public/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };

// ── Le fond réel du cadre, lu dans app/globals.css : --bg2: #09152A ────────────────────────────
const FOND = [9, 21, 42];
const lin = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : (((c / 255) + 0.055) / 1.055) ** 2.4);
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const L_FOND = lum(...FOND);
const contraste = (L) => (Math.max(L, L_FOND) + 0.05) / (Math.min(L, L_FOND) + 0.05);

export function mesurerPixels(data, w, h, canaux) {
  const n = w * h;
  const cs = new Float64Array(n);
  let max = 0, somme = 0;
  let c15 = 0, c20 = 0, c30 = 0, opaques = 0;
  for (let i = 0; i < n; i++) {
    const o = i * canaux;
    const a = canaux === 4 ? data[o + 3] / 255 : 1;
    if (a > 0.5) opaques++;
    const r = data[o] * a + FOND[0] * (1 - a);
    const g = data[o + 1] * a + FOND[1] * (1 - a);
    const b = data[o + 2] * a + FOND[2] * (1 - a);
    const c = contraste(lum(r, g, b));
    cs[i] = c;
    somme += c;
    if (c > max) max = c;
    if (c >= 1.5) c15++;
    if (c >= 2) c20++;
    if (c >= 3) c30++;
  }
  const tri = Float64Array.from(cs).sort();
  const q = (p) => tri[Math.min(n - 1, Math.max(0, Math.floor(p * (n - 1))))];
  return {
    pixels: n,
    part_opaque: +(opaques / n).toFixed(4),
    contraste_max: +max.toFixed(3),
    contraste_moyen: +(somme / n).toFixed(3),
    p99: +q(0.99).toFixed(3),
    p95: +q(0.95).toFixed(3),
    mediane: +q(0.5).toFixed(3),
    couverture_1_5: +(c15 / n).toFixed(4),
    couverture_2: +(c20 / n).toFixed(4),
    couverture_3: +(c30 / n).toFixed(4),
  };
}

/** Verdict. Trois familles, un seuil chacune, tous mesurés — jamais « à l'œil ».
 *  · illisible        : nulle part de quoi se détacher (le meilleur pixel < 2,0 de contraste)
 *                       OU moins de 0,5 % de la surface qui atteint 1,5.
 *  · presque illisible: du contraste existe mais sur une frange (< 3 % de la surface à 2,0). */
export function verdict(m) {
  if (m.contraste_max < 2 || m.couverture_1_5 < 0.005) return 'illisible';
  if (m.couverture_2 < 0.03) return 'presque illisible';
  return 'lisible';
}

async function octets(url) {
  if (!/^https?:/i.test(url)) {
    const p = path.join(PUBLIC, url.replace(/^\//, '').split('?')[0]);
    return { buf: await readFile(p), source: 'local', type: null, statut: 200 };
  }
  const clef = createHash('sha1').update(url).digest('hex');
  const f = path.join(CACHE, clef);
  try {
    const st = await stat(f);
    if (st.size > 0) {
      const meta = JSON.parse(await readFile(`${f}.json`, 'utf8'));
      return { buf: await readFile(f), source: 'cache', ...meta };
    }
  } catch { /* pas en cache */ }
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(45_000) });
  const buf = Buffer.from(await r.arrayBuffer());
  const meta = { type: r.headers.get('content-type'), statut: r.status };
  if (r.ok && buf.length) {
    await writeFile(f, buf);
    await writeFile(`${f}.json`, JSON.stringify(meta));
  }
  return { buf, source: 'réseau', ...meta };
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  const site = clientSite();
  let toutes = [];
  for (let de = 0; ; de += 1000) {                       // PAGINATION — un select nu s'arrête à 1000
    const { data, error } = await site.from('akasha_entries')
      .select('slug,name,type,universe,image_url').order('slug').range(de, de + 999);
    if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
    toutes = toutes.concat(data ?? []);
    if ((data ?? []).length < 1000) break;
  }
  const avec = toutes.filter((e) => e.image_url);
  const parUrl = new Map();
  for (const e of avec) {
    if (!parUrl.has(e.image_url)) parUrl.set(e.image_url, []);
    parUrl.get(e.image_url).push(e.slug);
  }
  let urls = [...parUrl.keys()];
  if (LIMITE > 0) urls = urls.slice(0, LIMITE);
  console.log(`${toutes.length} fiches · ${avec.length} à visuel · ${parUrl.size} URL distinctes · fond #09152A (L=${L_FOND.toFixed(5)})`);

  const resultats = [];
  const file = [...urls];
  let fait = 0;
  const travail = async () => {
    for (;;) {
      const u = file.shift();
      if (!u) return;
      const fiches = parUrl.get(u);
      try {
        const { buf, type, statut, source } = await octets(u);
        if (!buf?.length) throw new Error(`réponse vide (statut ${statut})`);
        const img = sharp(buf, { animated: false });
        const meta = await img.metadata();
        // On ne rééchantillonne QUE les grandes images (le coût), jamais sous 256 px : sur une
        // vignette de 96 px, un rééchantillonnage effacerait justement les pixels clairs isolés.
        const cible = Math.max(meta.width ?? 1, meta.height ?? 1) > 256 ? 256 : null;
        const t = cible ? img.resize(cible, cible, { fit: 'inside', kernel: 'nearest' }) : img;
        const { data, info } = await t.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const m = mesurerPixels(data, info.width, info.height, info.channels);
        resultats.push({
          url: u, fiches, octets: buf.length, type_servi: type, source,
          format: meta.format, largeur: meta.width, hauteur: meta.height,
          a_alpha: !!meta.hasAlpha, images: meta.pages ?? 1,
          ...m, verdict: verdict(m),
        });
      } catch (e) {
        resultats.push({ url: u, fiches, erreur: String(e.message ?? e), verdict: 'non mesuré' });
      }
      if (++fait % 250 === 0) console.log(`  … ${fait}/${urls.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONC }, travail));

  const par = (v) => resultats.filter((r) => r.verdict === v);
  const illisibles = par('illisible').sort((a, b) => a.contraste_max - b.contraste_max);
  const presque = par('presque illisible').sort((a, b) => a.couverture_2 - b.couverture_2);
  const trace = {
    chantier: 'lisibilité des visuels sur le fond du site',
    quand: new Date().toISOString(),
    fond: { css: 'var(--bg2)', hex: '#09152A', rgb: FOND, luminance_relative: +L_FOND.toFixed(6) },
    methode: "chaque pixel composé sur #09152A selon son alpha, luminance relative WCAG, rapport de contraste ; verdict « illisible » si contraste_max < 2 OU couverture_1_5 < 0,5 %",
    lecteurs: ['AkashaList (vignette 40 px + aperçu)', 'AkashaMosaic', 'OmniSearch', 'Leaderboard', 'CharacterZone', 'EntityZone', 'OrganizationZone', 'HubInsights', 'opengraph-image'],
    compte: {
      fiches: toutes.length, fiches_a_visuel: avec.length, urls_distinctes: parUrl.size, urls_mesurees: resultats.length,
      illisibles: illisibles.length, presque_illisibles: presque.length,
      lisibles: par('lisible').length, non_mesurees: par('non mesuré').length,
      fiches_illisibles: illisibles.reduce((n, r) => n + r.fiches.length, 0),
      fiches_presque: presque.reduce((n, r) => n + r.fiches.length, 0),
    },
    illisibles, presque_illisibles: presque,
    non_mesurees: par('non mesuré'),
    tous: resultats,
  };
  await mkdir(AUDITS, { recursive: true });
  const nom = `${AUDITS}lisibilite-visuels${SUFFIXE ? `-${SUFFIXE}` : ''}-${HORO}.json`;
  await writeFile(nom, JSON.stringify(trace, null, 2));
  console.log(`\n${trace.compte.illisibles} illisibles · ${trace.compte.presque_illisibles} presque · ${trace.compte.lisibles} lisibles · ${trace.compte.non_mesurees} non mesurées`);
  console.log(`trace → ${nom}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
