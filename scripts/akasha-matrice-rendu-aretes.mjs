// scripts/akasha-matrice-rendu-aretes.mjs — CHANTIER 2, étape 1 (suite) : LE TABLEAU.
// Pour chaque arête, on demande : sur la fiche de son bout SOURCE, est-elle rendue ? sur la fiche
// de son bout CIBLE, est-elle rendue ? Les règles ci-dessous sont RECOPIÉES du code, ligne à
// ligne — elles ne devinent rien : chaque entrée cite le composant et la ligne qui la fonde.
// Lecture PAGINÉE. N'écrit RIEN en base. Trace horodatée dans data/audits/.
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
    if (data.length < PAGE) break;
  }
  return out;
}

const entries = await pagine('akasha_entries', 'id, slug, name, type, universe, category:attributes->>category', 'entrées');
const rels = await pagine('akasha_relations', 'id, relation, from_entry, to_entry', 'arêtes');
const parId = new Map(entries.map((e) => [e.id, e]));

// AVANT/APRÈS dans le MÊME fichier, pour que les deux colonnes du tableau soient produites par la
// même lecture du corpus et ne puissent pas diverger sur un décalage de mesure (le corpus bouge :
// 16 910 arêtes ce matin contre 16 788 hier). `APRES=1` applique les grappes « Autres liens »
// livrées ce jour dans CharacterZone et OrganizationZone.
const APRES = process.env.APRES === '1';

/** Le GABARIT qui rend une fiche — app/learn/akasha/[slug]/page.tsx, dans l'ordre des branches. */
export function gabarit(e) {
  if (e.type === 'character') return 'CharacterZone';
  if (e.type === 'status') return 'OrganizationZone';
  if ((e.type === 'power' || e.type === 'skill') && e.category === 'Attaque') return 'FicheAttaque';
  return 'EntityZone';
}

/** Une arête est-elle rendue sur la fiche `moi`, vue dans le sens `entrant` ? `autre` = l'autre
 *  bout (son type compte pour certains filtres). Retourne le NOM DE LA GRAPPE, ou null. */
function rendu(moi, autre, relation, entrant) {
  const g = gabarit(moi);

  if (g === 'CharacterZone') {
    // components/akasha/zone/CharacterZone.tsx
    if (!entrant) {
      if (relation === 'maitrise') return 'Techniques (l.74)';
      if (relation === 'famille') return 'Famille (l.94)';
      if (['allie', 'mentor', 'eleve', 'ennemi', 'rival'].includes(relation)) return 'Liens (l.109)';
      if (['appartient', 'habite', 'exerce'].includes(relation)) return 'Appartenances (l.149)';
      return APRES ? 'Autres liens → (l.177)' : null; // possede, jumeau, ange, kaio_shin, dieu_destruction
    }
    if (relation === 'famille') return 'Famille (l.94)';
    if (['mentor', 'eleve'].includes(relation)) return 'Liens inversés (l.113)';
    if (['allie', 'ennemi', 'rival'].includes(relation)) return 'Liens (l.120)';
    return APRES ? 'Autres liens ← (l.177)' : null; // appartient/habite/exerce/maitrise/possede ENTRANTS
  }

  if (g === 'OrganizationZone') {
    // components/akasha/zone/OrganizationZone.tsx
    if (entrant && relation === 'appartient' && autre?.type === 'character') return 'Puits/membres (l.55)';
    if (entrant && relation === 'appartient' && autre?.type === 'artifact') return 'Arsenal (l.63)';
    return APRES ? `Autres liens ${entrant ? '←' : '→'} (l.85)` : null;
  }

  if (g === 'FicheAttaque') {
    // app/learn/akasha/[slug]/page.tsx, branche category==='Attaque'
    if (entrant && relation === 'maitrise' && autre?.type === 'character') return 'Maîtrisée par (page l.118)';
    return null;
  }

  // EntityZone : `secondary` ramasse TOUT relationsOut et TOUT relationsIn hors primaire —
  // toute arête est rendue, avec un libellé directionnel (libelle()). Plafond 12 + « + N autres ».
  const PRIMARY = { power: ['maitrise'], skill: ['maitrise'], artifact: ['possede'], profession: ['exerce'], place: ['habite', 'appartient'] };
  if (entrant && (PRIMARY[moi.type] ?? []).includes(relation) && autre?.type === 'character') return 'Primaire/orbite (l.193)';
  return entrant ? 'Autres liens ← (l.222)' : 'Autres liens → (l.221)';
}

