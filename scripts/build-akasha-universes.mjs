// scripts/build-akasha-universes.mjs — 7 univers AKASHA (Bleach, Dragon Ball, Hunter x Hunter,
// JoJo's Bizarre Adventure, Initial D, Death Note, One Piece), même process que Naruto :
// config CURÉE en FR (persos, entités, relations) + images via APIs gratuites → data/akasha-universes.json.
//
// APIs (gratuites, sans clé) :
//  • Jikan v4 (MyAnimeList)      https://api.jikan.moe/v4/anime/{id}/characters  → cast + portraits CDN
//  • Dragon Ball API             https://dragonball-api.com/api/characters       → images détourées + ki/race
//  • One Piece API (FR)          https://api.api-onepiece.com/v2/characters/fr   → primes + équipages en français
//
// Ensuite : PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/seed-akasha-universes.ts
// (upsert par slug — additif, ne touche pas aux entrées Naruto).
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { applyEnrichment } from '../data/akasha-enrich.mjs';
import { fetchAniListChars, anilistIndex } from './lib/anilist.mjs';
import { dedupeChars } from './lib/dedup.mjs';
import { dedupeByName } from './akasha-dedup.mjs';
import { DEDUP_ALIASES } from './lib/dedup-aliases.mjs';

const JIKAN = 'https://api.jikan.moe/v4';

// Contenu premium CURÉ hors-ligne (pages évolutives + Stands + rosters), authoré + vérifié
// par workflow puis figé dans data/akasha-content-extra.json. Chargé si présent (additif).
const EXTRA = existsSync('data/akasha-content-extra.json')
  ? JSON.parse(readFileSync('data/akasha-content-extra.json', 'utf8'))
  : { pages: [], stands: [], rosters: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'NIKA-AKASHA/1.0 (registre encyclopédique)' } });
      if (res.status === 429) { await sleep(1500 * (i + 1)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) { console.warn(`  ⚠ ${url} → ${e.message}`); return null; }
      await sleep(900 * (i + 1));
    }
  }
  return null;
}

