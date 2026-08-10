// scripts/audit-doublons-par-image.mjs — DÉTECTER LES DOUBLONS QUE LE NOM NE TRAHIT PAS.
//
// POURQUOI (09/08/2026)
// `scripts/akasha-dedup.mjs` groupe par (univers | type | nom normalisé) : il attrape « Kurama »
// contre « Kurama », jamais « Jet-Skis » contre « Waver ». Or ces deux fiches One Piece décrivent
// le même véhicule, mot pour mot, et le chantier images du 08/08 l'a rendu visible sans le voir :
// il a posé sur `jet-skis` l'image que `waver` portait déjà.
//
// CE QUE LE SIGNAL VAUT VRAIMENT, mesuré sur les 45 groupes du 09/08 : partager un visuel N'EST
// PAS partager une identité. Le partage recouvre trois situations très différentes, et seule la
// lecture les sépare :
//   · le vrai DOUBLON — `jushiro-ukitake` et `juushirou-ukitake`, deux romanisations du même
//     capitaine, que la déduplication par nom ne peut pas voir ;
//   · l'image USURPÉE — `trafalgar-law` affichait le portrait de sa petite sœur ; quatre têtes
//     d'affiche étaient dans ce cas (voir ops-reparer-portraits-usurpes.mjs) ;
//   · le partage LÉGITIME, de loin le plus fréquent — une technique et l'arme qui la porte, un
//     personnage et sa monture, deux attaques illustrées par la même planche. Rien à corriger.
// Le signal ne conclut donc rien ; il désigne les 91 fiches à lire parmi 6 818, ce qu'aucun autre
// tri ne fait gratuitement.
//
// Ce script NE SUPPRIME RIEN et n'écrit rien en base. Une fusion demande de repointer les
// relations et de choisir la fiche survivante : c'est une décision, pas un balayage. Il produit la
// liste à instruire, avec de quoi trancher sans rouvrir la base (type, résumé, nombre d'arêtes).
//
// Usage : node --env-file=.env.local scripts/audit-doublons-par-image.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { chargerNonDoublons } from '../lib/ops/non-doublons.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
// 10/08/2026 — voir lib/ops/non-doublons.mjs : les paires déjà tranchées sont ANNOTÉES, pas
// cachées. Un partage d'image reste un fait à lire même quand l'identité, elle, est réglée.
const registre = chargerNonDoublons(ROOT);

const pageAll = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = await pageAll('akasha_entries', 'id, slug, name, type, universe, summary, image_url');
const rels = await pageAll('akasha_relations', 'from_entry, to_entry');

const degre = new Map();
for (const r of rels) {
  degre.set(r.from_entry, (degre.get(r.from_entry) ?? 0) + 1);
  degre.set(r.to_entry, (degre.get(r.to_entry) ?? 0) + 1);
}

// Le suffixe `/revision/latest?cb=…` de Fandom varie d'une capture à l'autre pour le MÊME fichier :
// comparer les URLs brutes raterait la moitié des paires.
const fichier = (url) => String(url).split('/revision')[0].split('?')[0];

const parImage = new Map();
for (const e of entries) {
  if (!e.image_url) continue;
  const k = fichier(e.image_url);
  if (!parImage.has(k)) parImage.set(k, []);
  parImage.get(k).push(e);
}

const groupes = [...parImage.entries()]
  .filter(([, g]) => g.length > 1)
  .map(([image, g]) => ({
    image,
    univers: [...new Set(g.map((e) => e.universe))],
    // Un groupe dont les fiches ne partagent NI le type NI l'univers mérite d'être lu en premier :
    // c'est là que se cachent les erreurs de classement (un lieu rangé en organisation, par ex.).
    memeType: new Set(g.map((e) => e.type)).size === 1,
    dejaRefute: registre.verdict(g.map((e) => e.slug)) ?? undefined,
    fiches: g.map((e) => ({
      slug: e.slug, nom: e.name, type: e.type, universe: e.universe,
      aretes: degre.get(e.id) ?? 0,
      resume: String(e.summary ?? '').slice(0, 120),
    })).sort((a, b) => b.aretes - a.aretes),
  }))
  .sort((a, b) => Number(a.memeType) - Number(b.memeType) || b.fiches.length - a.fiches.length);

const rapport = {
  chantier: 'doublons détectés par image partagée', quand: new Date().toISOString(),
  fiches: entries.length, avecImage: entries.filter((e) => e.image_url).length,
  groupes: groupes.length,
  fichesConcernees: groupes.reduce((n, g) => n + g.fiches.length, 0),
  typesMelanges: groupes.filter((g) => !g.memeType).length,
  dejaRefutes: groupes.filter((g) => g.dejaRefute).length,
  registre: { paires: registre.taille, misAJour: registre.misAJour },
  detail: groupes,
};

const sortie = path.join(ROOT, 'data/audits/doublons-par-image.json');
fs.mkdirSync(path.dirname(sortie), { recursive: true });
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));

console.log(`${rapport.avecImage} fiches avec image → ${groupes.length} groupe(s) partageant un visuel (${rapport.fichesConcernees} fiches)`);
console.log(`dont ${rapport.typesMelanges} groupe(s) à TYPES MÉLANGÉS (à lire en premier)`);
console.log(`registre des réfutations : ${registre.taille} paire(s) — ${rapport.dejaRefutes} groupe(s) ici DÉJÀ tranché(s)\n`);
for (const g of groupes.slice(0, 12)) {
  const marque = g.dejaRefute ? `  ⟵ DÉJÀ RÉFUTÉ : ${g.dejaRefute.verdict}` : '';
  console.log(`${g.memeType ? ' ' : '⚠'} ${g.fiches.map((f) => `${f.slug}(${f.type},${f.aretes})`).join('  +  ')}${marque}`);
}
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
