// scripts/akasha-recensement-aretes.mjs — CHANTIER 2, étape 1 : le TABLEAU avant le code.
// Recense TOUTES les natures d'arêtes de `akasha_relations` avec leur compte, croisées avec le
// TYPE de la fiche à chaque bout — parce que « qui rend cette arête ? » se répond gabarit par
// gabarit, et qu'un même couple (nature, sens) n'a pas le même sort selon le type de la fiche.
// Lecture PAGINÉE (.range) : un select nu s'arrête à 1000 lignes sans erreur.
// Écrit une trace horodatée dans data/audits/. N'écrit RIEN en base.
import { clientSite } from '../lib/ops/db.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const db = clientSite();
const PAGE = 1000;

async function pagine(table, cols, label) {
  const out = [];
  for (let d = 0; ; d += PAGE) {
    const { data, error } = await db.from(table).select(cols).order('id', { ascending: true }).range(d, d + PAGE - 1);
    if (error) throw new Error(`${label} @${d} : ${error.message}`);
    out.push(...data);
    process.stderr.write(`\r${label} : ${out.length}`);
    if (data.length < PAGE) break;
  }
  process.stderr.write('\n');
  return out;
}

const entries = await pagine('akasha_entries', 'id, slug, name, type, universe', 'entrées');
const rels = await pagine('akasha_relations', 'id, relation, from_entry, to_entry', 'arêtes');

const parId = new Map(entries.map((e) => [e.id, e]));

// ── Croisement (nature, type source, type cible) ────────────────────────────
const croise = new Map(); // "relation|typeFrom|typeTo" -> n
const parNature = new Map(); // relation -> n
const orphelines = { from: 0, to: 0 };
for (const r of rels) {
  const f = parId.get(r.from_entry);
  const t = parId.get(r.to_entry);
  if (!f) orphelines.from++;
  if (!t) orphelines.to++;
  const k = `${r.relation}|${f?.type ?? '?'}|${t?.type ?? '?'}`;
  croise.set(k, (croise.get(k) ?? 0) + 1);
  parNature.set(r.relation, (parNature.get(r.relation) ?? 0) + 1);
}

// ── Ce que chaque gabarit LIT réellement (relevé À LA MAIN dans le code, ligne par ligne) ──
// La clé est le TYPE de la fiche ouverte. Chaque entrée dit : quelles natures ce composant lit,
// dans quel sens, et sous quel libellé. Toute nature absente de la liste est INVISIBLE sur ce
// gabarit — c'est exactement ce qu'on cherche à mesurer.
const LU = {
  // CharacterZone.tsx
  character: {
    composant: 'CharacterZone',
    out: {
      maitrise: 'grappe Techniques',
      famille: 'grappe Famille',
      allie: 'grappe Liens', mentor: 'grappe Liens', eleve: 'grappe Liens',
      ennemi: 'grappe Liens', rival: 'grappe Liens',
      appartient: 'grappe Appartenances (10/08)', habite: 'grappe Appartenances (10/08)',
      exerce: 'grappe Appartenances (10/08)',
    },
    in: {
      famille: 'grappe Famille',
      mentor: 'grappe Liens (inversé)', eleve: 'grappe Liens (inversé)',
      allie: 'grappe Liens', ennemi: 'grappe Liens', rival: 'grappe Liens',
    },
  },
  // OrganizationZone.tsx
  status: {
    composant: 'OrganizationZone',
    out: {},
    in: {
      appartient: 'puits (cible character) / arsenal (cible artifact)',
    },
  },
  // EntityZone.tsx — PRIMARY_RELATION (entrant, cible character) + `secondary` (TOUT le reste,
  // dans les deux sens, libellé directionnel via libelle()).
  _entity: {
    composant: 'EntityZone',
    // `secondary` prend TOUT relationsOut et TOUT relationsIn hors primaire → tout est lu.
    toutOut: true,
    toutIn: true,
  },
};
const TYPES_ENTITYZONE = new Set(['power', 'skill', 'artifact', 'profession', 'place']);
// Le gabarit ATTAQUE (page.tsx, type power|skill + category='Attaque') court-circuite EntityZone
// et ne lit QUE `maitrise` entrant.

// ── Le tableau : pour chaque (nature, sens, type de fiche), rendu ou non ────
const lignes = [];
for (const [k, n] of croise) {
  const [relation, tf, tt] = k.split('|');
  lignes.push({ relation, typeSource: tf, typeCible: tt, n });
}
lignes.sort((a, b) => b.n - a.n);

mkdirSync('data/audits', { recursive: true });
const horo = new Date().toISOString().replace(/[:.]/g, '-');
const chemin = `data/audits/aretes-recensement-${horo}.json`;
writeFileSync(chemin, JSON.stringify({
  mesureLe: new Date().toISOString(),
  totalEntrees: entries.length,
  totalAretes: rels.length,
  orphelines,
  parNature: Object.fromEntries([...parNature].sort((a, b) => b[1] - a[1])),
  croise: lignes,
}, null, 2));

console.log(`\n=== CORPUS === ${entries.length} entrées · ${rels.length} arêtes · trace ${chemin}`);
console.log(`bouts orphelins : from=${orphelines.from} to=${orphelines.to}`);

console.log('\n=== NATURES (compte total) ===');
for (const [r, n] of [...parNature].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(6)}  ${r}`);

console.log('\n=== TYPES DE FICHES (compte) ===');
const parType = new Map();
for (const e of entries) parType.set(e.type, (parType.get(e.type) ?? 0) + 1);
for (const [t, n] of [...parType].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(6)}  ${t}`);

console.log('\n=== CROISEMENT relation | typeSource -> typeCible | n ===');
for (const l of lignes) console.log(`${String(l.n).padStart(6)}  ${l.relation.padEnd(18)} ${l.typeSource.padEnd(12)} -> ${l.typeCible}`);
