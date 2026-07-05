// scripts/build-akasha-attacks.mjs — ATTAQUES/TECHNIQUES nommées (hybride, validé avec Dan).
// Naruto a déjà ses 1411 jutsu (API Dattebayo). Les autres univers n'ont AUCUN endpoint attaques → :
//   • Dragon Ball : wiki Fandom (pages « List of techniques used by X » = lien perso→technique propre).
//   • One Piece + Bleach : movesets CURÉS (les wikis n'ont pas de listes perso exploitables) — les
//     attaques signature que les fans connaissent, correctement attribuées.
// Sortie : data/akasha-attacks.json { entities[], relations[] } → seed-akasha-attacks.ts (additif).
//   node scripts/build-akasha-attacks.mjs            → build complet + JSON
//   node scripts/build-akasha-attacks.mjs --dry-run  → rapport sans écrire le JSON de seed
import { writeFileSync, readFileSync } from 'node:fs';
import { categoryMembers, searchTitles, pageLinksIn, fandomSleep } from './lib/fandom.mjs';

const DRY = process.argv.includes('--dry-run');
const slugify = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Résolution des personnages contre le graphe. Le graphe mélange « Prénom Nom » et « Nom Prénom »
// (casting MAL) + noms FR + « Edward Newgate · Barbe Blanche » → on indexe par nom normalisé, par slug,
// et par JEU DE TOKENS TRIÉ (capture l'inversion d'ordre), en éclatant les parties sur « · » et « & ».
const graph = JSON.parse(readFileSync('data/akasha-universes.json', 'utf8')).entries;
const tokset = (s) => norm(s).split(' ').filter(Boolean).sort().join(' ');
const byNorm = new Map(), bySlug = new Map(), byTok = new Map();
for (const e of graph) if (e.type === 'character') {
  bySlug.set(e.universe + '|' + e.slug, e.slug);
  for (const part of String(e.name).split(/[·&]/)) {
    const p = part.trim(); if (!p) continue;
    byNorm.set(e.universe + '|' + norm(p), e.slug);
    byTok.set(e.universe + '|' + tokset(p), e.slug);
  }
}
const resolveChar = (universe, name) =>
  byNorm.get(universe + '|' + norm(name))
  || bySlug.get(universe + '|' + slugify(name))
  || byTok.get(universe + '|' + tokset(name))
  || null;

const entities = [];
const relations = [];
const seenTech = new Set();
const unresolved = [];
// Ajoute une technique (entité) + le lien perso→technique. Slug suffixé par univers (anti-collision).
function addTech(universe, charName, techName, { signature = false, source, discipline = 'Technique', roman = null } = {}) {
  const charSlug = resolveChar(universe, charName);
  if (!charSlug) { unresolved.push(`${universe}: ${charName}`); return false; }
  const base = slugify(techName);
  if (!base) return false;
  const uSuffix = { 'One Piece': 'op', 'Dragon Ball': 'db', Bleach: 'bl' }[universe] || slugify(universe);
  const slug = `atk-${uSuffix}-${base}`;
  if (!seenTech.has(slug)) {
    seenTech.add(slug);
    entities.push({
      slug, type: 'power', name: techName, is_fiction: true, universe,
      summary: `${discipline} de ${universe}${signature ? ' — attaque signature' : ''}.`,
      rarity: signature ? 'epic' : 'rare',
      attributes: { discipline, category: 'Attaque', is_signature: signature || undefined, source, roman_name: roman || undefined },
    });
  }
  relations.push({ from: charSlug, to: slug, relation: 'maitrise' });
  return true;
}

// ══════════ DRAGON BALL — Fandom (lien perso→technique via « List of techniques used by X ») ══════════
const DB_API = 'https://dragonball.fandom.com/api.php';
const DB_CAP = 90;
const GAME = /\b(Xenoverse|But[oō]den|Heroes|Kakarot|Legends|Dokkan|Sparking|Budokai|Tenkaichi|Raging Blast|FighterZ|The Breakers|Card Warriors|Fusions)\b/i;
const NOISY = /^\d+x |^\d/;
const cleanTech = (t) => t.replace(/\s*\((?:ability|technique|move|attack)\)\s*$/i, '').trim();
const SKIP_CHAR = /Future Warrior|Player|Avatar|Time Patroller|Xeno\b/i;
// Nom Fandom → nom du graphe (romanisation MAL) pour les gros persos qui ne matchent pas tels quels.
const DB_CHAR_ALIAS = { Goku: 'Son Goku', Gohan: 'Son Gohan', Frieza: 'Freeza', Krillin: 'Krillin' };
const DB_SIGNATURE = {
  Goku: ['Kamehameha', 'Kaio-ken', 'Spirit Bomb', 'Dragon Fist', 'Instant Transmission', 'Solar Flare', 'Super Kamehameha'],
  Vegeta: ['Galick Gun', 'Final Flash', 'Big Bang Attack', 'Final Explosion', 'Big Bang Kamehameha'],
  Gohan: ['Masenko', 'Kamehameha', 'Father-Son Kamehameha', 'Special Beam Cannon'],
  Piccolo: ['Special Beam Cannon', 'Demon Cannon', 'Hellzone Grenade', 'Explosive Demon Wave', 'Light Grenade'],
  Krillin: ['Destructo Disc', 'Kamehameha', 'Solar Flare', 'Scattering Bullet'],
  Frieza: ['Death Ball', 'Death Beam', 'Supernova', 'Nova Strike'],
  Cell: ['Kamehameha', 'Special Beam Cannon', 'Big Bang Crash', 'Solar Flare'],
  'Future Trunks': ['Burning Attack', 'Buster Cannon', 'Heat Dome Attack', 'Final Hope Slash'],
};

