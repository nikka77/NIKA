// scripts/mesure-sans-visuel-vague2.mjs — L'ÉTAT RÉEL DES FICHES SANS VISUEL, RECOMPTÉ.
//
// POURQUOI. Le carnet date du 10/08 au matin et la vague 1 a écrit depuis : le chiffre « 818 »
// ne vaut plus rien. Et surtout, la vague 1 a affirmé que les 155 fiches d'attaque (`atk-*`)
// « n'ont pas de page propre » — une affirmation qui, si elle est fausse, condamne 155 fiches
// à rester muettes pour une mauvaise raison. On mesure les deux.
//
// LECTURE PAGINÉE OBLIGATOIRE : un `.select()` nu s'arrête à 1 000 lignes SANS ERREUR.
// N'écrit RIEN en base. Sortie : data/audits/sans-visuel-mesure-<horodatage>.json
import { writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');
const site = clientSite();

const pageAll = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await site.from(table).select(sel).order('slug').range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const toutes = await pageAll('akasha_entries', 'id,slug,name,type,universe,image_url,attributes');
const sans = toutes.filter((e) => !e.image_url);

const compte = (liste, cle) => {
  const m = {};
  for (const e of liste) { const k = cle(e); m[k] = (m[k] ?? 0) + 1; }
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
};

const catDe = (e) => (e.attributes && typeof e.attributes.category === 'string') ? e.attributes.category : null;
const estAttaque = (e) => (e.type === 'power' || e.type === 'skill') && catDe(e) === 'Attaque';

const atk = sans.filter((e) => e.slug.startsWith('atk-'));
// L'affirmation à éprouver : « les atk-* n'ont pas de page propre ». Le gabarit d'attaque de
// app/learn/akasha/[slug]/page.tsx se déclenche sur (type power|skill) ET category === 'Attaque'.
const atkAvecGabarit = atk.filter(estAttaque);
const atkSansGabarit = atk.filter((e) => !estAttaque(e));
// Et le symétrique : des fiches d'ATTAQUE sans visuel dont le slug ne commence PAS par atk-.
const attaquesHorsAtk = sans.filter((e) => estAttaque(e) && !e.slug.startsWith('atk-'));

// Les 9 fiches nommées par la vague 1 comme « jamais interrogées » (univers hors connecteur FR).
const NOMMEES = ['detective', 'le-caire', 'fleche-du-stand', 'masque-de-pierre', 'pilote-de-toge',
  'onde-hamon', 'drift', 'fondation-speedwagon', 'stand-requiem'];
const nommees = NOMMEES.map((s) => {
  const e = toutes.find((x) => x.slug === s);
  return e ? { slug: e.slug, name: e.name, universe: e.universe, type: e.type, image_url: e.image_url } : { slug: s, absente: true };
});

const rapport = {
  chantier: 'mesure — fiches sans visuel (vague 2)',
  quand: new Date().toISOString(),
  total_fiches: toutes.length,
  avec_visuel: toutes.length - sans.length,
  sans_visuel: sans.length,
  sans_visuel_par_univers: compte(sans, (e) => e.universe ?? '(sans univers)'),
  sans_visuel_par_type: compte(sans, (e) => e.type),
  atk: {
    total_sans_visuel: atk.length,
    avec_gabarit_attaque: atkAvecGabarit.length,
    sans_gabarit_attaque: atkSansGabarit.length,
    exemples_sans_gabarit: atkSansGabarit.slice(0, 20).map((e) => ({ slug: e.slug, type: e.type, cat: catDe(e) })),
    par_univers: compte(atk, (e) => e.universe ?? '?'),
  },
  attaques_hors_prefixe_atk: {
    combien: attaquesHorsAtk.length,
    exemples: attaquesHorsAtk.slice(0, 15).map((e) => ({ slug: e.slug, universe: e.universe })),
  },
  neuf_fiches_nommees_vague1: nommees,
  univers_sans_connecteur_fr: compte(
    sans.filter((e) => !['One Piece', 'Naruto', 'Bleach', 'Dragon Ball'].includes(e.universe)),
    (e) => e.universe ?? '(sans univers)'),
};

await mkdir(AUDITS, { recursive: true });
const out = `${AUDITS}sans-visuel-mesure-${HORO}.json`;
await writeFile(out, JSON.stringify(rapport, null, 1));
console.log(JSON.stringify({ ...rapport, neuf_fiches_nommees_vague1: '(voir fichier)' }, null, 1));
console.log(`\ntrace : ${out}`);
