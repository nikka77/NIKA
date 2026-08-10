// scripts/mesure-visuels-v4.mjs — RECENSEMENT SEC : qui n'a pas de visuel, et à quoi ressemble
// le stock d'images déjà posé. AUCUNE requête réseau, AUCUNE écriture en base.
//
// Lecture PAGINÉE obligatoire (.range) : un select nu s'arrête à 1 000 lignes sans erreur.
import { writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');

const site = clientSite();
let toutes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await site.from('akasha_entries')
    .select('id,slug,name,type,universe,image_url').order('slug').range(de, de + 999);
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  toutes = toutes.concat(data ?? []);
  if ((data ?? []).length < 1000) break;
}

const sans = toutes.filter((e) => !e.image_url);
const avec = toutes.filter((e) => e.image_url);
const distantes = avec.filter((e) => /^https?:/i.test(e.image_url));
const locales = avec.length - distantes.length;

const compte = (liste, f) => {
  const m = {};
  for (const e of liste) { const k = f(e); m[k] = (m[k] ?? 0) + 1; }
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
};

const rapport = {
  chantier: 'recensement des visuels (vague 4)',
  quand: new Date().toISOString(),
  fiches_total: toutes.length,
  avec_visuel: avec.length,
  sans_visuel: sans.length,
  url_distante: distantes.length,
  image_locale: locales,
  urls_distinctes: new Set(distantes.map((e) => e.image_url)).size,
  sans_visuel_par_univers: compte(sans, (e) => e.universe ?? '∅'),
  sans_visuel_par_univers_type: compte(sans, (e) => `${e.universe ?? '∅'} · ${e.type ?? '∅'}`),
  sans_visuel_liste: sans.map((e) => ({ slug: e.slug, name: e.name, type: e.type, universe: e.universe })),
};
await mkdir(AUDITS, { recursive: true });
const out = `${AUDITS}visuels-recensement-v4-${HORO}.json`;
await writeFile(out, JSON.stringify(rapport, null, 1));
console.log(`${toutes.length} fiches · ${avec.length} avec visuel · ${sans.length} SANS visuel`);
console.log(`${distantes.length} URL distantes (${rapport.urls_distinctes} distinctes) · ${locales} locales`);
console.log('sans visuel par univers :', JSON.stringify(rapport.sans_visuel_par_univers, null, 0));
console.log(`trace : ${out}`);
