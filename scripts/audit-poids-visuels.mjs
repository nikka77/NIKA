// scripts/audit-poids-visuels.mjs — COMBIEN PÈSE CE QUE LE SITE TÉLÉCHARGE VRAIMENT ?
//
// POURQUOI. `image_url` est servi dans un `<img>` NU (AkashaList, AkashaMosaic, OmniSearch,
// Leaderboard, opengraph-image) : aucun optimiseur ne passe derrière. Une rangée de liste qui
// tire une vignette de 2 Mo est un défaut même quand l'image est JUSTE — et le 10/08 la vague 1
// n'a mesuré le poids que des 37 visuels qu'elle venait de poser, jamais du stock.
//
// Ce script NE MESURE QUE. Il n'écrit rien en base ; la réparation est un second script, pour que
// la mesure d'avant survive à la réparation (règle de la trace).
//
// MÉTHODE. Une requête HEAD par URL DISTINCTE (les 6 800 fiches partagent ~6 780 fichiers) et on
// lit `content-length`. On ne fait pas confiance à la seule extension : un `.png` servi par le CDN
// Fandom est souvent re-encodé en webp, et son poids n'a rien à voir avec celui du fichier source.
//
// Usage : node --env-file=.env.local scripts/audit-poids-visuels.mjs [--seuil=307200] [--concurrence=8]
import { writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const SEUIL = Number(arg('seuil', 300 * 1024));      // 300 Ko — plafond posé par le chantier
const CONC = Number(arg('concurrence', 8));
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };

const site = clientSite();
let toutes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await site.from('akasha_entries')
    .select('slug,name,type,universe,image_url').order('slug').range(de, de + 999);
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  toutes = toutes.concat(data ?? []);
  if ((data ?? []).length < 1000) break;
}
// Les images LOCALES (/images/…) ne passent pas par le CDN : hors portée de cette mesure.
const avec = toutes.filter((e) => e.image_url && /^https?:/i.test(e.image_url));
const locales = toutes.filter((e) => e.image_url && !/^https?:/i.test(e.image_url)).length;

const parUrl = new Map();
for (const e of avec) {
  if (!parUrl.has(e.image_url)) parUrl.set(e.image_url, []);
  parUrl.get(e.image_url).push(e);
}
console.log(`${toutes.length} fiches · ${avec.length} avec URL distante · ${parUrl.size} URL distinctes · ${locales} locales (hors portée)`);

const urls = [...parUrl.keys()];
const resultats = [];
let fait = 0;
const travail = async () => {
  for (;;) {
    const u = urls.shift();
    if (!u) return;
    let taille = null, type = null, statut = null, motif = null;
    for (let essai = 0; essai < 2 && taille === null; essai++) {
      try {
        const r = await fetch(u, { method: 'HEAD', headers: UA, signal: AbortSignal.timeout(20_000) });
        statut = r.status;
        if (r.ok) {
          const cl = Number(r.headers.get('content-length'));
          if (Number.isFinite(cl) && cl > 0) taille = cl;
          type = r.headers.get('content-type');
        } else motif = `HTTP ${r.status}`;
      } catch (e) { motif = String(e?.name ?? e).slice(0, 40); }
      if (taille === null) await new Promise((r) => setTimeout(r, 400));
    }
    resultats.push({ url: u, octets: taille, type, statut, motif, fiches: parUrl.get(u).map((f) => f.slug) });
    if (++fait % 500 === 0) console.log(`   ${fait}/${parUrl.size}…`);
  }
};
await Promise.all(Array.from({ length: CONC }, travail));

const mesures = resultats.filter((r) => r.octets !== null);
const rates = resultats.filter((r) => r.octets === null);
const lourdes = mesures.filter((r) => r.octets > SEUIL).sort((a, b) => b.octets - a.octets);
const ko = (n) => `${(n / 1024).toFixed(0)} Ko`;
const tranche = (n) => n > 2e6 ? '> 2 Mo' : n > 1e6 ? '1–2 Mo' : n > 512e3 ? '512 Ko–1 Mo' : n > 307200 ? '300–512 Ko' : n > 102400 ? '100–300 Ko' : n > 51200 ? '50–100 Ko' : '< 50 Ko';
const distribution = {};
for (const r of mesures) distribution[tranche(r.octets)] = (distribution[tranche(r.octets)] ?? 0) + 1;

const rapport = {
  chantier: 'poids réel des visuels servis', quand: new Date().toISOString(),
  seuil_octets: SEUIL,
  urls_distinctes: parUrl.size, mesurees: mesures.length, non_mesurees: rates.length,
  fiches_avec_url_distante: avec.length, fiches_image_locale: locales,
  total_octets: mesures.reduce((a, b) => a + b.octets, 0),
  distribution,
  au_dessus_du_seuil: lourdes.length,
  fiches_touchees_par_une_lourde: lourdes.reduce((n, r) => n + r.fiches.length, 0),
  lourdes: lourdes.map((r) => ({ octets: r.octets, poids: ko(r.octets), type: r.type, fiches: r.fiches, url: r.url })),
  non_mesurees: rates.map((r) => ({ url: r.url, statut: r.statut, motif: r.motif, fiches: r.fiches })),
};
await mkdir(AUDITS, { recursive: true });
const out = `${AUDITS}poids-visuels-${HORO}.json`;
await writeFile(out, JSON.stringify(rapport, null, 1));
console.log(`\ndistribution : ${JSON.stringify(distribution)}`);
console.log(`> ${ko(SEUIL)} : ${lourdes.length} URL (${rapport.fiches_touchees_par_une_lourde} fiches) · non mesurées : ${rates.length}`);
console.log(`trace : ${out}`);