// ─── Config curée par univers ───────────────────────────────────────────────
// chars[].mal = nom EXACT côté MyAnimeList (« Nom, Prénom ») pour matcher le portrait.
// entities = [type, slug, name, attrKey→valeur, summary, rarity] (même familles que Naruto).
const UNIVERSES = [
  {
    label: 'Bleach', malId: 269,
    chars: [
      { slug: 'ichigo-kurosaki', name: 'Ichigo Kurosaki', mal: 'Kurosaki, Ichigo', rarity: 'legendary', role: 'Shinigami remplaçant', aff: ['Karakura', 'Soul Society'], summary: "Lycéen capable de voir les esprits, devenu Shinigami remplaçant pour protéger les siens — son zanpakutō est Zangetsu.",
        status: 'Vivant', nindo: "Je ne veux pas le pouvoir de tout vaincre — juste celui de protéger les miens.",
        bio: "Ichigo voit les fantômes depuis l'enfance. La nuit où la Shinigami Rukia Kuchiki lui transfère ses pouvoirs pour sauver sa famille d'un Hollow, sa vie bascule : lycéen le jour, faucheur d'âmes la nuit. D'invasion de la Soul Society en guerre contre Aizen, il découvre que son sang mêle Shinigami, Quincy et Hollow — et sacrifie plusieurs fois ses pouvoirs pour protéger les deux mondes.",
        quotes: ["Je ne me bats pas pour gagner. Je me bats parce que je dois protéger.", 'Rukia… je suis venu te sauver.', 'Getsuga… Tenshō !'],
        trivia: ["Son prénom s'écrit avec « ichi » (un) et « go » (protéger) : « celui qui protège ».", 'Ses cheveux orange sont naturels — des années de bagarres au lycée à cause d\'eux.', "Zangetsu n'a pas de forme scellée : son zanpakutō est en libération permanente."] },
      { slug: 'rukia-kuchiki', name: 'Rukia Kuchiki', mal: 'Kuchiki, Rukia', rarity: 'epic', role: 'Shinigami', aff: ['Soul Society · 13ᵉ division'], summary: "La Shinigami qui a transmis ses pouvoirs à Ichigo ; maîtresse du zanpakutō de glace Sode no Shirayuki." },
      { slug: 'renji-abarai', name: 'Renji Abarai', mal: 'Abarai, Renji', rarity: 'rare', role: 'Lieutenant', aff: ['Soul Society · 6ᵉ division'], summary: "Lieutenant fougueux de la 6ᵉ division, ami d'enfance de Rukia ; son zanpakutō serpent est Zabimaru." },
      { slug: 'orihime-inoue', name: 'Orihime Inoue', mal: 'Inoue, Orihime', rarity: 'rare', role: 'Humaine aux pouvoirs spirituels', aff: ['Karakura'], summary: "Camarade d'Ichigo dont les Shun Shun Rikka peuvent rejeter les événements — soigner, protéger, trancher." },
      { slug: 'uryu-ishida', name: 'Uryū Ishida', mal: 'Ishida, Uryuu', rarity: 'rare', role: 'Quincy', aff: ['Karakura'], summary: "Dernier archer Quincy, rival puis allié d'Ichigo, fier héritier d'un peuple exterminé par les Shinigami." },
      { slug: 'kisuke-urahara', name: 'Kisuke Urahara', mal: 'Urahara, Kisuke', rarity: 'epic', role: 'Ex-capitaine · marchand', aff: ['Boutique Urahara'], summary: "Génie exilé de la Soul Society, inventeur au bob rayé qui manigance depuis sa boutique de bonbons." },
      { slug: 'byakuya-kuchiki', name: 'Byakuya Kuchiki', mal: 'Kuchiki, Byakuya', rarity: 'epic', role: 'Capitaine', aff: ['Soul Society · 6ᵉ division'], summary: "Capitaine de la 6ᵉ division et chef du clan Kuchiki ; son bankai disperse mille lames en pétales de cerisier." },
      { slug: 'sosuke-aizen', name: 'Sōsuke Aizen', mal: 'Aizen, Sousuke', rarity: 'legendary', role: 'Traître · seigneur de Las Noches', aff: ['Hueco Mundo'], summary: "Capitaine modèle devenu le grand traître de la Soul Society : son zanpakutō d'hypnose parfaite piège tous les sens." },
      { slug: 'toshiro-hitsugaya', name: 'Tōshirō Hitsugaya', mal: 'Hitsugaya', rarity: 'epic', role: 'Capitaine prodige', aff: ['Soul Society · 10ᵉ division'], summary: "Le plus jeune capitaine de l'histoire du Gotei 13 ; son zanpakutō Hyōrinmaru commande la glace du ciel." },
      { slug: 'kenpachi-zaraki', name: 'Kenpachi Zaraki', mal: 'Zaraki', rarity: 'epic', role: 'Capitaine berserker', aff: ['Soul Society · 11ᵉ division'], summary: "Le capitaine qui ne vit que pour le duel : il bride sa propre force par un cache-œil pour que le plaisir dure." },
      { slug: 'yoruichi-shihoin', name: 'Yoruichi Shihōin', mal: 'Yoruichi', rarity: 'epic', role: 'Déesse de la vitesse', aff: ['Boutique Urahara'], summary: "Ex-capitaine des forces spéciales, maîtresse du shunpo — et chatte noire à ses heures." },
      { slug: 'grimmjow', name: 'Grimmjow Jaegerjaquez', mal: 'Grimmjow', rarity: 'epic', role: 'Sexta Espada', aff: ['Hueco Mundo'], summary: "La panthère du Hueco Mundo, sixième Espada : la soif de combat incarnée, obsédé par sa revanche sur Ichigo." },
      { slug: 'ulquiorra', name: 'Ulquiorra Cifer', mal: 'Ulquiorra', rarity: 'epic', role: 'Cuarta Espada', aff: ['Hueco Mundo'], summary: "Le quatrième Espada, nihiliste aux larmes vertes — celui qui découvrira ce qu'est un cœur en affrontant Ichigo." },
      { slug: 'genryusai-yamamoto', name: 'Genryūsai Yamamoto', mal: 'Genryuusai', rarity: 'epic', role: 'Capitaine-commandant', aff: ['Soul Society · 1ʳᵉ division'], summary: "Le fondateur millénaire du Gotei 13 ; son Ryūjin Jakka est le zanpakutō de feu le plus destructeur de la Soul Society." },
      { slug: 'yasutora-sado', name: 'Yasutora « Chad » Sado', mal: 'Sado, Yasutora', rarity: 'rare', role: 'Bras du Géant', summary: "Le colosse taiseux au sang mexicain, lié à Ichigo par une promesse : ses bras blindés ne frappent que pour protéger." },
      { slug: 'isshin-kurosaki', name: 'Isshin Kurosaki', mal: 'Kurosaki, Isshin', rarity: 'rare', role: 'Père · ex-capitaine', summary: "Le père fantasque d'Ichigo, médecin de quartier — et ancien capitaine du Gotei 13 qui a renoncé à ses pouvoirs par amour." },
      { slug: 'gin-ichimaru', name: 'Gin Ichimaru', mal: 'Ichimaru, Gin', rarity: 'epic', role: 'Capitaine au sourire de renard', summary: "Le capitaine au sourire figé et au zanpakutō-lance Shinsō : traître d'Aizen… ou vengeur infiltré depuis l'enfance." },
      { slug: 'shunsui-kyoraku', name: 'Shunsui Kyōraku', mal: 'Kyouraku', rarity: 'epic', role: 'Capitaine nonchalant', summary: "Le capitaine au kimono fleuri qui transforme le duel en jeu d'enfant mortel — les règles de son Katen Kyōkotsu s'imposent aux deux camps." },
      { slug: 'jushiro-ukitake', name: 'Jūshirō Ukitake', mal: 'Ukitake', rarity: 'rare', role: 'Capitaine au grand cœur', summary: "Le capitaine tuberculeux le plus aimé du Seireitei, mentor de Rukia — un double zanpakutō et un secret divin." },
      { slug: 'mayuri-kurotsuchi', name: 'Mayuri Kurotsuchi', mal: 'Kurotsuchi, Mayuri', rarity: 'rare', role: 'Savant fou du Gotei', summary: "Le capitaine-scientifique de la 12ᵉ division, pour qui tout être vivant n'est qu'un spécimen en attente de dissection." },
      { slug: 'nelliel', name: 'Nelliel Tu Odelschwanck', mal: 'Nelliel', rarity: 'rare', role: 'Ex-Tercera Espada', summary: "L'ancienne Tercera Espada réduite en enfant amnésique — Nel la gamine morveuse cache une guerrière au cœur immense." },
    ],
    entities: [
      ['place', 'soul-society', 'Soul Society', ['region', 'Monde spirituel'], "La société des âmes : le Seireitei des Shinigami entouré des districts du Rukongai.", 'epic'],
      ['artifact', 'zanpakuto', 'Zanpakutō', ['material', 'Lame-âme'], "Le sabre-âme des Shinigami : chaque lame est un esprit vivant qui porte un nom, un shikai et un bankai.", 'epic'],
      ['profession', 'shinigami', 'Shinigami', ['sector', 'Fauchage des âmes'], "Gardiens de l'équilibre des âmes : ils guident les défunts et purifient les Hollows.", 'rare'],
      ['status', 'hollow', 'Hollow', ['scope', 'Espèce spirituelle'], "Âmes corrompues au masque blanc, dévoreuses d'esprits — les proies naturelles des Shinigami.", 'rare'],
      ['power', 'bankai', 'Bankai', ['element', 'Libération ultime'], "La seconde libération du zanpakutō : des années d'entraînement pour décupler sa puissance.", 'epic'],
      ['place', 'hueco-mundo', 'Hueco Mundo', ['region', 'Monde des Hollows'], "Le désert blanc éternel des Hollows sous une lune inversée — le royaume d'Aizen et de Las Noches.", 'epic'],
      ['status', 'espada', 'Espada', ['scope', 'Élite arrancar'], "Les dix arrancars d'élite d'Aizen, numérotés selon leur puissance — chacun incarne un aspect de la mort.", 'epic'],
      ['artifact', 'hogyoku', 'Hōgyoku', ['material', 'Orbe de distorsion'], "L'orbe qui abolit la frontière entre Shinigami et Hollow et matérialise les désirs de son porteur.", 'legendary'],
      ['place', 'las-noches', 'Las Noches', ['region', 'Hueco Mundo'], "La forteresse-palais d'Aizen au cœur du désert blanc, si vaste qu'elle contient son propre ciel.", 'rare'],
      ['status', 'gotei-13', 'Gotei 13', ['scope', 'Armée de cour'], "Les treize divisions de protection de la Soul Society — chaque capitaine vaut une armée.", 'epic'],
      ['status', 'quincy', 'Quincy', ['scope', 'Peuple archer'], "Les archers humains qui détruisent les Hollows au lieu de les purifier — exterminés par les Shinigami, sauf une lignée.", 'epic'],
      ['skill', 'shunpo', 'Shunpo', ['discipline', 'Pas éclair'], "L'art du déplacement instantané des Shinigami — Yoruichi en est la « déesse ».", 'rare'],
      ['power', 'kido', 'Kidō', ['element', 'Sorcellerie'], "Les incantations démoniaques du Gotei : voies de la destruction et voies du lien, du n°1 au n°99.", 'rare'],
    ],
    relations: [
      ['ichigo-kurosaki', 'exerce', 'shinigami'], ['rukia-kuchiki', 'exerce', 'shinigami'], ['renji-abarai', 'exerce', 'shinigami'], ['byakuya-kuchiki', 'exerce', 'shinigami'],
      ['rukia-kuchiki', 'habite', 'soul-society'], ['renji-abarai', 'habite', 'soul-society'], ['byakuya-kuchiki', 'habite', 'soul-society'],
      ['ichigo-kurosaki', 'maitrise', 'bankai'], ['renji-abarai', 'maitrise', 'bankai'], ['byakuya-kuchiki', 'maitrise', 'bankai'],
      ['ichigo-kurosaki', 'possede', 'zanpakuto'], ['sosuke-aizen', 'rival', 'ichigo-kurosaki'], ['uryu-ishida', 'rival', 'ichigo-kurosaki'],
      ['ichigo-kurosaki', 'allie', 'rukia-kuchiki'], ['ichigo-kurosaki', 'allie', 'orihime-inoue'],
      ['toshiro-hitsugaya', 'exerce', 'shinigami'], ['kenpachi-zaraki', 'exerce', 'shinigami'], ['genryusai-yamamoto', 'exerce', 'shinigami'],
      ['toshiro-hitsugaya', 'habite', 'soul-society'], ['kenpachi-zaraki', 'habite', 'soul-society'], ['genryusai-yamamoto', 'habite', 'soul-society'],
      ['toshiro-hitsugaya', 'maitrise', 'bankai'], ['genryusai-yamamoto', 'maitrise', 'bankai'],
      ['grimmjow', 'appartient', 'espada'], ['ulquiorra', 'appartient', 'espada'],
      ['grimmjow', 'habite', 'hueco-mundo'], ['ulquiorra', 'habite', 'hueco-mundo'],
      ['grimmjow', 'rival', 'ichigo-kurosaki'], ['sosuke-aizen', 'possede', 'hogyoku'],
      ['yoruichi-shihoin', 'allie', 'kisuke-urahara'],
      ['yasutora-sado', 'allie', 'ichigo-kurosaki'], ['isshin-kurosaki', 'exerce', 'shinigami'],
      ['gin-ichimaru', 'exerce', 'shinigami'], ['gin-ichimaru', 'allie', 'sosuke-aizen'],
      ['shunsui-kyoraku', 'exerce', 'shinigami'], ['shunsui-kyoraku', 'appartient', 'gotei-13'], ['jushiro-ukitake', 'appartient', 'gotei-13'], ['mayuri-kurotsuchi', 'appartient', 'gotei-13'],
      ['toshiro-hitsugaya', 'appartient', 'gotei-13'], ['kenpachi-zaraki', 'appartient', 'gotei-13'], ['byakuya-kuchiki', 'appartient', 'gotei-13'], ['genryusai-yamamoto', 'appartient', 'gotei-13'],
      ['nelliel', 'habite', 'hueco-mundo'], ['nelliel', 'allie', 'ichigo-kurosaki'], ['sosuke-aizen', 'habite', 'las-noches'],
      ['uryu-ishida', 'appartient', 'quincy'], ['yoruichi-shihoin', 'maitrise', 'shunpo'], ['byakuya-kuchiki', 'maitrise', 'kido'],
    ],
  },
  {
    // Z (813) + Dragon Ball (223), GT (225) et Super (30694) pour couvrir Roshi, Beerus, etc.
    label: 'Dragon Ball', malId: 813, extraMalIds: [223, 225, 30694], dbApi: true,
    chars: [
      { slug: 'son-goku', name: 'Son Goku', mal: 'Son, Gokuu', db: 'Goku', rarity: 'legendary', role: 'Saiyan élevé sur Terre', summary: "Saiyan envoyé sur Terre bébé, devenu son plus grand défenseur — toujours en quête d'un adversaire plus fort.",
        status: 'Vivant', nindo: 'Plus l\'adversaire est fort, plus ça devient intéressant !',
        bio: "Envoyé sur Terre pour la conquérir, le petit Kakarot perd la mémoire en tombant dans un ravin et devient Son Goku, élevé par le vieux Gohan. De la quête des Dragon Balls aux tournois d'arts martiaux, puis de l'invasion saiyan au sacrifice contre Cell, il repousse chaque limite — premier Super Saiyan depuis des siècles, il finit par tutoyer les dieux.",
        quotes: ['Kaméhaméha !', 'Je ne suis pas venu me battre… je suis venu gagner.', 'Salut ! Moi c\'est Goku, et j\'ai super faim !'],
        trivia: ['Son nom saiyan est Kakarot — seul Vegeta continue de l\'appeler ainsi.', 'Il n\'a jamais eu son permis de conduire, malgré un épisode entier d\'auto-école.', 'Sa seule peur connue : les piqûres.'] },
      { slug: 'vegeta', name: 'Vegeta', mal: 'Vegeta', db: 'Vegeta', rarity: 'legendary', role: 'Prince des Saiyans', summary: "Le prince déchu des Saiyans : d'ennemi juré à rival éternel de Goku, porté par un orgueil sans limite." },
      { slug: 'son-gohan', name: 'Son Gohan', mal: 'Son, Gohan', db: 'Gohan', rarity: 'epic', role: 'Demi-Saiyan érudit', summary: "Fils aîné de Goku, au potentiel colossal qui n'explose que lorsque les siens sont menacés." },
      { slug: 'piccolo', name: 'Piccolo', mal: 'Piccolo', db: 'Piccolo', rarity: 'epic', role: 'Namek · mentor', summary: "Démon namek devenu le mentor le plus dévoué de Gohan — le rival transformé en second père." },
      { slug: 'freezer', name: 'Freezer', mal: 'Frieza', db: 'Freezer', rarity: 'legendary', role: 'Empereur galactique', summary: "Le tyran de l'univers, destructeur de la planète Vegeta — l'ennemi qui a fait naître le premier Super Saiyan." },
      { slug: 'cell', name: 'Cell', mal: 'Cell', db: 'Celula', rarity: 'epic', role: 'Bio-androïde parfait', summary: "Bio-androïde du Dr Gero assemblé à partir des cellules des plus grands guerriers, obsédé par sa « perfection »." },
      { slug: 'majin-buu', name: 'Majin Buu', mal: 'Majin Buu', db: 'Majin Buu', rarity: 'epic', role: 'Démon ancestral', summary: "Création magique ancestrale à la puissance absurde, tour à tour destructeur cosmique et gourmand naïf." },
      { slug: 'trunks', name: 'Trunks', mal: 'Trunks', db: 'Trunks', rarity: 'rare', role: 'Demi-Saiyan du futur', summary: "Fils de Vegeta venu d'un futur ravagé par les cyborgs pour prévenir les héros — l'épéiste du temps." },
      { slug: 'krillin', name: 'Krillin', mal: 'Kuririn', db: 'Krillin', rarity: 'rare', role: 'Meilleur ami humain', summary: "Le meilleur ami de Goku et le Terrien le plus vaillant — son courage dépasse de loin son niveau de combat." },
      { slug: 'bulma', name: 'Bulma', mal: 'Bulma', db: 'Bulma', rarity: 'rare', role: 'Génie de Capsule Corp', summary: "L'inventrice qui a lancé la quête des Dragon Balls avec son radar — le cerveau (et le portefeuille) des guerriers Z." },
      { slug: 'kame-sennin', name: 'Kamé Sennin', mal: 'Roushi', db: 'Master Roshi', rarity: 'rare', role: 'Maître Tortue', summary: "L'ermite écarlate, inventeur du Kamehameha et premier maître de Goku — 300 ans de sagesse et de magazines douteux." },
      { slug: 'beerus', name: 'Beerus', mal: 'Beerus', db: 'Beerus', rarity: 'legendary', role: 'Dieu de la Destruction', summary: "Le Dieu de la Destruction de l'Univers 7, félin capricieux dont l'humeur dépend du menu — un claquement de doigts efface une planète." },
      { slug: 'gotenks', name: 'Gotenks', mal: 'Gotenks', db: 'Gotenks', rarity: 'rare', role: 'Fusion turbulente', summary: "La fusion de Goten et Trunks : une puissance colossale gâchée par un ego de cour de récré — inventeur du Kamikaze Ghost." },
      { slug: 'mr-satan', name: 'Mr. Satan', mal: 'Satan', db: 'Mr. Satan', rarity: 'common', role: '« Champion du monde »', summary: "Le champion mondial des arts martiaux… qui s'attribue les victoires des guerriers Z. Trouillard, mais le monde le croit." },
      { slug: 'son-goten', name: 'Son Goten', mal: 'Son, Goten', db: 'Goten', rarity: 'rare', role: 'Cadet insouciant', summary: "Le cadet de Goku, portrait craché de son père — Super Saiyan avant même de savoir voler." },
      { slug: 'videl', name: 'Videl', mal: 'Videl', db: 'Videl', rarity: 'common', role: 'Justicière lycéenne', summary: "La fille de Mr. Satan, vraie combattante de la famille — elle perce l'identité du Great Saiyaman en deux regards." },
      { slug: 'whis', name: 'Whis', mal: 'Whis', db: 'Whis', rarity: 'legendary', role: 'Ange précepteur', summary: "L'ange précepteur de Beerus, plus rapide que son dieu — il rembobine le temps d'une pichenette et vit pour la bonne cuisine." },
      { slug: 'yamcha', name: 'Yamcha', mal: 'Yamcha', db: 'Yamcha', rarity: 'common', role: 'Loup du désert', summary: "Le bandit du désert devenu guerrier Z — éternel espoir déchu dont la « pose du cratère » est entrée dans la légende." },
      { slug: 'ten-shin-han', name: 'Ten Shin Han', mal: 'Tenshinhan', db: 'Ten Shin Han', rarity: 'rare', role: 'Ascète au troisième œil', summary: "Le moine guerrier au troisième œil, rival devenu allié — son Kikōhō arrête même Cell au prix de sa vie." },
      { slug: 'raditz', name: 'Raditz', mal: 'Raditz', db: 'Raditz', rarity: 'common', role: 'Frère renié', summary: "Le frère aîné de Goku, premier Saiyan à fouler la Terre — sa venue force l'alliance impensable Goku-Piccolo." },
      { slug: 'broly', name: 'Broly', mal: 'Broly', db: 'Broly', rarity: 'legendary', role: 'Saiyan légendaire', summary: "Le Saiyan au potentiel anormal, exilé à la naissance — sa rage libérée dépasse les dieux eux-mêmes." },
    ],
    entities: [
      ['power', 'kamehameha', 'Kamehameha', ['element', 'Ki'], "La vague déferlante de ki enseignée par Kamé Sennin — la technique signature de l'école Tortue.", 'epic'],
      ['skill', 'super-saiyan', 'Super Saiyan', ['discipline', 'Transformation'], "La transformation légendaire des Saiyans : cheveux d'or et puissance démultipliée, éveillée par la rage.", 'legendary'],
      ['status', 'saiyan', 'Saiyan', ['scope', 'Peuple guerrier'], "Peuple de guerriers de l'espace à la force prodigieuse, quasi exterminé par Freezer.", 'epic'],
      ['place', 'namek', 'Namek', ['region', 'Planète'], "La planète verte des Nameks, théâtre du combat contre Freezer et berceau des Dragon Balls originelles.", 'rare'],
      ['artifact', 'dragon-balls', 'Dragon Balls', ['material', 'Boules de cristal'], "Les sept boules de cristal qui, réunies, invoquent le dragon sacré exauçant les vœux.", 'legendary'],
      ['power', 'genkidama', 'Genkidama', ['element', 'Énergie collective'], "L'orbe d'énergie empruntée à tous les êtres vivants — l'arme de la dernière chance de Goku.", 'epic'],
      ['place', 'salle-esprit-temps', "Salle de l'Esprit et du Temps", ['region', 'Palais de Dendé'], "Un an d'entraînement à l'intérieur, un jour à l'extérieur : l'accélérateur des guerriers Z.", 'rare'],
      ['power', 'kaio-ken', 'Kaiō-ken', ['element', 'Multiplicateur'], "La technique du Roi Kaiō : multiplier sa puissance au prix du corps — l'atout rouge de Goku avant le Super Saiyan.", 'rare'],
      ['skill', 'ultra-instinct', 'Ultra Instinct', ['discipline', 'Technique divine'], "L'état où le corps esquive et frappe sans la pensée — la maîtrise des anges, effleurée par Goku.", 'legendary'],
      ['status', 'capsule-corp', 'Capsule Corporation', ['scope', 'Empire technologique'], "L'empire technologique de la famille Brief : tout un vaisseau dans une capsule de poche.", 'rare'],
      ['place', 'planete-vegeta', 'Planète Vegeta', ['region', 'Espace'], "Le monde natal des Saiyans, pulvérisé par Freezer d'une seule sphère — le berceau perdu de Goku.", 'rare'],
      ['artifact', 'senzu', 'Haricots Senzu', ['material', 'Graines de Karin'], "Les haricots magiques de Maître Karin : un seul restaure toute la vitalité — et dix jours de repas.", 'rare'],
    ],
    relations: [
      ['son-goku', 'appartient', 'saiyan'], ['vegeta', 'appartient', 'saiyan'], ['son-gohan', 'appartient', 'saiyan'], ['trunks', 'appartient', 'saiyan'],
      ['son-goku', 'maitrise', 'kamehameha'], ['son-gohan', 'maitrise', 'kamehameha'], ['krillin', 'maitrise', 'kamehameha'], ['cell', 'maitrise', 'kamehameha'],
      ['son-goku', 'maitrise', 'super-saiyan'], ['vegeta', 'maitrise', 'super-saiyan'], ['son-gohan', 'maitrise', 'super-saiyan'], ['trunks', 'maitrise', 'super-saiyan'],
      ['freezer', 'rival', 'son-goku'], ['vegeta', 'rival', 'son-goku'], ['cell', 'rival', 'son-gohan'],
      ['piccolo', 'allie', 'son-gohan'], ['krillin', 'allie', 'son-goku'],
      ['bulma', 'allie', 'son-goku'], ['kame-sennin', 'maitrise', 'kamehameha'], ['son-goku', 'maitrise', 'genkidama'],
      ['beerus', 'rival', 'son-goku'], ['gotenks', 'maitrise', 'super-saiyan'], ['mr-satan', 'allie', 'majin-buu'],
      ['son-goten', 'appartient', 'saiyan'], ['son-goten', 'maitrise', 'super-saiyan'], ['raditz', 'appartient', 'saiyan'], ['broly', 'appartient', 'saiyan'],
      ['broly', 'maitrise', 'super-saiyan'], ['broly', 'rival', 'son-goku'], ['raditz', 'rival', 'son-goku'],
      ['videl', 'allie', 'son-gohan'], ['whis', 'allie', 'beerus'], ['whis', 'maitrise', 'ultra-instinct'], ['son-goku', 'maitrise', 'kaio-ken'], ['son-goku', 'maitrise', 'ultra-instinct'],
      ['yamcha', 'allie', 'son-goku'], ['ten-shin-han', 'allie', 'son-goku'], ['bulma', 'appartient', 'capsule-corp'], ['trunks', 'appartient', 'capsule-corp'],
      ['vegeta', 'habite', 'planete-vegeta'], ['raditz', 'habite', 'planete-vegeta'],
    ],
  },
  {
    label: 'Hunter x Hunter', malId: 11061,
    chars: [
      { slug: 'gon-freecss', name: 'Gon Freecss', mal: 'Freecss, Gon', rarity: 'legendary', role: 'Hunter débutant', summary: "Garçon solaire parti passer l'examen de Hunter pour retrouver son père — une volonté qui plie le monde.",
        status: 'Vivant', nindo: "Une fois qu'on est décidé, on fonce jusqu'au bout.",
        bio: "Élevé par sa tante Mito sur l'Île de la Baleine, Gon découvre que le père qu'il croyait mort est un Hunter légendaire. Pour le retrouver, il passe l'examen de Hunter à douze ans, s'y lie à Killua, Kurapika et Leorio, apprend le Nen — et découvre, jusqu'à la limite de l'autodestruction face à Neferpitou, le prix de sa propre détermination.",
        quotes: ['Ging, je vais te trouver !', 'Killua, on est amis, non ?', 'Jajanken… pierre !'],
        trivia: ["Sa canne à pêche lui vient de Ging : il attrape n'importe quoi avec, jusqu'aux portefeuilles.", "Son odorat rivalise avec celui d'un chien de chasse.", 'Le double « s » de Freecss reste un mystère jamais expliqué par Togashi.'] },
      { slug: 'killua-zoldyck', name: 'Killua Zoldyck', mal: 'Zoldyck, Killua', rarity: 'legendary', role: 'Assassin héritier', summary: "Héritier de la famille d'assassins Zoldyck, qui fuit son destin et trouve en Gon son premier ami." },
      { slug: 'kurapika', name: 'Kurapika', mal: 'Kurapika', rarity: 'epic', role: 'Survivant Kurta', summary: "Dernier survivant du clan Kurta, aux yeux écarlates ; il traque la Brigade Fantôme, chaînes au poing." },
      { slug: 'leorio', name: 'Leorio Paradinight', mal: 'Paladiknight, Leorio', rarity: 'rare', role: 'Aspirant médecin', summary: "Grande gueule au grand cœur, devenu Hunter pour financer des études de médecine et soigner gratuitement." },
      { slug: 'hisoka', name: 'Hisoka Morow', mal: 'Morow, Hisoka', rarity: 'epic', role: 'Magicien combattant', summary: "Le magicien imprévisible qui ne vit que pour affronter des proies « mûres » — allié ou bourreau selon l'humeur." },
      { slug: 'chrollo-lucilfer', name: 'Chrollo Lucilfer', mal: 'Lucilfer, Chrollo', rarity: 'epic', role: 'Chef de la Brigade Fantôme', summary: "Le chef calme et lettré de la Brigade Fantôme, dont le Nen dérobe les capacités d'autrui dans un livre." },
      { slug: 'isaac-netero', name: 'Isaac Netero', mal: 'Netero, Isaac', rarity: 'epic', role: 'Président de l\'Association', summary: "Président de l'Association des Hunters, moine-guerrier au sommet du Nen malgré son grand âge." },
      { slug: 'meruem', name: 'Meruem', mal: 'Meruem', rarity: 'legendary', role: 'Roi des Fourmis-Chimères', summary: "Le Roi des Fourmis-Chimères, né arme absolue — qu'une humble joueuse de gungi rendra presque humain." },
      { slug: 'ging-freecss', name: 'Ging Freecss', mal: 'Freecss, Ging', rarity: 'epic', role: 'Hunter légendaire · père', summary: "Le père de Gon, archéologue de génie classé parmi les cinq meilleurs Nen du monde — introuvable par choix." },
      { slug: 'neferpitou', name: 'Neferpitou', mal: 'Neferpitou', rarity: 'epic', role: 'Garde royale chimère', summary: "Le chat de la Garde royale, d'une loyauté absolue au Roi — son En couvre des kilomètres et son Nen ranime les morts." },
      { slug: 'biscuit-krueger', name: 'Biscuit Krueger', mal: 'Krueger', rarity: 'rare', role: 'Maître Nen', summary: "La « petite fille » de 57 ans qui a formé Gon et Killua sur Greed Island — sa vraie forme soulève des montagnes." },
      { slug: 'illumi-zoldyck', name: 'Illumi Zoldyck', mal: 'Zoldyck, Illumi', rarity: 'epic', role: 'Assassin aux aiguilles', summary: "Le frère aîné de Killua, assassin au visage de porcelaine qui manipule les corps — et son propre frère — à l'aiguille." },
      { slug: 'kite', name: 'Kite', mal: 'Kite', rarity: 'rare', role: 'Disciple de Ging', summary: "Le disciple de Ging qui a mis Gon sur la voie des Hunters — son Nen tire une arme au hasard, Crazy Slots." },
      { slug: 'komugi', name: 'Komugi', mal: 'Komugi', rarity: 'rare', role: 'Prodige du gungi', summary: "La joueuse de gungi aveugle, invaincue à vie — la seule à avoir jamais mis le Roi Meruem en échec… au jeu comme au cœur." },
      { slug: 'wing', name: 'Wing', mal: 'Wing', rarity: 'common', role: 'Maître de Nen', summary: "Le maître discret de la Tour Céleste qui enseigne les vrais principes du Nen à Gon et Killua." },
      { slug: 'silva-zoldyck', name: 'Silva Zoldyck', mal: 'Zoldyck, Silva', rarity: 'epic', role: 'Patriarche assassin', summary: "Le père de Killua, sommet de l'art d'assassiner — l'un des rares à avoir affronté le chef de la Brigade et survécu." },
      { slug: 'alluka-zoldyck', name: 'Alluka Zoldyck', mal: 'Zoldyck, Alluka', rarity: 'epic', role: 'Enfant aux vœux', summary: "L'enfant Zoldyck habitée par « Quelque Chose » qui exauce tout vœu — contre des demandes de plus en plus terribles." },
      { slug: 'feitan', name: 'Feitan', mal: 'Feitan', rarity: 'rare', role: 'Tortionnaire de la Brigade', summary: "Le bourreau de la Brigade Fantôme : petit, létal, et son Pain Packer transforme sa douleur en soleil miniature." },
    ],
    entities: [
      ['skill', 'nen', 'Nen', ['discipline', 'Aura'], "L'art de maîtriser son aura vitale : Ten, Zetsu, Ren, Hatsu — le socle de tout combat de Hunter.", 'legendary'],
      ['profession', 'chasseur', 'Hunter', ['sector', 'Exploration & traque'], "Licence d'élite qui ouvre tous les droits : traquer trésors, créatures, criminels ou saveurs inconnues.", 'epic'],
      ['status', 'brigade-fantome', 'Brigade Fantôme', ['scope', 'Troupe criminelle'], "Le Genei Ryodan : treize voleurs de classe A à l'araignée tatouée, originaires de Ryūsegai.", 'epic'],
      ['status', 'zoldyck', 'Famille Zoldyck', ['scope', 'Clan'], "La plus célèbre famille d'assassins du monde, retranchée sur le mont Kukurū.", 'epic'],
      ['place', 'greed-island', 'Greed Island', ['region', 'Île-jeu'], "Le jeu vidéo grandeur nature créé par des Hunters : une île réelle régie par des cartes aux pouvoirs fous.", 'rare'],
      ['place', 'ile-de-la-baleine', 'Île de la Baleine', ['region', 'Mer du sud'], "L'île natale de Gon, d'où il regardait partir les bateaux en rêvant de son père.", 'common'],
      ['status', 'fourmis-chimeres', 'Fourmis-Chimères', ['scope', 'Espèce'], "Les insectes qui héritent des gènes de leurs proies — jusqu'à donner naissance au Roi Meruem.", 'epic'],
      ['status', 'examen-hunter', 'Examen de Hunter', ['scope', 'Épreuve'], "L'épreuve annuelle aux phases mortelles qui ne délivre qu'une poignée de licences par an.", 'rare'],
      ['place', 'tour-celeste', 'Tour Céleste', ['region', 'Arène de 251 étages'], "L'arène-gratte-ciel où l'on grimpe étage par étage à la force des poings — l'école du Nen de Gon et Killua.", 'rare'],
      ['skill', 'gungi', 'Gungi', ['discipline', 'Jeu de stratégie'], "Le jeu d'échecs de Chine orientale dont Komugi est la championne éternelle — le seul terrain où le Roi a plié.", 'common'],
      ['status', 'association-hunters', 'Association des Hunters', ['scope', 'Organisation'], "L'organisation qui délivre les licences et régit l'élite : ses douze piliers portent des noms du zodiaque.", 'epic'],
      ['place', 'mont-kukuru', 'Mont Kukurū', ['region', 'Domaine Zoldyck'], "La montagne-forteresse des Zoldyck, gardée par la Porte du Crépuscule et un chien de sept mètres.", 'rare'],
    ],
    relations: [
      ['gon-freecss', 'exerce', 'chasseur'], ['killua-zoldyck', 'exerce', 'chasseur'], ['kurapika', 'exerce', 'chasseur'], ['leorio', 'exerce', 'chasseur'], ['isaac-netero', 'exerce', 'chasseur'],
      ['killua-zoldyck', 'appartient', 'zoldyck'], ['chrollo-lucilfer', 'appartient', 'brigade-fantome'],
      ['gon-freecss', 'maitrise', 'nen'], ['killua-zoldyck', 'maitrise', 'nen'], ['kurapika', 'maitrise', 'nen'], ['hisoka', 'maitrise', 'nen'], ['chrollo-lucilfer', 'maitrise', 'nen'], ['isaac-netero', 'maitrise', 'nen'], ['meruem', 'maitrise', 'nen'],
      ['hisoka', 'rival', 'chrollo-lucilfer'], ['meruem', 'rival', 'isaac-netero'], ['kurapika', 'rival', 'chrollo-lucilfer'],
      ['gon-freecss', 'allie', 'killua-zoldyck'],
      ['ging-freecss', 'exerce', 'chasseur'], ['ging-freecss', 'maitrise', 'nen'], ['biscuit-krueger', 'exerce', 'chasseur'], ['biscuit-krueger', 'maitrise', 'nen'],
      ['illumi-zoldyck', 'appartient', 'zoldyck'], ['illumi-zoldyck', 'maitrise', 'nen'],
      ['neferpitou', 'appartient', 'fourmis-chimeres'], ['neferpitou', 'maitrise', 'nen'], ['neferpitou', 'rival', 'gon-freecss'],
      ['meruem', 'appartient', 'fourmis-chimeres'], ['gon-freecss', 'habite', 'ile-de-la-baleine'],
      ['kite', 'exerce', 'chasseur'], ['kite', 'allie', 'ging-freecss'], ['kite', 'maitrise', 'nen'],
      ['komugi', 'maitrise', 'gungi'], ['meruem', 'maitrise', 'gungi'], ['komugi', 'allie', 'meruem'],
      ['wing', 'maitrise', 'nen'], ['wing', 'allie', 'gon-freecss'],
      ['silva-zoldyck', 'appartient', 'zoldyck'], ['alluka-zoldyck', 'appartient', 'zoldyck'], ['silva-zoldyck', 'habite', 'mont-kukuru'], ['killua-zoldyck', 'habite', 'mont-kukuru'],
      ['feitan', 'appartient', 'brigade-fantome'], ['feitan', 'maitrise', 'nen'], ['silva-zoldyck', 'maitrise', 'nen'],
      ['isaac-netero', 'appartient', 'association-hunters'], ['ging-freecss', 'appartient', 'association-hunters'],
      ['alluka-zoldyck', 'allie', 'killua-zoldyck'],
    ],
  },
  {
    // Chaque partie de JoJo est un anime MAL distinct → casts additionnels pour les JoJo 3→6.
    label: "JoJo's Bizarre Adventure", malId: 14719, extraMalIds: [20899, 31933, 37991, 48661],
    // L'axe CANON de JoJo : la partie. Déduite de la saison animée où le perso apparaît en premier.
    partByMal: { 14719: 'Partie 1-2', 20899: 'Partie 3', 31933: 'Partie 4', 37991: 'Partie 5', 48661: 'Partie 6' },
    chars: [
      { slug: 'jonathan-joestar', name: 'Jonathan Joestar', mal: 'Joestar, Jonathan', rarity: 'epic', role: 'Gentleman · 1ʳᵉ génération', summary: "Le premier JoJo : gentleman victorien au grand cœur, premier maître de l'Onde face à Dio." },
      { slug: 'joseph-joestar', name: 'Joseph Joestar', mal: 'Joestar, Joseph', rarity: 'legendary', role: 'Stratège espiègle · 2ᵉ génération', summary: "Le JoJo le plus roublard : provocateur génial dont la botte secrète est d'annoncer ta prochaine réplique." },
      { slug: 'jotaro-kujo', name: 'Jotaro Kujo', mal: 'Kuujou, Joutarou', rarity: 'legendary', role: 'Délinquant stoïque · 3ᵉ génération', summary: "Yare yare daze… Le JoJo à la casquette et au Stand Star Platinum, précis et rapide au point d'arrêter le temps.",
        nindo: 'Yare yare daze…',
        bio: "Délinquant lycéen au grand cœur soigneusement caché, Jotaro découvre en 1987 que « l'esprit » qui le hante est un Stand : Star Platinum. Pour sauver sa mère, il traverse le monde jusqu'au Caire avec son grand-père Joseph et terrasse Dio, le vampire aux cent ans de rancune. Devenu biologiste marin, il veille sur les générations suivantes — Josuke, puis sa propre fille Jolyne.",
        quotes: ['Yare yare daze…', 'Star Platinum : The World.', 'Tu croyais pouvoir m\'échapper dans le temps arrêté ?'],
        trivia: ["Star Platinum est si précis qu'il attrape une balle de revolver entre deux doigts.", 'Jotaro est docteur : sa thèse porte sur… les étoiles de mer.', "Sa casquette et ses cheveux fusionnent — mystère graphique assumé par Araki."] },
      { slug: 'dio-brando', name: 'Dio Brando', mal: 'Brando, Dio', rarity: 'legendary', role: 'Vampire · némésis des Joestar', summary: "L'orphelin devenu vampire par le Masque de Pierre, némésis éternelle des Joestar — son Stand The World fige le temps." },
      { slug: 'josuke-higashikata', name: 'Josuke Higashikata', mal: 'Higashikata, Jousuke', rarity: 'epic', role: 'Lycéen de Morioh · 4ᵉ génération', summary: "Le JoJo à la banane insultable de Morioh : son Stand Crazy Diamond répare tout — sauf lui-même." },
      { slug: 'giorno-giovanna', name: 'Giorno Giovanna', mal: 'Giovanna, Giorno', rarity: 'epic', role: 'Gangstar · 5ᵉ génération', summary: "Fils de Dio au sang Joestar, rêvant de devenir un « Gangstar » : Gold Experience insuffle la vie à la matière." },
      { slug: 'jolyne-cujoh', name: 'Jolyne Cujoh', mal: 'Kuujou, Jolyne', rarity: 'epic', role: 'Détenue · 6ᵉ génération', summary: "Fille de Jotaro, emprisonnée à Green Dolphin Street : son Stand Stone Free la détisse en fil indestructible." },
      { slug: 'speedwagon', name: 'Robert E. O. Speedwagon', mal: 'Speedwagon, Robert Edward O.', rarity: 'rare', role: 'Allié fidèle · fondation', summary: "Voyou des rues devenu l'allié le plus fidèle des Joestar — sa fondation veille sur la famille depuis un siècle." },
      { slug: 'noriaki-kakyoin', name: 'Noriaki Kakyoin', mal: 'Kakyouin', rarity: 'epic', role: 'Stand Hierophant Green', summary: "Le lycéen d'Égypte au Stand émeraude, compagnon de route de Jotaro — rerorerorero et Emerald Splash." },
      { slug: 'jean-pierre-polnareff', name: 'Jean Pierre Polnareff', mal: 'Polnareff', rarity: 'epic', role: 'Stand Silver Chariot', summary: "Le chevalier français à la crête d'argent, parti venger sa sœur — le cœur le plus loyal (et le plus malchanceux) du groupe." },
      { slug: 'yoshikage-kira', name: 'Yoshikage Kira', mal: 'Kira, Yoshikage', rarity: 'epic', role: 'Tueur en série de Morioh', summary: "Le salarié qui ne veut qu'« une vie tranquille » — entre deux meurtres effacés par Killer Queen et ses bombes." },
      { slug: 'bruno-bucciarati', name: 'Bruno Bucciarati', mal: 'Bucciarati', rarity: 'epic', role: 'Capo de Passione', summary: "Le capo au Sticky Fingers qui ouvre tout d'une fermeture éclair — la boussole morale du gang, arigato mina." },
      { slug: 'rohan-kishibe', name: 'Rohan Kishibe', mal: 'Kishibe', rarity: 'rare', role: 'Mangaka · Heaven\'s Door', summary: "Le mangaka de Morioh qui lit les gens comme des livres — littéralement. Mais il refusera toujours de te prêter de l'argent." },
      { slug: 'caesar-zeppeli', name: 'Caesar Zeppeli', mal: 'Zeppeli, Caesar', rarity: 'epic', role: 'Maître de l\'Onde · 2ᵉ génération', summary: "L'héritier italien des Zeppeli, rival puis frère d'armes de Joseph — ses bulles d'Onde et son bandeau resteront à jamais." },
      { slug: 'lisa-lisa', name: 'Lisa Lisa', mal: 'Lisa Lisa', rarity: 'epic', role: 'Coach de l\'Onde', summary: "La coach implacable de Joseph et Caesar sur l'île de Vénus — élégance, écharpe conductrice d'Onde et secret de famille." },
      { slug: 'iggy', name: 'Iggy', mal: 'Iggy', rarity: 'rare', role: 'Chien porteur de Stand', summary: "Le boston terrier au caractère impossible et au Stand de sable The Fool — accro au chewing-gum au café, héros malgré lui." },
      { slug: 'enrico-pucci', name: 'Enrico Pucci', mal: 'Pucci', rarity: 'epic', role: 'Aumônier · disciple de Dio', summary: "L'aumônier de Green Dolphin Street, disciple secret de Dio — son Stand accélère le temps jusqu'à refaire l'univers." },
      { slug: 'diavolo', name: 'Diavolo', mal: 'Diavolo', rarity: 'epic', role: 'Boss de Passione', summary: "Le boss paranoïaque de Passione, l'homme sans passé : King Crimson efface le temps — et Giorno le condamnera à mourir sans fin." },
      { slug: 'koichi-hirose', name: 'Koichi Hirose', mal: 'Hirose', rarity: 'rare', role: 'Lycéen au Echoes', summary: "Le petit lycéen de Morioh que tout le monde sous-estime — son Stand Echoes grandit avec son courage, jusqu'au 3 Freeze." },
      { slug: 'okuyasu-nijimura', name: 'Okuyasu Nijimura', mal: 'Okuyasu', rarity: 'rare', role: 'Bras droit de Josuke', summary: "Le meilleur ami de Josuke, pas la moitié la plus futée du duo — mais The Hand efface littéralement l'espace." },
    ],
    entities: [
      ['power', 'stand', 'Stand', ['element', 'Esprit combattant'], "La manifestation psychique du combattant : un esprit aux pouvoirs uniques que seuls les porteurs voient.", 'legendary'],
      ['skill', 'onde-hamon', 'Onde (Hamon)', ['discipline', 'Énergie solaire'], "L'art respiratoire qui charge le corps d'une énergie solaire — l'arme absolue contre les vampires.", 'epic'],
      ['artifact', 'masque-de-pierre', 'Masque de Pierre', ['material', 'Relique aztèque'], "La relique aztèque qui transforme son porteur en vampire — l'objet qui a maudit deux siècles de Joestar.", 'epic'],
      ['place', 'morioh', 'Morioh', ['region', 'Ville côtière · Japon'], "Paisible ville côtière japonaise à l'étrange densité de porteurs de Stand — le décor de Diamond is Unbreakable.", 'rare'],
      ['status', 'joestar', 'Lignée Joestar', ['scope', 'Famille'], "La lignée marquée d'une étoile à l'épaule, liée par le destin à Dio à travers les générations.", 'legendary'],
      ['artifact', 'fleche-du-stand', 'Flèche du Stand', ['material', 'Pointe météorique'], "Taillée dans une météorite, elle éveille le Stand de ceux qu'elle transperce — ou les tue.", 'legendary'],
      ['status', 'passione', 'Passione', ['scope', 'Gang napolitain'], "La mafia qui règne sur Naples — que Giorno infiltre pour la conquérir de l'intérieur.", 'rare'],
      ['place', 'green-dolphin', 'Green Dolphin Street', ['region', 'Floride'], "La prison maximale où Jolyne est piégée — et où le disciple de Dio prépare le « paradis ».", 'rare'],
      ['status', 'hommes-du-pilier', 'Hommes du Pilier', ['scope', 'Race ancienne'], "Les surhommes aztèques endormis dans la pierre, créateurs du Masque — l'Onde est leur seule faiblesse.", 'epic'],
      ['power', 'stand-requiem', 'Stand Requiem', ['element', 'Évolution ultime'], "Quand la Flèche transperce un Stand déjà éveillé : Gold Experience Requiem remet même la mort à zéro.", 'legendary'],
      ['status', 'fondation-speedwagon', 'Fondation Speedwagon', ['scope', 'Organisation'], "La fondation du fidèle Speedwagon : un siècle de soutien scientifique et logistique aux Joestar.", 'rare'],
      ['place', 'le-caire', 'Le Caire', ['region', 'Égypte'], "Le bout du voyage de 50 jours : la ville où Dio attend, et où le temps s'arrête.", 'rare'],
    ],
    relations: [
      ['jonathan-joestar', 'appartient', 'joestar'], ['joseph-joestar', 'appartient', 'joestar'], ['jotaro-kujo', 'appartient', 'joestar'], ['josuke-higashikata', 'appartient', 'joestar'], ['giorno-giovanna', 'appartient', 'joestar'], ['jolyne-cujoh', 'appartient', 'joestar'],
      ['jotaro-kujo', 'maitrise', 'stand'], ['dio-brando', 'maitrise', 'stand'], ['josuke-higashikata', 'maitrise', 'stand'], ['giorno-giovanna', 'maitrise', 'stand'], ['jolyne-cujoh', 'maitrise', 'stand'], ['joseph-joestar', 'maitrise', 'stand'],
      ['jonathan-joestar', 'maitrise', 'onde-hamon'], ['joseph-joestar', 'maitrise', 'onde-hamon'],
      ['dio-brando', 'possede', 'masque-de-pierre'], ['josuke-higashikata', 'habite', 'morioh'],
      ['dio-brando', 'rival', 'jonathan-joestar'], ['dio-brando', 'rival', 'jotaro-kujo'],
      ['speedwagon', 'allie', 'jonathan-joestar'],
      ['noriaki-kakyoin', 'maitrise', 'stand'], ['noriaki-kakyoin', 'allie', 'jotaro-kujo'],
      ['jean-pierre-polnareff', 'maitrise', 'stand'], ['jean-pierre-polnareff', 'allie', 'jotaro-kujo'],
      ['yoshikage-kira', 'maitrise', 'stand'], ['yoshikage-kira', 'habite', 'morioh'], ['yoshikage-kira', 'rival', 'josuke-higashikata'],
      ['bruno-bucciarati', 'maitrise', 'stand'], ['bruno-bucciarati', 'appartient', 'passione'], ['bruno-bucciarati', 'allie', 'giorno-giovanna'],
      ['rohan-kishibe', 'maitrise', 'stand'], ['rohan-kishibe', 'habite', 'morioh'],
      ['giorno-giovanna', 'appartient', 'passione'],
      ['caesar-zeppeli', 'maitrise', 'onde-hamon'], ['caesar-zeppeli', 'allie', 'joseph-joestar'], ['lisa-lisa', 'maitrise', 'onde-hamon'], ['lisa-lisa', 'allie', 'joseph-joestar'],
      ['iggy', 'maitrise', 'stand'], ['iggy', 'allie', 'jotaro-kujo'],
      ['enrico-pucci', 'maitrise', 'stand'], ['enrico-pucci', 'allie', 'dio-brando'], ['enrico-pucci', 'rival', 'jolyne-cujoh'], ['jolyne-cujoh', 'habite', 'green-dolphin'],
      ['diavolo', 'appartient', 'passione'], ['diavolo', 'maitrise', 'stand'], ['diavolo', 'rival', 'giorno-giovanna'],
      ['koichi-hirose', 'maitrise', 'stand'], ['koichi-hirose', 'habite', 'morioh'], ['okuyasu-nijimura', 'maitrise', 'stand'], ['okuyasu-nijimura', 'habite', 'morioh'], ['okuyasu-nijimura', 'allie', 'josuke-higashikata'],
      ['giorno-giovanna', 'maitrise', 'stand-requiem'], ['speedwagon', 'appartient', 'fondation-speedwagon'],
    ],
  },
  {
    // First Stage (185) + Second Stage (730) pour couvrir Kyoichi Sudo.
    label: 'Initial D', malId: 185, extraMalIds: [730],
    chars: [
      { slug: 'takumi-fujiwara', name: 'Takumi Fujiwara', mal: 'Fujiwara, Takumi', rarity: 'legendary', role: 'Livreur de tofu · prodige du tōge', summary: "Le livreur de tofu qui dévale l'Akina depuis ses 13 ans : un prodige du drift qui s'ignore, au volant d'une AE86.",
        status: 'Vivant', nindo: 'Livrer le tofu, aller vite, rentrer. C\'est comme ça que j\'ai appris.',
        bio: "Chaque matin avant l'aube, depuis ses treize ans, Takumi descend l'Akina au volant de la Hachi-Roku pour livrer le tofu paternel — sans réaliser qu'il est devenu, virage après virage, le pilote le plus rapide de la montagne. Révélé malgré lui face aux RedSuns de Keisuke Takahashi, il bat un à un les cadors de Gunma avant de porter le downhill de Project D et d'écrire la légende de l'AE86.",
        quotes: ['C\'est quoi le drift, au juste ?', 'Le gobelet d\'eau, c\'est pour ne pas renverser le tofu.', 'Sur Akina, la nuit, je ne perds pas.'],
        trivia: ['La technique du gobelet d\'eau vient de Bunta : rouler sans en renverser une goutte.', 'Il gagne sa première course sans savoir ce qu\'est une grille de départ.', 'Le hurlement du 4A-GE en montée est devenu un son culte de l\'animation.'] },
      { slug: 'keisuke-takahashi', name: 'Keisuke Takahashi', mal: 'Takahashi, Keisuke', rarity: 'epic', role: 'Pilote de la FD · RedSuns', summary: "Le cadet fougueux des frères Takahashi et sa Mazda RX-7 FD jaune — premier grand rival, puis coéquipier de Takumi." },
      { slug: 'ryosuke-takahashi', name: 'Ryosuke Takahashi', mal: 'Takahashi, Ryousuke', rarity: 'epic', role: 'Stratège · fondateur de Project D', summary: "Le « comète blanche d'Akagi » : cerveau des RedSuns puis fondateur de Project D, théoricien absolu de la course." },
      { slug: 'bunta-fujiwara', name: 'Bunta Fujiwara', mal: 'Fujiwara, Bunta', rarity: 'epic', role: 'Père · légende du volant', summary: "Le père de Takumi, marchand de tofu taiseux — et légende du tōge qui a forgé son fils sans jamais le lui dire." },
      { slug: 'itsuki-takeuchi', name: 'Itsuki Takeuchi', mal: 'Takeuchi, Itsuki', rarity: 'common', role: 'Meilleur ami enthousiaste', summary: "Le meilleur ami de Takumi, fan de caisses à l'enthousiasme débordant et au talent... en construction." },
      { slug: 'natsuki-mogi', name: 'Natsuki Mogi', mal: 'Mogi, Natsuki', rarity: 'rare', role: 'Camarade de lycée', summary: "La camarade de classe dont Takumi est proche — le fil sentimental des débuts de l'histoire." },
      { slug: 'takeshi-nakazato', name: 'Takeshi Nakazato', mal: 'Nakazato, Takeshi', rarity: 'rare', role: 'Leader des NightKids', summary: "Le leader des NightKids de Myōgi et sa Skyline R32 GT-R : la puissance brute face à la finesse d'Akina." },
      { slug: 'shingo-shoji', name: 'Shingo Shoji', mal: 'Shouji, Shingo', rarity: 'common', role: 'Pilote agressif des NightKids', summary: "Le pilote le plus déloyal des NightKids et sa Civic EG6 — l'inventeur du défi « main scotchée au volant »." },
      { slug: 'koichiro-iketani', name: 'Koichiro Iketani', mal: 'Iketani', rarity: 'common', role: 'Leader des Speed Stars', summary: "Le leader des Akina Speed Stars, pompiste au grand cœur — le premier à découvrir qui pilote vraiment la Hachi-Roku." },
      { slug: 'kenji', name: 'Kenji', mal: 'Kenji', rarity: 'common', role: 'Speed Star', summary: "Le fidèle acolyte d'Iketani chez les Speed Stars — commentateur passionné des duels d'Akina." },
      { slug: 'mako-sato', name: 'Mako Sato', mal: 'Mako', rarity: 'rare', role: 'Pilote d\'Impact Blue', summary: "La pilote de la SilEighty d'Usui, moitié du duo Impact Blue avec Sayuki — la plus rapide de Gunma… au féminin." },
      { slug: 'kyoichi-sudo', name: 'Kyoichi Sudo', mal: 'Sudou', rarity: 'epic', role: 'Leader des Emperor', summary: "Le leader des Emperor et sa Lancer Evo III : l'apôtre du rationnel qui méprise le « drift de spectacle » — et l'homme qui a brisé la première AE86." },
      { slug: 'sayuki', name: 'Sayuki', mal: 'Sayuki', rarity: 'common', role: 'Copilote d\'Impact Blue', summary: "La moitié pétillante d'Impact Blue : navigatrice de Mako sur Usui, elle connaît chaque relief du col par cœur." },
      { slug: 'wataru-akiyama', name: 'Wataru Akiyama', mal: 'Akiyama, Wataru', rarity: 'rare', role: 'Pilote de la Levin turbo', summary: "Le pilote de la AE86 Levin turbo — l'« autre Hachi-Roku », prêt à tout pour prouver que la sienne est la vraie." },
      { slug: 'kai-kogashiwa', name: 'Kai Kogashiwa', mal: 'Kogashiwa', rarity: 'rare', role: 'Rival de seconde génération', summary: "Le fils du rival historique de Bunta, sur la MR2 paternelle : la revanche des pères par les fils, dans la brume d'Irohazaka." },
      { slug: 'yuichi-tachibana', name: 'Yuichi Tachibana', mal: 'Tachibana', rarity: 'common', role: 'Patron de la station-service', summary: "Le gérant de la station Esso où bosse Iketani — vieux complice de Bunta et mémoire vivante du tōge de Gunma." },
    ],
    entities: [
      ['artifact', 'ae86-trueno', 'Toyota AE86 Trueno', ['material', 'Sprinter Trueno GT-APEX'], "La « Hachi-Roku » panda du tofu Fujiwara : propulsion légère, moteur affûté en secret — la voiture légende du tōge.", 'legendary'],
      ['place', 'mont-akina', 'Mont Akina', ['region', 'Préfecture de Gunma'], "Le col aux cinq épingles consécutives, terrain de jeu nocturne des Speed Stars — et royaume de l'AE86.", 'epic'],
      ['status', 'project-d', 'Project D', ['scope', 'Équipe de course'], "L'équipe fondée par Ryosuke Takahashi pour conquérir tous les cols du Kantō avec Takumi et Keisuke.", 'epic'],
      ['artifact', 'rx7-fd', 'Mazda RX-7 FD', ['material', 'FD3S · moteur rotatif'], "La FD jaune de Keisuke : rotatif affûté et aéro travaillée — l'arme de l'uphill de Project D.", 'epic'],
      ['place', 'mont-akagi', 'Mont Akagi', ['region', 'Préfecture de Gunma'], "Le col des RedSuns et de la « comète blanche » : le fief des frères Takahashi.", 'rare'],
      ['status', 'speed-stars', 'Akina Speed Stars', ['scope', 'Équipe locale'], "L'équipe amateur d'Akina menée par Iketani — les premiers témoins du prodige au tofu.", 'common'],
      ['artifact', 'r32-gtr', 'Nissan Skyline R32 GT-R', ['material', 'BNR32 · RB26DETT'], "« Godzilla » : la GT-R de Nakazato, quatre roues motrices et force brute — l'anti-thèse de l'AE86.", 'rare'],
      ['artifact', 'sileighty', 'Nissan SilEighty', ['material', 'S13 face 180SX'], "La monture d'Impact Blue : une Silvia greffée d'un avant de 180SX — l'arme des reines d'Usui.", 'rare'],
      ['artifact', 'lancer-evo3', 'Mitsubishi Lancer Evo III', ['material', 'CE9A · 4G63T'], "L'Evo III de Kyoichi Sudo : turbo, transmission intégrale et misfiring system — la doctrine Emperor sur roues.", 'rare'],
      ['place', 'mont-myogi', 'Mont Myōgi', ['region', 'Préfecture de Gunma'], "Le col des NightKids — la ligne droite finale où la puissance de la GT-R fait la loi.", 'common'],
      ['place', 'mont-usui', 'Mont Usui', ['region', 'Préfecture de Gunma'], "Le col sinueux d'Impact Blue, réputé pour son enchaînement C-121 — le territoire de Mako et Sayuki.", 'common'],
      ['status', 'redsuns', 'Akagi RedSuns', ['scope', 'Équipe de course'], "L'écurie des frères Takahashi : la plus rapide de Gunma, dirigée à la donnée et au chrono par Ryosuke.", 'epic'],
      ['status', 'nightkids', 'Myōgi NightKids', ['scope', 'Équipe de course'], "L'équipe de Myōgi menée par Nakazato — la culture de la puissance et l'orgueil du col.", 'rare'],
      ['status', 'impact-blue', 'Impact Blue', ['scope', 'Duo de course'], "Le duo Mako & Sayuki sur SilEighty : le binôme pilote-copilote le plus rapide d'Usui.", 'rare'],
      ['profession', 'pilote-de-toge', 'Pilote de tōge', ['sector', 'Course de montagne'], "Les coureurs des routes de montagne japonaises : downhill, uphill, et l'art de frôler le rail.", 'rare'],
      ['skill', 'drift', 'Drift', ['discipline', 'Pilotage'], "L'art de glisser une propulsion en virage sans perdre de vitesse — la signature du tōge.", 'epic'],
    ],
    relations: [
      ['takumi-fujiwara', 'possede', 'ae86-trueno'], ['bunta-fujiwara', 'possede', 'ae86-trueno'],
      ['takumi-fujiwara', 'appartient', 'project-d'], ['keisuke-takahashi', 'appartient', 'project-d'], ['ryosuke-takahashi', 'appartient', 'project-d'],
      ['takumi-fujiwara', 'exerce', 'pilote-de-toge'], ['keisuke-takahashi', 'exerce', 'pilote-de-toge'], ['ryosuke-takahashi', 'exerce', 'pilote-de-toge'], ['bunta-fujiwara', 'exerce', 'pilote-de-toge'], ['takeshi-nakazato', 'exerce', 'pilote-de-toge'],
      ['takumi-fujiwara', 'maitrise', 'drift'], ['keisuke-takahashi', 'maitrise', 'drift'], ['bunta-fujiwara', 'maitrise', 'drift'],
      ['keisuke-takahashi', 'rival', 'takumi-fujiwara'], ['takeshi-nakazato', 'rival', 'takumi-fujiwara'],
      ['itsuki-takeuchi', 'allie', 'takumi-fujiwara'],
      ['koichiro-iketani', 'appartient', 'speed-stars'], ['koichiro-iketani', 'exerce', 'pilote-de-toge'], ['kenji', 'appartient', 'speed-stars'],
      ['mako-sato', 'exerce', 'pilote-de-toge'], ['kyoichi-sudo', 'exerce', 'pilote-de-toge'],
      ['kyoichi-sudo', 'rival', 'takumi-fujiwara'], ['kyoichi-sudo', 'rival', 'ryosuke-takahashi'],
      ['keisuke-takahashi', 'possede', 'rx7-fd'],
      ['sayuki', 'appartient', 'impact-blue'], ['mako-sato', 'appartient', 'impact-blue'], ['mako-sato', 'possede', 'sileighty'],
      ['takeshi-nakazato', 'possede', 'r32-gtr'], ['takeshi-nakazato', 'appartient', 'nightkids'], ['shingo-shoji', 'appartient', 'nightkids'],
      ['kyoichi-sudo', 'possede', 'lancer-evo3'], ['keisuke-takahashi', 'appartient', 'redsuns'], ['ryosuke-takahashi', 'appartient', 'redsuns'],
      ['wataru-akiyama', 'exerce', 'pilote-de-toge'], ['wataru-akiyama', 'rival', 'takumi-fujiwara'], ['kai-kogashiwa', 'exerce', 'pilote-de-toge'], ['kai-kogashiwa', 'rival', 'takumi-fujiwara'],
      ['yuichi-tachibana', 'allie', 'bunta-fujiwara'], ['sayuki', 'exerce', 'pilote-de-toge'],
    ],
  },
  {
    label: 'Death Note', malId: 1535,
    chars: [
      { slug: 'light-yagami', name: 'Light Yagami', mal: 'Yagami, Light', rarity: 'legendary', role: 'Lycéen génie · Kira', summary: "Lycéen surdoué qui ramasse le cahier d'un dieu de la mort et s'improvise justicier suprême sous le nom de Kira.",
        status: 'Décédé', nindo: 'Je suis la justice.',
        bio: "Premier de la nation, brillant et désœuvré, Light Yagami ramasse un cahier tombé du ciel : le Death Note du shinigami Ryuk. Convaincu de pouvoir purger le monde du crime, il devient « Kira », dieu autoproclamé d'un ordre nouveau — et engage avec le détective L la plus vertigineuse partie d'échecs du manga, jusqu'à sa chute face à Near.",
        quotes: ['Je suis la justice.', 'Tout se déroule comme prévu. (keikaku dōri)', 'Je prendrai une chips… et je la mangerai !'],
        trivia: ['« keikaku dōri » (tout se déroule comme prévu) est devenu un mème mondial.', 'La scène de la chips est l\'une des plus parodiées de l\'animation japonaise.', 'Son prénom s\'écrit avec le kanji « lune » (月) lu à l\'anglaise : Light.'] },
      { slug: 'l-lawliet', name: 'L', mal: 'Lawliet, L', rarity: 'legendary', role: 'Détective de l\'ombre', summary: "Le plus grand détective du monde : excentrique, accroupi et sucré, seul capable d'acculer Kira." },
      { slug: 'ryuk', name: 'Ryuk', mal: 'Ryuk', rarity: 'epic', role: 'Dieu de la Mort', summary: "Le shinigami qui a laissé tomber son Death Note sur Terre... par pur ennui. Se paie en pommes." },
      { slug: 'misa-amane', name: 'Misa Amane', mal: 'Amane, Misa', rarity: 'epic', role: 'Idole · second Kira', summary: "Idole pop dévouée corps et âme à Kira : elle sacrifie la moitié de sa vie pour les yeux de shinigami." },
      { slug: 'near', name: 'Near', mal: 'River, Nate', rarity: 'epic', role: 'Successeur de L', summary: "Le plus jeune successeur de L : un stratège glacial qui résout les affaires en empilant des jouets." },
      { slug: 'mello', name: 'Mello', mal: 'Keehl, Mihael', rarity: 'rare', role: 'Successeur rival', summary: "L'autre héritier de L, impulsif et chocolat en main — prêt à passer par la mafia pour battre Near et Kira." },
      { slug: 'soichiro-yagami', name: 'Soichiro Yagami', mal: 'Yagami, Souichirou', rarity: 'rare', role: 'Directeur de la police', summary: "Le père de Light, policier intègre qui traque Kira sans imaginer qu'il dîne en face de lui chaque soir." },
      { slug: 'rem', name: 'Rem', mal: 'Rem', rarity: 'rare', role: 'Dieu de la Mort', summary: "Shinigami au cœur tendre qui veille sur Misa — et qui prouvera qu'un dieu de la mort peut mourir d'amour." },
      { slug: 'watari', name: 'Watari', mal: 'Wammy, Quillsh', rarity: 'rare', role: 'Bras droit de L', summary: "L'inventeur philanthrope derrière L : fondateur de la Wammy's House et seul lien du détective avec le monde." },
      { slug: 'touta-matsuda', name: 'Tōta Matsuda', mal: 'Matsuda', rarity: 'common', role: 'Policier de la cellule Kira', summary: "Le benjamin maladroit de la cellule d'enquête — sous-estimé de tous, c'est pourtant lui qui tirera au dernier acte." },
      { slug: 'teru-mikami', name: 'Teru Mikami', mal: 'Mikami', rarity: 'rare', role: 'Procureur · main de Kira', summary: "Le procureur fanatique choisi comme « main » de Kira — sakujo ! (élimination), scandé le stylo à la main." },
      { slug: 'kiyomi-takada', name: 'Kiyomi Takada', mal: 'Takada', rarity: 'common', role: 'Porte-parole de Kira', summary: "Présentatrice star devenue la porte-parole officielle de Kira — et son maillon faible." },
      { slug: 'naomi-misora', name: 'Naomi Misora', mal: 'Misora', rarity: 'rare', role: 'Ex-agent du FBI', summary: "L'ex-agent du FBI qui avait percé Kira à jour en quelques jours — la première grande victime de l'intelligence de Light." },
      { slug: 'shuichi-aizawa', name: 'Shūichi Aizawa', mal: 'Aizawa', rarity: 'common', role: 'Enquêteur intègre', summary: "Le policier à l'afro et aux principes : le premier à re-soupçonner Light quand tout le monde a baissé la garde." },
      { slug: 'kanzo-mogi', name: 'Kanzō Mogi', mal: 'Mogi', rarity: 'common', role: 'Enquêteur silencieux', summary: "Le colosse mutique de la cellule Kira — et, contre toute attente, un manager d'idole étonnamment convaincant." },
      { slug: 'raye-penber', name: 'Raye Penber', mal: 'Penber', rarity: 'common', role: 'Agent du FBI', summary: "L'agent du FBI chargé de filer Light — sa mort dans le métro est l'un des coups les plus glaçants de Kira." },
    ],
    entities: [
      ['artifact', 'cahier-de-la-mort', 'Death Note', ['material', 'Cahier de shinigami'], "Le cahier des dieux de la mort : quiconque y voit son nom inscrit meurt — 40 secondes, crise cardiaque par défaut.", 'legendary'],
      ['status', 'dieu-de-la-mort', 'Dieu de la Mort', ['scope', 'Shinigami'], "Les shinigami du monde des morts : ils prolongent leur vie en inscrivant celle des humains.", 'epic'],
      ['status', 'kira', 'Kira', ['scope', 'Identité'], "Le « sauveur » anonyme qui exécute les criminels du monde entier — messie pour les uns, tueur en série pour les autres.", 'epic'],
      ['profession', 'detective', 'Détective', ['sector', 'Enquête'], "Les esprits les plus brillants du monde lancés sur l'affaire Kira : L, puis ses successeurs.", 'rare'],
      ['skill', 'oeil-de-shinigami', 'Œil de Shinigami', ['discipline', 'Pacte'], "Le pacte qui échange la moitié de sa vie contre la vision du nom et de l'espérance de vie d'autrui.", 'epic'],
      ['place', 'wammys-house', "Wammy's House", ['region', 'Winchester · Angleterre'], "L'orphelinat pour génies fondé par Watari — la pépinière des successeurs de L.", 'rare'],
      ['status', 'cellule-kira', 'Cellule d\'enquête Kira', ['scope', 'Task force'], "La poignée de policiers restés aux côtés de L pour traquer Kira, quitte à y laisser leur carrière — ou leur vie.", 'rare'],
      ['place', 'monde-shinigami', 'Monde des Shinigami', ['region', 'Royaume des morts'], "Le désert d'os et d'ennui où les dieux de la mort jouent aux dés — Ryuk en est parti par curiosité.", 'rare'],
      ['status', 'spk', 'SPK', ['scope', 'Task force américaine'], "La Special Provision for Kira : l'unité de Near, montée pour reprendre la traque après la mort de L.", 'rare'],
      ['status', 'yotsuba', 'Groupe Yotsuba', ['scope', 'Conglomérat'], "Le conglomérat dont les cadres tuent à coups de Death Note en réunion hebdomadaire — l'arc du Kira d'entreprise.", 'common'],
    ],
    relations: [
      ['light-yagami', 'possede', 'cahier-de-la-mort'], ['misa-amane', 'possede', 'cahier-de-la-mort'],
      ['ryuk', 'appartient', 'dieu-de-la-mort'], ['rem', 'appartient', 'dieu-de-la-mort'],
      ['light-yagami', 'appartient', 'kira'], ['misa-amane', 'appartient', 'kira'],
      ['l-lawliet', 'exerce', 'detective'], ['near', 'exerce', 'detective'], ['mello', 'exerce', 'detective'],
      ['misa-amane', 'maitrise', 'oeil-de-shinigami'],
      ['l-lawliet', 'rival', 'light-yagami'], ['near', 'rival', 'light-yagami'], ['mello', 'rival', 'near'],
      ['rem', 'allie', 'misa-amane'],
      ['watari', 'allie', 'l-lawliet'], ['touta-matsuda', 'appartient', 'cellule-kira'], ['soichiro-yagami', 'appartient', 'cellule-kira'],
      ['teru-mikami', 'appartient', 'kira'], ['teru-mikami', 'possede', 'cahier-de-la-mort'], ['teru-mikami', 'maitrise', 'oeil-de-shinigami'],
      ['kiyomi-takada', 'appartient', 'kira'], ['near', 'habite', 'wammys-house'], ['mello', 'habite', 'wammys-house'],
      ['naomi-misora', 'allie', 'l-lawliet'], ['shuichi-aizawa', 'appartient', 'cellule-kira'], ['kanzo-mogi', 'appartient', 'cellule-kira'],
      ['raye-penber', 'allie', 'naomi-misora'], ['ryuk', 'habite', 'monde-shinigami'], ['rem', 'habite', 'monde-shinigami'],
      ['near', 'appartient', 'spk'],
    ],
  },
  {
    label: 'One Piece', malId: 21, opApi: true,
    chars: [
      { slug: 'monkey-d-luffy', name: 'Monkey D. Luffy', mal: 'Monkey D., Luffy', op: 'Monkey D Luffy', rarity: 'legendary', role: 'Capitaine · futur Roi des Pirates', summary: "Le garçon élastique au chapeau de paille, parti d'East Blue pour devenir le Roi des Pirates.",
        status: 'Vivant', nindo: 'Je serai le Roi des Pirates !',
        bio: "Gamin d'East Blue au chapeau de paille confié par Shanks, Luffy croque le fruit du Gomu Gomu et prend la mer à dix-sept ans. D'île en île, il recrute une famille de rêveurs, défie les Grandes Puissances, perd son frère Ace à Marineford — et transforme chaque défaite en serment : trouver le One Piece et devenir le Roi des Pirates.",
        quotes: ['Je serai le Roi des Pirates !', 'T\'es qui pour décider de qui je prends dans mon équipage ?', 'De la viande !!!'],
        trivia: ['Le chapeau de paille appartenait à Gol D. Roger avant Shanks.', 'Luffy ne sait pas nager — l\'ironie du capitaine pirate.', 'Son rire signature : « Shishishi ».'] },
      { slug: 'roronoa-zoro', name: 'Roronoa Zoro', mal: 'Roronoa, Zoro', op: 'Roronoa Zoro', rarity: 'legendary', role: 'Sabreur à trois lames', summary: "Le chasseur de pirates au style à trois sabres, qui vise le titre de meilleur épéiste du monde." },
      { slug: 'nami', name: 'Nami', mal: 'Nami', op: 'Nami', rarity: 'epic', role: 'Navigatrice cartographe', summary: "La navigatrice voleuse qui rêve de dessiner la carte du monde entier — et qui sent la météo avant le ciel." },
      { slug: 'usopp', name: 'Usopp', mal: 'Usopp', op: 'Usopp', rarity: 'rare', role: 'Tireur d\'élite fabulateur', summary: "Le tireur d'élite le plus menteur des mers : ses 8 000 hommes n'existent pas, son courage finit toujours par exister." },
      { slug: 'sanji', name: 'Sanji', mal: 'Sanji', op: 'Sanji Vinsmoke', rarity: 'epic', role: 'Cuisinier · jambe noire', summary: "Le cuisinier gentleman qui ne se bat qu'avec les jambes — trouver All Blue, nourrir quiconque a faim." },
      { slug: 'tony-tony-chopper', name: 'Tony Tony Chopper', mal: 'Tony Tony, Chopper', op: 'Tony-Tony Chopper', rarity: 'rare', role: 'Médecin renne', summary: "Le renne au nez bleu devenu médecin de bord grâce au fruit Hito Hito — soigneur génial, pirate attendrissant." },
      { slug: 'nico-robin', name: 'Nico Robin', mal: 'Nico, Robin', op: 'Nico Robin', rarity: 'epic', role: 'Archéologue', summary: "La dernière archéologue d'Ohara, seule à savoir lire les Ponéglyphes — l'enfant que le monde a voulu effacer." },
      { slug: 'shanks', name: 'Shanks', mal: 'Shanks', op: 'Shanks Le Roux', rarity: 'legendary', role: 'Empereur · le Roux', summary: "L'Empereur roux qui a sacrifié un bras pour Luffy et lui a confié son chapeau de paille — la promesse fondatrice." },
      { slug: 'portgas-d-ace', name: 'Portgas D. Ace', mal: 'Portgas D., Ace', op: 'Portgas D Ace', rarity: 'epic', role: 'Poing ardent', summary: "Le grand frère de cœur de Luffy, commandant de Barbe Blanche au fruit du feu — mort en protégeant son cadet." },
      { slug: 'franky', name: 'Franky', mal: 'Franky', op: 'Franky', rarity: 'rare', role: 'Charpentier cyborg', summary: "Le cyborg au cola qui a construit le Thousand Sunny de ses mains — SUPER ! charpentier des Chapeaux de Paille." },
      { slug: 'brook', name: 'Brook', mal: 'Brook', op: 'Brook', rarity: 'rare', role: 'Musicien squelette', summary: "Le squelette gentleman ressuscité par le fruit de la Résurrection : musicien de bord, 90 ans d'humour d'os. Yohohoho !" },
      { slug: 'jinbe', name: 'Jinbe', mal: 'Jinbe', op: 'Jinbei', rarity: 'epic', role: 'Timonier · homme-poisson', summary: "L'ancien Grand Corsaire, maître du karaté des hommes-poissons, devenu le timonier des Chapeaux de Paille." },
      { slug: 'gol-d-roger', name: 'Gol D. Roger', mal: 'Roger', rarity: 'legendary', role: 'Roi des Pirates', summary: "L'homme qui avait tout obtenu — et dont les derniers mots à l'échafaud ont jeté le monde entier sur les mers." },
      { slug: 'trafalgar-law', name: 'Trafalgar Law', mal: 'Trafalgar', op: 'Trafalgar D Water Law', rarity: 'epic', role: 'Chirurgien de la Mort', summary: "Le capitaine du Heart, chirurgien au fruit du Bistouri : dans sa « Room », il découpe et permute tout — allié tactique de Luffy." },
      { slug: 'barbe-blanche', name: 'Edward Newgate · Barbe Blanche', mal: 'Newgate', rarity: 'legendary', role: 'L\'Homme le plus fort du monde', summary: "L'Empereur qui considérait son équipage comme ses fils — mort debout à Marineford, sans une fuite au dos." },
      { slug: 'dracule-mihawk', name: 'Dracule Mihawk', mal: 'Mihawk', rarity: 'epic', role: 'Meilleur épéiste du monde', summary: "L'Œil de Faucon, le sabreur que Zoro s'est juré de détrôner — son sabre noir Yoru tranche les galions d'un geste." },
      { slug: 'boa-hancock', name: 'Boa Hancock', mal: 'Boa', rarity: 'epic', role: 'Impératrice Serpent', summary: "L'Impératrice d'Amazon Lily, dont la beauté pétrifie littéralement — insensible à tout homme… sauf Luffy." },
      { slug: 'crocodile', name: 'Crocodile', mal: 'Crocodile', rarity: 'epic', role: 'Ex-Grand Corsaire', summary: "Le baron du désert d'Alabasta, homme-sable au crochet doré — le premier grand mur que Luffy a dû franchir trois fois." },
      { slug: 'buggy', name: 'Buggy le Clown', mal: 'Buggy', rarity: 'rare', role: 'Clown miraculé', summary: "L'ancien mousse du Roger, pirate de pacotille au fruit morcelant — propulsé Empereur par une avalanche de malentendus." },
      { slug: 'monkey-d-garp', name: 'Monkey D. Garp', mal: 'Garp', rarity: 'epic', role: 'Héros de la Marine', summary: "Le grand-père de Luffy, vice-amiral légendaire qui a acculé Roger — et qui « éduque » sa descendance au Poing d'Amour." },
      { slug: 'sabo', name: 'Sabo', mal: 'Sabo', rarity: 'epic', role: 'Frère révolutionnaire', summary: "Le troisième frère de la coupe de sake, n°2 de l'Armée Révolutionnaire — héritier du fruit et de la volonté d'Ace." },
    ],
    entities: [
      ['place', 'grand-line', 'Grand Line', ['region', 'Route maritime'], "La route de tous les dangers qui ceinture le globe — au bout : Laugh Tale et le One Piece.", 'legendary'],
      ['power', 'fruit-du-demon', 'Fruit du Démon', ['element', 'Fruit maudit'], "Les fruits qui donnent un pouvoir unique contre la capacité de nager — la loterie du diable.", 'legendary'],
      ['status', 'chapeau-de-paille', 'Équipage du Chapeau de Paille', ['scope', 'Équipage pirate'], "L'équipage de Luffy : une poignée de rêveurs devenus l'équipage le plus recherché des mers.", 'legendary'],
      ['profession', 'pirate', 'Pirate', ['sector', 'Mers & abordages'], "Depuis l'exécution de Gol D. Roger, le monde entier a pris la mer à la recherche du One Piece.", 'rare'],
      ['skill', 'haki', 'Haki', ['discipline', 'Volonté'], "La volonté matérialisée : l'observation qui anticipe, l'armement qui durcit, le roi qui terrasse.", 'epic'],
      ['artifact', 'thousand-sunny', 'Thousand Sunny', ['material', 'Navire · bois d\'Adam'], "Le navire-lion des Chapeaux de Paille, œuvre de Franky — le successeur bien-aimé du Vogue Merry.", 'epic'],
      ['status', 'marine', 'Marine', ['scope', 'Force mondiale'], "Le bras armé du Gouvernement Mondial — l'éternel poursuivant des pirates, de la Justice Absolue aux héros du peuple.", 'rare'],
      ['place', 'east-blue', 'East Blue', ['region', 'Mer orientale'], "La plus paisible des quatre mers — et le berceau de Luffy, Zoro, Nami, Usopp et Sanji.", 'common'],
      ['artifact', 'one-piece-tresor', 'Le One Piece', ['material', 'Trésor ultime'], "Le trésor que Roger a laissé « quelque part » sur Laugh Tale — le mot qui a lancé le Grand Âge de la Piraterie.", 'legendary'],
      ['artifact', 'ponegliphes', 'Ponéglyphes', ['material', 'Stèles indestructibles'], "Les stèles gravées qui portent l'histoire interdite du Siècle Oublié — seule Robin sait encore les lire.", 'epic'],
      ['place', 'marineford', 'Marineford', ['region', 'QG de la Marine'], "Le théâtre de la Guerre au Sommet : Barbe Blanche contre la Marine entière, pour la tête d'Ace.", 'epic'],
      ['status', 'yonko', 'Yonkō', ['scope', 'Empereurs'], "Les quatre Empereurs qui règnent sur la seconde moitié de Grand Line comme des forces de la nature.", 'legendary'],
      ['status', 'shichibukai', 'Shichibukai', ['scope', 'Grands Corsaires'], "Les sept pirates affranchis par le Gouvernement — corsaires un jour, menaces le lendemain.", 'epic'],
    ],
    relations: [
      ['monkey-d-luffy', 'appartient', 'chapeau-de-paille'], ['roronoa-zoro', 'appartient', 'chapeau-de-paille'], ['nami', 'appartient', 'chapeau-de-paille'], ['usopp', 'appartient', 'chapeau-de-paille'], ['sanji', 'appartient', 'chapeau-de-paille'], ['tony-tony-chopper', 'appartient', 'chapeau-de-paille'], ['nico-robin', 'appartient', 'chapeau-de-paille'],
      ['monkey-d-luffy', 'exerce', 'pirate'], ['roronoa-zoro', 'exerce', 'pirate'], ['shanks', 'exerce', 'pirate'], ['portgas-d-ace', 'exerce', 'pirate'],
      ['monkey-d-luffy', 'maitrise', 'haki'], ['shanks', 'maitrise', 'haki'], ['portgas-d-ace', 'maitrise', 'haki'], ['roronoa-zoro', 'maitrise', 'haki'],
      ['monkey-d-luffy', 'maitrise', 'fruit-du-demon'], ['tony-tony-chopper', 'maitrise', 'fruit-du-demon'], ['nico-robin', 'maitrise', 'fruit-du-demon'], ['portgas-d-ace', 'maitrise', 'fruit-du-demon'],
      ['shanks', 'allie', 'monkey-d-luffy'], ['portgas-d-ace', 'allie', 'monkey-d-luffy'],
      ['roronoa-zoro', 'rival', 'sanji'],
      ['franky', 'appartient', 'chapeau-de-paille'], ['brook', 'appartient', 'chapeau-de-paille'], ['jinbe', 'appartient', 'chapeau-de-paille'],
      ['franky', 'exerce', 'pirate'], ['brook', 'exerce', 'pirate'], ['jinbe', 'exerce', 'pirate'], ['gol-d-roger', 'exerce', 'pirate'], ['trafalgar-law', 'exerce', 'pirate'],
      ['franky', 'possede', 'thousand-sunny'], ['jinbe', 'maitrise', 'haki'], ['gol-d-roger', 'maitrise', 'haki'],
      ['trafalgar-law', 'maitrise', 'fruit-du-demon'], ['brook', 'maitrise', 'fruit-du-demon'], ['trafalgar-law', 'allie', 'monkey-d-luffy'],
      ['monkey-d-luffy', 'habite', 'east-blue'],
      ['barbe-blanche', 'appartient', 'yonko'], ['shanks', 'appartient', 'yonko'], ['buggy', 'appartient', 'yonko'],
      ['dracule-mihawk', 'appartient', 'shichibukai'], ['boa-hancock', 'appartient', 'shichibukai'], ['crocodile', 'appartient', 'shichibukai'],
      ['dracule-mihawk', 'rival', 'roronoa-zoro'], ['crocodile', 'rival', 'monkey-d-luffy'], ['boa-hancock', 'allie', 'monkey-d-luffy'],
      ['barbe-blanche', 'allie', 'portgas-d-ace'], ['monkey-d-garp', 'appartient', 'marine'], ['monkey-d-garp', 'rival', 'gol-d-roger'],
      ['sabo', 'allie', 'monkey-d-luffy'], ['sabo', 'maitrise', 'fruit-du-demon'], ['boa-hancock', 'maitrise', 'fruit-du-demon'], ['crocodile', 'maitrise', 'fruit-du-demon'], ['buggy', 'maitrise', 'fruit-du-demon'], ['barbe-blanche', 'maitrise', 'fruit-du-demon'],
      ['gol-d-roger', 'possede', 'one-piece-tresor'], ['nico-robin', 'maitrise', 'ponegliphes'],
    ],
  },
];

