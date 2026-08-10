// scripts/akasha-sonde-preuve-noms.mjs — LA PREUVE LA PLUS FORTE : LA FICHE QUI CITE LE PAYS
// EMPLOIE-T-ELLE ELLE-MÊME LE NOM FR QU'ON VEUT LUI DONNER ?
//
// POURQUOI : « Pays des Bois » est attesté 1 fois dans le corpus. Si c'est justement dans la fiche
// Kurozuka — celle dont l'infobox du wiki porte « affiliation : Land of Woods » —, la traduction
// n'est plus une ressemblance, c'est le même fait écrit deux fois. Sinon, on garde le nom canon.
// N'écrit RIEN.
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};
const entries = await page('akasha_entries', 'id, slug, name, universe, summary, description, attributes');
const parSlug = new Map(entries.map((e) => [e.slug, e]));
const texteDe = (e) => [e.summary, e.description, JSON.stringify(e.attributes ?? {})].join('  ');

// Couples (cible du wiki → fiches qui la citent) relevés dans la sonde du 10/08 09:01.
const CITE = {
  'Land of Fire': ['kiyoyasu-kagetsu', 'makino-naruto', 'dengaku', 'tora', 'emi', 'shu-naruto', 'kusuma', 'goshiki', 'kazabune'],
  'Land of Redaku': ['penjira', 'ganno', 'fundaru', 'zansuru'],
  'Land of Waves': ['teguse', 'pochi', 'kaji'],
  'Land of Water': ['kajiki', 'iwana-citizen', 'taiki'],
  'Land of Ancestors': ['haori', 'shiro-land-of-ancestors'],
  'Land of Vegetables': ['momiji'],
  'Land of Forests': ['tsuzumi'],
  'Land of Sound': ['fuki-land-of-sound'],
  'Land of Tea': ['fukusuke-hikyakuya'],
  'Land of the Sea': ['hitode'],
  'Land of Honey': ['kayo'],
  'Land of Bean Jam': ['kayo'],
  'Land of Mountains': ['giant-eagle'],
  'Land of the Moon': ['korega'],
  'Land of Neck': ['shiromari'],
  'Land of Birds': ['komei'],
  'Land of That': ['shu-lord'],
  'Land of Lightning': ['tekkan'],
  'Land of Woods': ['kurozuka'],
  'Wagarashi Family': ['fukusuke-hikyakuya'],
  'Kanabun Gang': ['kanabun'],
  'Prajñā Group': ['kurozuka'],
};

console.log('=== CE QUE DIT LA FICHE QUI CITE (extrait de son propre texte) ===');
for (const [cible, slugs] of Object.entries(CITE)) {
  console.log(`\n── ${cible}`);
  for (const s of slugs) {
    const e = parSlug.get(s);
    if (!e) { console.log(`   ${s} : FICHE INTROUVABLE`); continue; }
    const t = texteDe(e);
    // On montre les fragments qui contiennent « Pays »/« Terre » : c'est là que le nom FR se cache.
    const frags = [...t.matchAll(/.{0,70}(?:Pays|Terre)\s+(?:du|de|des|d[’'])[^.,;"}]{0,40}/g)].map((m) => m[0].replace(/\\n/g, ' ').trim());
    console.log(`   ${s} :: ${frags.length ? frags.slice(0, 3).map((f) => `« …${f}… »`).join('  |  ') : '(aucun « Pays/Terre » dans son texte)'}`);
  }
}
