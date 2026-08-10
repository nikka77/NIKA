// scripts/audit-axes-hors-liste.mjs — MESURE SEULE (aucune écriture).
// Chantier 4 (10/08/2026) : les valeurs d'axe portées par des fiches mais absentes de la liste
// curée de lib/akasha/universe-taxonomy.ts. Une valeur hors liste n'a pas de chip au hub :
// la fiche la porte, personne ne peut la filtrer.
//
// Pagination OBLIGATOIRE (.range par 1000) : un select nu s'arrête à 1000 lignes SANS ERREUR.
// Usage : node --env-file=.env.local scripts/audit-axes-hors-liste.mjs
import { writeFileSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const s = clientSite();

// Axes à examiner (univers → attributs), recopiés du carnet du chantier.
const CIBLES = {
  'One Piece': ['crew', 'fruit_type'],
  Naruto: ['rank'],
  'Dragon Ball': ['race'],
  Bleach: ['race'],
};

/** Lit TOUTES les fiches d'un univers, page par page. */
async function lireUnivers(universe) {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await s
      .from('akasha_entries')
      .select('slug,name,type,universe,attributes,summary')
      .eq('universe', universe)
      .range(d, d + 999);
    if (error) throw new Error(`${universe} @${d} : ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

// Listes curées, extraites du miroir JS (identique au TS pour ces axes — vérifié à la main).
const { AXES } = await import('../scripts/lib/akasha-axes.mjs');

const rapport = { genere_le: new Date().toISOString(), lecture_seule: true, univers: {} };

for (const [universe, attrs] of Object.entries(CIBLES)) {
  const fiches = await lireUnivers(universe);
  rapport.univers[universe] = { fichesTotal: fiches.length, axes: {} };
  for (const attr of attrs) {
    const curees = new Set(AXES[universe]?.[attr] ?? []);
    const parValeur = new Map();
    for (const f of fiches) {
      const v = f.attributes?.[attr];
      if (typeof v !== 'string' || !v.trim()) continue;
      if (!parValeur.has(v)) parValeur.set(v, []);
      parValeur.get(v).push({ slug: f.slug, name: f.name, type: f.type, summary: (f.summary ?? '').slice(0, 400) });
    }
    const horsListe = [...parValeur.entries()]
      .filter(([v]) => !curees.has(v))
      .sort((a, b) => b[1].length - a[1].length)
      .map(([v, fs]) => ({ valeur: v, nFiches: fs.length, fiches: fs }));
    rapport.univers[universe].axes[attr] = {
      distinct: parValeur.size,
      curees: curees.size,
      fichesPortantLAxe: [...parValeur.values()].reduce((n, fs) => n + fs.length, 0),
      nHorsListe: horsListe.length,
      fichesHorsListe: horsListe.reduce((n, h) => n + h.nFiches, 0),
      horsListe,
    };
    console.log(`${universe}.${attr} : ${parValeur.size} distinctes, ${horsListe.length} hors liste (${horsListe.reduce((n, h) => n + h.nFiches, 0)} fiches)`);
    for (const h of horsListe) console.log(`   · « ${h.valeur} » ×${h.nFiches} — ${h.fiches.slice(0, 6).map((f) => f.slug).join(', ')}`);
  }
}

const chemin = `data/audits/axes-hors-liste-mesure-${rapport.genere_le.replace(/[:.]/g, '-')}.json`;
writeFileSync(chemin, JSON.stringify(rapport, null, 1) + '\n');
console.log(`\n✓ ${chemin}`);
