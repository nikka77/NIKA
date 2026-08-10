// scripts/akasha-sonde-gabarit-place.mjs — LIRE LE GABARIT ET VÉRIFIER L'ABSENCE AVANT D'ÉCRIRE.
//
// POURQUOI : on s'apprête à créer des fiches Naruto (pays, clans, équipes). Deux risques opposés :
// inventer un gabarit qui ne ressemble à rien de ce que le rendu sait afficher, et surtout créer
// un DOUBLON d'une fiche qui existe déjà sous un autre nom (« Kagetsu Family » côté wiki peut très
// bien être « Clan Kagetsu » chez nous). Cette sonde lit la forme réelle et cherche chaque cible
// manquante par plusieurs clés avant qu'on décide quoi que ce soit. N'écrit RIEN.
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;   // un select nu s'arrête à 1000 SANS erreur
  }
  return out;
};

const entries = await page('akasha_entries', '*');
console.log(`akasha_entries : ${entries.length} lignes · colonnes : ${Object.keys(entries[0]).join(', ')}`);
const naruto = entries.filter((e) => e.universe === 'Naruto');
const places = naruto.filter((e) => e.type === 'place');

console.log('\n=== SLUGS DES 39 PLACES NARUTO ===');
console.log(places.map((e) => `${(e.attributes?.category ?? '—').padEnd(8)} ${e.slug.padEnd(34)} ${e.name}  ${e.image_url ? '[img]' : '[sans img]'}`).join('\n'));

console.log('\n=== 3 PLACES « Lieu » MINIMALES, EN ENTIER (le gabarit à copier) ===');
const legers = places.filter((e) => Object.keys(e.attributes ?? {}).length <= 4);
for (const e of legers.slice(0, 3)) console.log(JSON.stringify(e, null, 1));

console.log('\n=== CE QUE LE CORPUS APPELLE UN CLAN / UNE ÉQUIPE ===');
for (const mot of ['Clan ', 'Équipe ', 'Team ', 'Gang', 'Groupe ']) {
  const l = naruto.filter((e) => (e.name ?? '').startsWith(mot));
  console.log(`\n« ${mot} » → ${l.length} fiches · types : ${[...new Set(l.map((e) => e.type))].join(', ')}`);
  console.log(l.slice(0, 8).map((e) => `   ${e.type} · ${e.slug} · ${e.name}`).join('\n'));
}
const unClan = naruto.find((e) => (e.name ?? '').startsWith('Clan '));
if (unClan) { console.log('\n--- une fiche clan en entier ---'); console.log(JSON.stringify(unClan, null, 1)); }
const uneEquipe = naruto.find((e) => (e.name ?? '').startsWith('Équipe '));
if (uneEquipe) { console.log('\n--- une fiche équipe en entier ---'); console.log(JSON.stringify(uneEquipe, null, 1)); }

console.log('\n=== LES CIBLES MANQUANTES EXISTENT-ELLES DÉJÀ SOUS UN AUTRE NOM ? ===');
const CIBLES = ['Land of Fire', 'Land of Redaku', 'Land of Waves', 'Land of Water', 'Land of Ancestors',
  'Land of Vegetables', 'Land of Forests', 'Land of Sound', 'Land of Tea', 'Land of the Sea', 'Land of Honey',
  'Land of Bean Jam', 'Land of Mountains', 'Land of the Moon', 'Land of Neck', 'Land of Birds', 'Land of That',
  'Land of Lightning', 'Land of Woods', 'Kagetsu Family', 'Wagarashi Family', 'Kanabun Gang', 'Prajñā Group',
  'Summon', 'Daimyō'];
// Recherche large : on cherche le DERNIER mot significatif du titre anglais dans tous les champs
// texte des fiches Naruto. Volontairement bruyant : mieux vaut lire dix faux positifs que créer
// un doublon.
const nettoie = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
for (const c of CIBLES) {
  const noyau = nettoie(c).replace(/^land of (the )?/, '').replace(/ (family|group|gang)$/, '');
  const hits = naruto.filter((e) => nettoie(e.name).includes(noyau) || nettoie(e.slug).includes(noyau.replace(/\s+/g, '-')));
  console.log(`\n${c}  (noyau « ${noyau} ») → ${hits.length} fiches Naruto`);
  console.log(hits.slice(0, 12).map((e) => `   ${e.type.padEnd(10)} ${e.slug.padEnd(32)} ${e.name}`).join('\n'));
}

console.log('\n=== VALEURS DÉJÀ EMPLOYÉES DANS attributes.region (le nom FR d\'un pays, si le corpus en a un) ===');
const regions = {};
for (const e of naruto) { const r = e.attributes?.region; if (r) regions[r] = (regions[r] ?? 0) + 1; }
console.log(Object.entries(regions).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k} ×${v}`).join('\n'));

console.log('\n=== rarity : valeurs employées par les places Naruto ===');
const rar = {};
for (const e of places) rar[e.rarity] = (rar[e.rarity] ?? 0) + 1;
console.log(JSON.stringify(rar));

console.log('\n=== descFrSource : d\'où viennent les textes FR des places ? ===');
const src = {};
for (const e of places) { const s = e.attributes?.descFrSource; if (s) src[s] = (src[s] ?? 0) + 1; }
console.log(JSON.stringify(src, null, 1));
