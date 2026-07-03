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
import { writeFileSync } from 'node:fs';

const JIKAN = 'https://api.jikan.moe/v4';
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
    map.set(c.character.name, { img, role: c.role || null, va });
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
const purge = (o) => { for (const k of Object.keys(o)) { const v = o[k]; if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) delete o[k]; } return o; };

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
    await sleep(1100); // rate limit Jikan
    for (const extra of u.extraMalIds ?? []) {
      const more = await jikanCast(extra);
      for (const [k, v] of more) if (!cast.has(k)) cast.set(k, v);
      await sleep(1100);
    }
    console.log(`  ${cast.size} portraits MAL`);

    for (const c of u.chars) {
      const cv = cast.get(c.mal);
      let img = cv?.img ?? fuzzyGet(cast, c.mal) ?? null;
      const attributes = { role: c.role };
      if (c.aff) attributes.affiliation = c.aff;
      if (cv?.va) attributes.voiceActors = cv.va; // doubleurs JP/VF-EN pour les curés aussi
      // Champs de profondeur optionnels (le dossier perso les lit génériquement : onglet Histoire, bannière credo…)
      for (const k of ['status', 'nindo', 'nindoLabel', 'bio', 'personality', 'quotes', 'trivia']) if (c[k]) attributes[k] = c[k];
      // Dragon Ball : image détourée + race/ki de l'API dédiée
      if (u.dbApi && c.db) {
        const d = dbByName.get(c.db);
        if (d?.image) img = d.image;
        if (d?.race) attributes.race = d.race;
        if (d?.ki) attributes.ki = d.ki;
      }
      // One Piece : prime + équipage FR de l'API dédiée
      if (u.opApi && c.op) {
        const o = opByName.get(c.op);
        if (o?.bounty) attributes.bounty = `${o.bounty} Berrys`;
        if (o?.crew?.name) attributes.crew = o.crew.name;
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
      add(entry(c.slug, 'character', c.name, u.label, c.summary, c.rarity, attributes, img));
    }
    for (const [type, slug, name, [k, v], summary, rarity] of u.entities) add(entry(slug, type, name, u.label, summary, rarity, { [k]: v }));

    // ── Import de MASSE : casting COMPLET de l'univers (Jikan), au-delà des persos curés. ──
    // On épargne les persos déjà curés (par nom MAL et par slug) pour ne pas les dupliquer ;
    // collision cross-univers → suffixe par univers.
    const curatedMal = new Set(u.chars.map((c) => c.mal));
    const curatedSlug = new Set(u.chars.map((c) => c.slug));
    let massU = 0;
    for (const [rawName, { img, role, va }] of cast) {
      if (!rawName || GARBAGE_NAME.test(rawName) || curatedMal.has(rawName)) continue;
      const name = displayName(rawName);
      let slug = slugify(name);
      if (!slug || slug.length < 2 || curatedSlug.has(slug)) continue;
      if (seen.has(slug)) { slug = `${slug}-${slugify(u.label)}`; if (seen.has(slug)) continue; }
      const isMain = role === 'Main';
      const roleFr = isMain ? 'Personnage principal' : 'Personnage secondaire';
      add(entry(slug, 'character', name, u.label, `${roleFr} de ${u.label}.`, isMain ? 'rare' : 'common', purge({ role: roleFr, voiceActors: va || undefined }), img));
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
    const rarity = /Logia|mythique|spécial/i.test(type) ? 'epic' : 'rare';
    if (addEnt(slugify(f.name), 'power', f.name, 'One Piece', firstSentence(f.description) || `Fruit du Démon${type ? ' de type ' + type : ''}.`, rarity, purge({ element: `Fruit du Démon${type ? ' · ' + type : ''}`, roman_name: f.roman_name || null }))) nf++;
  }
  console.log(`  + ${nf} Fruits du Démon (power)`);
  const opCrews = (await getJSON('https://api.api-onepiece.com/v2/crews/fr')) ?? [];
  let ncr = 0;
  for (const cr of Array.isArray(opCrews) ? opCrews : []) {
    if (!cr?.name) continue;
    const rarity = cr.is_yonko ? 'legendary' : Number(cr.total_prime) > 1e9 ? 'epic' : 'rare';
    if (addEnt(slugify(cr.name), 'status', cr.name, 'One Piece', firstSentence(cr.description) || 'Équipage de pirates.', rarity, purge({ scope: 'Équipage pirate', roman_name: cr.roman_name || null, total_prime: cr.total_prime ? `${cr.total_prime} Berrys` : null }))) ncr++;
  }
  console.log(`  + ${ncr} équipages (status)`);
  const opHakis = (await getJSON('https://api.api-onepiece.com/v2/hakis/fr')) ?? [];
  let nh = 0;
  for (const h of Array.isArray(opHakis) ? opHakis : []) if (h?.name && addEnt(slugify(h.name), 'skill', h.name, 'One Piece', firstSentence(h.description) || 'Type de Haki.', 'epic', purge({ discipline: 'Haki', roman_name: h.roman_name || null }))) nh++;
  const opGears = (await getJSON('https://api.api-onepiece.com/v2/luffy-gears/fr')) ?? [];
  let ng = 0;
  for (const g of Array.isArray(opGears) ? opGears : []) if (g?.name && addEnt(slugify(g.name), 'skill', g.name, 'One Piece', firstSentence(g.description) || 'Transformation de Luffy.', 'epic', { discipline: 'Gear (Luffy)' })) { ng++; relations.push({ from: slugify(g.name), to: 'monkey-d-luffy', relation: 'maitrise' }); }
  console.log(`  + ${nh} hakis + ${ng} gears (skill)`);

  console.log('→ Dragon Ball — entités (transformations, planètes)…');
  const dbTrans = (await getJSON('https://dragonball-api.com/api/transformations?limit=100'));
  let nt = 0;
  for (const t of (dbTrans?.items || dbTrans || [])) if (t?.name && addEnt(slugify(t.name), 'skill', t.name, 'Dragon Ball', `Transformation de puissance${t.ki ? ` (Ki ${t.ki})` : ''}.`, 'epic', purge({ discipline: 'Transformation', ki: t.ki || null }), t.image || null)) nt++;
  const dbPlanets = (await getJSON('https://dragonball-api.com/api/planets?limit=100'));
  let np = 0;
  for (const pl of (dbPlanets?.items || dbPlanets || [])) if (pl?.name && addEnt(slugify(pl.name), 'place', pl.name, 'Dragon Ball', firstSentence(pl.description) || 'Planète.', 'rare', { region: pl.isDestroyed ? 'Planète détruite' : 'Planète' }, pl.image || null)) np++;
  console.log(`  + ${nt} transformations (skill) + ${np} planètes (place)`);

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
    if (oc.crew?.name && a.crew == null) a.crew = oc.crew.name;
    if (oc.fruit?.name && a.fruit == null) a.fruit = oc.fruit.name;
    const bits = [oc.crew?.name, oc.bounty ? `prime ${oc.bounty} Berrys` : null].filter(Boolean);
    if (bits.length) e.summary = `${e.summary.replace(/\.$/, '')} — ${bits.join(', ')}.`;
    if (oc.crew?.name) { const cs = slugify(oc.crew.name); if (seen.has(cs) && cs !== e.slug) { relations.push({ from: e.slug, to: cs, relation: 'appartient' }); opRelC++; } }
    if (oc.fruit?.name) { const fs = slugify(oc.fruit.name); if (seen.has(fs) && fs !== e.slug) { relations.push({ from: e.slug, to: fs, relation: 'maitrise' }); opRelF++; } }
    opEnr++;
  }
  console.log(`  ✓ ${opEnr} persos One Piece enrichis, +${opRelC} liens équipage, +${opRelF} liens fruit`);

  // Relations : vérifier que tous les slugs existent dans CE lot
  const bad = relations.filter((r) => !seen.has(r.from) || !seen.has(r.to));
  for (const b of bad) console.warn('  ⚠ relation ignorée:', b.from, '→', b.to);
  const ok = relations.filter((r) => seen.has(r.from) && seen.has(r.to));

  const byType = {};
  for (const e of entries) byType[e.type] = (byType[e.type] || 0) + 1;
  const noImg = entries.filter((e) => e.type === 'character' && !e.image_url).length;
  writeFileSync('data/akasha-universes.json', JSON.stringify({ entries, relations: ok }, null, 1));
  console.log(`✓ ${entries.length} entrées, ${ok.length} relations → data/akasha-universes.json`);
  console.log('  par type:', JSON.stringify(byType));
  console.log('  par univers:', UNIVERSES.map((u) => `${u.label}:${entries.filter((e) => e.universe === u.label).length}`).join(' · '));
  if (noImg) console.log(`  ⚠ ${noImg} perso(s) sans portrait`);
}

main().catch((e) => { console.error('✗ build-akasha-universes:', e); process.exit(1); });