// ── Comptage ────────────────────────────────────────────────────────────────
const cellules = new Map(); // "gabarit|relation|sens|typeAutre" -> {n, grappe}
const invisibles = [];      // arêtes rendues NULLE PART (ni source ni cible)
let vues = 0;

for (const r of rels) {
  const f = parId.get(r.from_entry);
  const t = parId.get(r.to_entry);
  if (!f || !t) continue;
  const gS = rendu(f, t, r.relation, false);
  const gC = rendu(t, f, r.relation, true);
  for (const [moi, autre, entrant, res] of [[f, t, false, gS], [t, f, true, gC]]) {
    const k = `${gabarit(moi)}|${r.relation}|${entrant ? 'entrant' : 'sortant'}|${autre.type}`;
    const c = cellules.get(k) ?? { n: 0, grappe: res };
    c.n++; c.grappe = res;
    cellules.set(k, c);
  }
  if (gS || gC) vues++;
  else invisibles.push({ relation: r.relation, de: f.slug, deType: f.type, vers: t.slug, versType: t.type });
}

const lignes = [...cellules].map(([k, v]) => {
  const [gab, relation, sens, typeAutre] = k.split('|');
  return { gabarit: gab, relation, sens, typeAutre, n: v.n, grappe: v.grappe, rendu: !!v.grappe };
}).sort((a, b) => b.n - a.n);

mkdirSync('data/audits', { recursive: true });
const horo = new Date().toISOString().replace(/[:.]/g, '-');
const chemin = `data/audits/aretes-matrice-rendu-${horo}.json`;
writeFileSync(chemin, JSON.stringify({ mesureLe: new Date().toISOString(), totalAretes: rels.length, lignes, invisibles }, null, 2));

const trous = lignes.filter((l) => !l.rendu);
const totalTrou = trous.reduce((s, l) => s + l.n, 0);
console.log(`\n=== ${rels.length} arêtes · ${vues} visibles au moins d'un bout · ${rels.length - vues} invisibles des DEUX bouts`);
console.log(`=== Demi-arêtes NON RENDUES : ${totalTrou} (sur ${rels.length * 2} demi-arêtes)\n`);

console.log('--- TROUS (demi-arêtes qu\'aucune grappe ne rend), par volume ---');
console.log('     n  gabarit            relation          sens      autre bout');
for (const l of trous) {
  console.log(`${String(l.n).padStart(6)}  ${l.gabarit.padEnd(18)} ${l.relation.padEnd(17)} ${l.sens.padEnd(9)} ${l.typeAutre}`);
}

console.log('\n--- RENDUES, par volume ---');
console.log('     n  gabarit            relation          sens      autre bout  → grappe');
for (const l of lignes.filter((x) => x.rendu)) {
  console.log(`${String(l.n).padStart(6)}  ${l.gabarit.padEnd(18)} ${l.relation.padEnd(17)} ${l.sens.padEnd(9)} ${l.typeAutre.padEnd(11)} → ${l.grappe}`);
}

// Récapitulatif par gabarit
console.log('\n--- Récapitulatif par gabarit (demi-arêtes) ---');
const parGab = new Map();
for (const l of lignes) {
  const g = parGab.get(l.gabarit) ?? { rendues: 0, trous: 0 };
  if (l.rendu) g.rendues += l.n; else g.trous += l.n;
  parGab.set(l.gabarit, g);
}
for (const [g, v] of parGab) console.log(`${g.padEnd(18)} rendues ${String(v.rendues).padStart(6)} · trous ${String(v.trous).padStart(6)}`);

console.log(`\nArêtes invisibles des DEUX côtés : ${invisibles.length}`);
const parPaire = new Map();
for (const i of invisibles) {
  const k = `${i.relation} ${i.deType}→${i.versType}`;
  parPaire.set(k, (parPaire.get(k) ?? 0) + 1);
}
for (const [k, n] of [...parPaire].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(5)}  ${k}`);
console.log(`\ntrace ${chemin}`);