async function buildDragonBall() {
  console.log('→ Dragon Ball — techniques via Fandom…');
  const techSet = await categoryMembers(DB_API, 'Techniques', 8);
  const listPages = [...new Set(await searchTitles(DB_API, 'List of techniques used by', 'List of techniques used by', 120))];
  let chars = 0;
  for (const page of listPages) {
    const wikiChar = page.replace(/^List of techniques used by (the )?/i, '').trim();
    if (SKIP_CHAR.test(wikiChar) || SKIP_CHAR.test(page)) continue;
    const char = DB_CHAR_ALIAS[wikiChar] || wikiChar; // nom Fandom → nom du graphe
    if (!resolveChar('Dragon Ball', char)) continue; // pas dans notre roster → skip (évite le bruit)
    let techs = await pageLinksIn(DB_API, page, techSet);
    techs = [...new Set(techs.map(cleanTech))].filter((t) => t && !GAME.test(t) && !NOISY.test(t) && t.length <= 60);
    if (!techs.length) continue;
    const sig = new Set((DB_SIGNATURE[wikiChar] || []).map(norm));
    techs.sort((a, b) => (sig.has(norm(b)) ? 1 : 0) - (sig.has(norm(a)) ? 1 : 0)); // signatures d'abord (anti-troncature)
    let n = 0;
    for (const t of techs.slice(0, DB_CAP)) if (addTech('Dragon Ball', char, t, { signature: sig.has(norm(t)), source: 'fandom' })) n++;
    if (n) chars++;
    await fandomSleep(250);
  }
  console.log(`  ✓ Dragon Ball : ${chars} persos couverts`);
}

// ══════════ ONE PIECE — movesets CURÉS (attaques signature) ══════════
const OP_MOVES = {
  'Monkey D. Luffy': ['Gomu Gomu no Pistolet', 'Gomu Gomu no Bazooka', 'Gomu Gomu no Gatling', 'Gomu Gomu no Red Hawk', 'Gomu Gomu no Elephant Gun', 'Gomu Gomu no King Kong Gun', 'Gear Second', 'Gear Third', 'Gear Fourth', 'Gear Fifth', 'Bajrang Gun', 'Red Roc'],
  'Roronoa Zoro': ['Oni Giri', 'Tora Gari', 'Santoryu Ougi Sanzen Sekai', 'Tatsumaki', 'Shishi Sonson', 'Ashura', 'Purgatory Oni Giri', 'King of Hell', 'Enma'],
  Sanji: ['Diable Jambe', 'Concasse', 'Mouton Shot', 'Party Table Kick Course', 'Ifrit Jambe', 'Bien Cuit Grill Shot', 'Poele à Frire'],
  Nami: ['Thunderbolt Tempo', 'Mirage Tempo', 'Zeus Breath', 'Thunder Lance Tempo', 'Cyclone Tempo'],
  Usopp: ['Kaen Boshi', 'Impact Dial', 'Kabuto', 'Midori Boshi', 'Firebird Star'],
  'Tony Tony Chopper': ['Monster Point', 'Kung Fu Point', 'Guard Point', 'Arm Point', 'Horn Point'],
  'Nico Robin': ['Clutch', 'Cien Fleur', 'Mil Fleur', 'Gigantesco Mano', 'Spider Net', 'Demonio Fleur'],
  Franky: ['Coup de Vent', 'Radical Beam', 'Franky Radical Hip', 'Weapons Left', 'Strong Right'],
  Brook: ['Soul Solid', 'Hanauta Sancho Yahazu Giri', 'Nemuriuta Flanc', 'Cold Nezumi Zeppyo', 'Swallow Bond Avant'],
  Jinbe: ['Karakusagawara Seiken', 'Buraikan', 'Samehada Shotei', 'Yarinami', 'Onigawara Seiken'],
  'Portgas D. Ace': ['Hiken', 'Enkai', 'Dai Enkai Entei', 'Kyokaen', 'Jujika'],
  Sabo: ['Ryu no Ibuki', 'Hiken', 'Dragon Claw', 'Ryu no Kagizume'],
  'Trafalgar Law': ['Room', 'Shambles', 'Gamma Knife', 'Injection Shot', 'Counter Shock', 'K-Room', 'Puncture Wille'],
  'Dracule Mihawk': ['Kokuto Yoru Slash'],
  Shanks: ['Divine Departure', "Conqueror's Haki Clash"],
  'Edward Newgate': ['Gura Gura no Mi Quake', 'Shima Yurai'],
  'Marshall D. Teach': ['Kurouzu', 'Gura Gura Quake', 'Liberation'],
  'Charlotte Katakuri': ['Mochi Tsuki', 'Buzz Cut Mochi', 'Zan Giri Mochi', 'Power Mochi'],
  'Rob Lucci': ['Rokushiki', 'Rokuogan', 'Shigan', 'Rankyaku', 'Geppo', 'Tekkai', 'Soru'],
};

