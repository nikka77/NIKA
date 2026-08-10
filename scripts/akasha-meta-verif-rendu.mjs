// scripts/akasha-meta-verif-rendu.mjs — CHANTIER 4 : ce que les pages RENDENT vraiment.
// N'interroge PAS la base : demande les URLs à http://localhost:3000 et relève les balises.
// Compare ensuite au recensement (réplique du code) pour mesurer le TAUX D'ERREUR de la réplique.
//
//   node --env-file=.env.local scripts/akasha-meta-verif-rendu.mjs <trace-recensement.json> [n]
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = process.env.AK_BASE ?? 'http://localhost:3000';
const tracePath = process.argv[2];
const rec = JSON.parse(readFileSync(tracePath, 'utf8'));
const byslug = new Map(rec.fiches.map((f) => [f.slug, f]));

/** Échantillon panaché : chaque type, chaque source de description, plusieurs univers. */
function echantillon(fiches, n) {
  const buckets = new Map();
  for (const f of fiches) {
    const k = `${f.type}|${f.source}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(f);
  }
  const out = [];
  let i = 0;
  while (out.length < n) {
    let pris = 0;
    for (const [, arr] of buckets) {
      if (i < arr.length) {
        // pas le premier de la liste : on prend en s'écartant, pour balayer les univers
        out.push(arr[Math.floor((i * 977 + 13) % arr.length)]);
        pris++;
      }
      if (out.length >= n) break;
    }
    if (!pris) break;
    i++;
  }
  return [...new Map(out.map((f) => [f.slug, f])).values()].slice(0, n);
}

function meta(html, re) {
  const m = html.match(re);
  if (!m) return null;
  return m[1]
    .replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/').replace(/&nbsp;/g, ' ');
}

const n = Number(process.argv[3] ?? 20);
const cibles = process.argv.slice(4).length
  ? process.argv.slice(4).map((s) => byslug.get(s)).filter(Boolean)
  : echantillon(rec.fiches, n);

const lignes = [];
for (const f of cibles) {
  const url = `${BASE}/learn/akasha/${f.slug}`;
  let html = '', code = 0;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    code = r.status;
    html = await r.text();
  } catch (e) { code = -1; html = String(e); }
  const rendu = {
    title: meta(html, /<title>([^<]*)<\/title>/),
    description: meta(html, /<meta name="description" content="([^"]*)"/),
    ogTitle: meta(html, /<meta property="og:title" content="([^"]*)"/),
    ogDescription: meta(html, /<meta property="og:description" content="([^"]*)"/),
    ogType: meta(html, /<meta property="og:type" content="([^"]*)"/),
    ogUrl: meta(html, /<meta property="og:url" content="([^"]*)"/),
    ogSiteName: meta(html, /<meta property="og:site_name" content="([^"]*)"/),
    ogImageAlt: meta(html, /<meta property="og:image:alt" content="([^"]*)"/),
    twCard: meta(html, /<meta name="twitter:card" content="([^"]*)"/),
    twTitle: meta(html, /<meta name="twitter:title" content="([^"]*)"/),
    twDescription: meta(html, /<meta name="twitter:description" content="([^"]*)"/),
    canonical: meta(html, /<link rel="canonical" href="([^"]*)"/),
  };
  lignes.push({
    slug: f.slug, type: f.type, universe: f.universe, source: f.source, code,
    attendu: { title: f.title, description: f.description },
    rendu,
    ecart_title: rendu.title !== f.title,
    ecart_description: rendu.description !== f.description,
  });
  process.stderr.write(`\r  ${lignes.length}/${cibles.length} ${f.slug}            `);
}
process.stderr.write('\n');

const ko = lignes.filter((l) => l.ecart_title || l.ecart_description);
const uniq = (k) => [...new Set(lignes.map((l) => l.rendu[k]))];
const resume = {
  quand: new Date().toISOString(),
  base: BASE,
  n: lignes.length,
  taux_erreur_replique: +(ko.length / lignes.length * 100).toFixed(1),
  ecarts: ko.map((l) => ({ slug: l.slug, attendu: l.attendu, rendu: { title: l.rendu.title, description: l.rendu.description } })),
  valeurs_distinctes_og_title: uniq('ogTitle'),
  valeurs_distinctes_og_description: uniq('ogDescription'),
  valeurs_distinctes_twitter_title: uniq('twTitle'),
  valeurs_distinctes_twitter_card: uniq('twCard'),
  valeurs_distinctes_og_type: uniq('ogType'),
  valeurs_distinctes_og_url: uniq('ogUrl'),
  valeurs_distinctes_og_site_name: uniq('ogSiteName'),
  valeurs_distinctes_og_image_alt: uniq('ogImageAlt'),
  canonical_ok: lignes.filter((l) => l.rendu.canonical?.endsWith(`/learn/akasha/${l.slug}`)).length,
};
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const p = `data/audits/meta-partage-rendu-${stamp}.json`;
writeFileSync(p, JSON.stringify({ ...resume, lignes }, null, 2));
console.log(JSON.stringify(resume, null, 2));
console.log('\nTRACE →', p);
