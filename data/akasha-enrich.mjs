// data/akasha-enrich.mjs — deltas d'enrichissement curés (canon) pour AKASHA.
// Partagé par scripts/build-akasha-universes.mjs (durable) ET scripts/akasha-apply-enrich.mjs (patch réseau-free).
// applyEnrichment(entries) mute le tableau : ajoute des entités (lieux OP, artefacts DB) et
// tague les persos existants (Nen HxH, saga/race DB, race Bleach) via correspondance de nom.

const nameIs = (e, pat) => {
  const n = String(e.name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return pat.includes(' ') ? n.includes(pat) : (n === pat || n.split(/[\s.,'’-]+/).includes(pat));
};
const mk = (slug, type, name, universe, summary, rarity, attributes) =>
  ({ slug, type, name, is_fiction: true, universe, summary, description: summary, image_url: null, attributes, rarity });

// ── One Piece — LIEUX (îles & territoires) : [slug, nom, région, résumé, rareté] ──
export const OP_PLACES = [
  ['foosha', 'Village de Fushia', 'East Blue', "Le paisible village natal de Luffy, où Shanks lui a confié son chapeau de paille.", 'rare'],
  ['shells-town', 'Shell Town', 'East Blue', "La base de la Marine où Luffy libère Zoro, ligoté sur la place d'armes.", 'common'],
  ['orange-town', 'Orange Town', 'East Blue', "La ville pillée par Baggy le Clown, premier vrai ennemi de l'équipage.", 'common'],
  ['syrup-village', 'Village de Syrup', 'East Blue', "Le village d'Usopp, théâtre de l'affrontement contre Kuro et de l'arrivée du Vogue Merry.", 'rare'],
  ['baratie', 'Le Baratie', 'East Blue', "Le restaurant flottant de Zeff où Sanji apprend la cuisine et rejoint l'équipage.", 'rare'],
  ['cocoyasi', 'Village de Cocoyasi', 'East Blue', "Le village de Nami, opprimé par Arlong Park jusqu'à la libération par Luffy.", 'epic'],
  ['loguetown', 'Loguetown', 'East Blue', "La ville du début et de la fin : lieu de naissance et d'exécution de Gold Roger.", 'epic'],
  ['reverse-mountain', 'Reverse Mountain', 'Grand Line · Paradis', "La montagne à l'envers, seule porte d'entrée de Grand Line depuis les quatre Blues.", 'rare'],
  ['whisky-peak', 'Whisky Peak', 'Grand Line · Paradis', "La cité en forme de cactus, repaire de chasseurs de primes de Baroque Works.", 'rare'],
  ['little-garden', 'Little Garden', 'Grand Line · Paradis', "L'île préhistorique figée dans le temps, où combattent éternellement les géants Dorry et Broggy.", 'epic'],
  ['drum-island', 'Île de Drum (Sakura)', 'Grand Line · Paradis', "Le royaume enneigé aux châteaux perchés, patrie de Chopper et du Dr. Hiluluk.", 'epic'],
  ['alabasta', 'Alabasta', 'Grand Line · Paradis', "Le royaume désertique de la princesse Vivi, déchiré par la guerre civile orchestrée par Crocodile.", 'legendary'],
  ['jaya', 'Jaya', 'Grand Line · Paradis', "L'île à moitié engloutie de Mock Town, point de départ vers le ciel de Skypiea.", 'rare'],
  ['skypiea', 'Skypiea', 'Grand Line · Ciel', "L'île céleste sur la mer de nuages, royaume de Dieu Ener et de la cloche d'or de Shandora.", 'epic'],
  ['water-seven', 'Water Seven', 'Grand Line · Paradis', "La cité de l'eau aux canaux et chantiers navals, berceau du Thousand Sunny et de la crise Cipher Pol.", 'epic'],
  ['enies-lobby', 'Enies Lobby', 'Grand Line · Paradis', "L'île judiciaire du Gouvernement Mondial, où l'équipage déclare la guerre pour sauver Robin.", 'legendary'],
  ['thriller-bark', 'Thriller Bark', 'Grand Line · Paradis', "Le galion-île géant de Gecko Moria, hanté de zombies et voleur d'ombres.", 'epic'],
  ['sabaody', 'Archipel Sabaody', 'Grand Line · Paradis', "La forêt de mangroves à bulles, dernière escale avant le Nouveau Monde et lieu de la séparation de l'équipage.", 'epic'],
  ['amazon-lily', 'Amazon Lily', 'Calm Belt', "L'île interdite aux hommes, patrie des guerrières Kuja et de l'impératrice Boa Hancock.", 'epic'],
  ['impel-down', 'Impel Down', 'Calm Belt', "La grande prison sous-marine à six niveaux d'enfer du Gouvernement Mondial.", 'legendary'],
  ['fishman-island', 'Île des Hommes-Poissons', 'Grand Line · Paradis', "Le royaume sous-marin de 10 000 mètres de fond, sous la Red Line, patrie de Jinbe.", 'epic'],
  ['punk-hazard', 'Punk Hazard', 'Grand Line · Nouveau Monde', "L'île coupée en deux — glace et feu — laboratoire empoisonné de Caesar Clown.", 'epic'],
  ['dressrosa', 'Dressrosa', 'Grand Line · Nouveau Monde', "Le royaume des jouets et des passions, empire secret de Doflamingo bâti sur l'esclavage.", 'legendary'],
  ['zou', 'Zou', 'Grand Line · Nouveau Monde', "L'île sur le dos d'un éléphant millénaire vivant, refuge des Minks et des Poneglyphes.", 'epic'],
  ['whole-cake-island', 'Whole Cake Island', 'Grand Line · Nouveau Monde', "L'île-gâteau de Big Mom, cœur sucré et cruel de l'empire de Totto Land.", 'legendary'],
  ['wano', 'Pays de Wano', 'Grand Line · Nouveau Monde', "Le pays fermé des samouraïs, sous le joug de l'empereur Kaido et du shogun Orochi.", 'legendary'],
  ['onigashima', 'Onigashima', 'Grand Line · Nouveau Monde', "La forteresse-crâne de l'Empereur Kaido, théâtre de la grande bataille de Wano.", 'legendary'],
  ['egghead', 'Egghead', 'Grand Line · Nouveau Monde', "L'île du futur du Dr. Vegapunk, cerveau scientifique le plus avancé du monde.", 'legendary'],
  ['elbaf', 'Elbaf', 'Grand Line · Nouveau Monde', "La terre légendaire des géants guerriers, où le combat et la fierté décident de tout.", 'epic'],
  ['ohara', 'Ohara', 'West Blue', "L'île des archéologues et de son Arbre de la Connaissance, rasée par un Buster Call pour avoir lu l'Histoire.", 'epic'],
  ['mary-geoise', 'Mariejois', 'Red Line', "La Terre Sainte au sommet de la Red Line, siège des Dragons Célestes et des Cinq Doyens.", 'legendary'],
  ['baltigo', 'Baltigo', 'Grand Line · Nouveau Monde', "L'île du vent, ancien quartier général secret de l'Armée Révolutionnaire de Dragon.", 'rare'],
  ['laugh-tale', 'Laugh Tale', 'Grand Line · Nouveau Monde', "L'île ultime au bout de Grand Line, où Roger a trouvé le trésor du One Piece.", 'legendary'],
  ['god-valley', 'God Valley', 'Grand Line', "L'île disparue, théâtre de l'incident où Roger et Garp ont vaincu Rocks D. Xebec.", 'legendary'],
];

// ── Dragon Ball — ARTEFACTS : [slug, nom, matière, résumé, rareté] ──
export const DB_ARTIFACTS = [
  ['epee-de-trunks', 'Épée de Trunks (Brave Sword)', 'Acier trempé', "La lame que Trunks du futur porte dans le dos ; il tranche Freezer en deux dès son arrivée.", 'epic'],
  ['potara', 'Potaras (boucles de fusion)', 'Boucles d’oreilles Kaiō', "Les boucles des Kaiōshin : portées à droite et à gauche, elles fusionnent deux êtres à jamais (Vegetto).", 'legendary'],
  ['z-epee', 'Z-Sword (Épée Zeta)', 'Métal légendaire', "L'épée sacrée fichée dans le roc du Monde Kaiō Suprême ; la briser libère le Vieux Kaiōshin scellé dedans.", 'epic'],
  ['baton-magique', 'Bâton Magique (Nyoi-bô)', 'Métal extensible', "Le bâton rouge de Son Goku, cadeau de Grand-père Son Gohan, qui s'allonge à l'infini sur commande.", 'rare'],
  ['kinto-un', 'Nuage Magique (Kinto-un)', 'Nuage condensé', "Le nuage jaune qui vole à toute vitesse mais ne porte que les cœurs purs — la monture de Goku.", 'rare'],
  ['radar-dragon', 'Radar du Dragon', 'Électronique', "L'invention de Bulma qui détecte l'onde des sept Dragon Balls partout sur Terre.", 'rare'],
  ['scouter', 'Scouter', 'Verre & électronique', "Le détecteur porté à l'œil qui lit la puissance de combat — technologie de l'armée de Freezer.", 'common'],
  ['armure-saiyan', 'Armure de combat Saiyan', 'Bio-tissu élastique', "Le plastron qui s'étire et encaisse, uniforme des guerriers de l'Empire du Froid.", 'common'],
  ['capsule-hoi-poi', 'Capsule Hoi-Poi', 'Alliage Capsule Corp', "L'invention phare de la Capsule Corp : ranger une maison, une moto ou un frigo dans une capsule de poche.", 'rare'],
  ['boule-4-etoiles', 'Boule à quatre étoiles', 'Cristal de dragon', "La Dragon Ball préférée de Goku, souvenir de Grand-père Son Gohan qu'il porte contre son cœur.", 'epic'],
  ['veste-lestee', 'Vêtements lestés', 'Tissu ultra-lourd', "Le dogi, les bottes et les poignets pesant des dizaines de kilos que Goku retire avant les grands combats.", 'common'],
  ['mafuba-flacon', 'Bidon du Mafûba', 'Céramique scellée', "Le récipient dans lequel on emprisonne un démon capturé par la Vague Diabolique — au prix de la vie du lanceur.", 'rare'],
];

// ── Extensions des tables de tagging (persos existants uniquement) ──
// HxH — types de Nen confirmés canon non encore couverts.
export const HXH_NEN = [
  ['zushi', 'Renforcement'], ['todo', 'Renforcement'], ['gido', 'Renforcement'],
  ['zeno zoldyck', 'Transformation'], ['zeno', 'Transformation'], ['bisky', 'Transformation'],
  ['genthru', 'Émission'], ['gon-freecss', 'Renforcement'],
  ['bonolenov', 'Matérialisation'], ['squala', 'Manipulation'], ['ikalgo', 'Manipulation'],
  ['meleoron', 'Spécialisation'], ['kortopi', 'Matérialisation'],
];

// DB — sagas : cœur du casting Z + antagonistes non encore tagués.
export const DB_SAGA = [
  [['goku', 'son goku'], 'Saga Saiyan'], [['piccolo'], 'Saga Saiyan'], [['gohan', 'son gohan'], 'Saga Saiyan'],
  [['krillin', 'kuririn'], 'Saga Saiyan'], [['yamcha'], 'Saga Saiyan'], [['tenshinhan', 'tien'], 'Saga Saiyan'],
  [['chiaotzu', 'chaozu'], 'Saga Saiyan'], [['vegeta'], 'Saga Saiyan'], [['kami'], 'Saga Saiyan'], [['saibaman'], 'Saga Saiyan'],
  [['guru'], 'Saga Namek'], [['bulma'], 'Saga Namek'], [['porunga'], 'Saga Namek'],
  [['trunks'], 'Saga Cell'], [['mr. satan', 'hercule'], 'Saga Cell'],
  [['gotenks'], 'Saga Buu'], [['goten', 'son goten'], 'Saga Buu'], [['supreme kai', 'kaioshin', 'shin'], 'Saga Buu'],
  [['kibito'], 'Saga Buu'], [['uub', 'oob'], 'Saga Buu'], [['pui pui'], 'Saga Buu'], [['yakon'], 'Saga Buu'],
  [['bra', 'bulla'], 'Saga Super'], [['pan'], 'Saga Super'], [['kefla'], 'Saga Super'], [['moro'], 'Saga Super'],
  [['granolah', 'granola'], 'Saga Super'], [['gas'], 'Saga Super'], [['fused zamasu', 'fusion zamasu'], 'Saga Super'],
  [['vegetto', 'vegito'], 'Saga Super'], [['gogeta'], 'Saga Super'],
];

// DB — races : hybrides/fusions Saiyan supplémentaires.
export const DB_RACE = [
  [['pan'], 'Saiyan'], [['bra', 'bulla'], 'Saiyan'], [['gotenks'], 'Saiyan'], [['vegetto', 'vegito'], 'Saiyan'],
  [['gogeta'], 'Saiyan'], [['android 21'], 'Android'], [['cooler', 'coora'], 'Frieza Race'],
];

// Bleach — races spirituelles (grand comblement, surtout Hollow / Quincy / Fullbringer / Visored / Arrancar).
export const BLEACH_RACE = [
  // Hollows
  [['grand fisher'], 'Hollow'], [['fishbone'], 'Hollow'], [['shrieker'], 'Hollow'], [['acidwire', 'acid wire'], 'Hollow'],
  [['metastacia'], 'Hollow'], [['numb chandelier'], 'Hollow'], [['bawabawa'], 'Hollow'], [['gillian', 'menos'], 'Hollow'],
  [['hollow ichigo', 'white'], 'Hollow'], [['grand fisher'], 'Hollow'],
  // Arrancar / Espada
  [['ulquiorra'], 'Arrancar'], [['grimmjow'], 'Arrancar'], [['nnoitra'], 'Arrancar'], [['tier harribel', 'harribel', 'halibel'], 'Arrancar'],
  [['coyote starrk', 'starrk', 'stark'], 'Arrancar'], [['baraggan', 'barragan'], 'Arrancar'], [['aaroniero'], 'Arrancar'],
  [['zommari'], 'Arrancar'], [['szayelaporro', 'szayel'], 'Arrancar'], [['yammy'], 'Arrancar'], [['neliel', 'nelliel', 'nel'], 'Arrancar'],
  [['dordoni'], 'Arrancar'], [['cirucci'], 'Arrancar'], [['gantenbainne'], 'Arrancar'], [['wonderweiss'], 'Arrancar'],
  [['loly'], 'Arrancar'], [['menoly'], 'Arrancar'], [['tesla'], 'Arrancar'], [['pesche'], 'Arrancar'], [['dondochakka'], 'Arrancar'],
  // Quincy (Vandenreich / Sternritter)
  [['yhwach', 'juha bach'], 'Quincy'], [['ryuken'], 'Quincy'], [['bazz-b', 'bazz b'], 'Quincy'], [['as nodt', 'as nödt'], 'Quincy'],
  [['bambietta'], 'Quincy'], [['candice'], 'Quincy'], [['gremmy'], 'Quincy'], [['gerard valkyrie', 'gerard'], 'Quincy'],
  [['lille barro', 'lille'], 'Quincy'], [['pernida'], 'Quincy'], [['askin'], 'Quincy'], [['jugram haschwalth', 'haschwalth'], 'Quincy'],
  [['cang du'], 'Quincy'], [['mask de masculine'], 'Quincy'], [['nianzol'], 'Quincy'], [['quilge', 'quilge opie'], 'Quincy'],
  // Fullbringer (Xcution)
  [['kugo ginjo', 'ginjo'], 'Fullbringer'], [['shukuro tsukishima', 'tsukishima'], 'Fullbringer'], [['giriko'], 'Fullbringer'],
  [['jackie tristan', 'jackie'], 'Fullbringer'], [['riruka'], 'Fullbringer'], [['yukio'], 'Fullbringer'], [['shishigawara'], 'Fullbringer'],
  // Visored
  [['shinji hirako', 'shinji'], 'Visored'], [['hiyori'], 'Visored'], [['love aikawa', 'love'], 'Visored'], [['rojuro', 'rose'], 'Visored'],
  [['kensei'], 'Visored'], [['mashiro'], 'Visored'], [['lisa yadomaru', 'lisa'], 'Visored'], [['hachigen', 'hachi'], 'Visored'],
  // Humains à pouvoir
  [['orihime', 'inoue'], 'Humain'], [['yasutora sado', 'chad', 'sado'], 'Humain'], [['tatsuki'], 'Humain'],
  [['keigo'], 'Humain'], [['karin'], 'Humain'], [['yuzu'], 'Humain'], [['don kanonji'], 'Humain'],
  // Shinigami emblématiques (si non déjà tagués par l'API)
  [['sosuke aizen', 'aizen'], 'Shinigami'], [['gin ichimaru'], 'Shinigami'], [['kaname tosen', 'tosen'], 'Shinigami'],
  [['yamamoto', 'genryusai'], 'Shinigami'], [['kenpachi', 'zaraki'], 'Shinigami'], [['byakuya'], 'Shinigami'],
  [['toshiro', 'hitsugaya'], 'Shinigami'], [['renji', 'abarai'], 'Shinigami'], [['yoruichi'], 'Shinigami'], [['kisuke urahara', 'urahara'], 'Shinigami'],
];

/** Mute `entries` : ajoute lieux/artefacts (si slug libre) et tague nen/saga/race. Retourne les stats. */
export function applyEnrichment(entries) {
  const seen = new Set(entries.map((e) => e.slug));
  let added = 0;
  // Slug homonyme déjà pris (sagas/équipages/personnages) → suffixe pour ajouter quand même le lieu/artefact.
  const freeSlug = (s, suffix) => (seen.has(s) ? `${s}-${suffix}` : s);
  for (const [slug0, name, region, summary, rarity] of OP_PLACES) {
    const slug = freeSlug(slug0, 'lieu');
    if (!seen.has(slug)) { entries.push(mk(slug, 'place', name, 'One Piece', summary, rarity, { region, category: 'Lieu' })); seen.add(slug); added++; }
  }
  for (const [slug0, name, material, summary, rarity] of DB_ARTIFACTS) {
    const slug = freeSlug(slug0, 'relique');
    if (!seen.has(slug)) { entries.push(mk(slug, 'artifact', name, 'Dragon Ball', summary, rarity, { material, category: 'Relique' })); seen.add(slug); added++; }
  }
  let nen = 0, saga = 0, race = 0;
  for (const e of entries) {
    if (e.type !== 'character' || !e.attributes) continue;
    if (e.universe === 'Hunter x Hunter' && !e.attributes.nen) {
      const h = HXH_NEN.find(([p]) => nameIs(e, p)); if (h) { e.attributes.nen = h[1]; nen++; }
    } else if (e.universe === 'Dragon Ball') {
      if (!e.attributes.saga) { const h = DB_SAGA.find(([ps]) => ps.some((p) => nameIs(e, p))); if (h) { e.attributes.saga = h[1]; saga++; } }
      if (!e.attributes.race) { const h = DB_RACE.find(([ps]) => ps.some((p) => nameIs(e, p))); if (h) { e.attributes.race = h[1]; race++; } }
    } else if (e.universe === 'Bleach' && !e.attributes.race) {
      const h = BLEACH_RACE.find(([ps]) => ps.some((p) => nameIs(e, p))); if (h) { e.attributes.race = h[1]; race++; }
    }
  }
  return { added, nen, saga, race };
}