// ─── Fetch images ────────────────────────────────────────────────────────────
async function jikanCast(malId) {
  const j = await getJSON(`${JIKAN}/anime/${malId}/characters`);
  const map = new Map(); // nom → { img, role, va } (role = Main/Supporting ; va = doubleurs JP/VF-EN)
  for (const c of j?.data ?? []) {
    const img = c.character?.images?.webp?.image_url || c.character?.images?.jpg?.image_url || null;
    if (!(c.character?.name && img && !img.includes('questionmark'))) continue;
    const vas = Array.isArray(c.voice_actors) ? c.voice_actors : [];
    const jp = vas.filter((v) => v.language === 'Japanese').map((v) => displayName(String(v.person?.name || ''))).filter(Boolean).slice(0, 3);
    const en = vas.filter((v) => v.language === 'French' || v.language === 'English').map((v) => displayName(String(v.person?.name || ''))).filter(Boolean).slice(0, 2);
    const va = jp.length || en.length ? { jp, en } : null;
    map.set(c.character.name, { img, role: c.role || null, va, fav: typeof c.favorites === 'number' ? c.favorites : 0, mal: c.character?.mal_id ?? null });
  }
  return map;
}

function entry(slug, type, name, universe, summary, rarity, attributes, image_url) {
  return { slug, type, name, is_fiction: true, universe, summary, description: summary, image_url: image_url ?? null, attributes, rarity };
}