// ══════════ BLEACH — movesets CURÉS (Shikai/Bankai signature + Kidō emblématiques) ══════════
const BL_MOVES = {
  'Ichigo Kurosaki': ['Getsuga Tensho', 'Tensa Zangetsu', 'Bankai', 'Final Getsuga Tensho', 'Gran Rey Cero'],
  'Rukia Kuchiki': ['Sode no Shirayuki', 'Some no Mai Tsukishiro', 'Tsugi no Mai Hakuren', 'Hakka no Togame'],
  'Byakuya Kuchiki': ['Senbonzakura', 'Senbonzakura Kageyoshi', 'Senkei', 'Shukei Hakuteiken', 'Gokei'],
  'Toshiro Hitsugaya': ['Hyorinmaru', 'Daiguren Hyorinmaru', 'Sennen Hyoro', 'Hyoten Hyakkaso', 'Guncho Tsurara'],
  'Kenpachi Zaraki': ['Nozarashi', 'Kendo', 'Ryodan'],
  'Renji Abarai': ['Zabimaru', 'Higa Zekko', 'Hihio Zabimaru', 'Soo Zabimaru'],
  'Kisuke Urahara': ['Benihime', 'Nake Benihime', 'Kamisori Benihime', 'Bankai Kannonbiraki Benihime Aratame'],
  'Sosuke Aizen': ['Kyoka Suigetsu', 'Kanzen Saimin', 'Kurohitsugi'],
  'Yoruichi Shihoin': ['Shunko', 'Flash Cry', 'Utsusemi'],
  'Kaname Tousen': ['Suzumushi', 'Suzumushi Tsuishiki Enma Korogi'],
  'Mayuri Kurotsuchi': ['Ashisogi Jizo', 'Konjiki Ashisogi Jizo'],
  'Retsu Unohana': ['Minazuki'],
  'Shunsui Kyoraku': ['Katen Kyokotsu', 'Bushogoma', 'Takaoni', 'Kageoni'],
  Ulquiorra: ['Cero Oscuras', 'Lanza del Relampago', 'Segunda Etapa'],
  Grimmjow: ['Desgarron', 'Gran Rey Cero', 'Garra de la Pantera'],
  'Coyote Starrk': ['Los Lobos', 'Cero Metralleta'],
  'Nnoitra Gilga': ['Santa Teresa', 'Cero'],
};
const KIDO = ['Hado 31 Shakkaho', 'Hado 33 Sokatsui', 'Hado 63 Raikoho', 'Hado 73 Soren Sokatsui', 'Hado 90 Kurohitsugi', 'Bakudo 61 Rikujokoro', 'Bakudo 81 Danku', 'Bakudo 99 Kin'];

function buildCurated(universe, moves) {
  let n = 0, ch = 0;
  for (const [char, atks] of Object.entries(moves)) {
    let hit = 0;
    for (const a of atks) if (addTech(universe, char, a, { signature: true, source: 'curated', discipline: universe === 'Bleach' ? 'Technique de Zanpakutō' : 'Attaque' })) { n++; hit++; }
    if (hit) ch++;
  }
  console.log(`  ✓ ${universe} (curé) : ${ch} persos, ${n} attaques`);
}

async function main() {
  await buildDragonBall();
  console.log('→ One Piece — movesets curés…');
  buildCurated('One Piece', OP_MOVES);
  console.log('→ Bleach — movesets curés…');
  buildCurated('Bleach', BL_MOVES);
  // Kidō : école de sorts partagée → entités seules (utilisateurs multiples, non liées 1-1).
  for (const k of KIDO) { const slug = `atk-bl-${slugify(k)}`; if (!seenTech.has(slug)) { seenTech.add(slug); entities.push({ slug, type: 'power', name: k, is_fiction: true, universe: 'Bleach', summary: 'Sort de Kidō (démonologie du Gotei 13).', rarity: 'rare', attributes: { discipline: 'Kidō', category: 'Attaque', source: 'curated' } }); } }

  console.log(`\n=== ATTAQUES (hybride) ===`);
  console.log(`Entités technique : ${entities.length} | relations perso→attaque : ${relations.length}`);
  const byU = {}; for (const e of entities) byU[e.universe] = (byU[e.universe] || 0) + 1;
  console.log('par univers :', JSON.stringify(byU));
  if (unresolved.length) { const uniq = [...new Set(unresolved)]; console.log(`⚠ ${uniq.length} persos curés non résolus (ignorés) : ${uniq.slice(0, 12).join(' | ')}`); }

  if (!DRY) {
    writeFileSync('data/akasha-attacks.json', JSON.stringify({ entities, relations }, null, 1));
    console.log(`✓ écrit data/akasha-attacks.json`);
  } else console.log('(dry-run : JSON non écrit)');
}
main();