const slugify = (s) =>
  String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// Noms MAL en « Nom, Prénom » → « Prénom Nom » (les héros à « D. » sont curés, donc épargnés du mass import).
const displayName = (s) => (s.includes(', ') ? s.split(/,\s*/).reverse().join(' ') : s);
const GARBAGE_NAME = /[<>]|https?:|\/wiki\/|\.(?:png|jpe?g|gif)/i;
const firstSentence = (s, n = 150) => String(s || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s/)[0].slice(0, n);
// Capture une description d'API en descRaw + langue (pour enrichissement + traduction FR future).
const descA = (t, lang) => (t && String(t).trim().length > 30 ? { descRaw: String(t).replace(/\s+/g, ' ').trim().slice(0, 1500), descLang: lang } : {});
const purge = (o) => { for (const k of Object.keys(o)) { const v = o[k]; if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) delete o[k]; } return o; };
// Popularité MAL (favorites) → palier de rareté : le tri du registre par rareté devient un tri par popularité.
const favTier = (n) => (n >= 25000 ? 'legendary' : n >= 5000 ? 'epic' : n >= 600 ? 'rare' : 'common');
const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };
const rarityMax = (a, b) => (RANK[b] > (RANK[a] ?? 0) ? b : a);

async function main() {
  const entries = [];
  const relations = [];
  const seen = new Set();
  const add = (e) => { if (seen.has(e.slug)) { console.warn('  ⚠ slug dupliqué ignoré:', e.slug); return; } seen.add(e.slug); entries.push(e); };

  // Sources dédiées (une requête chacune)
  console.log('→ Dragon Ball API…');
  const dbChars = (await getJSON('https://dragonball-api.com/api/characters?limit=100'))?.items ?? [];
  const dbByName = new Map(dbChars.map((c) => [c.name, c]));
  console.log(`  ${dbChars.length} persos DB`);
  console.log('→ One Piece API (FR)…');
  const opChars = (await getJSON('https://api.api-onepiece.com/v2/characters/fr')) ?? [];
  const opByName = new Map((Array.isArray(opChars) ? opChars : []).map((c) => [c.name, c]));
  console.log(`  ${Array.isArray(opChars) ? opChars.length : 0} persos OP`);
  // Cache Jikan `about` (bio EN complète par mal_id) → descRaw des personnages (curés + masse).
  // Produit par scripts/fetch-jikan-about.mjs (résumable). Absent = pas d'enrichissement bio, sans casser.
  const aboutCache = existsSync('data/jikan-about.json') ? JSON.parse(readFileSync('data/jikan-about.json', 'utf8')) : {};
  const aboutOf = (malId) => (malId != null && aboutCache[malId]?.about ? aboutCache[malId].about : null);
  console.log(`  cache jikan-about : ${Object.values(aboutCache).filter((v) => v.about).length} bios`);

  // Fallback : match par tokens significatifs (≥3 lettres) quand le nom MAL exact diffère.
  const tokens = (s) => new Set(String(s).toLowerCase().normalize('NFD').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((t) => t.length >= 3));
  const fuzzyGet = (cast, name) => {
    const want = tokens(name);
    for (const [k, v] of cast) {
      const have = tokens(k);
      let hit = 0;
      for (const t of want) if (have.has(t)) hit++;
      if (hit >= Math.min(2, want.size) && hit > 0) return v.img;
    }
    return null;
  };

  for (const u of UNIVERSES) {
    console.log(`→ ${u.label} (Jikan ${u.malId})…`);
    const cast = await jikanCast(u.malId);
    // Source de PREMIÈRE apparition (name → malId) : porte l'axe « partie » JoJo (partByMal).
    const srcByName = new Map();
    for (const k of cast.keys()) srcByName.set(k, u.malId);
    await sleep(1100); // rate limit Jikan
    for (const extra of u.extraMalIds ?? []) {
      const more = await jikanCast(extra);
      for (const [k, v] of more) if (!cast.has(k)) { cast.set(k, v); srcByName.set(k, extra); }
      await sleep(1100);
    }
    console.log(`  ${cast.size} portraits MAL`);
    const partOf = (malName) => (u.partByMal ? u.partByMal[srcByName.get(malName)] : undefined);

    for (const c of u.chars) {
      const cv = cast.get(c.mal);
      let img = cv?.img ?? fuzzyGet(cast, c.mal) ?? null;
      const attributes = { role: c.role };
      if (c.aff) attributes.affiliation = c.aff;
      const pt = partOf(c.mal);
      if (pt) attributes.partie = pt;
      if (cv?.va) attributes.voiceActors = cv.va; // doubleurs JP/VF-EN pour les curés aussi
      if (cv?.fav) attributes.favorites = cv.fav;
      // descRaw = bio brute EN (Jikan `about`) → traduction FR future. Jamais affichée telle quelle.
      const cAbout = aboutOf(cv?.mal);
      if (cAbout) Object.assign(attributes, descA(cAbout, 'en'));
      // Champs de profondeur optionnels (le dossier perso les lit génériquement : onglet Histoire, bannière credo…)
      for (const k of ['status', 'nindo', 'nindoLabel', 'bio', 'personality', 'quotes', 'trivia']) if (c[k]) attributes[k] = c[k];
      // Dragon Ball : image détourée + race/ki de l'API dédiée
      if (u.dbApi && c.db) {
        const d = dbByName.get(c.db);
        if (d?.image) img = d.image;
        if (d?.race) attributes.race = d.race;
        if (d?.ki) attributes.ki = d.ki;
        if (!attributes.descRaw && d?.description) Object.assign(attributes, descA(d.description, 'es')); // repli ES si pas de bio EN
      }
      // One Piece : prime + équipage FR de l'API dédiée
      if (u.opApi && c.op) {
        const o = opByName.get(c.op);
        if (o?.bounty) attributes.bounty = `${o.bounty} Berrys`;
        if (o?.crew?.name) attributes.crew = fixCrewName(o.crew.name);
        if (o?.job) attributes.occupation = o.job;
      }
      // Dernier recours : recherche globale Jikan (les casts MAL de certaines séries sont épars, ex. Initial D).
      if (!img) {
        const s = await getJSON(`${JIKAN}/characters?q=${encodeURIComponent(c.name)}&limit=1`);
        img = s?.data?.[0]?.images?.webp?.image_url || s?.data?.[0]?.images?.jpg?.image_url || null;
        if (img) console.log(`  ↳ portrait via recherche globale pour ${c.name}`);
        await sleep(1100);
      }
      if (!img) console.warn(`  ⚠ pas de portrait pour ${c.name} (mal: ${c.mal})`);
      add(entry(c.slug, 'character', c.name, u.label, c.summary, rarityMax(c.rarity, favTier(cv?.fav || 0)), attributes, img));
    }
    for (const [type, slug, name, [k, v], summary, rarity] of u.entities) add(entry(slug, type, name, u.label, summary, rarity, { [k]: v }));

    // ── Import de MASSE : casting COMPLET de l'univers (Jikan), au-delà des persos curés. ──
    // On épargne les persos déjà curés (par nom MAL et par slug) pour ne pas les dupliquer ;
    // collision cross-univers → suffixe par univers.
    const curatedMal = new Set(u.chars.map((c) => c.mal));
    const curatedSlug = new Set(u.chars.map((c) => c.slug));
    let massU = 0;
    for (const [rawName, { img, role, va, fav, mal }] of cast) {
      if (!rawName || GARBAGE_NAME.test(rawName) || curatedMal.has(rawName)) continue;
      const name = displayName(rawName);
      let slug = slugify(name);
      if (!slug || slug.length < 2 || curatedSlug.has(slug)) continue;
      if (seen.has(slug)) { slug = `${slug}-${slugify(u.label)}`; if (seen.has(slug)) continue; }
      const roleFr = role === 'Main' ? 'Personnage principal' : 'Personnage secondaire';
      // Rareté = palier de POPULARITÉ (favorites MAL) → tri du registre = tri par popularité.
      add(entry(slug, 'character', name, u.label, `${roleFr} de ${u.label}.`, favTier(fav), purge({ role: roleFr, favorites: fav || undefined, voiceActors: va || undefined, partie: partOf(rawName), ...descA(aboutOf(mal), 'en') }), img));
      massU++;
    }
    console.log(`  + ${massU} persos (casting complet)`);

    for (const [from, rel, to] of u.relations) relations.push({ from, to, relation: rel });
  }

  // ── Import de MASSE des ENTITÉS via les API dédiées (One Piece FR + Dragon Ball) ──
  const addEnt = (slug, type, name, universe, summary, rarity, attrs, img) => {
    let s = slug;
    if (!s || seen.has(s)) { if (seen.has(s)) s = `${slug}-${slugify(universe)}`; }
    if (!s || seen.has(s)) return false;
    add(entry(s, type, name, universe, summary, rarity, attrs, img ?? null));
    return true;
  };

  console.log('→ One Piece — entités (fruits, équipages, hakis, gears)…');
  const opFruits = (await getJSON('https://api.api-onepiece.com/v2/fruits/fr')) ?? [];
  let nf = 0;
  for (const f of Array.isArray(opFruits) ? opFruits : []) {
    if (!f?.name) continue;
    const type = String(f.type || '');
    // Grade de rareté par sous-type canonique : Zoan Mythique = le plus rare, Logia/Zoan Antique au-dessus du lot.
    const rarity = /mythique/i.test(type) ? 'legendary' : /Logia|antique/i.test(type) ? 'epic' : 'rare';
    if (addEnt(slugify(f.name), 'power', f.name, 'One Piece', firstSentence(f.description) || `Fruit du Démon${type ? ' de type ' + type : ''}.`, rarity, purge({ element: `Fruit du Démon${type ? ' · ' + type : ''}`, fruit_type: type || null, roman_name: f.roman_name || null, category: 'Fruit du Démon', ...descA(f.description, 'fr') }))) nf++;
  }
  console.log(`  + ${nf} Fruits du Démon (power)`);
// Typo de l'API api-onepiece (« Armarda ») corrigée à l'ingestion — sinon icône + slug décrochent.
  const fixCrewName = (s) => (s === 'Armarda du Chapeau de Paille' ? 'Armada du Chapeau de Paille' : s);
  const opCrews = (await getJSON('https://api.api-onepiece.com/v2/crews/fr')) ?? [];
  let ncr = 0;
  for (const cr of Array.isArray(opCrews) ? opCrews : []) {
    if (!cr?.name) continue;
    cr.name = fixCrewName(cr.name);
    const rarity = cr.is_yonko ? 'legendary' : Number(cr.total_prime) > 1e9 ? 'epic' : 'rare';
    if (addEnt(slugify(cr.name), 'status', cr.name, 'One Piece', firstSentence(cr.description) || 'Équipage de pirates.', rarity, purge({ scope: 'Équipage pirate', roman_name: cr.roman_name || null, total_prime: cr.total_prime ? `${cr.total_prime} Berrys` : null, category: 'Équipage', ...descA(cr.description, 'fr') }))) ncr++;
  }
  console.log(`  + ${ncr} équipages (status)`);
  const opHakis = (await getJSON('https://api.api-onepiece.com/v2/hakis/fr')) ?? [];
  let nh = 0;
  for (const h of Array.isArray(opHakis) ? opHakis : []) if (h?.name && addEnt(slugify(h.name), 'skill', h.name, 'One Piece', firstSentence(h.description) || 'Type de Haki.', 'epic', purge({ discipline: 'Haki', roman_name: h.roman_name || null, category: 'Haki', ...descA(h.description, 'fr') }))) nh++;
  const opGears = (await getJSON('https://api.api-onepiece.com/v2/luffy-gears/fr')) ?? [];
  let ng = 0;
  for (const g of Array.isArray(opGears) ? opGears : []) if (g?.name && addEnt(slugify(g.name), 'skill', g.name, 'One Piece', firstSentence(g.description) || 'Transformation de Luffy.', 'epic', { discipline: 'Gear (Luffy)', category: 'Gear', ...descA(g.description, 'fr') })) { ng++; relations.push({ from: slugify(g.name), to: 'monkey-d-luffy', relation: 'maitrise' }); }
  console.log(`  + ${nh} hakis + ${ng} gears (skill)`);

  // ── One Piece — NOUVELLES collections via api-onepiece (navires, épées, dials, sagas) ──
  console.log('→ One Piece — navires / épées / dials / sagas…');
  const opBoats = (await getJSON('https://api.api-onepiece.com/v2/boats/fr')) ?? [];
  let nbo = 0;
  for (const b of Array.isArray(opBoats) ? opBoats : []) {
    if (!b?.name) continue;
    const rarity = /Roger|Barbe Blanche|Chapeau de Paille|Moby|Oro Jackson|Thousand|Going/i.test(b.name) ? 'epic' : 'rare';
    if (addEnt(slugify(b.name), 'artifact', b.name, 'One Piece', firstSentence(b.description) || `${b.type || 'Navire'} de One Piece.`, rarity, purge({ material: b.type || 'Navire', boat_class: b.type || null, origin: b.crew?.name || null, roman_name: b.roman_name || null, category: 'Navire', ...descA(b.description, 'fr') }))) {
      nbo++;
      const cs = b.crew?.name ? slugify(b.crew.name) : null;
      if (cs && seen.has(cs)) relations.push({ from: slugify(b.name), to: cs, relation: 'appartient' });
    }
  }
  const opSwords = (await getJSON('https://api.api-onepiece.com/v2/swords/fr')) ?? [];
  let nsw = 0;
  for (const s of Array.isArray(opSwords) ? opSwords : []) {
    if (!s?.name) continue;
    // Grade MEITO canonique (api swords.category) = l'axe de collection : Saijō Ō Wazamono (12 suprêmes) →
    // Ō Wazamono (21) → Ryō Wazamono (50) → Wazamono. Pilote la rareté. type = classe de lame (Kokutō…).
    const grade = String(s.category || '').trim();
    const rarity = /Saijo|Saijō/i.test(grade) ? 'legendary' : /Ô Wazamono|O Wazamono/i.test(grade) ? 'epic' : grade ? 'rare' : 'rare';
    if (addEnt(slugify(s.name), 'artifact', s.name, 'One Piece', firstSentence(s.description) || 'Épée légendaire.', rarity, purge({ material: 'Sabre', blade_type: s.type || null, meito_grade: grade || null, roman_name: s.roman_name || null, category: 'Arme & outil', ...descA(s.description, 'fr') }))) nsw++;
  }
  const opDials = (await getJSON('https://api.api-onepiece.com/v2/dials/fr')) ?? [];
  let ndi = 0;
  for (const d of Array.isArray(opDials) ? opDials : []) if (d?.name && addEnt(slugify(d.name), 'artifact', d.name, 'One Piece', firstSentence(d.description) || 'Coquillage-outil de Skypiea.', 'rare', purge({ material: 'Dial (coquillage)', roman_name: d.roman_name || null, category: 'Relique', ...descA(d.description, 'fr') }))) ndi++;
  const opSagas = (await getJSON('https://api.api-onepiece.com/v2/sagas/fr')) ?? [];
  let nsa = 0;
  for (const sg of Array.isArray(opSagas) ? opSagas : []) if (sg?.title && addEnt(slugify(sg.title), 'status', sg.title, 'One Piece', firstSentence(sg.description) || 'Saga de One Piece.', 'rare', purge({ scope: 'Saga narrative', category: 'Saga', ...descA(sg.description, 'fr') }))) nsa++;
  console.log(`  + ${nbo} navires + ${nsw} épées + ${ndi} dials + ${nsa} sagas (One Piece)`);

  console.log('→ Dragon Ball — entités (transformations, planètes)…');
  const dbTrans = (await getJSON('https://dragonball-api.com/api/transformations?limit=100'));
  let nt = 0;
  for (const t of (dbTrans?.items || dbTrans || [])) if (t?.name && addEnt(slugify(t.name), 'skill', t.name, 'Dragon Ball', `Transformation de puissance${t.ki ? ` (Ki ${t.ki})` : ''}.`, 'epic', purge({ discipline: 'Transformation', ki: t.ki || null, category: 'Transformation' }), t.image || null)) nt++;
  const dbPlanets = (await getJSON('https://dragonball-api.com/api/planets?limit=100'));
  let np = 0;
  for (const pl of (dbPlanets?.items || dbPlanets || [])) if (pl?.name && addEnt(slugify(pl.name), 'place', pl.name, 'Dragon Ball', firstSentence(pl.description) || 'Planète.', 'rare', { region: pl.isDestroyed ? 'Planète détruite' : 'Planète', category: 'Planète', ...descA(pl.description, 'es') }, pl.image || null)) np++;
  console.log(`  + ${nt} transformations (skill) + ${np} planètes (place)`);

  // ── JoJo : STANDS individuels (curés FR) — la manifestation psychique de chaque combattant. ──
  // [slug, nom, porteurSlug, rareté, résumé]. Porteurs curés + quelques slugs de masse (validés par
  // le filtre de relations : slug inconnu → warning, pas de casse).
  const JOJO_STANDS = [
    ['star-platinum', 'Star Platinum', 'jotaro-kujo', 'legendary', "Le Stand de Jotaro : précision d'orfèvre, force et vitesse absolues — et l'arrêt du temps une fois éveillé (Star Platinum : The World)."],
    ['the-world', 'The World', 'dio-brando', 'legendary', "ZA WARUDO ! Le Stand de Dio arrête le temps — neuf secondes pour écraser le monde, un rouleau compresseur en option."],
    ['crazy-diamond', 'Crazy Diamond', 'josuke-higashikata', 'epic', "Le Stand de Josuke répare tout ce qu'il touche — objets, blessures, criminels transformés en mur. Tout, sauf Josuke lui-même."],
    ['gold-experience', 'Gold Experience', 'giorno-giovanna', 'epic', "Le Stand de Giorno insuffle la vie : un objet devient plante ou animal, et frapper la vie renvoie la douleur à l'agresseur."],
    ['gold-experience-requiem', 'Gold Experience Requiem', 'giorno-giovanna', 'legendary', "L'éveil ultime par la Flèche : GER annule toute action et remet « à zéro » — même la mort de son adversaire, pour l'éternité."],
    ['stone-free', 'Stone Free', 'jolyne-cujoh', 'epic', "Le Stand de Jolyne la détisse en fil indestructible : s'évader, écouter aux murs, recoudre son propre corps — la liberté faite corde."],
    ['hermit-purple', 'Hermit Purple', 'joseph-joestar', 'rare', "Les lianes psychiques de Joseph : photographier l'invisible en fracassant un appareil photo, et fouetter à distance."],
    ['hierophant-green', 'Hierophant Green', 'noriaki-kakyoin', 'epic', "Le Stand émeraude de Kakyoin : marionnettiste à distance, gardien du champ des 20 mètres — Emerald Splash !"],
    ['silver-chariot', 'Silver Chariot', 'jean-pierre-polnareff', 'epic', "Le chevalier d'argent de Polnareff : une rapière plus rapide que l'œil, une armure qui se largue pour doubler la vitesse."],
    ['the-fool', 'The Fool', 'iggy', 'rare', "Le Stand de sable d'Iggy : il se reforme à l'infini, planeur un instant, mâchoire d'acier l'instant d'après."],
    ['magicians-red', "Magician's Red", 'muhammad-avdol', 'rare', "Le Stand de feu d'Avdol : brasier vivant à tête d'aigle, détecteur de mensonges incandescent (Crossfire Hurricane)."],
    ['the-hand', 'The Hand', 'okuyasu-nijimura', 'rare', "Le Stand d'Okuyasu EFFACE l'espace de la main droite — ce qui est effacé disparaît, où ? Même lui ne le sait pas."],
    ['echoes', 'Echoes', 'koichi-hirose', 'rare', "Le Stand de Koichi grandit avec lui : Act 1 murmure, Act 2 piège les onomatopées, Act 3 écrase de gravité — 3 FREEZE !"],
    ['heavens-door', "Heaven's Door", 'rohan-kishibe', 'epic', "Le Stand de Rohan ouvre les gens comme des livres : lire leur vie, y écrire des ordres — « je ne peux pas attaquer Rohan Kishibe »."],
    ['killer-queen', 'Killer Queen', 'yoshikage-kira', 'legendary', "Le Stand de Kira transforme tout ce qu'il touche en bombe — première bombe de contact, Sheer Heart Attack autonome, et Bites the Dust qui boucle le temps."],
    ['sticky-fingers', 'Sticky Fingers', 'bruno-bucciarati', 'epic', "Le Stand de Bucciarati ouvre des fermetures éclair sur tout : corps, murs, espace — se démonter pour esquiver, ranger un bras en poche."],
    ['king-crimson', 'King Crimson', 'diavolo', 'legendary', "Le Stand de Diavolo EFFACE le temps : dix secondes annulées dont lui seul voit le déroulement — « tu n'atteindras jamais la vérité »."],
    ['made-in-heaven', 'Made in Heaven', 'enrico-pucci', 'legendary', "L'ascension de Pucci : accélérer le temps jusqu'à recréer l'univers entier — le paradis selon DIO, un monde où chacun connaît son destin."],
    ['whitesnake', 'Whitesnake', 'enrico-pucci', 'epic', "Le premier Stand de Pucci vole l'esprit en disques : Stand et souvenirs extraits comme des CD, rejouables dans n'importe quel corps."],
    ['sex-pistols', 'Sex Pistols', 'guido-mista', 'rare', "Six petits tireurs lunatiques (le n°4 n'existe pas) qui guident les balles de Mista — tant qu'ils sont nourris."],
  ];
  // Partie d'origine de chaque Stand (l'axe canon JoJo, aussi porté par les persos via partByMal).
  const STAND_PART = {
    'star-platinum': 'Partie 3', 'the-world': 'Partie 3', 'hermit-purple': 'Partie 3', 'hierophant-green': 'Partie 3',
    'silver-chariot': 'Partie 3', 'the-fool': 'Partie 3', 'magicians-red': 'Partie 3',
    'crazy-diamond': 'Partie 4', 'the-hand': 'Partie 4', 'echoes': 'Partie 4', 'heavens-door': 'Partie 4', 'killer-queen': 'Partie 4',
    'gold-experience': 'Partie 5', 'gold-experience-requiem': 'Partie 5', 'sticky-fingers': 'Partie 5', 'king-crimson': 'Partie 5', 'sex-pistols': 'Partie 5',
    'stone-free': 'Partie 6', 'made-in-heaven': 'Partie 6', 'whitesnake': 'Partie 6',
  };
  let nst = 0;
  for (const [slug, name, owner, rarity, summary] of JOJO_STANDS) {
    if (addEnt(slug, 'power', name, "JoJo's Bizarre Adventure", summary, rarity, purge({ element: 'Stand', category: 'Stand', partie: STAND_PART[slug] }))) {
      relations.push({ from: owner, to: slug, relation: 'maitrise' });
      nst++;
    }
  }
  console.log(`  + ${nst} Stands individuels (JoJo)`);

  // ── Enrichissement One Piece : croiser les 786 persos api-onepiece (données FR riches) avec le
  //    registre par tokens (« Monkey D Luffy » ↔ slug « luffy-monkey-d ») → primes/équipages/fruits
  //    + relations perso→équipage (appartient) & perso→fruit (maitrise). Limité aux persos de MASSE. ──
  console.log('→ One Piece — enrichissement (primes, équipages, fruits)…');
  const opRoster = entries.filter((e) => e.universe === 'One Piece' && e.type === 'character');
  const tokset = (s) => new Set(slugify(s).split('-').filter((t) => t.length >= 3));
  const opIndex = opRoster.map((e) => ({ e, toks: tokset(e.name) }));
  const matchOp = (name) => {
    const want = tokset(name);
    if (!want.size) return null;
    let best = null, bestHit = 0;
    for (const cand of opIndex) {
      let hit = 0; for (const t of want) if (cand.toks.has(t)) hit++;
      if (hit > bestHit && hit >= Math.min(2, want.size)) { bestHit = hit; best = cand.e; }
    }
    return best;
  };
  let opEnr = 0, opRelC = 0, opRelF = 0;
  const opUsed = new Set();
  for (const oc of (Array.isArray(opChars) ? opChars : [])) {
    if (!oc?.name) continue;
    const e = matchOp(oc.name);
    if (!e || opUsed.has(e.slug)) continue; // 1 perso API ↔ 1 entrée registre
    if (!/^Personnage (principal|secondaire)$/.test(e.attributes.role || '')) continue; // persos de masse seulement
    opUsed.add(e.slug);
    const a = e.attributes;
    if (oc.bounty && a.bounty == null) a.bounty = `${oc.bounty} Berrys`;
    if (oc.job && a.occupation == null) a.occupation = oc.job;
    if (oc.age && a.age == null) a.age = oc.age;
    if (oc.crew?.name && a.crew == null) a.crew = fixCrewName(oc.crew.name);
    if (oc.fruit?.name && a.fruit == null) a.fruit = oc.fruit.name;
    const bits = [oc.crew?.name ? fixCrewName(oc.crew.name) : null, oc.bounty ? `prime ${oc.bounty} Berrys` : null].filter(Boolean);
    if (bits.length) e.summary = `${e.summary.replace(/\.$/, '')} — ${bits.join(', ')}.`;
    if (oc.crew?.name) { const cs = slugify(fixCrewName(oc.crew.name)); if (seen.has(cs) && cs !== e.slug) { relations.push({ from: e.slug, to: cs, relation: 'appartient' }); opRelC++; } }
    if (oc.fruit?.name) { const fs = slugify(oc.fruit.name); if (seen.has(fs) && fs !== e.slug) { relations.push({ from: e.slug, to: fs, relation: 'maitrise' }); opRelF++; } }
    opEnr++;
  }
  console.log(`  ✓ ${opEnr} persos One Piece enrichis, +${opRelC} liens équipage, +${opRelF} liens fruit`);

  // ── AXES TAXONOMIQUES par univers (organisation canon → hubs /learn/akasha/u/*) ──────────
  // Matcher par NOM (les slugs de masse varient) : motif multi-mots = includes ; mot seul =
  // égalité de TOKEN exact (« hisoka » ↔ « Hisoka Morow » ✓, mais « rem » n'attrape pas « Remi »).
  const nameIs = (e, pat) => {
    const n = e.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (pat.includes(' ')) return n.includes(pat);
    return n === pat || n.split(/[\s.,'’-]+/).includes(pat);
  };

  // 1) One Piece — FACTION (heuristique crew / occupation / prime)
  let nFac = 0;
  for (const e of entries) {
    if (e.universe !== 'One Piece' || e.type !== 'character') continue;
    const a = e.attributes;
    if (a.faction) continue;
    const crew = String(a.crew || '');
    const occ = String(a.occupation || '');
    let f = null;
    if (/marine/i.test(crew) || /amiral|colonel|sergent|capitaine de la marine|instructeur|soldat/i.test(occ)) f = 'Marine';
    else if (/cipher pol|cp\s?-?[09]/i.test(crew + ' ' + occ)) f = 'Gouvernement Mondial';
    else if (/revolutionnaire|révolutionnaire/i.test(crew + ' ' + occ)) f = 'Révolutionnaire';
    else if (/équipage|equipage|pirate|armarda|flotte|barbe|bonney|firetank|kid/i.test(crew) || /pirate|corsaire|capitaine|second du navire/i.test(occ) || a.bounty || a.total_prime) f = 'Pirate';
    else if (crew) f = 'Civil';
    if (f) { a.faction = f; nFac++; }
  }
  console.log(`  ✓ ${nFac} factions One Piece posées`);

  // 2) Death Note — CAMP (duel Kira vs L : curation par nom)
  const DN_CAMPS = [
    ['light yagami', 'Kira'], ['misa amane', 'Kira'], ['teru mikami', 'Kira'], ['kiyomi takada', 'Kira'],
    ['kyosuke higuchi', 'Yotsuba'], ['reiji namikawa', 'Yotsuba'], ['shingo mido', 'Yotsuba'], ['suguru shimura', 'Yotsuba'],
    ['eiichi takahashi', 'Yotsuba'], ['masahiko kida', 'Yotsuba'], ['arayoshi hatori', 'Yotsuba'], ['takeshi ooi', 'Yotsuba'],
    ['l lawliet', 'Cellule d’enquête'], ['soichiro yagami', 'Cellule d’enquête'], ['touta matsuda', 'Cellule d’enquête'],
    ['shuichi aizawa', 'Cellule d’enquête'], ['kanzo mogi', 'Cellule d’enquête'], ['hideki ide', 'Cellule d’enquête'],
    ['hirokazu ukita', 'Cellule d’enquête'], ['watari', 'Cellule d’enquête'], ['quillsh wammy', 'Cellule d’enquête'],
    ['near', 'SPK'], ['nate river', 'SPK'], ['anthony rester', 'SPK'], ['stephen gevanni', 'SPK'], ['halle lidner', 'SPK'],
    ['mello', 'Wammy’s House'], ['mihael keehl', 'Wammy’s House'], ['mail jeevas', 'Wammy’s House'], ['matt', 'Wammy’s House'],
    ['ryuk', 'Shinigami'], ['rem', 'Shinigami'], ['sidoh', 'Shinigami'], ['gelus', 'Shinigami'], ['shinigami king', 'Shinigami'],
  ];
  let nCamp = 0;
  for (const e of entries) {
    if (e.universe !== 'Death Note' || e.type !== 'character' || e.attributes.camp) continue;
    const hit = DN_CAMPS.find(([pat]) => nameIs(e, pat));
    if (hit) { e.attributes.camp = hit[1]; nCamp++; }
  }
  console.log(`  ✓ ${nCamp} camps Death Note posés`);

  // 3) Initial D — ÉCURIES + COLS des pilotes, cols en LIEUX, duo pilote↔voiture
  const ID_PILOTS = [
    ['takumi fujiwara', { aff: 'Project D', col: 'Mont Akina', car: 'ae86-trueno' }],
    ['bunta fujiwara', { col: 'Mont Akina' }],
    ['keisuke takahashi', { aff: 'Project D', col: 'Mont Akagi', car: 'rx7-fd' }],
    ['ryosuke takahashi', { aff: 'Project D', col: 'Mont Akagi' }],
    ['takeshi nakazato', { aff: 'Myogi NightKids', col: 'Mont Myōgi', car: 'r32-gtr' }],
    ['shingo shoji', { aff: 'Myogi NightKids', col: 'Mont Myōgi' }],
    ['koichiro iketani', { aff: 'Akina SpeedStars', col: 'Mont Akina' }],
    ['kenji', { aff: 'Akina SpeedStars', col: 'Mont Akina' }],
    ['itsuki takeuchi', { aff: 'Akina SpeedStars', col: 'Mont Akina' }],
    ['mako sato', { aff: 'Impact Blue', col: 'Col d’Usui', car: 'sileighty' }],
    ['sayuki', { aff: 'Impact Blue', col: 'Col d’Usui' }],
    ['kyoichi sudo', { aff: 'Team Emperor', col: 'Irohazaka', car: 'lancer-evo3' }],
    ['seiji iwaki', { aff: 'Team Emperor', col: 'Irohazaka' }],
  ];
  let nPil = 0;
  for (const e of entries) {
    if (e.universe !== 'Initial D' || e.type !== 'character') continue;
    const hit = ID_PILOTS.find(([pat]) => nameIs(e, pat));
    if (!hit) continue;
    const [, cfg] = hit;
    if (cfg.aff && !e.attributes.affiliation) e.attributes.affiliation = cfg.aff;
    if (cfg.col) e.attributes.col = cfg.col;
    if (cfg.car) relations.push({ from: e.slug, to: cfg.car, relation: 'possede' });
    nPil++;
  }
  const ID_COLS = [
    ['mont-akina', 'Mont Akina', 'Le col du duel : le downhill le plus célèbre du Kantō, territoire de la Hachi-Roku du tofu Fujiwara.', 'epic', 'Préfecture de Gunma'],
    ['mont-akagi', 'Mont Akagi', 'Le fief des Akagi RedSuns : la montagne des frères Takahashi et de la FC/FD.', 'rare', 'Préfecture de Gunma'],
    ['mont-myogi', 'Mont Myōgi', 'Le territoire des Myogi NightKids : lignes rapides et gardes-corps qui pardonnent peu.', 'rare', 'Préfecture de Gunma'],
    ['col-usui', 'Col d’Usui', 'Le circuit des Impact Blue : virages en C historiques, royaume de la Sileighty de Mako & Sayuki.', 'rare', 'Frontière Gunma / Nagano'],
    ['irohazaka', 'Irohazaka', 'Les 48 virages en épingle de Nikkō : le terrain de chasse du Team Emperor — et du saut de l’AE86.', 'epic', 'Préfecture de Tochigi'],
  ];
  let nCols = 0;
  for (const [slug, name, summary, rarity, region] of ID_COLS) {
    if (addEnt(slug, 'place', name, 'Initial D', summary, rarity, { region, col: name, category: 'Lieu' })) nCols++;
  }
  console.log(`  ✓ ${nPil} pilotes Initial D (écurie/col) + ${nCols} cols en lieux`);

  // 4) Bleach — RACES SPIRITUELLES + DIVISIONS du Gotei 13 (curation par nom)
  const BLEACH_TAXO = [
    // [motif nom, race, division]
    ['ichigo kurosaki', 'Shinigami', null], ['rukia kuchiki', 'Shinigami', '13ᵉ division'],
    ['renji abarai', 'Shinigami', '6ᵉ division'], ['byakuya kuchiki', 'Shinigami', '6ᵉ division'],
    ['genryuusai', 'Shinigami', '1ʳᵉ division'], ['yamamoto', 'Shinigami', '1ʳᵉ division'],
    ['chojiro sasakibe', 'Shinigami', '1ʳᵉ division'],
    ['suì-fēng', 'Shinigami', '2ᵉ division'], ['soi fon', 'Shinigami', '2ᵉ division'], ['soifon', 'Shinigami', '2ᵉ division'],
    ['marechiyo', 'Shinigami', '2ᵉ division'], ['yoruichi', 'Shinigami', '2ᵉ division'],
    ['gin ichimaru', 'Shinigami', '3ᵉ division'], ['izuru kira', 'Shinigami', '3ᵉ division'],
    ['retsu unohana', 'Shinigami', '4ᵉ division'], ['isane kotetsu', 'Shinigami', '4ᵉ division'], ['hanatarou', 'Shinigami', '4ᵉ division'], ['hanataro', 'Shinigami', '4ᵉ division'],
    ['sousuke aizen', 'Shinigami', '5ᵉ division'], ['sosuke aizen', 'Shinigami', '5ᵉ division'], ['momo hinamori', 'Shinigami', '5ᵉ division'], ['shinji hirako', 'Visored', '5ᵉ division'],
    ['sajin komamura', 'Shinigami', '7ᵉ division'], ['tetsuzaemon', 'Shinigami', '7ᵉ division'],
    ['shunsui', 'Shinigami', '8ᵉ division'], ['nanao ise', 'Shinigami', '8ᵉ division'],
    ['kaname tousen', 'Shinigami', '9ᵉ division'], ['kaname tosen', 'Shinigami', '9ᵉ division'], ['shuuhei hisagi', 'Shinigami', '9ᵉ division'], ['shuhei hisagi', 'Shinigami', '9ᵉ division'], ['kensei muguruma', 'Visored', '9ᵉ division'],
    ['hitsugaya', 'Shinigami', '10ᵉ division'], ['rangiku matsumoto', 'Shinigami', '10ᵉ division'],
    ['kenpachi zaraki', 'Shinigami', '11ᵉ division'], ['yachiru', 'Shinigami', '11ᵉ division'], ['ikkaku madarame', 'Shinigami', '11ᵉ division'], ['yumichika', 'Shinigami', '11ᵉ division'],
    ['mayuri kurotsuchi', 'Shinigami', '12ᵉ division'], ['nemu kurotsuchi', 'Shinigami', '12ᵉ division'], ['kisuke urahara', 'Shinigami', '12ᵉ division'],
    ['juushirou ukitake', 'Shinigami', '13ᵉ division'], ['jushiro ukitake', 'Shinigami', '13ᵉ division'], ['kaien shiba', 'Shinigami', '13ᵉ division'],
    ['isshin', 'Shinigami', '10ᵉ division'],
    // Hollows / Arrancars / Espada
    ['ulquiorra', 'Arrancar', null], ['grimmjow', 'Arrancar', null], ['coyote starrk', 'Arrancar', null],
    ['tier harribel', 'Arrancar', null], ['baraggan', 'Arrancar', null], ['nnoitra', 'Arrancar', null],
    ['szayelaporro', 'Arrancar', null], ['zommari', 'Arrancar', null], ['aaroniero', 'Arrancar', null],
    ['yammy', 'Arrancar', null], ['nelliel', 'Arrancar', null], ['nel tu', 'Arrancar', null],
    // Quincy
    ['uryuu ishida', 'Quincy', null], ['uryu ishida', 'Quincy', null], ['ryuuken', 'Quincy', null],
    ['yhwach', 'Quincy', null], ['haschwalth', 'Quincy', null], ['bazz-b', 'Quincy', null],
    // Humains & Fullbringers
    ['orihime inoue', 'Humain', null], ['tatsuki', 'Humain', null], ['keigo', 'Humain', null], ['mizuiro', 'Humain', null],
    ['yasutora sado', 'Fullbringer', null], ['kuugo ginjou', 'Fullbringer', null], ['kugo ginjo', 'Fullbringer', null], ['riruka', 'Fullbringer', null],
    // Visored hors divisions
    ['hiyori', 'Visored', null], ['love aikawa', 'Visored', null], ['lisa yadomaru', 'Visored', null], ['mashiro', 'Visored', null], ['hachigen', 'Visored', null], ['rojuro', 'Visored', null],
  ];
  let nBl = 0;
  for (const e of entries) {
    if (e.universe !== 'Bleach' || e.type !== 'character') continue;
    const hit = BLEACH_TAXO.find(([pat]) => nameIs(e, pat));
    if (!hit) continue;
    const [, race, division] = hit;
    if (race && !e.attributes.race) e.attributes.race = race;
    if (division && !e.attributes.division) e.attributes.division = division;
    nBl++;
  }
  console.log(`  ✓ ${nBl} persos Bleach (race/division)`);

  // 5) Bleach — ZANPAKUTŌ en artefacts, liés à leur porteur (résolution par nom → slug réel)
  const ZANPAKUTO = [
    ['zangetsu', 'Zangetsu', 'ichigo kurosaki', 'legendary', 'La « lune tranchante » d’Ichigo : un couperet démesuré, un Getsuga Tenshō, et un Bankai qui condense la puissance en vitesse pure.'],
    ['senbonzakura', 'Senbonzakura', 'byakuya kuchiki', 'epic', 'Le zanpakutō de Byakuya se dissout en mille pétales-lames — le Bankai en fait une tempête rose mortelle.'],
    ['hyorinmaru', 'Hyōrinmaru', 'hitsugaya', 'epic', 'Le dragon de glace de Hitsugaya : le zanpakutō de glace le plus puissant de la Soul Society, capable de geler le ciel.'],
    ['zabimaru', 'Zabimaru', 'renji abarai', 'epic', 'Le serpent-scie de Renji : une lame segmentée qui fouette à distance — et un Bankai squelette de serpent géant.'],
    ['sode-no-shirayuki', 'Sode no Shirayuki', 'rukia kuchiki', 'epic', 'La « manche de neige blanche » de Rukia : la plus belle lame de la Soul Society, blanche des ondulations à la garde, maîtresse des danses de glace.'],
    ['kyoka-suigetsu', 'Kyōka Suigetsu', 'aizen', 'legendary', 'L’« hypnose parfaite » d’Aizen : quiconque a vu sa libération une seule fois voit ses cinq sens réécrits à volonté.'],
    ['ryujin-jakka', 'Ryūjin Jakka', 'yamamoto', 'legendary', 'Le zanpakutō de feu du capitaine-commandant : le plus ancien et le plus destructeur — sa libération réduit le monde en cendres.'],
    ['shinso', 'Shinsō', 'gin ichimaru', 'epic', 'La « lance divine » de Gin : une lame courte qui s’allonge à la vitesse de la lumière — cent fois sa taille en un clin d’œil.'],
    ['nozarashi', 'Nozarashi', 'kenpachi zaraki', 'epic', 'La lame « délaissée » de Kenpachi : un couperet de brute qui tranche même les météores, longtemps sans nom faute d’être écoutée.'],
    ['benihime', 'Benihime', 'kisuke urahara', 'epic', 'La « princesse écarlate » d’Urahara : boucliers de sang, lames d’énergie et pièges — aussi retorse que son porteur.'],
    ['haineko', 'Haineko', 'rangiku matsumoto', 'rare', 'Le « chat de cendres » de Rangiku : la lame se disperse en cendres coupantes qui suivent la garde.'],
    ['kazeshini', 'Kazeshini', 'hisagi', 'rare', 'La « mort du vent » de Hisagi : deux faux reliées par une chaîne — une arme qu’il redoute lui-même, faite pour moissonner la vie.'],
    ['katen-kyokotsu', 'Katen Kyōkotsu', 'shunsui', 'epic', 'La paire de lames de Kyōraku : elle rend RÉELS les jeux d’enfants — ombres, duels de couleurs… et le perdant meurt.'],
    ['sogyo-no-kotowari', 'Sōgyo no Kotowari', 'ukitake', 'epic', 'Les lames jumelles d’Ukitake : elles absorbent l’attaque ennemie… et la renvoient amplifiée.'],
    ['suzumebachi', 'Suzumebachi', 'suì-fēng', 'rare', 'Le « frelon » de Soi Fon : deux piqûres au même point — Nigeki Kessatsu, la mort en deux coups.'],
    ['wabisuke', 'Wabisuke', 'izuru kira', 'rare', 'Le « pénitent » de Kira : chaque parade DOUBLE le poids de l’arme adverse, jusqu’à plier l’ennemi au sol — tête baissée pour l’exécution.'],
  ];
  let nzp = 0;
  for (const [slug, name, ownerPat, rarity, summary] of ZANPAKUTO) {
    const owner = entries.find((e) => e.universe === 'Bleach' && e.type === 'character' && nameIs(e, ownerPat));
    if (addEnt(slug, 'artifact', name, 'Bleach', summary, rarity, purge({ material: 'Zanpakutō', origin: owner ? `Lame de ${owner.name}` : 'Lame d’âme', category: 'Arme & outil' }))) {
      if (owner) relations.push({ from: owner.slug, to: slug, relation: 'possede' });
      nzp++;
    }
  }
  console.log(`  ✓ ${nzp} zanpakutō (artefacts liés)`);

  // 6) Hunter x Hunter — TYPES DE NEN (curation par nom, les ~25 sûrs du canon)
  const HXH_NEN = [
    ['gon freecss', 'Renforcement'], ['uvogin', 'Renforcement'], ['nobunaga', 'Renforcement'], ['phinks', 'Renforcement'],
    ['isaac netero', 'Renforcement'], ['netero', 'Renforcement'], ['wing', 'Renforcement'], ['palm siberia', 'Renforcement'],
    ['killua zoldyck', 'Transformation'], ['hisoka', 'Transformation'], ['machi', 'Transformation'], ['biscuit', 'Transformation'], ['feitan', 'Transformation'],
    ['kurapika', 'Matérialisation'], ['kite', 'Matérialisation'], ['shizuku', 'Matérialisation'], ['kortopi', 'Matérialisation'], ['knov', 'Matérialisation'],
    ['leorio', 'Émission'], ['franklin', 'Émission'], ['razor', 'Émission'], ['knuckle', 'Émission'],
    ['illumi', 'Manipulation'], ['shalnark', 'Manipulation'], ['kalluto', 'Manipulation'], ['shoot', 'Manipulation'], ['morel', 'Manipulation'],
    ['chrollo', 'Spécialisation'], ['neferpitou', 'Spécialisation'], ['pakunoda', 'Spécialisation'], ['neon', 'Spécialisation'],
  ];
  let nNen = 0;
  for (const e of entries) {
    if (e.universe !== 'Hunter x Hunter' || e.type !== 'character' || e.attributes.nen) continue;
    const hit = HXH_NEN.find(([pat]) => nameIs(e, pat));
    if (hit) { e.attributes.nen = hit[1]; nNen++; }
  }
  console.log(`  ✓ ${nNen} types de Nen posés`);

  // 7) Dragon Ball — RACES étendues + SAGAS (curation) + lignées de transformations (relations)
  const DB_RACES = [
    [['goku', 'son goku'], 'Saiyan'], [['vegeta'], 'Saiyan'], [['gohan', 'son gohan'], 'Saiyan'], [['goten', 'son goten'], 'Saiyan'],
    [['trunks'], 'Saiyan'], [['bardock'], 'Saiyan'], [['raditz'], 'Saiyan'], [['nappa'], 'Saiyan'], [['broly'], 'Saiyan'],
    [['cabba'], 'Saiyan'], [['caulifla'], 'Saiyan'], [['kale'], 'Saiyan'], [['gine'], 'Saiyan'],
    [['bulma'], 'Human'], [['krillin', 'kuririn'], 'Human'], [['yamcha'], 'Human'], [['tenshinhan', 'tien'], 'Human'],
    [['chiaotzu', 'chaozu'], 'Human'], [['muten', 'roshi', 'kame sennin'], 'Human'], [['chi-chi', 'chichi'], 'Human'],
    [['videl'], 'Human'], [['mr. satan', 'hercule', 'mark satan'], 'Human'], [['uub', 'oob'], 'Human'],
    [['piccolo'], 'Namekian'], [['dende'], 'Namekian'], [['nail'], 'Namekian'], [['kami'], 'Namekian'],
    [['frieza', 'freeza', 'freezer'], 'Frieza Race'], [['cooler', 'coora'], 'Frieza Race'], [['king cold', 'cold'], 'Frieza Race'], [['frost'], 'Frieza Race'],
    [['android 16', 'c-16'], 'Android'], [['android 17', 'c-17', 'lapis'], 'Android'], [['android 18', 'c-18', 'lazuli'], 'Android'],
    [['android 19'], 'Android'], [['android 20', 'dr. gero', 'gero'], 'Android'], [['cell'], 'Android'],
    [['majin buu', 'buu', 'boo', 'majin boo'], 'Majin'],
    [['whis'], 'Angel'], [['vados'], 'Angel'], [['grand priest', 'daishinkan'], 'Angel'],
  ];
  const DB_SAGAS = [
    [['raditz'], 'Saga Saiyan'], [['nappa'], 'Saga Saiyan'], [['bardock'], 'Saga Saiyan'],
    [['frieza', 'freeza', 'freezer'], 'Saga Namek'], [['zarbon'], 'Saga Namek'], [['dodoria'], 'Saga Namek'],
    [['ginyu'], 'Saga Namek'], [['recoome', 'reacoom'], 'Saga Namek'], [['burter'], 'Saga Namek'], [['jeice'], 'Saga Namek'], [['guldo'], 'Saga Namek'],
    [['dende'], 'Saga Namek'], [['nail'], 'Saga Namek'], [['cui', 'kiwi'], 'Saga Namek'],
    [['cell'], 'Saga Cell'], [['android 16', 'c-16'], 'Saga Cell'], [['android 17', 'c-17'], 'Saga Cell'], [['android 18', 'c-18'], 'Saga Cell'],
    [['android 19'], 'Saga Cell'], [['android 20', 'dr. gero', 'gero'], 'Saga Cell'],
    [['majin buu', 'buu', 'boo', 'majin boo'], 'Saga Buu'], [['babidi'], 'Saga Buu'], [['dabura'], 'Saga Buu'], [['videl'], 'Saga Buu'], [['spopovich'], 'Saga Buu'],
    [['beerus'], 'Saga Super'], [['whis'], 'Saga Super'], [['champa'], 'Saga Super'], [['vados'], 'Saga Super'],
    [['jiren'], 'Saga Super'], [['toppo', 'top'], 'Saga Super'], [['dyspo'], 'Saga Super'], [['hit'], 'Saga Super'],
    [['zamasu'], 'Saga Super'], [['goku black'], 'Saga Super'], [['zeno', 'zen-oh'], 'Saga Super'],
    [['cabba'], 'Saga Super'], [['caulifla'], 'Saga Super'], [['kale'], 'Saga Super'], [['frost'], 'Saga Super'], [['broly'], 'Saga Super'],
  ];
  let nRace = 0, nSaga = 0;
  for (const e of entries) {
    if (e.universe !== 'Dragon Ball' || e.type !== 'character') continue;
    if (!e.attributes.race) {
      const hit = DB_RACES.find(([pats]) => pats.some((p) => nameIs(e, p)));
      if (hit) { e.attributes.race = hit[1]; nRace++; }
    }
    if (!e.attributes.saga) {
      const hit = DB_SAGAS.find(([pats]) => pats.some((p) => nameIs(e, p)));
      if (hit) { e.attributes.saga = hit[1]; nSaga++; }
    }
  }
  // Lignées : « Goku SSJ » (transformation) → relation Goku ─maîtrise→ la transformation.
  let nLin = 0;
  const dbCharsReg = entries.filter((e) => e.universe === 'Dragon Ball' && e.type === 'character');
  for (const t of entries) {
    if (t.universe !== 'Dragon Ball' || t.attributes.category !== 'Transformation') continue;
    const first = String(t.name).split(/\s+/)[0].toLowerCase();
    if (first.length < 3) continue;
    const ownerChar = dbCharsReg.find((c) => c.name.toLowerCase().split(/\s+/).includes(first));
    if (ownerChar) { relations.push({ from: ownerChar.slug, to: t.slug, relation: 'maitrise' }); nLin++; }
  }
  console.log(`  ✓ DB : ${nRace} races + ${nSaga} sagas + ${nLin} lignées de transformation`);

  // 8) JoJo — la LIGNÉE JOESTAR (arbre généalogique, format FamilyTree {rel EN, name, slug})
  const JOJO_FAMILY = {
    'jonathan joestar': [
      { rel: 'father', name: 'George Joestar I' }, { rel: 'wife', name: 'Erina Pendleton' },
      { rel: 'son', name: 'George Joestar II' }, { rel: 'descendant', name: 'Joseph Joestar', slug: 'joseph-joestar' },
    ],
    'joseph joestar': [
      { rel: 'grandmother', name: 'Erina Joestar' }, { rel: 'ancestor', name: 'Jonathan Joestar', slug: 'jonathan-joestar' },
      { rel: 'wife', name: 'Suzi Q' }, { rel: 'daughter', name: 'Holy Kujo' },
      { rel: 'son', name: 'Josuke Higashikata', slug: 'josuke-higashikata' },
    ],
    'jotaro kujo': [
      { rel: 'mother', name: 'Holy Kujo' }, { rel: 'grandfather', name: 'Joseph Joestar', slug: 'joseph-joestar' },
      { rel: 'daughter', name: 'Jolyne Cujoh', slug: 'jolyne-cujoh' },
    ],
    'josuke higashikata': [
      { rel: 'father', name: 'Joseph Joestar', slug: 'joseph-joestar' }, { rel: 'mother', name: 'Tomoko Higashikata' },
    ],
    'giorno giovanna': [
      { rel: 'father', name: 'DIO (corps de Jonathan)', slug: 'dio-brando' }, { rel: 'ancestor', name: 'Jonathan Joestar', slug: 'jonathan-joestar' },
    ],
    'jolyne cujoh': [
      { rel: 'father', name: 'Jotaro Kujo', slug: 'jotaro-kujo' },
    ],
  };
  let nJf = 0;
  for (const e of entries) {
    if (e.universe !== "JoJo's Bizarre Adventure" || e.type !== 'character' || e.attributes.family) continue;
    const key = Object.keys(JOJO_FAMILY).find((pat) => nameIs(e, pat));
    if (key) { e.attributes.family = JOJO_FAMILY[key]; nJf++; }
  }
  console.log(`  ✓ ${nJf} arbres Joestar posés`);

  // ── 12 STARS MULTI-UNIVERS — fiches « légendaires » complètes (même moteur que les 7 Naruto) ──
  // Formes évolutives + sprites pixel (public/images/akasha/universes/idle/) + stats databook
  // génériques (PUI/TEC/AGI/INT/FOR/VIT/END/ESP) + credo + histoire FR.
  const IDLE_U = (n) => `/images/akasha/universes/idle/${n}.webp`;
  const GEN_LABELS = { nin: 'PUI', tai: 'TEC', gen: 'AGI', int: 'INT', for: 'FOR', vit: 'VIT', end: 'END', sce: 'ESP' };
  const STAR_DETAILS = {
    'monkey-d-luffy': {
      nindoLabel: 'Rêve · sa promesse', nindo: 'Je serai le Roi des Pirates !',
      titles: ['Chapeau de Paille', 'Cinquième Empereur', 'Joy Boy'], status: 'Vivant — Empereur',
      statLabels: GEN_LABELS,
      bio: "Un garçon d'un village d'East Blue avale un Fruit du Démon, hérite du chapeau de paille de Shanks et prend la mer avec une promesse folle : trouver le One Piece. Équipage après équipage, mer après mer, Luffy renverse les puissants — Crocodile, Doflamingo, Kaido — non pas pour régner, mais pour être l'homme le plus LIBRE du monde.",
      personality: "Simple, glouton, d'une loyauté absolue. Luffy ne réfléchit pas — il ressent. Il tend la main à quiconque pleure, déclare la guerre à quiconque touche à son équipage, et sourit face à ce qui devrait le terrifier.",
      quotes: [
        'Je serai le Roi des Pirates !',
        "Bien sûr que je vais peut-être mourir. Mais je me battrai libre — c'est ça, être pirate.",
        "Tu veux savoir qui je suis ? Je suis Monkey D. Luffy — et je ne perdrai contre personne !",
      ],
      trivia: [
        'Son « Gomu Gomu no Mi » est en réalité le Hito Hito no Mi modèle Nika, fruit mythique traqué par le Gouvernement depuis 800 ans.',
        'Sa prime dépasse les 3 milliards de Berrys après Onigashima.',
        "Il ne sait pas nager — comme tout utilisateur de Fruit du Démon : l'ironie fondatrice du manga.",
      ],
      forms: [
        { label: 'East Blue', idle: IDLE_U('luffy-eastblue'), age: '17 ans', arc: 'Romance Dawn → Arlong Park', caption: 'Le garçon au chapeau de paille', summary: "Un gamin élastique, quatre compagnons, un rafiot — et la promesse faite à Shanks qui prend la mer.", stats: { nin: 3, tai: 3.5, gen: 4, int: 2, for: 3.5, vit: 3.5, end: 4.5, sce: 5 } },
        { label: 'Gear 2', idle: IDLE_U('luffy-gear2'), age: '17 ans', arc: 'Enies Lobby', caption: 'Le sang comme moteur', summary: "Luffy pompe son sang comme une turbine : peau rougie, vapeur — la vitesse d'un Soru permanent, au prix de son endurance.", stats: { nin: 3.5, tai: 4, gen: 4.5, int: 2, for: 4, vit: 5, end: 3.5, sce: 5 } },
        { label: 'Gear 4 — Boundman', idle: IDLE_U('luffy-gear4'), age: '19 ans', arc: 'Dressrosa', caption: 'Le muscle gonflé de Haki', summary: "Torse gonflé, Haki armé sur tout le corps : l'élasticité devient artillerie — Kong Gun, Rhino Schneider, la puissance qui a brisé Doflamingo.", stats: { nin: 4.5, tai: 4.5, gen: 4, int: 2.5, for: 5, vit: 4.5, end: 4, sce: 5 } },
        { label: 'Gear 5 — Nika', idle: IDLE_U('luffy-gear5'), age: '19 ans', arc: 'Onigashima', caption: 'Le Guerrier de la Libération', summary: "L'éveil du fruit : cheveux blancs, cœur qui bat le rythme de la liberté — le monde devient son jouet en caoutchouc. Le rire de Joy Boy résonne à nouveau.", stats: { nin: 5, tai: 5, gen: 5, int: 3, for: 5, vit: 5, end: 5, sce: 5 } },
      ],
    },
    'roronoa-zoro': {
      nindoLabel: 'Serment · sa lame', nindo: 'Plus jamais je ne perdrai — jusqu\'à ce que je sois le plus grand sabreur du monde.',
      titles: ['Chasseur de Pirates', 'Roi de l\'Enfer'], status: 'Vivant — bras droit des Chapeaux de Paille',
      statLabels: GEN_LABELS,
      bio: "Chasseur de primes devenu premier compagnon de Luffy, Zoro poursuit le serment fait à Kuina, son amie d'enfance morte : devenir le meilleur sabreur du monde. Son style à trois sabres — un dans chaque main, un entre les dents — fauche tout ce qui se dresse entre lui et Mihawk.",
      personality: "Stoïque, d'une discipline de fer… et incapable de suivre un plan de ville. Zoro s'entraîne jusqu'à l'évanouissement, boit comme un tonneau et n'a qu'une parole. Il accepterait de mourir pour Luffy — il a d'ailleurs déjà essayé.",
      quotes: [
        "Rien… il ne s'est rien passé. (Thriller Bark — après avoir absorbé la douleur de Luffy)",
        'Les cicatrices dans le dos sont la honte du sabreur.',
        "Tant que je le protège, le Roi des Pirates n'a rien à craindre.",
      ],
      trivia: [
        'Son sens de l\'orientation est si catastrophique qu\'il se perd sur une ligne droite — gag récurrent depuis East Blue.',
        'À Wano, il hérite d\'Enma, la lame d\'Oden qui « dévore » le Haki de son porteur.',
        'Sa technique Ashura fait apparaître trois visages et six bras — une aura démoniaque, pas une illusion.',
      ],
      forms: [
        { label: 'East Blue', idle: IDLE_U('zoro-eastblue'), age: '19 ans', arc: 'Shells Town → Baratie', caption: 'Le chasseur de pirates', summary: "Trois sabres, un bandana et un duel perdu d'avance contre Mihawk — accepté le sourire aux lèvres, la cicatrice en travers du torse.", stats: { nin: 3, tai: 4.5, gen: 3, int: 2.5, for: 4, vit: 3.5, end: 5, sce: 4.5 } },
        { label: 'Nouveau Monde', idle: IDLE_U('zoro-timeskip'), age: '21 ans', arc: 'Retour → Dressrosa', caption: "L'élève de Mihawk", summary: "Deux ans d'entraînement chez son propre rival : l'œil gauche s'est fermé, la puissance a décuplé — Pica, une montagne de pierre, tombe en un seul coup.", stats: { nin: 4, tai: 5, gen: 3, int: 3, for: 4.5, vit: 4, end: 5, sce: 4.5 } },
        { label: 'Wano — Enma', idle: IDLE_U('zoro-wano'), age: '21 ans', arc: 'Pays de Wano', caption: 'Le Roi de l\'Enfer', summary: "Avec Enma et le Haki du Roi enfin éveillé, Zoro entaille Kaido et gagne son surnom : Roi de l'Enfer — trois lames, une aura de démon.", stats: { nin: 4.5, tai: 5, gen: 3.5, int: 3, for: 5, vit: 4.5, end: 5, sce: 5 } },
      ],
    },
    'son-goku': {
      nindoLabel: 'Credo · son moteur', nindo: 'Plus l\'adversaire est fort, plus j\'ai envie de me battre.',
      titles: ['Kakarot', 'Le Saiyan élevé sur Terre'], status: 'Vivant — défenseur de l\'Univers 7',
      statLabels: GEN_LABELS,
      bio: "Envoyé bébé pour détruire la Terre, recueilli par Son Gohan, Kakarot devient Son Goku : l'enfant à la queue de singe qui cherche les Dragon Balls devient le guerrier qui repousse Freezer, Cell et Buu, puis se mesure aux dieux eux-mêmes. Chaque limite n'existe que pour être pulvérisée.",
      personality: "Naïf en tout sauf au combat, où il devient un génie tactique. Goku pardonne à ses pires ennemis — Piccolo, Vegeta en témoignent — car un ennemi épargné est un rival de plus pour demain.",
      quotes: [
        "Je suis le Saiyan élevé sur Terre — Son Goku !",
        'Je ne défends pas la Terre parce que c\'est mon devoir. Je la défends parce que c\'est chez moi.',
        "Tu es le numéro un, Vegeta. (Tournoi du Pouvoir)",
      ],
      trivia: [
        'Son nom saiyan, Kakarot, dérive de « carotte » — toute sa famille est nommée d\'après des légumes.',
        'Il n\'a jamais embrassé Chi-Chi à l\'écran — confirmé (avec effroi) par leurs fils.',
        "L'Ultra Instinct est une technique divine que même les Dieux de la Destruction peinent à maîtriser.",
      ],
      forms: [
        { label: 'Goku', idle: IDLE_U('goku-base'), arc: 'De Raditz à Buu', caption: 'Le gi orange de Kame House', summary: "La base : le gi orange de Tortue Géniale, le Kamehameha, et un appétit de combat (et de riz) sans fond.", stats: { nin: 4, tai: 4.5, gen: 4, int: 3, for: 4, vit: 4, end: 4.5, sce: 4.5 } },
        { label: 'Super Saiyan', idle: IDLE_U('goku-ssj'), arc: 'Namek — vs Freezer', caption: 'La légende dorée', summary: "La colère face à la mort de Krillin réveille la légende : cheveux d'or, aura de feu — le Super Saiyan renaît après 1 000 ans, sur Namek en flammes.", stats: { nin: 4.5, tai: 4.5, gen: 4, int: 3, for: 4.5, vit: 4.5, end: 4.5, sce: 4.5 } },
        { label: 'Super Saiyan Blue', idle: IDLE_U('goku-blue'), arc: 'Dragon Ball Super', caption: 'Le ki divin maîtrisé', summary: "La transformation du Super Saiyan God stabilisée : le bleu du ki divin, la puissance des dieux dans un corps mortel — face à Beerus, Hit, Jiren.", stats: { nin: 5, tai: 5, gen: 4.5, int: 3.5, for: 5, vit: 5, end: 4.5, sce: 4.5 } },
        { label: 'Ultra Instinct', idle: IDLE_U('goku-ui'), arc: 'Tournoi du Pouvoir', caption: 'Le corps qui pense seul', summary: "L'état des anges : le corps esquive et frappe SANS la pensée. Cheveux d'argent, calme absolu — la limite au-delà des limites, brisée face à Jiren.", stats: { nin: 5, tai: 5, gen: 5, int: 4, for: 5, vit: 5, end: 5, sce: 5 } },
      ],
    },
    'vegeta': {
      nindoLabel: 'Orgueil · son trône', nindo: 'Je suis le prince des Saiyans. Kakarot… c\'est MOI qui te dépasserai.',
      titles: ['Prince des Saiyans', 'Le rival éternel'], status: 'Vivant — protecteur (à contrecœur) de la Terre',
      statLabels: GEN_LABELS,
      bio: "Prince d'un peuple exterminé, arrivé sur Terre en conquérant, resté par orgueil — puis par amour, même s'il mourrait plutôt que l'admettre. Vegeta est l'ombre de Goku et son aiguillon : chaque victoire de Kakarot est une blessure, chaque blessure un carburant.",
      personality: "Fier jusqu'à l'autodestruction, travailleur là où Goku est un don du ciel. Son arc est la plus longue rédemption du shōnen : du génocidaire au père qui sacrifie sa vie pour Trunks, en gardant le rictus.",
      quotes: [
        "Je suis le prince de TOUS les Saiyans !",
        'Prends soin de Trunks… et de Bulma. (avant son sacrifice contre Buu)',
        "Kakarot… tu es le numéro un. (Namek, à l'agonie)",
      ],
      trivia: [
        'Son gant blanc et son plastron sont restés son identité visuelle à travers 30 ans de sagas.',
        "L'attaque Final Flash contre Cell reste l'un des cris les plus célèbres du doublage FR.",
        'Il développe l\'Ultra Ego — la voie du dieu de la destruction — en miroir de l\'Ultra Instinct de Goku.',
      ],
      forms: [
        { label: 'Arrivée sur Terre', idle: IDLE_U('vegeta-saiyan'), arc: 'Saga Saiyan', caption: 'Le prince conquérant', summary: "Scouter à l'œil, armure de combat, mépris intégral : le prince vient détruire la Terre — et y rencontre l'insecte qui le hantera toute sa vie.", stats: { nin: 4, tai: 4.5, gen: 3.5, int: 4, for: 4, vit: 4, end: 4, sce: 4.5 } },
        { label: 'Super Saiyan', idle: IDLE_U('vegeta-ssj'), arc: 'Androïdes → Cell', caption: 'La légende, par la rage', summary: "Là où Goku a transcendé par la perte, Vegeta y parvient par la RAGE pure : l'or lui va bien, l'arrogance encore mieux.", stats: { nin: 4.5, tai: 4.5, gen: 3.5, int: 4, for: 4.5, vit: 4.5, end: 4.5, sce: 4.5 } },
        { label: 'Super Saiyan Blue', idle: IDLE_U('vegeta-blue'), arc: 'Dragon Ball Super', caption: 'Le ki divin du prince', summary: "Le prince atteint les dieux à la force du poignet — sans rituel, sans raccourci : des années de gravité 500G dans la Capsule Corp.", stats: { nin: 5, tai: 5, gen: 4, int: 4, for: 5, vit: 4.5, end: 4.5, sce: 5 } },
      ],
    },
    'ichigo-kurosaki': {
      nindoLabel: 'Raison · son sabre', nindo: 'Si je ne peux pas protéger tout le monde… alors à quoi sert ce pouvoir ?',
      titles: ['Shinigami remplaçant', 'Le protecteur de Karakura'], status: 'Vivant — Karakura',
      statLabels: GEN_LABELS,
      bio: "Lycéen capable de voir les esprits, Ichigo reçoit les pouvoirs de Rukia Kuchiki une nuit qui change tout : le voilà Shinigami remplaçant, faucheur d'âmes à mi-temps. De la Soul Society à Hueco Mundo, il découvrira que son sang mêle TOUTES les lignées : Shinigami, Quincy, Hollow.",
      personality: "Bougon, front plissé en permanence, mais d'une droiture totale : Ichigo ne se bat jamais pour gagner — il se bat pour que personne d'autre ne saigne à sa place.",
      quotes: [
        "Je ne me bats pas parce que je veux gagner. Je me bats parce que je DOIS protéger.",
        'Zangetsu… porte-moi encore une fois.',
        "Tremble, Aizen. Ce que tu vois est le fruit de mon sacrifice — le Getsuga final.",
      ],
      trivia: [
        'Son nom peut se lire « celui qui protège » (護) — le programme de toute sa vie.',
        'Zangetsu est en réalité double : le vieil homme est son côté Quincy, le Hollow blanc son vrai pouvoir de Shinigami.',
        'Sa couleur de cheveux orange lui vaut des bagarres depuis le collège — il n\'a jamais cédé à la teinture.',
      ],
      forms: [
        { label: 'Shikai — Zangetsu', idle: IDLE_U('ichigo-shikai'), age: '15 ans', arc: 'Soul Society', caption: 'Le couperet géant', summary: "Zangetsu libéré : un couperet sans garde, enveloppé de bandages, aussi grand que lui — et le Getsuga Tenshō qui fend les murs du Seireitei.", stats: { nin: 4, tai: 4, gen: 3.5, int: 3, for: 4, vit: 4, end: 4.5, sce: 5 } },
        { label: 'Bankai — Tensa Zangetsu', idle: IDLE_U('ichigo-bankai'), age: '15-17 ans', arc: 'vs Byakuya → Arrancars', caption: 'La lame noire condensée', summary: "Le Bankai qui a choqué la Soul Society : au lieu de grandir, Zangetsu se CONDENSE — un katana noir, un manteau déchiré, la vitesse d'un dieu de la mort.", stats: { nin: 4.5, tai: 4.5, gen: 4, int: 3, for: 4, vit: 5, end: 4.5, sce: 5 } },
        { label: 'Hollowfication', idle: IDLE_U('ichigo-hollow'), age: '16-17 ans', arc: 'Hueco Mundo', caption: 'Le masque blanc', summary: "Le Hollow intérieur accepté : masque cornu, Getsuga noir, instinct pur — la fusion qui a laissé Ulquiorra en poussière au sommet de Las Noches.", stats: { nin: 5, tai: 5, gen: 4, int: 2.5, for: 5, vit: 5, end: 5, sce: 4 } },
      ],
    },
    'gon-freecss': {
      nindoLabel: 'Cap · sa boussole', nindo: 'Papa, je vais te trouver — et je verrai le monde que tu as choisi plutôt que moi.',
      titles: ['Le fils de Ging', 'Hunter à la canne à pêche'], status: 'Vivant — a perdu (rendu ?) son Nen',
      statLabels: GEN_LABELS,
      bio: "Élevé sur l'île de la Baleine, Gon découvre que son père, qu'il croyait mort, est un Hunter légendaire qui l'a abandonné pour l'aventure. Sa réponse : passer l'examen le plus mortel du monde à 12 ans, se faire des amis en or (Killua, Kurapika, Leorio) — et poursuivre l'ombre de Ging jusqu'au bout de la rage.",
      personality: "Solaire, direct, incapable de mentir — et c'est précisément ce qui le rend inquiétant : la même pureté qui charme tout le monde devient, quand on lui prend quelqu'un, une absence totale de limite.",
      quotes: [
        'Je suis Gon Freecss ! Et je vais trouver mon père !',
        "Killua, tu es mon meilleur ami. C'est pour ça que je peux tout te dire.",
        "Ça m'est égal si c'est la fin. Pour tuer Pitou, je donnerai TOUT. (transformation)",
      ],
      trivia: [
        'Sa canne à pêche a battu l\'examen Hunter : il a « pêché » le badge de Hisoka.',
        'Sa transformation adulte est un vœu Nen suicidaire : toute sa puissance future, brûlée en un instant.',
        "Togashi n'a jamais confirmé s'il retrouvera un jour son Nen.",
      ],
      forms: [
        { label: 'Gon', idle: IDLE_U('gon-base'), age: '12 ans', arc: 'Examen Hunter → York Shin', caption: 'Le garçon à la canne', summary: "Un gamin de l'île de la Baleine qui sent la forêt et fonce d'abord, réfléchit ensuite — le Renforcement fait garçon : Jajanken, pierre-papier-ciseaux mortel.", stats: { nin: 3.5, tai: 4, gen: 4, int: 2.5, for: 4, vit: 4, end: 4.5, sce: 5 } },
        { label: 'Transformation', idle: IDLE_U('gon-adulte'), age: '—', arc: 'Fourmis-Chimères — vs Neferpitou', caption: 'La rage faite corps', summary: "Devant le corps de Kite, Gon sacrifie TOUT son avenir de Nen pour la puissance immédiate : un corps adulte, une aura qui terrifie les Fourmis royales — et un prix irréversible.", stats: { nin: 5, tai: 5, gen: 4.5, int: 2, for: 5, vit: 5, end: 4, sce: 3 } },
      ],
    },
    'killua-zoldyck': {
      nindoLabel: 'Choix · sa liberté', nindo: 'Je ne trahirai jamais Gon. C\'est la seule chose que je me suis jurée.',
      titles: ['Héritier des Zoldyck', 'L\'éclair blanc'], status: 'Vivant — voyage avec Alluka',
      statLabels: GEN_LABELS,
      bio: "Élevé pour tuer par la plus célèbre famille d'assassins du monde, Killua fugue à 12 ans pour passer l'examen Hunter « pour s'amuser » — et y rencontre la première personne qu'il veut protéger plutôt qu'éliminer. Son arc entier tient dans ce choix : l'ami plutôt que l'arme.",
      personality: "Génie blasé au sourire de chat, gamin accro au chocolat — et tueur au sang absolument froid quand il le décide. L'aiguille d'Illumi plantée dans son cerveau lui ordonnait de fuir les plus forts : il l'a arrachée pour rester aux côtés de Gon.",
      quotes: [
        'Gon est ma lumière.',
        "Un pro trouve toujours le moyen de gagner — même contre plus fort que lui.",
        'Kanmuru : je pense plus vite que l\'éclair, parce que je SUIS l\'éclair.',
      ],
      trivia: [
        'Il s\'est électrocuté volontairement pendant des mois pour transformer la torture familiale en pouvoir (Transformation).',
        'Ses yo-yos pèsent 50 kg chacun — personne ne s\'en doute jamais.',
        'Il libère sa petite sœur Alluka, l\'arme la plus dangereuse de la famille, par pur amour fraternel.',
      ],
      forms: [
        { label: 'Killua', idle: IDLE_U('killua-base'), age: '12 ans', arc: 'Examen → Greed Island', caption: "L'assassin en fugue", summary: "Mains-lames, pas d'assassin silencieux, yo-yos de 50 kg : le prodige Zoldyck applique l'art familial… à la protection de son premier ami.", stats: { nin: 4, tai: 4, gen: 5, int: 4, for: 3.5, vit: 4.5, end: 4, sce: 4 } },
        { label: 'Godspeed — Kanmuru', idle: IDLE_U('killua-godspeed'), age: '13 ans', arc: 'Fourmis-Chimères', caption: "L'éclair incarné", summary: "L'aura électrique automatise ses réflexes : plus besoin de penser pour esquiver ni frapper — Killua devient littéralement la foudre blanche.", stats: { nin: 4.5, tai: 4.5, gen: 5, int: 4, for: 3.5, vit: 5, end: 3.5, sce: 4.5 } },
      ],
    },
    'jotaro-kujo': {
      nindoLabel: 'Flegme · sa carapace', nindo: 'Yare yare daze…',
      titles: ['JoJo de la 3ᵉ génération', 'L\'homme au Stand du temps'], status: 'Océanographe — docteur ès étoiles de mer',
      statLabels: GEN_LABELS,
      bio: "Lycéen de Tokyo persuadé d'être possédé par un « esprit maléfique », Jotaro découvre que ce fantôme est un Stand — Star Platinum — et que le vampire responsable du réveil de ce pouvoir, DIO, détient le corps de son ancêtre. Cinquante jours de voyage vers l'Égypte plus tard, la lignée Joestar est vengée.",
      personality: "Mutique, imperturbable, allergique aux effusions — « yare yare daze » est sa réponse à peu près tout. Sous la visière : une intelligence froide qui piège DIO lui-même, et une loyauté de granit envers les siens.",
      quotes: [
        'Yare yare daze…',
        "STAR PLATINUM : ZA WARUDO ! Le temps s'est arrêté pour toi aussi, DIO.",
        'Il y a des choses qu\'on ne peut régler qu\'avec les poings. (ORA ORA ORA)',
      ],
      trivia: [
        'Star Platinum arrête le temps — pouvoir jumeau de The World, révélé au dernier round contre DIO.',
        'Sa casquette et ses cheveux fusionnent — mystère graphique jamais résolu par Araki.',
        'Docteur en biologie marine : le délinquant taciturne est devenu spécialiste des étoiles de mer.',
      ],
      forms: [
        { label: 'Stardust Crusaders', idle: IDLE_U('jotaro-p3'), age: '17 ans', arc: 'Partie 3 — vers l\'Égypte', caption: 'Le gakuran et la chaîne', summary: "50 jours, 10 000 km, une dynastie à venger : le lycéen au gakuran troué mène la croisade contre DIO — Star Platinum cogne, ORA en rafale.", stats: { nin: 5, tai: 5, gen: 3, int: 4.5, for: 5, vit: 5, end: 4.5, sce: 4 } },
        { label: 'Morioh', idle: IDLE_U('jotaro-p4'), age: '28 ans', arc: 'Partie 4 — Diamond is Unbreakable', caption: 'Le mentor en blanc', summary: "Costume blanc, badge de l'océanographe : Jotaro revient guider Josuke à Morioh — Star Platinum : The World n'arrête plus que 2 secondes, mais 2 secondes de Jotaro suffisent.", stats: { nin: 4.5, tai: 4.5, gen: 3, int: 5, for: 4.5, vit: 4.5, end: 4, sce: 4 } },
      ],
    },
    'dio-brando': {
      nindoLabel: 'Ambition · son trône', nindo: 'Toi, JoJo… c\'est le destin qui m\'a choisi. MOI, DIO !',
      titles: ['L\'ennemi de la lignée', 'Le vampire au Stand du monde'], status: 'Réduit en cendres — héritage toujours actif',
      statLabels: GEN_LABELS,
      bio: "Fils de misère adopté par les Joestar, Dio choisit le mal comme on choisit une carrière : empoisonner le père, briser le fils, et couronner le tout avec le Masque de Pierre — l'immortalité vampirique. Décapité, il survit un siècle au fond de l'océan accroché au corps de Jonathan, puis revient avec le Stand le plus tyrannique qui soit : The World.",
      personality: "Charisme de gourou, cruauté d'enfant qui arrache les ailes : DIO ne veut pas seulement gagner — il veut que le monde admette qu'il MÉRITAIT de gagner. Son ombre plane sur six parties du manga.",
      quotes: [
        'Ce n\'est pas moi qui ai abandonné mon humanité, JoJo — je l\'ai TRANSCENDÉE !',
        'ZA WARUDO ! TOKI YO TOMARE ! (Le monde ! Le temps, arrête-toi !)',
        'MUDA MUDA MUDA MUDA !',
      ],
      trivia: [
        'Son « WRYYY » et son rouleau compresseur sont devenus des monuments d\'internet.',
        "Giorno Giovanna, héros de la Partie 5, est son fils — conçu avec le corps volé de Jonathan.",
        'Son plan « Heaven » se réalise après sa mort via le prêtre Pucci (Partie 6).',
      ],
      forms: [
        { label: 'Vampire', idle: IDLE_U('dio-vampire'), age: '20 ans (puis ∞)', arc: 'Partie 1 — Phantom Blood', caption: 'Le Masque de Pierre', summary: "Le fils adoptif pose le masque sur son visage et abandonne l'humanité : force surhumaine, regard pétrifiant, éternité — il ne restera de lui qu'une tête… tenace.", stats: { nin: 4.5, tai: 4, gen: 3.5, int: 4.5, for: 5, vit: 4, end: 5, sce: 3.5 } },
        { label: 'DIO — The World', idle: IDLE_U('dio-world'), age: '≈ 120 ans', arc: 'Partie 3 — Égypte', caption: 'Le maître du temps arrêté', summary: "Un siècle au fond de la mer, un corps volé, un Stand absolu : The World fige le temps 9 secondes — assez pour un rouleau compresseur. « Approche, Jotaro. »", stats: { nin: 5, tai: 4.5, gen: 4, int: 5, for: 5, vit: 5, end: 4.5, sce: 3 } },
      ],
    },
    'takumi-fujiwara': {
      nindoLabel: 'Ligne · sa trajectoire', nindo: 'Je ne connais pas la théorie. Je sais juste comment la voiture veut tourner.',
      titles: ['Le fantôme d\'Akina', 'As du downhill de Project D'], status: 'Actif — rallye pro (épilogue)',
      statLabels: GEN_LABELS,
      bio: "Chaque matin depuis ses 13 ans, Takumi livre le tofu familial en dévalant le mont Akina — sans savoir qu'il forge, virage après virage, le meilleur pilote de descente du Kantō. Quand la Hachi-Roku « dépassée » humilie la RX-7 des RedSuns, la rumeur du fantôme d'Akina se répand dans toute la préfecture.",
      personality: "Lunaire, monosyllabique, réveillé uniquement par le volant : Takumi ne comprend ni les chiffres ni la mécanique — il SENT. Le gobelet d'eau calé dans le porte-verre par Bunta lui a appris la douceur ; les duels lui apprendront la rage.",
      quotes: [
        "C'est juste une livraison de tofu. Je fais ça tous les matins.",
        'La gouttière… je peux y mettre la roue.',
        "Cette voiture, c'est mon père qui l'a réglée. Elle n'a pas fini de surprendre.",
      ],
      trivia: [
        'Sa technique signature — le drift de la gouttière — cale la roue intérieure dans le caniveau pour pivoter plus vite.',
        'Le 4A-GE Groupe A monté par Bunta hurle jusqu\'à 11 000 tr/min.',
        'Il bat l\'Evo de l\'Emperor, la NSX… sans jamais lire une seule revue auto.',
      ],
      forms: [
        { label: 'Livreur de tofu', idle: IDLE_U('takumi-lyceen'), age: '18 ans', arc: 'First Stage', caption: 'Le fantôme d\'Akina', summary: "Un lycéen endormi, une AE86 de livraison, un col avalé 3 000 fois : quand Keisuke le défie, le « fantôme » ne sait même pas qu'il est rapide.", stats: { nin: 3.5, tai: 4.5, gen: 5, int: 2.5, for: 2.5, vit: 4.5, end: 4, sce: 4.5 } },
        { label: 'Project D', idle: IDLE_U('takumi-projectd'), age: '19 ans', arc: 'Fourth → Final Stage', caption: 'L\'as du downhill', summary: "Recruté par Ryosuke, Takumi devient l'arme de descente de Project D : col après col, invaincu — jusqu'au duel final contre la GT-R de Shinigami.", stats: { nin: 4.5, tai: 5, gen: 5, int: 3.5, for: 3, vit: 5, end: 4.5, sce: 5 } },
      ],
    },
    'light-yagami': {
      nindoLabel: 'Sentence · son verdict', nindo: 'Je suis la justice. Le monde nouveau n\'a besoin que d\'un dieu — moi.',
      titles: ['Kira', 'Le dieu du monde nouveau (autoproclamé)'], status: 'Mort — d\'une crise cardiaque, ironiquement',
      statLabels: GEN_LABELS,
      bio: "Premier de la nation, fils de policier, ennui abyssal — jusqu'au cahier tombé du ciel : écris un nom, la personne meurt. En six jours, Light juge 40 criminels. En six mois, le monde entier connaît « Kira ». Il ne reste qu'un obstacle entre lui et sa divinité : un détective sans nom, assis en tailleur.",
      personality: "Brillant, méthodique, et pourri par la certitude d'avoir raison : Light n'a jamais eu l'impression de tomber — chaque meurtre était « nécessaire », chaque manipulation « rationnelle ». Le génie du mal avec la conscience tranquille.",
      quotes: [
        'Keikaku dōri… (tout se déroule comme prévu)',
        "Je prendrai une chips… et je la MANGERAI !",
        'Je suis Kira. Et le monde m\'a déjà choisi.',
      ],
      trivia: [
        'Le pacte des yeux de shinigami coûte la moitié de la vie restante — Light ne l\'a jamais accepté : trop calculateur.',
        'Sa règle des 40 secondes (crise cardiaque par défaut) a redéfini le thriller psychologique.',
        'Ryuk avait prévenu dès la première nuit : « c\'est moi qui écrirai ton nom, un jour ». Il a tenu parole.',
      ],
      forms: [
        { label: 'Le cahier', idle: IDLE_U('light-lyceen'), age: '17 ans', arc: 'Découverte du Death Note', caption: 'Le lycéen parfait', summary: "L'élève parfait ramasse un cahier noir dans la cour du lycée. 40 noms plus tard, Interpol a un problème — et Ryuk, du spectacle.", stats: { nin: 3, tai: 2, gen: 3, int: 5, for: 1.5, vit: 2, end: 3, sce: 5 } },
        { label: 'Kira', idle: IDLE_U('light-kira'), age: '18-23 ans', arc: 'Duel contre L → SPK', caption: 'Le dieu autoproclamé', summary: "Kira règne : les criminels meurent à heure fixe, les états s'inclinent, L lui-même tombe. Reste Near, Mello — et l'entrepôt de la Yellow Box.", stats: { nin: 3.5, tai: 2, gen: 3.5, int: 5, for: 1.5, vit: 2, end: 3.5, sce: 5 } },
      ],
    },
    'l-lawliet': {
      nindoLabel: 'Méthode · sa logique', nindo: 'Je suis la justice — non parce que j\'ai raison, mais parce que je ne perds jamais.',
      titles: ['L', 'Le plus grand détective du monde (×3)'], status: 'Mort — le nom écrit par Rem',
      statLabels: GEN_LABELS,
      bio: "Personne ne connaît son visage, tout le monde connaît sa lettre : L, le détective qui résout l'insoluble derrière un écran gothique. L'affaire Kira le force à sortir de l'ombre — jusqu'à s'enchaîner (littéralement) à son suspect principal, qu'il considère aussi comme son premier ami.",
      personality: "Assis en gargouille, sucre dans le thé jusqu'à saturation, pieds nus : L pense mieux dans l'inconfort des autres. Son taux de certitude affiché (« 5 % ») est toujours un mensonge tactique — c'est 90 dans sa tête.",
      quotes: [
        'Je suis L.',
        "Si je m'assois normalement, ma capacité de déduction chute de 40 %.",
        'Light-kun… tu es mon premier ami. (et mon principal suspect)',
      ],
      trivia: [
        'Il détient les identités des « trois plus grands détectives du monde » : L, Eraldo Coil et Danuve — les trois sont lui.',
        'Watari est son intendant, son sniper et le fondateur de la Wammy\'s House qui l\'a élevé.',
        'Sa mort à mi-série reste l\'un des chocs narratifs les plus célèbres du manga moderne.',
      ],
      forms: [
        { label: 'Le détective', idle: IDLE_U('l-assis'), age: '24 ans', arc: 'Affaire Kira — cellule d\'enquête', caption: 'La gargouille pensante', summary: "Accroupi face à 12 écrans, pouce aux lèvres, sucre en intraveineuse : L réduit le monde entier à une probabilité — et Kira à un lycéen de Tokyo.", stats: { nin: 3, tai: 3, gen: 3.5, int: 5, for: 1.5, vit: 2.5, end: 3, sce: 5 } },
        { label: 'Face à Kira', idle: IDLE_U('l-debout'), age: '25 ans', arc: 'Confrontation finale', caption: 'Le dernier pari', summary: "Menotté à son suspect, certain à 99 % mais sans preuve : L joue sa dernière carte sous la pluie du toit — il entend déjà les cloches.", stats: { nin: 3, tai: 3.5, gen: 3.5, int: 5, for: 2, vit: 2.5, end: 3, sce: 5 } },
      ],
    },
  };
  let nStar = 0;
  for (const e of entries) {
    if (STAR_DETAILS[e.slug]) { Object.assign(e.attributes, STAR_DETAILS[e.slug]); nStar++; }
  }
  console.log(`  ✓ ${nStar}/12 stars multi-univers équipées (formes + sprites + credo)`);

  // ── Pages ÉVOLUTIVES hors Naruto (le moteur PlaceView s'active sur attributes.eras) ──
  const UNI_DETAILS = {
    'soul-society': {
      kanji: '尸魂界',
      quote: { text: "La Soul Society n'est pas le paradis. C'est une société — avec ses nobles, ses bas-fonds… et ses lames.", author: 'Rukia Kuchiki' },
      facts: [
        { label: 'Fondation', value: 'Il y a ~1 000 ans, par Genryūsai Yamamoto' },
        { label: 'Cœur', value: 'Le Seireitei — la cité fortifiée des Shinigami' },
        { label: 'Périphérie', value: 'Le Rukongai, 320 districts des âmes' },
        { label: 'Noblesse', value: 'Quatre grandes maisons (Kuchiki, Shihōin…)' },
        { label: 'Loi', value: 'La Chambre Centrale des 46' },
      ],
      bio: "La Soul Society est le monde où transitent les âmes : au centre, le Seireitei et ses treize divisions de Shinigami ; tout autour, l'immense Rukongai où survivent les âmes ordinaires. Mille ans d'ordre y ont été fondés par le Gotei 13 de Yamamoto — jusqu'à ce que la trahison d'Aizen, puis l'invasion des Quincy de Yhwach, fassent trembler l'édifice sur ses fondations.",
      eras: [
        { label: 'Fondation', leader: 'Genryūsai Yamamoto', period: 'Il y a 1 000 ans', event: 'Création du Gotei 13', threat: 'Chaos originel', img: '/images/akasha/places/soul-society-fondation.webp',
          summary: "Yamamoto fonde le Gotei 13 : treize divisions de faucheurs d'âmes pour faire régner l'ordre — une armée née dans un âge de sang." },
        { label: 'Paix armée', leader: 'Gotei 13', period: 'Le long équilibre', event: 'Ordre du Seireitei', threat: 'Hollows', img: '/images/akasha/places/soul-society-paix.webp',
          summary: "Des siècles d'équilibre : le Seireitei veille, le Rukongai survit, les Hollows sont purifiés — la routine millénaire des Shinigami." },
        { label: 'La Trahison', leader: 'Sōsuke Aizen', period: 'Arc Soul Society', event: 'Fuite d\'Aizen (Hōgyoku)', threat: 'Arrancars', img: '/images/akasha/places/soul-society-trahison.webp',
          summary: "Aizen abat son masque : la Chambre des 46 assassinée, le Hōgyoku volé, trois capitaines passés à l'ennemi — la Soul Society vacille." },
        { label: 'Guerre de Mille Ans', leader: 'Shunsui Kyōraku', period: 'Arc final', event: 'Invasion du Wandenreich', threat: 'Yhwach & les Quincy', img: '/images/akasha/places/soul-society-guerre.webp',
          summary: "Les Quincy surgissent de l'ombre : Yamamoto tombe, le Seireitei est ravagé — et Kyōraku reconstruit sur les cendres." },
      ],
    },
    'grand-line': {
      kanji: '偉大なる航路',
      quote: { text: 'Mon trésor ? Il est à vous si vous le voulez. Cherchez-le : j\'ai tout laissé là-bas.', author: 'Gol D. Roger' },
      facts: [
        { label: 'Entrée', value: 'Reverse Mountain — un seul courant y mène' },
        { label: 'Garde-fous', value: 'Les Calm Belts, repaires des Rois des Mers' },
        { label: 'Navigation', value: 'Log Pose obligatoire (la boussole y devient folle)' },
        { label: 'Moitiés', value: 'Paradise, puis le Nouveau Monde après Red Line' },
        { label: 'Terminus', value: 'Laugh Tale — et le One Piece' },
      ],
      bio: "La Grand Line ceinture le globe entre deux Calm Belts infestés de monstres marins : une route où le climat, les courants et les boussoles perdent la raison. Sa première moitié, Paradise, brise les rookies ; la seconde, le Nouveau Monde, appartient aux Empereurs. Tout au bout dort Laugh Tale, l'île où Roger a laissé son trésor — la raison pour laquelle le monde entier a pris la mer.",
      eras: [
        { label: "L'ère de Roger", leader: 'Gol D. Roger', period: 'Il y a 24 ans', event: 'Conquête de la route', threat: 'La Marine', img: '/images/akasha/places/grand-line-roger.webp',
          summary: "L'Oro Jackson atteint Laugh Tale : Roger conquiert la route maritime, devient le Roi des Pirates — et meurt à Loguetown, le sourire aux lèvres." },
        { label: 'Grand Âge de la Piraterie', leader: 'Les rookies', period: 'Depuis 24 ans', event: "Ruée vers l'aventure", threat: 'Marine & Shichibukai', img: '/images/akasha/places/grand-line-ruee.webp',
          summary: "Les derniers mots de Roger jettent le monde à la mer : des milliers d'équipages s'engouffrent dans Paradise à la poursuite du One Piece." },
        { label: 'Nouveau Monde', leader: 'Les Quatre Empereurs', period: 'Seconde moitié', event: 'Règne des Yonkō', threat: 'Kaido · Big Mom · Barbe Noire', img: '/images/akasha/places/grand-line-nouveau-monde.webp',
          summary: "Au-delà de Red Line, la mer des monstres : quatre Empereurs se partagent des eaux où même les vétérans de Paradise coulent." },
        { label: 'Course finale', leader: 'Monkey D. Luffy', period: "Aujourd'hui", event: 'Route vers Laugh Tale', threat: 'La guerre finale', img: '/images/akasha/places/grand-line-laugh-tale.webp',
          summary: "Les Ponéglyphes s'assemblent, les Empereurs tombent — la course au One Piece entre dans son dernier acte." },
      ],
    },
    'ae86-trueno': {
      kanji: 'ハチロク',
      quote: { text: 'Avec la même voiture, un pilote différent… c\'est une autre voiture.', author: 'Bunta Fujiwara' },
      facts: [
        { label: 'Châssis', value: 'Toyota Sprinter Trueno GT-APEX (AE86, 1983)' },
        { label: 'Architecture', value: 'Moteur avant, propulsion (FR) · ~925 kg' },
        { label: 'Livrée', value: 'Panda blanc & noir · « Fujiwara Tofu Shop »' },
        { label: 'Moteur', value: '4A-GE 1.6 — puis 4A-GE Groupe A à 11 000 tr/min' },
        { label: 'Terrain', value: 'Le downhill du mont Akina' },
      ],
      bio: "La « Hachi-Roku » du magasin de tofu Fujiwara n'a rien d'une voiture de course : une propulsion légère de 1983, dépassée sur le papier par tout ce qui roule. Mais façonnée par les livraisons de l'aube et le pied de Takumi, elle devient le fantôme d'Akina — la voiture qui humilie les RedSuns, casse son moteur au combat, renaît avec un cœur de Groupe A et porte le downhill de Project D.",
      eras: [
        { label: 'La livreuse de tofu', leader: 'Bunta Fujiwara', period: "Avant l'histoire", event: "Livraisons de l'aube", threat: "Un gobelet d'eau", img: '/images/akasha/artifacts/ae86-tofu.webp',
          summary: "La voiture de livraison du tofu Fujiwara : chaque matin depuis ses 13 ans, Takumi dévale l'Akina sans savoir qu'il apprend l'art du drift." },
        { label: "Reine d'Akina", leader: 'Takumi Fujiwara', period: 'First Stage', event: 'Victoire sur la FD de Keisuke', threat: 'RedSuns & NightKids', img: '/images/akasha/artifacts/ae86-akina.webp',
          summary: "La « vieille » Hachi-Roku humilie les RedSuns : gouttière, frôlages de rail — la légende du fantôme d'Akina est née." },
        { label: 'Moteur brisé', leader: 'Kyoichi Sudo', period: 'Second Stage', event: "Casse du 4A-GE face à l'Evo III", threat: 'La fin ?', img: '/images/akasha/artifacts/ae86-casse.webp',
          summary: "Face à l'Emperor de Sudo, le moteur rend l'âme en pleine course — l'AE86 semble finie… jusqu'à ce que Bunta déniche un 4A-GE de course." },
        { label: 'Project D', leader: 'Takumi Fujiwara', period: 'Fourth Stage', event: '11 000 tr/min', threat: 'Tous les cols du Kantō', img: '/images/akasha/artifacts/ae86-project-d.webp',
          summary: "Renée avec un moteur qui hurle à 11 000 tr/min, la panda devient l'arme du downhill de Project D — invaincue de col en col." },
      ],
    },
  };
  for (const e of entries) if (UNI_DETAILS[e.slug]) Object.assign(e.attributes, UNI_DETAILS[e.slug]);

  // ── Primes One Piece : overrides canon curés + normalisation de format (Most Wanted) ──
  // L'API api-onepiece ne fournit la prime que pour une minorité de persos ; les têtes majeures
  // (Yonko, légendes, Cross Guild, primes post-Wano) arrivent par l'import de masse Jikan SANS prime.
  // data/op-bounties-curated.json (slug → entier Berrys) comble ces trous et corrige les erreurs.
  const OP_BOUNTIES = existsSync('data/op-bounties-curated.json')
    ? JSON.parse(readFileSync('data/op-bounties-curated.json', 'utf8'))
    : {};
  const fmtBerrys = (n) => `${Number(n).toLocaleString('de-DE')} Berrys`; // 4.388.000.000 Berrys
  let opBAdd = 0, opBFix = 0, opBNorm = 0;
  for (const e of entries) {
    if (e.universe !== 'One Piece' || e.type !== 'character') continue;
    if (OP_BOUNTIES[e.slug] != null) {
      const before = e.attributes.bounty;
      e.attributes.bounty = fmtBerrys(OP_BOUNTIES[e.slug]);
      if (before == null) opBAdd++; else if (before !== e.attributes.bounty) opBFix++;
    } else if (e.attributes.bounty != null) {
      const v = parseInt(String(e.attributes.bounty).replace(/[^\d]/g, ''), 10);
      if (v > 0) { const f = fmtBerrys(v); if (f !== e.attributes.bounty) { e.attributes.bounty = f; opBNorm++; } }
    }
  }
  if (opBAdd || opBFix || opBNorm) console.log(`  ✓ primes OP : ${opBAdd} ajoutées + ${opBFix} corrigées + ${opBNorm} normalisées (curated)`);

  // ── Pages évolutives SUPPLÉMENTAIRES (data-driven, authorées par workflow) ──
  const EXTRA_PAGES = new Map((EXTRA.pages || []).map((p) => [p.slug, p]));
  let nEP = 0;
  for (const e of entries) {
    const p = EXTRA_PAGES.get(e.slug);
    if (!p) continue;
    const { slug, ...attrs } = p;
    Object.assign(e.attributes, attrs);
    nEP++;
  }
  if (nEP) console.log(`  ✓ ${nEP} pages évolutives supplémentaires mergées (Hueco Mundo, Namek…)`);

  // ── Stands JoJo SUPPLÉMENTAIRES (data-driven) ──
  let nExStand = 0;
  const jojoCharByName = entries.filter((e) => e.universe === "JoJo's Bizarre Adventure" && e.type === 'character');
  const resolveJojoOwner = (name) => {
    const n = String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const toks = n.split(/[\s.,'’-]+/).filter((t) => t.length >= 3);
    let best = null, bestHit = 0;
    for (const c of jojoCharByName) {
      const cn = c.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const ctoks = new Set(cn.split(/[\s.,'’-]+/).filter((t) => t.length >= 3));
      let hit = 0; for (const t of toks) if (ctoks.has(t)) hit++;
      if (hit > bestHit && hit >= Math.min(2, toks.length)) { bestHit = hit; best = c; }
    }
    return best;
  };
  for (const st of (EXTRA.stands || [])) {
    if (!st?.slug || !st?.name) continue;
    if (addEnt(st.slug, 'power', st.name, "JoJo's Bizarre Adventure", st.summary || 'Stand.', st.rarity || 'rare', purge({ element: 'Stand', category: 'Stand', partie: st.partie || null }))) {
      const owner = resolveJojoOwner(st.ownerName || '');
      if (owner) relations.push({ from: owner.slug, to: st.slug, relation: 'maitrise' });
      nExStand++;
    }
  }
  if (nExStand) console.log(`  ✓ ${nExStand} Stands JoJo supplémentaires`);

  // ── Rosters d'ORGANISATIONS (data-driven) : org entity + relations appartient ──
  let nOrg = 0, nMemRel = 0;
  const resolveMember = (universe, name) => {
    const n = String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const toks = n.split(/[\s.,'’-]+/).filter((t) => t.length >= 3);
    if (!toks.length) return null;
    let best = null, bestHit = 0;
    for (const c of entries) {
      if (c.universe !== universe || c.type !== 'character') continue;
      const cn = c.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const ctoks = new Set(cn.split(/[\s.,'’-]+/).filter((t) => t.length >= 3));
      let hit = 0; for (const t of toks) if (ctoks.has(t)) hit++;
      // exige un recouvrement fort (≥2 tokens ou nom mono-token exact) pour éviter les faux positifs
      if (hit > bestHit && hit >= Math.min(2, toks.length)) { bestHit = hit; best = c; }
    }
    return best;
  };
  for (const org of (EXTRA.rosters || [])) {
    if (!org?.orgSlug || !org?.orgName) continue;
    addEnt(org.orgSlug, 'status', org.orgName, org.universe, org.summary || `${org.orgName}.`, org.rarity || 'epic', purge({ scope: 'Organisation', category: org.category || 'Organisation' }));
    if (seen.has(org.orgSlug)) nOrg++;
    for (const m of (org.members || [])) {
      const mem = resolveMember(org.universe, m.name);
      if (mem && mem.slug !== org.orgSlug) { relations.push({ from: mem.slug, to: org.orgSlug, relation: 'appartient' }); nMemRel++; }
    }
  }
  if (nOrg) console.log(`  ✓ ${nOrg} organisations (rosters) + ${nMemRel} liens de membres`);

  // ── Catégorie normalisée pour les entités CURÉES (carte slug→catégorie + fallback par type) ──
  const CATEGORY_BY_SLUG = {
    // JoJo
    stand: 'Stand', 'stand-requiem': 'Stand', 'onde-hamon': 'Aptitude', 'masque-de-pierre': 'Relique', 'fleche-du-stand': 'Relique',
    joestar: 'Clan & lignée', passione: 'Organisation', 'fondation-speedwagon': 'Organisation', 'hommes-du-pilier': 'Race & espèce',
    // Bleach
    zanpakuto: 'Arme & outil', hogyoku: 'Relique', bankai: 'Technique', kido: 'Technique', shunpo: 'Aptitude',
    'gotei-13': 'Organisation', espada: 'Organisation', quincy: 'Race & espèce', hollow: 'Race & espèce', shinigami: 'Métier',
    // Dragon Ball
    kamehameha: 'Technique', genkidama: 'Technique', 'kaio-ken': 'Technique', 'super-saiyan': 'Transformation', 'ultra-instinct': 'Transformation',
    saiyan: 'Race & espèce', 'dragon-balls': 'Relique', senzu: 'Relique', 'capsule-corp': 'Organisation',
    // One Piece
    haki: 'Haki', 'fruit-du-demon': 'Fruit du Démon', 'chapeau-de-paille': 'Équipage', marine: 'Organisation',
    yonko: 'Titre & rang', shichibukai: 'Titre & rang', pirate: 'Métier', 'thousand-sunny': 'Navire',
    'one-piece-tresor': 'Relique', ponegliphes: 'Relique',
    // HxH
    nen: 'Aptitude', gungi: 'Aptitude', chasseur: 'Métier', 'brigade-fantome': 'Organisation', 'association-hunters': 'Organisation',
    zoldyck: 'Clan & lignée', 'fourmis-chimeres': 'Race & espèce', 'examen-hunter': 'Titre & rang',
    // Initial D
    'ae86-trueno': 'Voiture', 'rx7-fd': 'Voiture', 'r32-gtr': 'Voiture', sileighty: 'Voiture', 'lancer-evo3': 'Voiture',
    drift: 'Aptitude', 'pilote-de-toge': 'Métier', redsuns: 'Écurie de course', nightkids: 'Écurie de course', 'impact-blue': 'Écurie de course', 'project-d': 'Écurie de course', 'speed-stars': 'Écurie de course',
    // Death Note
    'cahier-de-la-mort': 'Relique', 'dieu-de-la-mort': 'Race & espèce', kira: 'Titre & rang', detective: 'Métier',
    'oeil-de-shinigami': 'Aptitude', spk: 'Organisation', yotsuba: 'Organisation', 'cellule-kira': 'Organisation',
  };
  for (const e of entries) {
    if (e.attributes.category) continue;
    if (CATEGORY_BY_SLUG[e.slug]) { e.attributes.category = CATEGORY_BY_SLUG[e.slug]; continue; }
    if (e.type === 'power') e.attributes.category = 'Technique';
    else if (e.type === 'skill') e.attributes.category = 'Aptitude';
    else if (e.type === 'artifact') e.attributes.category = 'Relique';
    else if (e.type === 'profession') e.attributes.category = 'Métier';
    else if (e.type === 'status') e.attributes.category = /Équipage/.test(String(e.attributes.scope || '')) ? 'Équipage' : 'Organisation';
    else if (e.type === 'place') e.attributes.category = 'Lieu';
  }

  // ── Enrichissement ANILIST : combler la popularité (favorites) + bio manquantes ──
  // AniList expose favourites + description par perso, triés par popularité (idMal réutilisé).
  // Favoris (nombres, neutres) → popularité/rareté. descRaw = description AniList BRUTE (anglais),
  // stockée pour ENRICHISSEMENT + traduction FR ultérieure (JAMAIS affichée telle quelle → règle FR).
  console.log('→ AniList — favoris + descriptions brutes (descRaw) par univers…');
  let aniFav = 0, aniDesc = 0;
  for (const u of UNIVERSES) {
    // Média principal + médias secondaires (parties JoJo, films DB, suites Initial D) → couverture max.
    const ids = [u.malId, ...(u.extraMalIds ?? [])];
    const chars = [];
    const seenAni = new Set();
    for (const id of ids) {
      let part = await fetchAniListChars(id, 10);
      // Rate-limit AniList (90/min) : un média peut revenir VIDE après un burst (ex. les 300+ persos DB
      // juste avant). On retente une fois après une pause plus longue avant d'abandonner ce média.
      if (!part.length) { await sleep(4000); part = await fetchAniListChars(id, 10); }
      for (const c of part) { const k = (c.names?.[0] || '').toLowerCase(); if (k && !seenAni.has(k)) { seenAni.add(k); chars.push(c); } }
      await sleep(500); // respire entre médias pour éviter la salve
    }
    if (!chars.length) { console.log(`  ⚠ AniList vide pour ${u.label} (mal ${u.malId})`); continue; }
    const lookup = anilistIndex(chars);
    let fu = 0, du = 0;
    for (const e of entries) {
      if (e.universe !== u.label || e.type !== 'character') continue;
      const hit = lookup(e.name);
      if (!hit) continue;
      if ((!e.attributes.favorites || e.attributes.favorites === 0) && hit.fav > 0) {
        e.attributes.favorites = hit.fav;
        e.rarity = rarityMax(e.rarity, favTier(hit.fav));
        aniFav++; fu++;
      }
      if (!e.attributes.descRaw && hit.descRaw) { e.attributes.descRaw = hit.descRaw; e.attributes.descLang = 'en'; aniDesc++; du++; }
    }
    console.log(`  ✓ ${u.label} : +${fu} favoris, +${du} descriptions (AniList ${chars.length} persos)`);
  }
  console.log(`  ✓ AniList total : +${aniFav} favoris, +${aniDesc} descriptions brutes`);

  // ── Repli JIKAN `about` par NOM : comble les persos qu'ni le join mal_id ni AniList n'ont couverts
  // (mal_id absent du cache au moment du casting, ou noms divergents). CLOISONNÉ PAR UNIVERS : le cache
  // couvre TOUS les univers, donc un match par nom non-scopé contamine (ex. Komugi HxH ← bio Komugi Naruto).
  // On limite chaque lookup aux mal_id de l'univers (malId + extraMalIds).
  let aboutFallback = 0;
  const aboutByUniv = new Map(); // label → fn(name)
  for (const u of UNIVERSES) {
    const ids = new Set([u.malId, ...(u.extraMalIds ?? [])].map(String));
    const chars = Object.entries(aboutCache)
      .filter(([mal, v]) => v.about && ids.has(String(mal)))
      .map(([, v]) => ({
        names: [v.name, v.name.includes(', ') ? v.name.split(/,\s*/).reverse().join(' ') : v.name],
        favourites: 0, descRaw: String(v.about).replace(/\s+/g, ' ').trim().slice(0, 1200),
      }));
    if (chars.length) aboutByUniv.set(u.label, anilistIndex(chars));
  }
  for (const e of entries) {
    if (e.type !== 'character' || e.attributes.descRaw) continue;
    const lk = aboutByUniv.get(e.universe);
    if (!lk) continue;
    const hit = lk(e.name);
    if (hit?.descRaw) { e.attributes.descRaw = hit.descRaw; e.attributes.descLang = 'en'; aboutFallback++; }
  }
  console.log(`  ✓ repli Jikan about (cloisonné par univers) : +${aboutFallback} descriptions brutes`);

  // ── DÉDUP : fusion des doublons de personnages (clé canonique + alias curés) ──
  // Les slugs CURÉS (config u.chars + STAR_DETAILS) sont toujours gardés comme keeper.
  const curatedSlugs = new Set([...UNIVERSES.flatMap((u) => u.chars.map((c) => c.slug)), ...Object.keys(STAR_DETAILS)]);
  const dd = dedupeChars(entries, relations, DEDUP_ALIASES, curatedSlugs);
  let finalEntries = dd.entries;
  const seenFinal = new Set(finalEntries.map((e) => e.slug));
  console.log(`  ✓ dédup : ${dd.merges.length} doublons fusionnés → ${finalEntries.length} entrées`);
  writeFileSync('data/akasha-merges-universes.json', JSON.stringify(dd.merges, null, 1));

  // Relations : ne garder que celles dont les 2 extrémités existent (post-dédup)
  const bad = dd.relations.filter((r) => !seenFinal.has(r.from) || !seenFinal.has(r.to));
  for (const b of bad) console.warn('  ⚠ relation ignorée:', b.from, '→', b.to);
  let ok = dd.relations.filter((r) => seenFinal.has(r.from) && seenFinal.has(r.to));

  const byType = {};
  for (const e of finalEntries) byType[e.type] = (byType[e.type] || 0) + 1;
  const noImg = finalEntries.filter((e) => e.type === 'character' && !e.image_url).length;
  // Traductions VF (descFr) : source de vérité data/akasha-translations.json → réinjectées à chaque build.
  try {
    const tl = JSON.parse(readFileSync('data/akasha-translations.json', 'utf8'));
    let ni = 0; for (const e of finalEntries) if (tl[e.slug] && String(tl[e.slug]).trim().length > 10) { e.attributes.descFr = String(tl[e.slug]).trim(); ni++; }
    console.log(`  ✓ ${ni} traductions VF (descFr) réinjectées`);
  } catch { /* pas encore de traductions */ }
  // Enrichissement curé durable (lieux OP, artefacts DB, tags nen/saga/race) — cf. data/akasha-enrich.mjs.
  { const r = applyEnrichment(finalEntries); console.log(`  ✓ enrichissement : +${r.added} entités · tags nen ${r.nen}/saga ${r.saga}/race ${r.race}`); }
  // Dédup final tous types (même univers+type+nom) — le suffixe par univers des collisions curé/miné créait des doublons.
  const dd2 = dedupeByName(finalEntries, ok);
  if (dd2.removed.length) console.log(`  ✓ dédup entités : −${dd2.removed.length} doublons (${dd2.removed.slice(0, 6).join(', ')}${dd2.removed.length > 6 ? '…' : ''})`);
  finalEntries = dd2.entries; ok = dd2.relations;
  writeFileSync('data/akasha-universes.json', JSON.stringify({ entries: finalEntries, relations: ok }, null, 1));
  console.log(`✓ ${finalEntries.length} entrées, ${ok.length} relations → data/akasha-universes.json`);
  console.log('  par type:', JSON.stringify(byType));
  console.log('  par univers:', UNIVERSES.map((u) => `${u.label}:${finalEntries.filter((e) => e.universe === u.label).length}`).join(' · '));
  if (noImg) console.log(`  ⚠ ${noImg} perso(s) sans portrait`);
}

main().catch((e) => { console.error('✗ build-akasha-universes:', e); process.exit(1); });
