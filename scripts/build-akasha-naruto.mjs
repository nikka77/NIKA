// scripts/build-akasha-naruto.mjs — construit data/akasha-naruto.json pour le registre AKASHA.
// Source : Dattebayo API (faits + images). Les RÉSUMÉS sont rédigés ici (originaux, FR),
// jamais copiés de Narutopedia. Run : node scripts/build-akasha-naruto.mjs
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Image de référence (Narutopedia, via scripts/fetch-akasha-naruto-images.py) si présente.
const refImg = (slug) =>
  existsSync(join(ROOT, 'public/images/akasha/ref', `${slug}.webp`)) ? `/images/akasha/ref/${slug}.webp` : null;

// Faits canon SMW (scripts/fetch-akasha-naruto-facts.mjs) — corrige/enrichit les données API.
let FACTS = {};
try { FACTS = JSON.parse(readFileSync(join(ROOT, 'data', 'akasha-naruto-facts.json'), 'utf8')); } catch { /* optionnel */ }

// Libellés FR courts (classification, affiliations, rangs). Défaut = original.
const FR = {
  Sage: 'Ermite (Sage)', 'Sensor Type': 'Type Capteur', 'Missing-nin': 'Déserteur (Nukenin)',
  'Medical-nin': 'Ninja médical', Reincarnation: 'Réincarné', Orphan: 'Orphelin', Criminal: 'Criminel',
  'S-rank': 'Rang S', 'Allied Shinobi Forces': 'Forces Shinobi Alliées', 'Mount Myōboku': 'Mont Myōboku',
  'Team 7': 'Équipe 7', Genin: 'Genin', Chūnin: 'Chūnin', Jōnin: 'Jōnin', Kage: 'Kage',
};
const fr = (s) => FR[s] ?? s;
const frList = (a) => (Array.isArray(a) ? a.map(fr) : []);
const API = 'https://dattebayo-api.onrender.com';
const UA = 'Mozilla/5.0 (NIKA/akasha-build)';

const slugify = (s) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function getJSON(path) {
  const r = await fetch(API + path, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json();
}

// ─── Personnages curés (faits tirés de l'API ; résumé rédigé ici) ─────
// village = slug du lieu ; clan/ranks/powers/skills/artifacts/beast = slugs cibles de relations.
const CHARACTERS = [
  { key: 'Naruto Uzumaki', village: 'konohagakure', clan: 'uzumaki', ranks: ['hokage', 'jinchuriki'], powers: ['rasengan', 'shadow-clone', 'tailed-beast-ball'], beast: 'kurama', rarity: 'legendary',
    role: 'Hokage, Jinchūriki', summary: "Orphelin turbulent devenu héros et Septième Hokage, hôte du renard Kurama.",
    kg: [],                       // clan Uzumaki = aucun kekkei genkai personnel (les natures exotiques viennent de Kurama)
    nat: ['Wind Release', 'Yin–Yang Release'],
    // techniques signature en tête de liste (le reste — 94 au total — suit dans l'ordre API)
    jutsuPriority: ['Rasengan', 'Shadow Clone Technique', 'Multiple Shadow Clone Technique', 'Sage Mode',
      'Six Paths Sage Mode', 'Tailed Beast Ball', 'Wind Release: Rasenshuriken', 'Nine-Tails Chakra Mode',
      'Baryon Mode', 'Sexy Technique', 'One Thousand Years of Death', 'Summoning Technique (Toad)'],
    // Surnoms curés en FR (l'API renvoie un dump kanji+romaji collé, illisible) — canon Narutopedia.
    titles: ['Ninja hyperactif imprévisible n°1', "L'Enfant de la Prophétie", 'Le Sauveur de ce monde',
      'Le Héros de Konoha', 'Le Garçon aux miracles', 'Le Hokage orange de Konoha', 'Septième Hokage', 'Le Renard'],
    nindo: 'Je ne reviens jamais sur ma parole. C\'est ça, mon nindō : ma voie du ninja !',
    nindoLabel: 'Nindō · sa voie du ninja',
    // Arsenal CURÉ : l'API agrège des outils film/jeu/autres persos (Sable=Gaara, Pierre de Gelel=film,
    // lames/mécanismes=autres ninjas). Naruto n'est pas un porteur d'armes → basiques + Fūma + Hiraishin emprunté.
    tools: ['Kunai', 'Shuriken', 'Fūma Shuriken', 'Flying Thunder God Kunai'],
    status: 'Vivant',
    biju: 'Kurama', // l'API dump les 9 bijū (chakra reçu en guerre) → curé au bijū réel
    squad: { name: 'Équipe 7 · Team Kakashi', members: [
      { rel: 'Sensei', name: 'Kakashi Hatake', slug: 'kakashi-hatake' },
      { rel: 'Coéquipier', name: 'Sasuke Uchiha', slug: 'sasuke-uchiha' },
      { rel: 'Coéquipière', name: 'Sakura Haruno', slug: 'sakura-haruno' },
    ] },
    bio: "Orphelin dès sa naissance, Naruto porte en lui Kurama, le Démon-Renard à neuf queues scellé par son père le Quatrième Hokage. Rejeté et craint par le village, il masque sa solitude derrière des farces et un rêve tenace : devenir Hokage pour être enfin reconnu. Intégré à l'Équipe 7 sous Kakashi, il se lie à Sasuke et Sakura, apprend le Multiclonage puis le Rasengan, et se révèle aux Examens Chūnin. Après deux ans et demi d'entraînement avec Jiraiya, il maîtrise le Rasenshuriken, puis le Mode Ermite avec lequel il terrasse Pain et sauve Konoha. Durant la Quatrième Grande Guerre Shinobi, il se réconcilie avec Kurama, débloque le Mode Chakra puis le pouvoir des Six Chemins, et scelle Kaguya aux côtés de Sasuke. Devenu le Septième Hokage, il veille sur une ère de paix — jusqu'au Mode Baryon, ultime sacrifice contre Isshiki.",
    personality: "Hyperactif, bruyant et impulsif, Naruto cache sous ses pitreries la blessure d'un enfant seul. Sa détermination ne faiblit jamais et son optimisme est contagieux. Son arme la plus puissante n'est pas le chakra mais les liens : il a le don de comprendre la douleur de ses ennemis et de les transformer en alliés — ce que Jiraiya appelait son « ninjutsu de la parole ».",
    quotes: [
      'Crois-le ! (Dattebayo !)',
      'Quand on protège quelque chose de vraiment précieux… on devient vraiment fort.',
      "Le vrai perdant, ce n'est pas celui qui échoue, c'est celui qui abandonne.",
      "Je deviendrai Hokage, et tout le village devra reconnaître mon existence !",
    ],
    trivia: [
      "« Naruto » désigne les tourbillons marins et le narutomaki, la garniture en spirale des ramen ; son prénom vient du héros du roman de Jiraiya.",
      "Ses ramen préférés : le miso chāshū du restaurant Ichiraku.",
      "Il est le premier Hokage à ne descendre d'aucun clan fondateur prestigieux.",
      "Enfant, il ratait systématiquement le clonage à l'Académie — l'épreuve qu'il finit par réussir grâce au Multiclonage de l'ombre.",
    ],
    // Chaque forme = un instantané COHÉRENT calé sur les faits SMW (âge→taille→rang) et l'arc.
    forms: [
      { label: 'Partie I', g: 0, age: '12 ans', height: '1,45 m', weight: '40 kg', rank: 'Genin',
        classification: ['Jinchūriki'], natures: [], occupation: ['Genin · Équipe 7'], affiliation: ['Konohagakure', 'Équipe 7'],
        signature: ['Multiclonage', 'Rasengan'], arc: 'Pays des Vagues · Examens Chūnin',
        caption: '12 ans · Genin · Pays des Vagues & Examens Chūnin',
        summary: "Genin turbulent de l'équipe 7. Il apprend le Multiclonage de l'ombre puis le Rasengan, et découvre son lien avec Kurama." },
      { label: '1 Queue', img: '/images/akasha/naruto/naruto-1tail.webp', age: '12 ans', height: '1,45 m', weight: '40 kg', rank: 'Genin',
        classification: ['Jinchūriki'], natures: [], occupation: ['Genin · Équipe 7'], affiliation: ['Konohagakure'],
        signature: ['Manteau de Kurama — 1 queue', 'Rasengan'], arc: 'Récupération de Sasuke',
        caption: '12 ans · Premier manteau de Kurama (déchaîné)',
        summary: "À la Vallée de la Fin contre Sasuke, la rage fait déborder le chakra de Kurama en un manteau à une queue." },
      // Ordre chronologique : le RETOUR (Partie II, début Shippūden) précède la Version 2 (4 queues au
      // Pont Tenchi, mission Sasuke/Sai qui vient APRÈS le retour). Retour ≈ 15 ans, Tenchi ≈ 15 ans.
      { label: 'Partie II', g: 1, age: '15 ans', height: '1,66 m', weight: '51 kg', rank: 'Genin',
        classification: ['Jinchūriki'], natures: ['Wind Release'], occupation: ['Ninja de Konoha'], affiliation: ['Konohagakure'],
        signature: ['Rasenshuriken', 'Multiclonage', 'Rasengan'], arc: 'Shippūden — retour',
        caption: '15 ans · Shippūden — retour',
        summary: "De retour après deux ans et demi d'entraînement avec Jiraiya, plus mûr et plus puissant ; il maîtrise le Rasenshuriken." },
      { label: 'Version 2', img: '/images/akasha/naruto/naruto-v2.webp', age: '15 ans', height: '1,66 m', weight: '51 kg', rank: 'Genin',
        classification: ['Jinchūriki'], natures: [], occupation: ['Ninja de Konoha'], affiliation: ['Konohagakure'],
        signature: ['Manteau de Kurama — 4 queues', 'Bombe de chakra'], arc: 'Pont Tenchi (vs Orochimaru)',
        caption: '15 ans · Version 2 — forme déchaînée (4 queues)',
        summary: "Submergé par la rage face à Orochimaru, le chakra de Kurama atteint quatre queues : une forme bestiale et dévastatrice qui ronge son propre corps." },
      { label: 'Mode Ermite', img: '/images/akasha/naruto/naruto-sage.webp', age: '16 ans', height: '1,66 m', weight: '51 kg', rank: 'Genin',
        classification: ['Jinchūriki', 'Ermite (Sage)'], natures: ['Wind Release'], occupation: ['Ninja de Konoha'], affiliation: ['Konohagakure', 'Mont Myōboku'],
        signature: ['Mode Ermite', 'Rasenshuriken', 'Rasengan'], arc: 'Assaut de Pain',
        caption: '16 ans · Ermite du mont Myōboku · Assaut de Pain',
        summary: "Formé par les crapauds, il maîtrise le senjutsu (Mode Ermite) et terrasse Pain avec le Rasenshuriken." },
      { label: 'Chakra Kurama', img: '/images/akasha/naruto/naruto-kurama.webp', age: '17 ans', height: '1,80 m', weight: '51 kg', rank: 'Genin',
        classification: ['Jinchūriki', 'Ermite (Sage)'], natures: ['Wind Release'], occupation: ['Ninja de Konoha'], affiliation: ['Forces Shinobi Alliées'],
        signature: ['Manteau de chakra de Kurama', 'Rasenshuriken', 'Multiclonage'], arc: 'Quatrième Guerre Shinobi',
        caption: '17 ans · Mode Chakra de Kurama',
        summary: "Réconcilié avec Kurama, il revêt un manteau de chakra doré marqué de sceaux : vitesse et puissance décuplées." },
      { label: 'Bijū Mode', img: '/images/akasha/naruto/naruto-biju.webp', age: '17 ans', height: '1,80 m', rank: 'Genin',
        classification: ['Jinchūriki', 'Ermite (Sage)', 'Type Capteur'], natures: ['Wind Release'], occupation: ['Ninja de Konoha'], affiliation: ['Forces Shinobi Alliées'],
        signature: ['Avatar de Kurama', 'Bijūdama', 'Rasenshuriken'], arc: 'Quatrième Guerre Shinobi',
        caption: '17 ans · Bijū Mode — avatar de Kurama',
        summary: "En pleine symbiose, Naruto matérialise l'avatar complet de Kurama, colossale silhouette de chakra, et déchaîne des Bijūdama." },
      { label: 'Six Chemins', img: '/images/akasha/naruto/naruto-sixpaths.webp', age: '17 ans', height: '1,80 m', rank: 'Genin',
        classification: ['Jinchūriki', 'Ermite (Sage)', 'Type Capteur'], natures: ['Wind Release', 'Yin–Yang Release'], occupation: ['Ninja de Konoha'], affiliation: ['Forces Shinobi Alliées'],
        signature: ['Mode Ermite des Six Chemins', 'Boules Cherche-Vérité', 'Rasenshuriken'], arc: 'Quatrième Guerre Shinobi (fin)',
        caption: '17 ans · Mode Ermite des Six Chemins',
        summary: "Doté du chakra d'Hagoromo, il accède au Mode Ermite des Six Chemins : vol, boules cherche-vérité et puissance divine pour sceller Kaguya." },
      { label: 'Hokage', img: '/images/akasha/naruto/naruto-hokage.webp', age: 'Adulte', height: '1,80 m', rank: 'Kage',
        // Jinchūriki jusqu'au sacrifice de Kurama (Mode Baryon vs Isshiki) : cette forme couvre l'essentiel
        // du mandat de Hokage, où Kurama est encore vivant → garder 'Jinchūriki' (cf. forme Mode Baryon).
        classification: ['Jinchūriki', 'Hokage'], natures: ['Wind Release', 'Yin–Yang Release'], occupation: ['Septième Hokage'], affiliation: ['Konohagakure'],
        signature: ['Rasengan', 'Multiclonage'], arc: 'Boruto — Hokage',
        caption: 'Adulte · Septième Hokage',
        summary: "Devenu le Septième Hokage, il dirige et protège Konoha tout en formant la nouvelle génération de ninjas." },
      { label: 'Mode Baryon', img: '/images/akasha/naruto/naruto-baryon.webp', age: 'Adulte', height: '1,80 m', rank: 'Kage',
        classification: ['Jinchūriki', 'Hokage'], natures: ['Wind Release', 'Yin–Yang Release'], occupation: ['Septième Hokage'], affiliation: ['Konohagakure'],
        signature: ['Mode Baryon', 'Bijūdama', 'Rasengan'], arc: 'Boruto',
        caption: 'Adulte · Forme ultime (Boruto)',
        summary: "Septième Hokage, il pousse la fusion avec Kurama jusqu'au Mode Baryon — ultime recours qui consume leur énergie vitale." },
    ],
    anims: [
      { label: 'Multiclonage', src: '/images/akasha/naruto/multiclonage-anim.webp' },
      { label: 'Fūma Shuriken', src: '/images/akasha/naruto/fuma-shuriken-anim.webp', blend: 'screen' },
    ] },
  { key: 'Sasuke Uchiha', village: 'konohagakure', clan: 'uchiha', powers: ['chidori', 'amaterasu', 'susanoo'], skills: ['sharingan', 'rinnegan'], artifacts: ['kusanagi'], rarity: 'legendary',
    role: 'Dernier vengeur Uchiha', kg: ['Sharingan', 'Rinnegan'], summary: "Prodige du clan Uchiha, rival éternel de Naruto, hanté par la vengeance avant la rédemption.",
    status: 'Vivant', biju: null, squad: { name: 'Équipe 7', members: [
      { rel: 'Sensei', name: 'Kakashi Hatake', slug: 'kakashi-hatake' },
      { rel: 'Coéquipier', name: 'Naruto Uzumaki', slug: 'naruto-uzumaki' },
      { rel: 'Coéquipière', name: 'Sakura Haruno', slug: 'sakura-haruno' },
    ] },
    titles: ['Le dernier des Uchiha', 'Le Hokage de l\'ombre', 'Sasuke du Rinnegan'],
    nindo: 'Je vais restaurer mon clan… et tuer un certain homme.', nindoLabel: 'Nindō · sa voie du ninja',
    bio: "Survivant du massacre de son clan, Sasuke grandit avec une seule obsession : venger les siens en tuant son frère Itachi. Prodige de l'Académie, rival et coéquipier de Naruto au sein de l'Équipe 7, il déserte Konoha pour chercher la puissance auprès d'Orochimaru. La vérité sur le sacrifice d'Itachi le brise et le retourne contre le village, jusqu'à l'affrontement final de la Vallée de la Fin où Naruto le ramène. Racheté, doté du Rinnegan, il devient le « Hokage de l'ombre » : l'épée qui protège Konoha depuis les ténèbres.",
    personality: "Froid, orgueilleux et solitaire, Sasuke enferme sa douleur derrière un mépris de façade. Sa quête de puissance l'a mené aux pires trahisons — mais son lien avec Naruto, le seul qu'il n'a jamais pu trancher, a fini par le ramener.",
    quotes: ["Mon rêve n'est pas un rêve : je vais restaurer mon clan, et tuer un certain homme.", 'Tu es devenu mon meilleur ami… c\'est pour ça que je dois te tuer.', "J'ai fermé les yeux depuis trop longtemps… mes ténèbres m'appartiennent."],
    trivia: ["Son nom vient de Sasuke Sarutobi, ninja légendaire du folklore japonais.", 'Il n\'active son premier Sharingan que la nuit du massacre — et l\'oublie pendant des années.', 'Son Chidori percé avec le Sharingan est le seul assaut que Kakashi lui ait jamais transmis.', "Adulte, il voyage seul pour expier — son manteau cache le bras qu'il a laissé à la Vallée de la Fin."],
    forms: [
      { label: 'Partie I', idle: '/images/akasha/naruto/idle/sasuke-p1.webp', g: 0, age: '12 ans', height: '1,50 m', weight: '42 kg', rank: 'Genin',
        classification: [], natures: ['Fire Release', 'Lightning Release'], kg: ['Sharingan'], occupation: ['Genin · Équipe 7'], affiliation: ['Konohagakure', 'Équipe 7'],
        signature: ['Boule de feu suprême', 'Chidori', 'Sharingan'], arc: 'Pays des Vagues · Examens Chūnin',
        caption: '12 ans · Genin · le prodige de l\'Équipe 7',
        summary: "Premier de sa promotion, il maîtrise déjà le Katon du clan et éveille son Sharingan face à Haku. Kakashi lui enseigne le Chidori.",
        stats: { nin: 3.5, tai: 3, gen: 2.5, int: 3, for: 2.5, vit: 3.5, end: 2.5, sce: 3 } },
      { label: 'Sceau maudit', idle: '/images/akasha/naruto/idle/sasuke-cs2.webp', img: '/images/akasha/naruto/sasuke-cs2.webp', age: '13 ans', height: '1,53 m', weight: '43 kg', rank: 'Genin',
        classification: [], natures: ['Fire Release', 'Lightning Release'], kg: ['Sharingan'], occupation: ['Déserteur'], affiliation: ['Orochimaru'],
        signature: ['Sceau maudit niv. 2', 'Chidori noir'], arc: 'Vallée de la Fin (vs Naruto)',
        caption: '13 ans · Sceau maudit niveau 2 — la Vallée de la Fin',
        summary: "La marque d'Orochimaru le transforme : peau grise, ailes-mains démoniaques. Il terrasse Naruto à la Vallée de la Fin et quitte Konoha.",
        stats: { nin: 4, tai: 3.5, gen: 3, int: 3, for: 3.5, vit: 4, end: 3, sce: 3 } },
      { label: 'Hebi', idle: '/images/akasha/naruto/idle/sasuke-hebi.webp', g: 1, age: '16 ans', height: '1,68 m', weight: '52 kg', rank: 'Déserteur',
        classification: [], natures: ['Fire Release', 'Lightning Release'], kg: ['Sharingan'], occupation: ['Chef de Hebi'], affiliation: ['Hebi / Taka'],
        signature: ['Kirin', 'Chidori (formes multiples)', 'Kusanagi'], arc: 'Vengeance — vs Itachi',
        caption: '16 ans · chef de Hebi — la vengeance accomplie',
        summary: "Ayant absorbé la formation d'Orochimaru, il traque Itachi avec son équipe Hebi et l'abat sous l'éclair de Kirin — avant d'apprendre l'insoutenable vérité.",
        stats: { nin: 5, tai: 4.5, gen: 5, int: 4.5, for: 3.5, vit: 5, end: 3, sce: 4.5 } },
      { label: 'Mangekyō éternel', idle: '/images/akasha/naruto/idle/sasuke-mangekyo.webp', img: '/images/akasha/naruto/sasuke-susanoo.webp', age: '17 ans', height: '1,68 m', weight: '52 kg', rank: 'Déserteur',
        classification: [], natures: ['Fire Release', 'Lightning Release', 'Yin Release'], kg: ['Mangekyō Sharingan éternel'], occupation: ['Nukenin international'], affiliation: ['Akatsuki (allié)'],
        signature: ['Susanoo parfait', 'Amaterasu', 'Kagutsuchi'], arc: 'Quatrième Guerre Shinobi',
        caption: '17 ans · Mangekyō éternel — le Susanoo se dresse',
        summary: "Greffé des yeux d'Itachi, son Mangekyō éternel déploie un Susanoo complet : flammes d'Amaterasu et armure spectrale indestructible.",
        stats: { nin: 5, tai: 4.5, gen: 5, int: 5, for: 3.5, vit: 5, end: 3.5, sce: 5 } },
      { label: 'Rinnegan', idle: '/images/akasha/naruto/idle/sasuke-rinnegan.webp', img: '/images/akasha/naruto/sasuke-adulte.webp', age: '19 ans+', height: '1,82 m', weight: '56 kg', rank: 'Nukenin gracié',
        classification: [], natures: ['Fire Release', 'Lightning Release', 'Yin–Yang Release'], kg: ['Rinnegan', 'Mangekyō éternel'], occupation: ['Protecteur itinérant'], affiliation: ['Konohagakure (soutien)'],
        signature: ['Amenotejikara', 'Chibaku Tensei', 'Indra no Ya'], arc: 'Errance — le Hokage de l\'ombre',
        caption: 'Adulte · Rinnegan — l\'épée qui veille depuis l\'ombre',
        summary: "Éveillé au Rinnegan par le chakra du Sage, il sillonne le monde en éclaireur solitaire : la seconde lame de Konoha, invisible et absolue.",
        stats: { nin: 5, tai: 5, gen: 5, int: 5, for: 4, vit: 5, end: 4, sce: 5 } },
    ] },
  { key: 'Sakura Haruno', village: 'konohagakure', powers: [], medical: true, rarity: 'rare',
    role: 'Kunoichi médicale', summary: "Kunoichi de l'équipe 7, ninja médicale d'élite à la force colossale, élève de Tsunade." },
  { key: 'Kakashi Hatake', village: 'konohagakure', clan: 'hatake', ranks: ['hokage'], powers: ['chidori'], skills: ['sharingan'], rarity: 'epic',
    role: 'Ninja copieur, Hokage', summary: "Le « ninja copieur » au Sharingan, mentor de l'équipe 7 puis Sixième Hokage.",
    status: 'Vivant', squad: { name: 'Équipe 7 (sensei)', members: [
      { rel: 'Élève', name: 'Naruto Uzumaki', slug: 'naruto-uzumaki' },
      { rel: 'Élève', name: 'Sasuke Uchiha', slug: 'sasuke-uchiha' },
      { rel: 'Élève', name: 'Sakura Haruno', slug: 'sakura-haruno' },
    ] },
    titles: ['Le Ninja copieur', 'Kakashi au Sharingan', 'Sixième Hokage'],
    nindo: 'Ceux qui enfreignent les règles sont des moins que rien… mais ceux qui abandonnent leurs amis sont pires encore.', nindoLabel: 'Nindō · sa voie du ninja',
    bio: "Fils du « Croc Blanc de Konoha », Kakashi devient jōnin à 13 ans et reçoit de son coéquipier mourant, Obito, le Sharingan qui fera sa légende : plus de mille techniques copiées. Passé par les Anbu après la mort de Rin, il devient le sensei désabusé — et en apparence toujours en retard — de l'Équipe 7, à qui il transmet la leçon d'Obito : ne jamais abandonner ses camarades. Pendant la Quatrième Guerre, son Kamui et un bref double Mangekyō en font un acteur décisif face à Obito et Kaguya. La paix revenue, il coiffe le chapeau de Sixième Hokage.",
    personality: "Nonchalant, toujours plongé dans « Le Paradis du Batifolage », Kakashi cultive l'art du détachement — un masque de plus. Derrière : un stratège glacial, un professeur exigeant, et un homme hanté par tous ceux qu'il n'a pas pu sauver.",
    quotes: ['Yo. Désolé du retard — je me suis perdu sur le chemin de la vie.', 'Le travail d\'équipe passe avant tout.', 'Je protège mes camarades. Quoi qu\'il en coûte.'],
    trivia: ["Son visage sans masque est l'un des gags les plus longs de la série — même ses élèves ont échoué à le voir.", 'Il lit la série de romans érotiques de Jiraiya en public, y compris en mission.', 'Il invoque une meute de chiens ninjas, menée par le carlin Pakkun.', 'Jōnin à 13 ans, Hokage à 31 : l\'une des carrières les plus précoces de Konoha.'],
    forms: [
      { label: 'Anbu', idle: '/images/akasha/naruto/idle/kakashi-anbu.webp', img: '/images/akasha/naruto/kakashi-anbu.webp', age: '14-20 ans', height: '1,68 m', rank: 'Anbu',
        classification: [], natures: ['Lightning Release'], kg: ['Sharingan (greffé)'], occupation: ['Capitaine Anbu'], affiliation: ['Konohagakure', 'Anbu'],
        signature: ['Chidori', 'Tantō', 'Assassinat silencieux'], arc: 'Jeunesse — les années sombres',
        caption: 'Anbu · les années sombres après Rin',
        summary: "Après la mort de Rin, Kakashi s'enfonce dans les Anbu : missions noires, masque de chien, précision chirurgicale — jusqu'à ce que le Troisième l'en sorte.",
        stats: { nin: 4, tai: 4, gen: 3, int: 4.5, for: 3, vit: 4, end: 2.5, sce: 4 } },
      { label: 'Ninja copieur', idle: '/images/akasha/naruto/idle/kakashi-copieur.webp', g: 0, age: '26-27 ans', height: '1,81 m', weight: '67,5 kg', rank: 'Jōnin',
        classification: [], natures: ['Lightning Release', 'Earth Release', 'Water Release', 'Fire Release'], kg: ['Sharingan (greffé)'], occupation: ['Sensei de l\'Équipe 7'], affiliation: ['Konohagakure', 'Équipe 7'],
        signature: ['Chidori / Raikiri', '1000 techniques copiées', 'Invocation canine'], arc: 'Partie I — sensei de l\'Équipe 7',
        caption: '27 ans · Jōnin · le sensei de l\'Équipe 7',
        summary: "Le ninja copieur prend en charge Naruto, Sasuke et Sakura : l'épreuve des clochettes, le Pays des Vagues, et la leçon qui définit tout — le travail d'équipe.",
        stats: { nin: 5, tai: 4.5, gen: 4, int: 5, for: 3.5, vit: 4.5, end: 3, sce: 5 } },
      { label: 'Kamui', idle: '/images/akasha/naruto/idle/kakashi-kamui.webp', img: '/images/akasha/naruto/kakashi-kamui.webp', age: '29-31 ans', height: '1,81 m', rank: 'Jōnin',
        classification: [], natures: ['Lightning Release'], kg: ['Mangekyō Sharingan'], occupation: ['Jōnin d\'élite'], affiliation: ['Konohagakure'],
        signature: ['Kamui (distorsion spatiale)', 'Raikiri'], arc: 'Shippūden — l\'éveil du Mangekyō',
        caption: 'Mangekyō · Kamui — aspirer l\'espace lui-même',
        summary: "Son Mangekyō éveille le Kamui : un vortex qui aspire n'importe quelle cible vers une autre dimension — l'arme qui le lie, sans qu'il le sache, à Obito.",
        stats: { nin: 5, tai: 4.5, gen: 4, int: 5, for: 3.5, vit: 4.5, end: 3, sce: 5 } },
      { label: 'Double Mangekyō', idle: '/images/akasha/naruto/idle/kakashi-guerre.webp', img: '/images/akasha/naruto/kakashi-guerre.webp', age: '31 ans', height: '1,81 m', rank: 'Jōnin',
        classification: [], natures: ['Lightning Release', 'Yin–Yang Release'], kg: ['Double Mangekyō (Obito)'], occupation: ['Commandant de division'], affiliation: ['Forces Shinobi Alliées'],
        signature: ['Susanoo complet', 'Kamui Raikiri'], arc: 'Guerre — vs Kaguya',
        caption: 'Guerre · le cadeau d\'Obito — Susanoo complet',
        summary: "Le chakra d'Obito mourant lui offre brièvement les deux Mangekyō : Kakashi déploie un Susanoo complet et porte le coup décisif contre Kaguya.",
        stats: { nin: 5, tai: 4.5, gen: 4.5, int: 5, for: 3.5, vit: 5, end: 3.5, sce: 5 } },
      { label: 'Hokage', idle: '/images/akasha/naruto/idle/kakashi-hokage.webp', img: '/images/akasha/naruto/kakashi-hokage.webp', age: '32+ ans', height: '1,81 m', rank: 'Hokage',
        classification: [], natures: ['Lightning Release'], kg: [], occupation: ['Sixième Hokage'], affiliation: ['Konohagakure'],
        signature: ['Administration', 'Diplomatie', 'Raikiri (sans Sharingan)'], arc: 'L\'ère de la paix',
        caption: 'Sixième Hokage · l\'ère de la reconstruction',
        summary: "Sans plus de Sharingan, il guide Konoha dans l'après-guerre : reconstruction, ouverture des villages — et passation, des années plus tard, à Naruto.",
        stats: { nin: 4.5, tai: 4.5, gen: 3.5, int: 5, for: 3.5, vit: 4.5, end: 3.5, sce: 5 } },
    ] },
  { key: 'Itachi Uchiha', village: 'konohagakure', clan: 'uchiha', powers: ['amaterasu', 'susanoo'], skills: ['sharingan'], rarity: 'epic',
    role: 'Anbu, membre de l’Akatsuki', kg: ['Sharingan'], summary: "Génie Uchiha qui sacrifia tout — y compris sa réputation — pour protéger Konoha.",
    status: 'Décédé',
    titles: ['Le génie du clan Uchiha', 'Itachi de l\'Illusion', 'Le héros de l\'ombre'],
    nindo: 'Pardonne-moi, Sasuke… ce sera la dernière fois.', nindoLabel: 'Nindō · sa voie du ninja',
    bio: "Prodige absolu — Sharingan à 8 ans, Anbu à 11, capitaine à 13 — Itachi grandit entre deux loyautés : son clan, qui prépare un coup d'État, et son village, qui exige son anéantissement. Il choisit l'impensable : exécuter les siens en une nuit, épargner son petit frère, et endosser à jamais le rôle du monstre au sein de l'Akatsuki pour continuer à protéger Konoha de l'intérieur. Malade, il se laisse tuer par Sasuke pour lui offrir sa vengeance — et lui transmettre ses yeux. Réanimé pendant la guerre, il brise l'Edo Tensei et disparaît en héros que seul son frère connaîtra.",
    personality: "Calme, doux et d'une intelligence terrifiante, Itachi est un pacifiste qui a porté les crimes les plus lourds. Tout chez lui est sacrifice : sa réputation, son clan, sa vie — offerts sans un mot pour la paix du village et l'avenir de Sasuke.",
    quotes: ['Pardonne-moi, Sasuke… ce sera la dernière fois.', 'Les hommes vivent prisonniers de leurs certitudes.', 'Tu n\'as pas besoin de me pardonner. Quoi que tu deviennes, je t\'aimerai toujours.'],
    trivia: ["Le poke sur le front de Sasuke — « pardonne-moi, une prochaine fois » — est devenu le geste le plus iconique de la fratrie.", 'Son Susanoo porte l\'épée de Totsuka (qui scelle) et le miroir de Yata (qui repousse tout).', 'Il est mort debout, souriant, après avoir scellé Orochimaru hors de Sasuke.', 'Ses corbeaux servaient autant le genjutsu que le message : l\'un portait un Mangekyō de secours.'],
    forms: [
      { label: 'Anbu', idle: '/images/akasha/naruto/idle/itachi-anbu.webp', img: '/images/akasha/naruto/itachi-anbu.webp', age: '11-13 ans', height: '1,60 m', rank: 'Capitaine Anbu',
        classification: [], natures: ['Fire Release', 'Water Release'], kg: ['Sharingan'], occupation: ['Capitaine Anbu'], affiliation: ['Konohagakure', 'Anbu'],
        signature: ['Genjutsu du Sharingan', 'Clones de corbeaux', 'Katon'], arc: 'Jeunesse — le prodige des Anbu',
        caption: '13 ans · capitaine Anbu · l\'agent double',
        summary: "Le plus jeune capitaine Anbu de l'histoire, espion du village au sein de son propre clan — jusqu'à la nuit du massacre.",
        stats: { nin: 4.5, tai: 4, gen: 5, int: 5, for: 3, vit: 4.5, end: 2.5, sce: 4.5 } },
      { label: 'Akatsuki', idle: '/images/akasha/naruto/idle/itachi-akatsuki.webp', g: 0, age: '17-21 ans', height: '1,78 m', weight: '58 kg', rank: 'Nukenin (rang S)',
        classification: ['Missing-nin'], natures: ['Fire Release', 'Water Release', 'Yin Release'], kg: ['Mangekyō Sharingan'], occupation: ['Membre de l\'Akatsuki'], affiliation: ['Akatsuki'],
        signature: ['Tsukuyomi', 'Amaterasu', 'Genjutsu absolu'], arc: 'Akatsuki — le monstre de façade',
        caption: 'Akatsuki · le criminel que Konoha a fabriqué',
        summary: "Sous la cape aux nuages rouges, il joue le monstre pour surveiller l'Akatsuki — tout en freinant, de l'intérieur, la traque de Naruto.",
        stats: { nin: 5, tai: 4.5, gen: 5, int: 5, for: 3.5, vit: 5, end: 2.5, sce: 5 } },
      { label: 'Susanoo', idle: '/images/akasha/naruto/idle/itachi-susanoo.webp', img: '/images/akasha/naruto/itachi-susanoo.webp', age: '21 ans', height: '1,78 m', rank: 'Nukenin (rang S)',
        classification: ['Missing-nin'], natures: ['Fire Release', 'Yin Release'], kg: ['Mangekyō Sharingan'], occupation: ['Membre de l\'Akatsuki'], affiliation: ['Akatsuki'],
        signature: ['Susanoo (Totsuka & Yata)', 'Izanami'], arc: 'Le dernier duel — vs Sasuke',
        caption: 'Susanoo · Totsuka et Yata — le dernier duel',
        summary: "Rongé par la maladie, il offre à Sasuke le duel de sa vengeance : Amaterasu, Tsukuyomi, Susanoo — et meurt d'un dernier poke sur le front.",
        stats: { nin: 5, tai: 4, gen: 5, int: 5, for: 3, vit: 4.5, end: 1.5, sce: 5 } },
      { label: 'Edo Tensei', idle: '/images/akasha/naruto/idle/itachi-edo.webp', img: '/images/akasha/naruto/itachi-edo.webp', age: '—', height: '1,78 m', rank: 'Réanimé',
        classification: ['Edo Tensei'], natures: ['Fire Release', 'Yin Release'], kg: ['Mangekyō Sharingan'], occupation: ['Âme libérée'], affiliation: ['—'],
        signature: ['Izanami', 'Kotoamatsukami (corbeau)', 'Susanoo'], arc: 'Guerre — briser l\'Edo Tensei',
        caption: 'Edo Tensei · l\'âme qui brisa la réanimation',
        summary: "Réanimé par Kabuto, il se libère du contrôle grâce au corbeau laissé en Naruto, piège Kabuto dans Izanami et met fin à l'Edo Tensei — en héros, enfin, aux yeux de son frère.",
        stats: { nin: 5, tai: 4.5, gen: 5, int: 5, for: 3.5, vit: 5, end: 5, sce: 5 } },
    ] },
  { key: 'Madara Uchiha', village: 'konohagakure', clan: 'uchiha', powers: ['susanoo', 'wood-release'], skills: ['sharingan', 'rinnegan'], artifacts: ['gunbai'], rarity: 'legendary',
    role: 'Cofondateur de Konoha', kg: ['Sharingan', 'Rinnegan', 'Mokuton (Bois)'], summary: "Légende Uchiha et cofondateur de Konoha, devenu l'un de ses plus grands ennemis.",
    status: 'Décédé',
    titles: ['Le fantôme des Uchiha', 'Cofondateur de Konoha', 'Le second Sage des Six Chemins'],
    nindo: 'Rien ne se passe jamais comme prévu en ce bas monde.', nindoLabel: 'Nindō · sa voie du ninja',
    bio: "Chef du clan Uchiha à l'époque des guerres claniques, rival juré puis partenaire d'Hashirama Senju, Madara cofonde Konoha — avant de s'en détourner, persuadé que la paix des hommes est un mensonge. Vaincu à la Vallée de la Fin, il survit en secret, éveille le Rinnegan grâce aux cellules d'Hashirama et lègue son plan à Obito : l'Œil de la Lune, un genjutsu éternel projeté sur la lune pour plonger l'humanité dans un rêve parfait. Réanimé pendant la Quatrième Guerre, il écrase des armées entières, devient le jinchūriki du Jūbi… avant d'être trahi par sa propre marionnette, Zetsu Noir, au profit de Kaguya.",
    personality: "Orgueil d'aristocrate, désillusion de vétéran : Madara ne croit qu'à la force et au rêve. Sa fraternité brisée avec Hashirama est la blessure originelle — il a préféré un monde d'illusion parfaite à un monde réel imparfait.",
    quotes: ['Rien ne se passe jamais comme prévu en ce bas monde.', 'Danser, c\'est un art qui se pratique à deux.', 'L\'homme ne peut s\'empêcher d\'espérer — c\'est sa plus belle faiblesse, et sa perte.'],
    trivia: ["Son duel « 1 vs 10 000 » face aux armées alliées est resté le gold standard du powerscaling shinobi.", 'Le gunbai qu\'il porte est devenu l\'emblème de l\'Akatsuki via Obito.', 'Il a survécu à la Vallée de la Fin en mordant sa propre chair — le monde entier l\'a cru mort pendant des décennies.', 'Kishimoto l\'a nommé d\'après le « démon » des jeux de go : celui qui renverse la partie.'],
    forms: [
      { label: 'Guerres claniques', idle: '/images/akasha/naruto/idle/madara-clans.webp', img: '/images/akasha/naruto/madara-fondateur.webp', age: 'Jeunesse', height: '1,79 m', weight: '71 kg', rank: 'Chef de clan',
        classification: [], natures: ['Fire Release', 'Wind Release', 'Lightning Release'], kg: ['Mangekyō Sharingan éternel'], occupation: ['Chef du clan Uchiha'], affiliation: ['Clan Uchiha'],
        signature: ['Gunbai', 'Katon dévastateurs', 'Susanoo'], arc: 'Ère des clans en guerre',
        caption: 'Ère des clans · le chef de guerre des Uchiha',
        summary: "À l'ère où Uchiha et Senju s'entretuent, Madara est LA terreur des champs de bataille — l'égal d'Hashirama, son rival et seul ami.",
        stats: { nin: 5, tai: 4.5, gen: 5, int: 4.5, for: 4, vit: 4.5, end: 4.5, sce: 4.5 } },
      { label: 'Fondation', idle: '/images/akasha/naruto/idle/madara-fondation.webp', g: 0, age: 'Adulte', height: '1,79 m', weight: '71 kg', rank: 'Cofondateur',
        classification: [], natures: ['Fire Release', 'Yin Release'], kg: ['Mangekyō Sharingan éternel'], occupation: ['Cofondateur de Konoha'], affiliation: ['Konohagakure'],
        signature: ['Susanoo', 'Genjutsu'], arc: 'Fondation de Konoha → Vallée de la Fin',
        caption: 'Cofondateur · l\'alliance trahie',
        summary: "Il fonde Konoha avec Hashirama et nomme le village — avant de le quitter, vaincu à la Vallée de la Fin dans le duel qui redessina la géographie.",
        stats: { nin: 5, tai: 5, gen: 5, int: 5, for: 4.5, vit: 5, end: 4.5, sce: 5 } },
      { label: 'Edo Tensei', idle: '/images/akasha/naruto/idle/madara-edo.webp', img: '/images/akasha/naruto/madara-susanoo.webp', age: '—', height: '1,79 m', rank: 'Réanimé (rang S+)',
        classification: ['Edo Tensei'], natures: ['Fire Release', 'Wood Release', 'Yin–Yang Release'], kg: ['Rinnegan', 'Mokuton'], occupation: ['Fléau de la 4ᵉ Guerre'], affiliation: ['—'],
        signature: ['Susanoo parfait', 'Météores', 'Mokuton'], arc: 'Guerre — 1 contre 10 000',
        caption: 'Edo Tensei · Susanoo parfait — 1 contre 10 000',
        summary: "Réanimé avec le Rinnegan et le Mokuton, il pulvérise seul la 4ᵉ division, fait pleuvoir des météores et tranche des montagnes de son Susanoo parfait.",
        stats: { nin: 5, tai: 5, gen: 5, int: 5, for: 5, vit: 5, end: 5, sce: 5 } },
      { label: 'Jinchūriki du Jūbi', idle: '/images/akasha/naruto/idle/madara-juubi.webp', img: '/images/akasha/naruto/madara-juubi.webp', age: '—', height: '1,79 m', rank: 'Jinchūriki du Jūbi',
        classification: ['Jinchūriki', 'Ermite des Six Chemins'], natures: ['Yin–Yang Release'], kg: ['Rinnegan', 'Rinne Sharingan'], occupation: ['Second Sage des Six Chemins'], affiliation: ['—'],
        signature: ['Boules Cherche-Vérité', 'Limbo', 'Tsukuyomi Infini'], arc: 'L\'Œil de la Lune',
        caption: 'Jinchūriki du Jūbi · l\'Œil de la Lune s\'ouvre',
        summary: "Ressuscité puis fusionné au Jūbi, il transcende les Kage, aveugle le monde sous le Tsukuyomi Infini — un instant de triomphe avant la trahison de Zetsu Noir.",
        stats: { nin: 5, tai: 5, gen: 5, int: 5, for: 5, vit: 5, end: 5, sce: 5 } },
    ] },
  { key: 'Hashirama Senju', village: 'konohagakure', clan: 'senju', ranks: ['hokage'], powers: ['wood-release'], rarity: 'legendary',
    role: 'Premier Hokage', kg: ['Mokuton (Bois)'], summary: "Le « Dieu des shinobi », Premier Hokage et maître unique du Mokuton (libération du bois).",
    status: 'Décédé',
    titles: ['Le Dieu des shinobi', 'Premier Hokage', 'Le maître du Mokuton'],
    nindo: 'Le village d\'abord. Toujours. C\'est ça, la Volonté du Feu.', nindoLabel: 'Nindō · sa voie du ninja',
    bio: "Chef du clan Senju à l'ère des guerres claniques, Hashirama rêve depuis l'enfance d'un monde où les enfants ne meurent plus au combat — un rêve partagé, au bord d'une rivière, avec un garçon nommé Madara. Devenus chefs de clans ennemis, les deux amis finissent par sceller la paix et fonder ensemble Konoha, le premier village caché. Élu Premier Hokage contre le vœu de Madara, il doit affronter son ancien ami à la Vallée de la Fin, dans un duel qui sculpte la vallée elle-même. Son Mokuton, unique dans l'histoire, et sa Volonté du Feu irriguent encore chaque génération de Konoha.",
    personality: "Exubérant, chaleureux, d'un optimisme désarmant — Hashirama passe du rire tonitruant à l'abattement comique en une phrase. Mais sous la bonhomie : le shinobi le plus puissant de son ère, et un idéaliste prêt à tout sacrifier, y compris son ami, pour le village.",
    quotes: ['Le village d\'abord. Toujours.', 'Où que tu ailles, quoi que tu deviennes… tu resteras mon ami, Madara.', 'La Volonté du Feu, c\'est croire que la génération suivante fera mieux que la nôtre.'],
    trivia: ["Son Mokuton est resté inégalé : même les greffes de ses cellules n'en reproduisent qu'un pâle écho.", 'Son visage est le premier sculpté sur la falaise des Hokage.', 'Les Dieux du duel : sa statue et celle de Madara gardent la Vallée de la Fin.', 'Ses cellules sont à l\'origine de la moitié des expériences interdites du monde shinobi (Danzō, Yamato, Madara…).'],
    forms: [
      { label: 'Ère des clans', idle: '/images/akasha/naruto/idle/hashirama-clans.webp', g: 0, age: 'Jeunesse', height: '1,85 m', weight: '74 kg', rank: 'Chef de clan',
        classification: [], natures: ['Earth Release', 'Water Release', 'Wood Release'], kg: ['Mokuton'], occupation: ['Chef du clan Senju'], affiliation: ['Clan Senju'],
        signature: ['Mokuton', 'Régénération sans sceaux'], arc: 'Ère des clans en guerre',
        caption: 'Ère des clans · le chef des Senju',
        summary: "À la tête des Senju, il affronte inlassablement les Uchiha de Madara — tout en rêvant du village qui mettra fin à la guerre des enfants-soldats.",
        stats: { nin: 5, tai: 4.5, gen: 3.5, int: 4.5, for: 5, vit: 4.5, end: 5, sce: 5 } },
      { label: 'Premier Hokage', idle: '/images/akasha/naruto/idle/hashirama-hokage.webp', img: '/images/akasha/naruto/hashirama-hokage.webp', age: 'Adulte', height: '1,85 m', weight: '74 kg', rank: 'Hokage',
        classification: [], natures: ['Wood Release'], kg: ['Mokuton'], occupation: ['Premier Hokage'], affiliation: ['Konohagakure'],
        signature: ['Fondation du village', 'Distribution des Bijū'], arc: 'Fondation de Konoha',
        caption: 'Premier Hokage · le rêve devenu village',
        summary: "Konoha fondée, il en devient le Premier Hokage, distribue les Bijū aux autres villages en gage de paix — et voit Madara s'éloigner dans l'ombre.",
        stats: { nin: 5, tai: 4.5, gen: 3.5, int: 4.5, for: 5, vit: 4.5, end: 5, sce: 5 } },
      { label: 'Mode Ermite', idle: '/images/akasha/naruto/idle/hashirama-sage.webp', img: '/images/akasha/naruto/hashirama-sage.webp', age: 'Adulte', height: '1,85 m', rank: 'Hokage',
        classification: ['Ermite (Sage)'], natures: ['Wood Release', 'Yin–Yang Release'], kg: ['Mokuton'], occupation: ['Premier Hokage'], affiliation: ['Konohagakure'],
        signature: ['Shinsū Senju (Bouddha aux mille mains)', 'Senjutsu'], arc: 'Le sommet de sa puissance',
        caption: 'Mode Ermite · le Bouddha aux mille mains',
        summary: "Son senjutsu propre culmine dans le Shinsū Senju : une statue de bois aux mille poings capable d'écraser le Susanoo parfait de Madara.",
        stats: { nin: 5, tai: 5, gen: 4, int: 4.5, for: 5, vit: 5, end: 5, sce: 5 } },
      { label: 'Vallée de la Fin', idle: '/images/akasha/naruto/idle/hashirama-vallee.webp', img: '/images/akasha/naruto/hashirama-vallee.webp', age: 'Adulte', height: '1,85 m', rank: 'Hokage',
        classification: ['Ermite (Sage)'], natures: ['Wood Release'], kg: ['Mokuton'], occupation: ['Premier Hokage'], affiliation: ['Konohagakure'],
        signature: ['Mokuryū', 'Kakuan Nitten Suishu'], arc: 'Vallée de la Fin — vs Madara',
        caption: 'Vallée de la Fin · le duel qui sculpta la terre',
        summary: "Face à Madara et Kurama asservi, il livre le plus grand duel de l'histoire : la terre s'ouvre, une vallée naît — et son ami tombe, pour un siècle de paix fragile.",
        stats: { nin: 5, tai: 5, gen: 4, int: 4.5, for: 5, vit: 5, end: 5, sce: 5 } },
    ] },
  { key: 'Minato Namikaze', village: 'konohagakure', ranks: ['hokage'], powers: ['rasengan', 'flying-raijin'], rarity: 'epic',
    role: 'Quatrième Hokage', summary: "L'« Éclair jaune de Konoha », Quatrième Hokage et père de Naruto, créateur du Rasengan." },
  { key: 'Jiraiya', village: 'konohagakure', ranks: ['sannin'], powers: ['rasengan'], rarity: 'epic',
    role: 'Sannin, ermite', summary: "L'un des trois légendaires Sannin, ermite des crapauds et maître de Naruto." },
  { key: 'Tsunade', village: 'konohagakure', clan: 'senju', ranks: ['hokage', 'sannin'], medical: true, rarity: 'epic',
    role: 'Cinquième Hokage', summary: "Sannin et Cinquième Hokage, la plus grande ninja médicale du monde shinobi." },
  { key: 'Orochimaru', village: 'konohagakure', ranks: ['sannin'], powers: ['edo-tensei'], artifacts: ['kusanagi'], rarity: 'epic',
    role: 'Sannin renégat', summary: "Sannin obsédé par l'immortalité et le savoir interdit, créateur d'Otogakure." },
  { key: 'Gaara', village: 'sunagakure', ranks: ['jinchuriki'], beast: 'shukaku', rarity: 'epic',
    role: 'Cinquième Kazekage', kg: ['Magnet (Jiton)'], summary: "Ancien Jinchūriki de Shukaku devenu Cinquième Kazekage et symbole de rédemption." },
  { key: 'Rock Lee', village: 'konohagakure', rarity: 'rare',
    role: 'Spécialiste du taijutsu', summary: "Ninja incapable de ninjutsu qui compense par une maîtrise absolue du combat physique." },
  { key: 'Neji Hyūga', village: 'konohagakure', clan: 'hyuga', skills: ['byakugan'], rarity: 'rare',
    role: 'Prodige Hyūga', kg: ['Byakugan'], summary: "Génie de la branche secondaire du clan Hyūga, maître du Poing Souple et du Byakugan." },
  { key: 'Hinata Hyūga', village: 'konohagakure', clan: 'hyuga', skills: ['byakugan'], rarity: 'rare',
    role: 'Héritière Hyūga', kg: ['Byakugan'], summary: "Héritière timide puis vaillante du clan Hyūga, future épouse de Naruto." },
  { key: 'Shikamaru Nara', village: 'konohagakure', clan: 'nara', rarity: 'rare',
    role: 'Stratège', summary: "Le plus brillant stratège de sa génération, manipulateur des ombres du clan Nara." },
  { key: 'Obito Uchiha', village: 'konohagakure', clan: 'uchiha', skills: ['sharingan'], rarity: 'epic',
    role: 'Membre masqué de l’Akatsuki', kg: ['Sharingan'], summary: "Camarade de Kakashi cru mort, devenu le marionnettiste masqué derrière la guerre." },
  { key: 'Nagato', village: 'amegakure', clan: 'uzumaki', skills: ['rinnegan'], rarity: 'epic',
    role: 'Chef de l’Akatsuki (Pain)', kg: ['Rinnegan'], summary: "Porteur du Rinnegan et véritable « Pain », chef de l'Akatsuki en quête de paix par la douleur." },
  { key: 'Killer B', village: 'kumogakure', ranks: ['jinchuriki'], beast: 'gyuki', rarity: 'rare',
    role: 'Jinchūriki, rappeur', summary: "Jinchūriki de Gyūki et bretteur hors pair de Kumo, qui rappe entre deux combats." },
  { key: 'Might Guy', village: 'konohagakure', rarity: 'rare',
    role: 'Maître du taijutsu', summary: "Maître du taijutsu capable d'ouvrir les Huit Portes, rival autoproclamé de Kakashi." },
];

// Tailed beasts traités comme personnages (entités nommées). Images via l'API.
const BEASTS = [
  { key: 'Kurama', slug: 'kurama', rarity: 'legendary', summary: "Le Démon-renard à Neuf Queues, le plus puissant des Bijū, scellé en Naruto.",
    status: 'Décédé', role: 'Bijū à Neuf Queues',
    titles: ['Kyūbi — le Démon-Renard', 'Le plus puissant des Bijū', 'Le partenaire de Naruto'],
    nindo: 'Je suis Kurama, le Renard à Neuf Queues — pas une « masse de chakra » sans nom !',
    bio: "Né du chakra du Jūbi partagé par le Sage des Six Chemins, Kurama est le plus puissant des neuf Bijū — et le plus haï. Utilisé comme arme par Madara à la Vallée de la Fin, scellé en Mito puis en Kushina Uzumaki, il est arraché à cette dernière par Obito la nuit de la naissance de Naruto et ravage Konoha, avant d'être scellé dans le nouveau-né par le Quatrième. Des années de haine derrière les barreaux plus tard, Naruto lui arrache son chakra, puis gagne ce que personne n'avait offert au renard : sa confiance. Partenaires en pleine symbiose, ils sauvent le monde ensemble — jusqu'au Mode Baryon, où Kurama s'éteint pour que Naruto vive.",
    personality: "Cynique, orgueilleux et cruel en façade — des siècles de peur et d'asservissement humains l'ont forgé ainsi. Mais Naruto révèle l'autre Kurama : un partenaire loyal, râleur et étrangement tendre, premier des Bijū à choisir un humain.",
    quotes: ['Je suis Kurama ! Retiens ce nom, gamin.', 'Naruto… tu es sûr de vouloir mourir avec moi ? — Alors allons-y ensemble.', 'Les humains m\'ont craint, scellé, utilisé. Lui… il m\'a appelé par mon nom.'],
    trivia: ["Kurama est le seul Bijū dont le jinchūriki n'a jamais « pris » le chakra de force après réconciliation : il le DONNE.", 'Sa haine venait aussi de Madara : le Sharingan l\'a asservi deux fois dans l\'histoire.', 'Le Mode Baryon consume son existence même — il meurt en s\'excusant de mentir à Naruto sur le prix.', 'Yin et Yang : le Quatrième l\'a scellé en deux moitiés, réunies seulement pendant la Guerre.'],
    forms: [
      { label: 'Le Fléau', idle: '/images/akasha/naruto/idle/kurama-rage-idle.webp', img: '/images/akasha/naruto/kurama-rage.webp', age: 'Immémorial', height: '≈ 100 m', rank: 'Bijū (9 queues)',
        classification: ['Bijū'], natures: ['Fire Release', 'Wind Release'], occupation: ['Force de la nature'], affiliation: ['—'],
        signature: ['Bijūdama', 'Rugissement dévastateur'], arc: 'Attaque de Konoha',
        caption: 'Le Fléau · la nuit où Konoha brûla',
        summary: "Arraché à Kushina et asservi par Obito, Kurama rase Konoha la nuit de la naissance de Naruto — jusqu'au sceau ultime du Quatrième Hokage.",
        stats: { nin: 5, tai: 5, gen: 3, int: 3.5, for: 5, vit: 4.5, end: 5, sce: 2 } },
      { label: 'La Cage', idle: '/images/akasha/naruto/idle/kurama-cage-idle.webp', img: '/images/akasha/naruto/kurama-cage.webp', age: 'Immémorial', height: '≈ 100 m', rank: 'Bijū scellé',
        classification: ['Bijū', 'Scellé'], natures: ['Fire Release'], occupation: ['Prisonnier de Naruto'], affiliation: ['Naruto Uzumaki'],
        signature: ['Chakra prêté par haine', 'Manteaux démoniaques'], arc: 'Scellé — derrière les barreaux',
        caption: 'La Cage · la haine derrière les barreaux',
        summary: "Depuis l'égout mental de Naruto, il distille son chakra empoisonné, attendant la faille — chaque manteau démoniaque est un pas vers la libération.",
        stats: { nin: 5, tai: 4, gen: 3, int: 4, for: 4, vit: 3.5, end: 5, sce: 2 } },
      { label: 'Chakra doré', idle: '/images/akasha/naruto/idle/kurama-doree-idle.webp', img: '/images/akasha/naruto/kurama-doree.webp', age: 'Immémorial', height: '≈ 100 m', rank: 'Partenaire',
        classification: ['Bijū'], natures: ['Fire Release', 'Wind Release', 'Yang Release'], occupation: ['Partenaire de Naruto'], affiliation: ['Naruto Uzumaki', 'Forces Shinobi Alliées'],
        signature: ['Bijūdama en rafale', 'Avatar doré', 'Fusion parfaite'], arc: 'Quatrième Guerre — la symbiose',
        caption: 'Chakra doré · le premier Bijū libre',
        summary: "Sa confiance offerte, son chakra devient doré : l'avatar colossal combat AVEC Naruto, non plus à travers lui — le premier Bijū partenaire de l'histoire.",
        stats: { nin: 5, tai: 5, gen: 3, int: 4.5, for: 5, vit: 5, end: 5, sce: 3 } },
    ] },
  { key: 'Gyūki', slug: 'gyuki', rarity: 'epic', summary: "Le Bijū à Huit Queues, mi-poulpe mi-taureau, partenaire de Killer B." },
  { key: 'Shukaku', slug: 'shukaku', rarity: 'rare', summary: "Le Bijū à Une Queue, tanuki de sable jadis scellé en Gaara." },
];

// ─── Entités rédigées (sans image → icône de type) ────────────────────
const PLACES = [
  ['konohagakure', 'Konohagakure', 'Pays du Feu', "Le Village caché de la Feuille, foyer de l'équipe 7 et cœur du récit.", 'rare'],
  ['sunagakure', 'Sunagakure', 'Pays du Vent', "Le Village caché du Sable, niché dans le désert, dirigé par le Kazekage.", 'common'],
  ['kirigakure', 'Kirigakure', "Pays de l'Eau", "Le Village caché de la Brume, autrefois surnommé le « village sanglant ».", 'common'],
  ['iwagakure', 'Iwagakure', 'Pays de la Terre', "Le Village caché de la Roche, place forte montagneuse du Tsuchikage.", 'common'],
  ['kumogakure', 'Kumogakure', 'Pays de la Foudre', "Le Village caché des Nuages, perché en altitude, fief du Raikage.", 'common'],
  ['amegakure', 'Amegakure', 'Pays de la Pluie', "Le Village caché de la Pluie, cité industrielle battue par les averses, berceau de l'Akatsuki.", 'common'],
  ['otogakure', 'Otogakure', 'Pays du Son', "Le Village caché du Son, fondé secrètement par Orochimaru pour ses expériences.", 'rare'],
];

// Détails riches par entité (lieu OU artefact…) fusionnés dans attributes → page bespoke « carte
// évolutive ». Les `eras[].img` non existantes retombent sur l'image de base via onError côté composant.
const ENTITY_DETAILS = {
  konohagakure: {
    kanji: '木ノ葉隠れの里',
    founded: "Fin de l'ère des Guerres Claniques",
    founders: [{ name: 'Hashirama Senju', slug: 'hashirama-senju' }, { name: 'Madara Uchiha', slug: 'madara-uchiha' }],
    symbol: 'La feuille',
    motto: 'La Volonté du Feu',
    quote: { text: 'Quand les feuilles dansent, le feu brûle. L\'ombre du feu illumine le village.', author: 'Hiruzen Sarutobi · 3ᵉ Hokage' },
    leaderTitle: 'Septième Hokage',
    leader: { name: 'Naruto Uzumaki', slug: 'naruto-uzumaki' },
    population: "Plusieurs dizaines de milliers d'habitants",
    villageRank: 'L\'un des Cinq Grands Villages',
    status: 'Prospère',
    bio: "Fondé à la fin de l'ère sanglante des Guerres Claniques par l'alliance du clan Senju de Hashirama et du clan Uchiha de Madara, Konohagakure fut le tout premier village caché — le modèle qu'imiteront les autres nations. Bâti dans le Pays du Feu et ceint d'une muraille circulaire, il érige la « Volonté du Feu » en credo : chaque génération protège la suivante comme une flamme que l'on transmet. Le village survivra à l'attaque de Kurama, au massacre du clan Uchiha, à la destruction totale infligée par Pain, puis à la Quatrième Grande Guerre Shinobi — pour renaître à chaque fois plus fort, et devenir sous le Septième Hokage une cité moderne et pacifiée.",
    trivia: [
      "« Konohagakure » signifie littéralement « caché parmi les feuilles ». Son symbole, la feuille, orne le bandeau frontal de tous ses ninjas.",
      "Le Monument des Hokage sculpte le visage de chaque Hokage dans la falaise qui domine le village.",
      "C'est le seul des Cinq Grands Villages à avoir été entièrement rasé — par Pain — puis reconstruit.",
      "La « Volonté du Feu », transmise par Hashirama, est la conviction que le village tout entier est une famille.",
    ],
    eras: [
      { label: 'Fondation', leader: 'Hashirama Senju · 1ᵉʳ Hokage', period: 'Ère des Guerres Claniques', event: 'Alliance Senju–Uchiha', threat: 'Rivalités claniques', img: '/images/akasha/places/konoha-fondation.webp',
        summary: "Hashirama Senju et Madara Uchiha scellent la paix entre leurs clans rivaux et fondent le premier village caché. Hashirama en devient le Premier Hokage et lui insuffle la Volonté du Feu." },
      { label: 'Nuit du Renard', leader: 'Minato Namikaze · 4ᵉ Hokage', period: '~12 ans avant la Partie I', event: 'Attaque de Kurama', threat: 'Le Renard à Neuf Queues', img: '/images/akasha/places/konoha-nuit-renard.webp',
        summary: "Une nuit, Kurama le Démon-Renard est libéré et ravage le village. Le Quatrième Hokage Minato le scelle au prix de sa vie dans son fils nouveau-né, Naruto." },
      { label: "Âge d'or", leader: 'Hiruzen Sarutobi · 3ᵉ Hokage', period: 'Partie I', event: 'Examens Chūnin', threat: 'Orochimaru', img: '/images/akasha/ref/konohagakure.webp',
        summary: "Sous le Troisième Hokage Hiruzen, le village prospère en paix. C'est le Konoha de l'enfance de Naruto — celui des Examens Chūnin et de l'équipe 7." },
      { label: 'Assaut de Pain', leader: 'Tsunade · 5ᵉ Hokage', period: 'Partie II', event: 'Shinra Tensei de Nagato', threat: 'Akatsuki', img: '/images/akasha/places/konoha-pain.webp',
        summary: "Nagato, sous le nom de Pain, réduit le village en cratère d'un unique Shinra Tensei pour capturer Naruto. Ce dernier revient, le terrasse et retourne le chef de l'Akatsuki." },
      { label: 'Ère moderne', leader: 'Naruto Uzumaki · 7ᵉ Hokage', period: 'Ère Boruto', event: 'Modernisation du village', threat: 'Organisation Kara', img: '/images/akasha/places/konoha-moderne.webp',
        summary: "Reconstruit après la guerre, Konoha entre dans une ère de paix et de technologie sous le Septième Hokage Naruto : gratte-ciels, écrans et trains côtoient les traditions ninja." },
    ],
    hokage: [
      { n: 'Iᵉʳ', name: 'Hashirama Senju', slug: 'hashirama-senju', note: 'Fondateur · maître du Mokuton' },
      { n: 'IIᵉ', name: 'Tobirama Senju', note: "Créateur de l'Edo Tensei" },
      { n: 'IIIᵉ', name: 'Hiruzen Sarutobi', note: '« Le Professeur »' },
      { n: 'IVᵉ', name: 'Minato Namikaze', slug: 'minato-namikaze', note: "« L'Éclair Jaune »" },
      { n: 'Vᵉ', name: 'Tsunade', slug: 'tsunade', note: 'Sannin · médecin légendaire' },
      { n: 'VIᵉ', name: 'Kakashi Hatake', slug: 'kakashi-hatake', note: '« Le Ninja Copieur »' },
      { n: 'VIIᵉ', name: 'Naruto Uzumaki', slug: 'naruto-uzumaki', note: 'Héros de la 4ᵉ Guerre' },
    ],
    clans: [
      { name: 'Senju', slug: 'senju' }, { name: 'Uchiha', slug: 'uchiha' }, { name: 'Uzumaki', slug: 'uzumaki' },
      { name: 'Hyūga', slug: 'hyuga' }, { name: 'Nara', slug: 'nara' },
      { name: 'Akimichi' }, { name: 'Yamanaka' }, { name: 'Aburame' }, { name: 'Inuzuka' }, { name: 'Sarutobi' },
    ],
    landmarks: [
      'Monument des Hokage', "Tour de l'Hokage", 'Académie des ninjas', 'Forêt de la Mort (terrain 44)',
      'Ichiraku Ramen', "Terrain d'entraînement n°3", 'Hôpital de Konoha', 'Ancien quartier Uchiha',
    ],
  },
  samehada: {
    kanji: '鮫肌',
    quote: { text: 'Samehada est capricieuse : elle ne se laisse porter que par celui qu\'elle a choisi.', author: 'Kisame Hoshigaki' },
    origin: 'Kirigakure · Village de la Brume',
    type: "L'une des Sept Épées des Sept Épéistes de la Brume",
    material: 'Lame vivante et sentiente, couverte d\'écailles',
    bearer: 'Kisame Hoshigaki',
    status: 'Active',
    bio: "Forgée pour les Sept Épéistes de la Brume, Samehada — « Peau de requin » — n'est pas une lame ordinaire : c'est une arme VIVANTE et sentiente, couverte d'écailles qui râpent la chair au lieu de la trancher et dévorent le chakra de l'ennemi. Portée d'abord par Fuguki Suikazan, elle passe à Kisame Hoshigaki, qui l'assassine pour la lui prendre : entre le monstre humain et l'épée gloutonne naît une symbiose parfaite. Kisame peut même fusionner avec elle pour absorber des océans de chakra. Mais Samehada reste libre de ses choix : face au chakra colossal de Killer B, l'hôte du Hachibi, elle trahit Kisame et se choisit un nouveau maître.",
    trivia: [
      "Samehada « râpe » au lieu de couper : ses écailles arrachent la chair et aspirent le chakra de la cible.",
      "C'est une arme sentiente : elle ronronne, mord ses ennemis, et peut refuser ou changer de porteur.",
      "Kisame et Samehada peuvent fusionner en une créature mi-homme mi-requin.",
      "Elle fait partie des sept armes légendaires des Sept Épéistes de la Brume de Kirigakure.",
    ],
    abilities: ['Dévore le chakra', 'Écailles-rasoir (râpe, ne tranche pas)', 'Sentiente — choisit son maître', 'Fusion avec le porteur', 'Régénération', 'Détecte les grandes réserves de chakra'],
    wielders: [
      { name: 'Fuguki Suikazan', note: "Premier porteur connu · l'un des Sept Épéistes" },
      { name: 'Kisame Hoshigaki', note: 'Le porteur légendaire · Akatsuki' },
      { name: 'Killer B', note: 'Nouveau maître après la trahison' },
    ],
    eras: [
      { label: 'Épée de la Brume', leader: 'Fuguki Suikazan', period: "Avant l'Akatsuki", event: "L'une des Sept Épées", threat: 'Enveloppée de bandages', img: '/images/akasha/artifacts/samehada-brume.webp',
        summary: "Samehada compte parmi les sept armes légendaires des Épéistes de la Brume de Kirigakure. Elle est alors portée par Fuguki Suikazan." },
      { label: 'Kisame', leader: 'Kisame Hoshigaki', period: 'Ère Akatsuki', event: 'Symbiose parfaite', threat: 'Dévore le chakra', img: '/images/akasha/ref/samehada.webp',
        summary: "Kisame Hoshigaki tue Fuguki et s'empare de Samehada. Entre le monstre humain et l'épée gloutonne naît une symbiose parfaite ; ensemble ils traquent les jinchūriki pour l'Akatsuki." },
      { label: 'Fusion', leader: 'Kisame Hoshigaki', period: "Combats de l'Akatsuki", event: 'Mode requin', threat: 'Absorption massive', img: '/images/akasha/artifacts/samehada-fusion.webp',
        summary: "En pleine bataille, Kisame fusionne avec Samehada pour se muer en créature mi-homme mi-requin, capable d'absorber des océans de chakra." },
      { label: 'La trahison', leader: 'Killer B', period: 'Quatrième Guerre', event: 'Change de maître', threat: 'Séduite par le Hachibi', img: '/images/akasha/artifacts/samehada-trahison.webp',
        summary: "Face au chakra colossal de Killer B, l'hôte du Hachibi, la sentiente Samehada abandonne Kisame et se choisit un nouveau maître." },
    ],
  },
  'ninja-medical': {
    kanji: '医療忍者',
    quote: { text: 'Un ninja médical ne meurt pas avant ses coéquipiers. C\'est la première règle.', author: 'Tsunade · 5ᵉ Hokage' },
    rosterLabel: 'Praticiens',
    facts: [
      { label: 'Secteur', value: 'Médecine ninja' },
      { label: 'Prérequis', value: "Contrôle du chakra d'une extrême précision" },
      { label: 'Réformé par', value: "Tsunade, l'une des Trois Sannin" },
      { label: 'Niveau ultime', value: 'Sceau de Byakugō' },
      { label: 'Symbole', value: '医 — « médecine »' },
    ],
    bio: "Le ninjutsu médical est l'art de soigner par le chakra — refermer les plaies, réparer les organes, neutraliser les poisons — sans jamais cesser de combattre. Il exige un contrôle du chakra d'une précision absolue : la moindre erreur peut tuer le patient. Longtemps marginale, la discipline fut révolutionnée par Tsunade, l'une des Trois Sannin, qui imposa la présence d'un ninja médical dans chaque équipe et forma l'élite de sa génération — Shizune, puis Sakura Haruno. Au sommet de l'art, le Sceau de Byakugō permet de stocker des années de chakra pour une régénération quasi instantanée.",
    trivia: [
      "Première règle de Tsunade : un ninja médical doit rester en vie coûte que coûte — sans lui, toute l'équipe est condamnée.",
      "Le symbole 医 (« médecine ») orne l'uniforme des medic-nin du corps médical de guerre.",
      "Le Sceau de Byakugō, losange sur le front, concentre des années de chakra accumulé pour une régénération instantanée.",
      "Peu de ninjas possèdent un contrôle du chakra assez fin pour opérer : c'est un talent rare et recherché.",
    ],
    abilities: ['Paume Mystique (soin)', 'Bistouri de chakra', 'Réanimation', 'Antidotes & poisons', 'Sceau de Byakugō (régénération)', 'Ninjutsu de Création (Katsuyu)', 'Diagnostic au chakra'],
    eras: [
      { label: 'Apprenti', leader: "Recrues de l'Académie", period: 'Formation', event: 'Contrôle du chakra', threat: 'Diagnostic précis', img: '/images/akasha/professions/medic-apprenti.webp',
        summary: "Tout commence par un contrôle du chakra d'une finesse extrême : diagnostiquer, refermer une plaie légère, ne jamais nuire au patient." },
      { label: 'Medic de terrain', leader: 'Corps médical', period: 'Missions & guerre', event: 'Paume Mystique', threat: 'Sang-froid au combat', img: '/images/akasha/professions/medic-terrain.webp',
        summary: "Sur le champ de bataille, le medic-nin soigne sous le feu grâce à la Paume Mystique, réanime et maintient l'escouade en vie." },
      { label: "Medic d'élite", leader: 'Sakura · Shizune', period: 'Maîtrise', event: 'Bistouri de chakra', threat: 'Anatomie parfaite', img: '/images/akasha/ref/ninja-medical.webp',
        summary: "L'élite opère au chakra : bistouri de précision, antidotes, régénération cellulaire. Sakura et Shizune, formées par Tsunade, en sont les fers de lance." },
      { label: 'Légendaire', leader: 'Tsunade · Sakura', period: "Sommet de l'art", event: 'Sceau de Byakugō', threat: 'Chakra colossal', img: '/images/akasha/professions/medic-legendaire.webp',
        summary: "Au sommet, Tsunade débloque le Sceau de Byakugō — des années de chakra stockées pour une régénération quasi instantanée — et le transmet à sa disciple Sakura." },
    ],
  },
  uchiha: {
    kanji: 'うちは一族',
    quote: { text: "L'amour trop profond des Uchiha engendre une haine tout aussi profonde.", author: 'Tobirama Senju · 2ᵉ Hokage' },
    rosterLabel: 'Membres',
    facts: [
      { label: 'Kekkei Genkai', value: 'Sharingan — l\'œil qui copie et hypnotise' },
      { label: 'Symbole', value: "L'éventail uchiwa (rouge & blanc)" },
      { label: 'Ancêtre', value: 'Indra Ōtsutsuki, fils du Sage des Six Chemins' },
      { label: 'Rival historique', value: 'Le clan Senju' },
      { label: 'Village', value: 'Konohagakure' },
    ],
    bio: "Descendants d'Indra, le fils aîné du Sage des Six Chemins, les Uchiha sont un clan de génies au chakra dévastateur, définis par le Sharingan — l'œil rouge qui copie toute technique et lit les mouvements. Leur force est aussi leur malédiction : la « Volonté de la Haine » veut que la perte d'un être cher éveille en eux un pouvoir immense, le Mangekyō, au prix de leur âme. Cofondateurs de Konoha aux côtés des Senju, ils en furent peu à peu écartés puis surveillés, jusqu'au massacre orchestré par Itachi pour éviter un coup d'État. De ce sang ne restèrent que Sasuke, Itachi et quelques exilés — mais la lignée renaît avec Sasuke et sa fille Sarada.",
    trivia: [
      "Le Sharingan s'éveille sous le choc d'une émotion intense — le plus souvent la perte d'un proche.",
      "Le nom du clan vient de l'« uchiwa », l'éventail de leur emblème, qui attisait aussi les flammes de leurs jutsu de Feu.",
      "Le Mangekyō Sharingan rend peu à peu aveugle — sauf en greffant les yeux d'un frère (Mangekyō éternel).",
      "Presque tous les Uchiha maîtrisent la Nature du Feu enfant : la Boule de Feu Suprême est leur rite de passage.",
    ],
    abilities: ['Sharingan', 'Mangekyō Sharingan', 'Amaterasu', 'Tsukuyomi', 'Susanoo', 'Izanagi & Izanami', 'Rinnegan (éveil ultime)', 'Nature du Feu'],
    eras: [
      { label: 'Origines', leader: 'Indra Ōtsutsuki', period: 'Âge des mythes', event: 'Naissance du clan', threat: 'Sharingan', img: '/images/akasha/status/uchiha-origines.webp',
        summary: "Héritiers du chakra d'Indra, les Uchiha éveillent le Sharingan dans la douleur et deviennent les éternels rivaux du clan Senju." },
      { label: 'Fondation de Konoha', leader: 'Madara Uchiha', period: 'Fondation du village', event: 'Alliance avec les Senju', threat: 'Mangekyō', img: '/images/akasha/status/uchiha-konoha.webp',
        summary: "Madara et Hashirama Senju scellent la paix et fondent Konoha. Les Uchiha, guerriers d'élite, y prennent une place centrale — jusqu'au départ de Madara, méfiant." },
      { label: 'Marginalisation', leader: 'Fugaku Uchiha', period: 'Avant la Partie I', event: 'Le clan sous surveillance', threat: 'Sharingan', img: '/images/akasha/status/uchiha-marginalisation.webp',
        summary: "Soupçonnés depuis la défection de Madara et l'attaque de Kurama, les Uchiha sont relégués dans un quartier à l'écart et surveillés. La tension monte vers un coup d'État." },
      { label: 'Le Massacre', leader: 'Itachi Uchiha', period: '~Partie I', event: 'Extermination du clan', threat: 'Tsukuyomi · Amaterasu', img: '/images/akasha/status/uchiha-massacre.webp',
        summary: "Pour empêcher une guerre civile, Itachi extermine le clan en une nuit sur ordre de Konoha — n'épargnant que son petit frère Sasuke, à qui il lègue la vérité et la haine." },
      { label: 'Renaissance', leader: 'Sasuke Uchiha', period: 'Ère Boruto', event: 'Réhabilitation du nom', threat: 'Rinnegan', img: '/images/akasha/status/uchiha-renaissance.webp',
        summary: "Dernier héritier, Sasuke traverse la vengeance puis la rédemption, débloque le Rinnegan et réhabilite le nom Uchiha. Sa fille Sarada perpétue la lignée." },
    ],
  },
  rasengan: {
    kanji: '螺旋丸',
    quote: { text: "Le Rasengan est l'héritage du Quatrième. Naruto… c'est à toi de l'achever.", author: 'Jiraiya' },
    rosterLabel: 'Maîtres',
    facts: [
      { label: 'Créateur', value: 'Minato Namikaze, 4ᵉ Hokage' },
      { label: 'Rang', value: 'A (base) → S (Rasenshuriken)' },
      { label: 'Nature', value: 'Chakra pur · + Vent pour le Rasenshuriken' },
      { label: 'Portée', value: 'Corps à corps → distance (Rasenshuriken)' },
      { label: 'Particularité', value: 'Aucun signe requis — rotation dans la paume' },
    ],
    bio: "Le Rasengan est une sphère de chakra en rotation ultra-dense, formée dans la paume sans le moindre signe. Inventé par le Quatrième Hokage Minato en s'inspirant de la Bijūdama des démons à queues, il représentait un défi que son créateur n'eut pas le temps d'achever : y ajouter une nature élémentaire. Transmis par Jiraiya à Naruto, il devint la signature du jeune ninja, qui le déclina à l'infini grâce au Multiclonage. C'est Naruto qui accomplit finalement le rêve de son père en y injectant sa nature Vent — le Rasenshuriken, arme de destruction cellulaire de rang S. Fusionné au chakra de Kurama et des Six Chemins, le Rasengan atteignit une échelle proprement divine.",
    trivia: [
      "Minato mit trois ans à créer le Rasengan ; il rêvait d'y ajouter une nature élémentaire — ce que seul Naruto réussira.",
      "Le Rasengan ne requiert AUCUN signe : toute sa difficulté tient dans la rotation et la compression du chakra dans la main.",
      "Le Rasenshuriken fut d'abord si dangereux qu'il endommageait les propres cellules de Naruto à chaque usage.",
      "Konohamaru, élève de Naruto, maîtrise lui aussi le Rasengan — la technique se transmet de génération en génération.",
    ],
    abilities: ['Rasengan (base)', 'Ōdama Rasengan (géant)', 'Rasengan multiple', 'Rasenshuriken', 'Rasengan tourbillonnant', 'Bijūdama Rasenshuriken', 'Rasengan des Six Chemins', 'Mini-Rasenshuriken'],
    eras: [
      { label: 'Création', leader: 'Minato Namikaze', period: '2 générations avant', event: 'Inspiré de la Bijūdama', threat: 'Rang A', img: '/images/akasha/powers/rasengan-creation.webp',
        summary: "Le Quatrième Hokage Minato invente le Rasengan en observant la Bijūdama d'un Bijū : une sphère de chakra en rotation, sans nature. Il meurt avant d'avoir pu y ajouter un élément." },
      { label: 'Rasengan', leader: 'Naruto (via Jiraiya)', period: 'Partie I', event: 'Les trois étapes', threat: 'Rang A', img: '/images/akasha/ref/rasengan.webp',
        summary: "Jiraiya transmet la technique à Naruto en trois étapes — rotation, puissance, contrôle. La sphère broie tout ce qu'elle touche, sans aucun signe." },
      { label: 'Ōdama & variantes', leader: 'Naruto Uzumaki', period: 'Partie I–II', event: 'Rasengan géant & multiclonage', threat: 'Rang A', img: '/images/akasha/powers/rasengan-odama.webp',
        summary: "Grâce au Multiclonage, Naruto décline le Rasengan à l'infini : Ōdama (géant), Rasengan multiple, tourbillonnant… la puissance décuplée." },
      { label: 'Rasenshuriken', leader: 'Naruto Uzumaki', period: 'Partie II', event: 'Ajout de la nature Vent', threat: 'Rang S', img: '/images/akasha/powers/rasengan-rasenshuriken.webp',
        summary: "Naruto réussit ce que Minato n'avait pu : y injecter sa nature Vent. Le Rasenshuriken lacère l'ennemi au niveau cellulaire — d'abord à bout portant, puis lançable." },
      { label: 'Six Chemins', leader: 'Naruto Uzumaki', period: '4ᵉ Guerre & au-delà', event: 'Bijūdama Rasenshuriken', threat: 'Rang S+', img: '/images/akasha/powers/rasengan-sixpaths.webp',
        summary: "Au sommet, Naruto fusionne le Rasengan avec le chakra de Kurama et des Six Chemins : Bijūdama Rasenshuriken, versions colossales… une échelle divine." },
    ],
  },
  sharingan: {
    kanji: '写輪眼',
    quote: { text: 'Face au Sharingan, ton corps te trahit avant même de bouger.', author: 'Kakashi Hatake' },
    rosterLabel: 'Porteurs',
    facts: [
      { label: 'Discipline', value: 'Dōjutsu héréditaire du clan Uchiha' },
      { label: 'Éveil', value: "Sous le choc d'une émotion intense" },
      { label: 'Apparence', value: 'Iris rouge à tomoes noirs' },
      { label: 'Évolution', value: '1 tomoe → 3 tomoes → Mangekyō → Rinnegan' },
      { label: 'Faiblesse', value: 'Le Mangekyō rend peu à peu aveugle' },
    ],
    bio: "Le Sharingan — « œil copieur tournoyant » — est le dōjutsu héréditaire du clan Uchiha. Il s'éveille sous le choc d'une émotion violente et confère une perception surhumaine : lire les mouvements, percevoir le flux de chakra, copier presque toute technique et plonger l'ennemi dans une hypnose redoutable. À mesure qu'apparaissent ses trois tomoes, sa puissance grandit. La perte d'un être cher peut l'élever au Mangekyō Sharingan, qui débloque des pouvoirs dévastateurs — Amaterasu, Tsukuyomi, Susanoo — mais consume peu à peu la vue. En greffant les yeux d'un frère, on obtient le Mangekyō éternel, sans la cécité. Ultime palier, nourri du chakra du Sage des Six Chemins, l'œil se mue en Rinnegan.",
    trivia: [
      "Le Sharingan copie une technique en la « lisant » — mais ne peut reproduire un kekkei genkai ni ce qui dépasse le corps du porteur.",
      "Chaque Mangekyō a un motif unique, propre à son porteur (l'œil d'Itachi, de Sasuke, de Kakashi/Obito…).",
      "Kakashi, non-Uchiha, portait un Sharingan greffé par Obito — et débloqua même le Kamui.",
      "Un œil arraché continue de fonctionner greffé sur un autre : Danzō en avait couvert tout un bras.",
    ],
    abilities: ['Copie de techniques', 'Prédiction des mouvements', 'Hypnose / Genjutsu', 'Amaterasu (flammes noires)', 'Tsukuyomi (illusion)', 'Susanoo (avatar)', 'Kamui (Obito · Kakashi)', 'Izanagi & Izanami'],
    eras: [
      { label: 'Sharingan (1 tomoe)', leader: 'Jeune Uchiha', period: 'Éveil', event: 'Premier choc émotionnel', threat: 'Perception accrue', img: '/images/akasha/skills/sharingan-1tomoe.webp',
        summary: "L'œil s'ouvre sous le choc d'une émotion violente : un premier tomoe apparaît, aiguisant déjà la perception et la lecture des mouvements." },
      { label: 'Sharingan complet', leader: 'Sasuke · Itachi', period: 'Maîtrise', event: "Maturité de l'œil (3 tomoes)", threat: 'Copie & hypnose', img: '/images/akasha/ref/sharingan.webp',
        summary: "Avec ses trois tomoes, le Sharingan atteint sa plénitude : il copie presque toute technique, anticipe chaque geste et hypnotise l'adversaire." },
      { label: 'Mangekyō', leader: 'Itachi · Sasuke', period: 'La perte', event: "Mort d'un être cher", threat: 'Amaterasu · Tsukuyomi · Susanoo', img: '/images/akasha/skills/sharingan-mangekyo.webp',
        summary: "Le deuil élève l'œil au Mangekyō Sharingan : Amaterasu, Tsukuyomi, Susanoo… des pouvoirs dévastateurs, au prix d'une cécité progressive." },
      { label: 'Mangekyō éternel', leader: 'Madara · Sasuke', period: 'Transplantation', event: "Greffe des yeux d'un frère", threat: 'Puissance sans cécité', img: '/images/akasha/skills/sharingan-eternel.webp',
        summary: "En fusionnant ses yeux avec ceux d'un frère, l'Uchiha obtient le Mangekyō éternel : toute la puissance du Mangekyō, sans en perdre la vue." },
      { label: 'Rinnegan', leader: 'Sasuke · Madara', period: 'Éveil ultime', event: 'Chakra du Sage des Six Chemins', threat: 'Les Six Voies', img: '/images/akasha/skills/sharingan-rinnegan.webp',
        summary: "Nourri du chakra d'Hagoromo, le Sharingan transcende sa forme et devient Rinnegan : l'œil violet aux anneaux, maître des Six Voies." },
    ],
  },
};

const POWERS = [
  ['rasengan', 'Rasengan', 'Chakra', "Sphère tourbillonnante de chakra concentrée dans la paume, créée par Minato.", 'epic'],
  ['chidori', 'Chidori', 'Foudre', "Concentration de foudre dans la main pour un assaut perforant fulgurant.", 'epic'],
  ['amaterasu', 'Amaterasu', 'Feu noir', "Flammes noires inextinguibles déclenchées par le Mangekyō Sharingan.", 'epic'],
  ['susanoo', 'Susanoo', 'Avatar', "Avatar de chakra géant et cuirassé invoqué par les maîtres du Mangekyō Sharingan.", 'legendary'],
  ['edo-tensei', 'Edo Tensei', 'Interdit', "Technique interdite de réincarnation qui rappelle les morts au combat.", 'legendary'],
  ['shadow-clone', 'Multiclonage', 'Chakra', "Crée des clones tangibles et autonomes, signature de Naruto.", 'rare'],
  ['flying-raijin', 'Hiraishin', 'Espace-temps', "Téléportation instantanée vers un sceau marqué — l'« éclair jaune ».", 'epic'],
  ['wood-release', 'Mokuton', 'Bois', "Libération du bois, fusion d'eau et de terre, propre à Hashirama.", 'legendary'],
  ['tailed-beast-ball', 'Bijūdama', 'Chakra', "Bombe de chakra condensée tirée par les Bijū et leurs hôtes.", 'epic'],
];

const SKILLS = [
  ['sharingan', 'Sharingan', 'Dōjutsu Uchiha', "Œil qui copie les techniques et perçoit le moindre mouvement.", 'epic'],
  ['byakugan', 'Byakugan', 'Dōjutsu Hyūga', "Vision à 360° révélant le réseau de chakra de l'adversaire.", 'rare'],
  ['rinnegan', 'Rinnegan', 'Dōjutsu légendaire', "Le plus vénéré des dōjutsu, maîtrise des six chemins et plus encore.", 'legendary'],
];

const ARTIFACTS = [
  ['kusanagi', 'Sabre de Kusanagi', 'Lame spirituelle', "Épée mythique d'une portée et d'un tranchant extraordinaires.", 'rare'],
  ['gunbai', 'Gunbai', 'Éventail de guerre', "Éventail de guerre indestructible capable de renvoyer les attaques.", 'epic'],
  ['samehada', 'Samehada', 'Épée vivante', "« Peau de requin » : lame vivante qui dévore le chakra, portée par Kisame.", 'epic'],
];

const PROFESSIONS = [
  ['shinobi', 'Shinobi', 'Arts ninja', "Guerrier de l'ombre maniant chakra, armes et techniques au service de son village.", 'common'],
  ['ninja-medical', 'Ninja médical', 'Médecine ninja', "Spécialiste qui soigne par le chakra et maîtrise l'anatomie au combat.", 'rare'],
];

// status = clans + rangs/titres
const STATUSES = [
  ['uchiha', 'Clan Uchiha', 'Clan', "Clan réputé pour le Sharingan et une intensité émotionnelle dévastatrice.", 'epic'],
  ['senju', 'Clan Senju', 'Clan', "Clan des fondateurs, « clan aux mille techniques », rival historique des Uchiha.", 'epic'],
  ['uzumaki', 'Clan Uzumaki', 'Clan', "Clan aux immenses réserves de chakra et maître du fūinjutsu (sceaux).", 'rare'],
  ['hyuga', 'Clan Hyūga', 'Clan', "Clan noble porteur du Byakugan et du Poing Souple.", 'rare'],
  ['nara', 'Clan Nara', 'Clan', "Clan de stratèges manipulant les ombres et gardiens de cerfs.", 'common'],
  ['hokage', 'Hokage', 'Titre', "Le chef suprême et protecteur de Konohagakure.", 'legendary'],
  ['jinchuriki', 'Jinchūriki', 'Statut', "Humain en qui est scellé un Bijū, arme vivante autant que fardeau.", 'epic'],
  ['sannin', 'Sannin légendaires', 'Titre', "Titre des trois élèves d'exception d'Hiruzen : Jiraiya, Tsunade, Orochimaru.", 'epic'],
];

// ─── Databook : sprite idle + stats /5 (8 axes) par mode de Naruto ────
const IDLE_SLUG = {
  'Partie I': 'partie-i', '1 Queue': '1-queue', 'Version 2': 'version-2', 'Partie II': 'partie-ii',
  'Mode Ermite': 'mode-ermite', 'Chakra Kurama': 'chakra-kurama', 'Bijū Mode': 'biju-mode',
  'Six Chemins': 'six-chemins', Hokage: 'hokage', 'Mode Baryon': 'mode-baryon',
};
// nin=Ninjutsu tai=Taijutsu gen=Genjutsu int=Intelligence for=Force vit=Vitesse end=Endurance sce=Sceaux
const NARUTO_STATS = {
  'Partie I':      { nin: 2,   tai: 1.5, gen: 1,   int: 1.5, for: 2,   vit: 2,   end: 3.5, sce: 2 },
  '1 Queue':       { nin: 2.5, tai: 2.5, gen: 1,   int: 1,   for: 3.5, vit: 3,   end: 4,   sce: 1.5 },
  'Version 2':     { nin: 3,   tai: 3.5, gen: 1,   int: 0.5, for: 4.5, vit: 4,   end: 4.5, sce: 1 },
  'Partie II':     { nin: 3.5, tai: 3,   gen: 1,   int: 2.5, for: 3.5, vit: 3.5, end: 5,   sce: 3 },
  'Mode Ermite':   { nin: 4.5, tai: 4,   gen: 1.5, int: 3,   for: 4.5, vit: 4,   end: 5,   sce: 3.5 },
  'Chakra Kurama': { nin: 4.5, tai: 4,   gen: 1.5, int: 3,   for: 4.5, vit: 5,   end: 5,   sce: 3.5 },
  'Bijū Mode':     { nin: 5,   tai: 4.5, gen: 2,   int: 3.5, for: 5,   vit: 5,   end: 5,   sce: 4 },
  'Six Chemins':   { nin: 5,   tai: 5,   gen: 3,   int: 4,   for: 5,   vit: 5,   end: 5,   sce: 4.5 },
  Hokage:          { nin: 5,   tai: 4.5, gen: 2.5, int: 4,   for: 4.5, vit: 4.5, end: 5,   sce: 4.5 },
  'Mode Baryon':   { nin: 5,   tai: 5,   gen: 3,   int: 4,   for: 5,   vit: 5,   end: 5,   sce: 5 },
};

function entry(slug, type, name, summary, rarity, attributes, image_url, description) {
  return { slug, type, name, is_fiction: true, universe: 'Naruto', summary, description: description ?? summary, image_url: image_url ?? null, attributes, rarity };
}

async function main() {
  const all = await getJSON('/characters?limit=1500');
  const chars = all.characters ?? all;
  const byName = new Map(chars.map((c) => [c.name, c]));
  const tb = (await getJSON('/tailed-beasts?limit=20'))['tailed-beasts'] ?? [];
  const tbByName = new Map(tb.map((t) => [t.name, t]));

  const entries = [];
  const relations = [];
  const slugs = new Set();
  // Relations croisées entre entités NON-perso (maillage des pages évolutives entre elles).
  relations.push(['sharingan', 'appartient', 'uchiha']);      // le dōjutsu est le kekkei genkai du clan
  relations.push(['samehada', 'appartient', 'kirigakure']);   // l'épée des Sept Épéistes de la Brume
  const add = (e) => { entries.push(e); slugs.add(e.slug); };

  // Entités rédigées — image_url = référence Narutopedia locale si disponible.
  for (const [slug, name, region, summary, rarity] of PLACES) add(entry(slug, 'place', name, summary, rarity, { region, ...(ENTITY_DETAILS[slug] || {}) }, refImg(slug)));
  for (const [slug, name, element, summary, rarity] of POWERS) add(entry(slug, 'power', name, summary, rarity, { element, ...(ENTITY_DETAILS[slug] || {}) }, refImg(slug)));
  for (const [slug, name, discipline, summary, rarity] of SKILLS) add(entry(slug, 'skill', name, summary, rarity, { discipline, ...(ENTITY_DETAILS[slug] || {}) }, refImg(slug)));
  for (const [slug, name, material, summary, rarity] of ARTIFACTS) add(entry(slug, 'artifact', name, summary, rarity, { material, ...(ENTITY_DETAILS[slug] || {}) }, refImg(slug)));
  for (const [slug, name, sector, summary, rarity] of PROFESSIONS) add(entry(slug, 'profession', name, summary, rarity, { sector, ...(ENTITY_DETAILS[slug] || {}) }, refImg(slug)));
  for (const [slug, name, scope, summary, rarity] of STATUSES) add(entry(slug, 'status', name, summary, rarity, { scope, ...(ENTITY_DETAILS[slug] || {}) }, refImg(slug)));

  // Helpers attributs riches
  const arr = (x) => (Array.isArray(x) ? x.filter(Boolean) : x ? [x] : []);
  const firstVal = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.values(x)[0] : x) || null;
  const cleanNote = (s) => String(s).replace(/\s*\((?:Affinity|Anime only|Manga only|Movie only|Game only|Novel only|Anime|Manga)\)/gi, '').trim();
  // Surnoms non curés : l'API colle nom-camelCase + kanji/romaji entre parenthèses → on retire la
  // parenthèse (kanji illisible) et on dé-colle le CamelCase, faute de traduction FR (fallback hygiène).
  const cleanTitle = (s) =>
    String(s).replace(/\s*\(.*$/s, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  // Dates de naissance : l'API renvoie « October 10 » (anglais) → « 10 octobre » (FR).
  const FR_MONTHS = { january: 'janvier', february: 'février', march: 'mars', april: 'avril', may: 'mai', june: 'juin', july: 'juillet', august: 'août', september: 'septembre', october: 'octobre', november: 'novembre', december: 'décembre' };
  const frDate = (s) => {
    if (!s) return s;
    const m = String(s).trim().match(/^([A-Za-z]+)\.?\s+(\d{1,2})$/);
    const mon = m && FR_MONTHS[m[1].toLowerCase()];
    return mon ? `${parseInt(m[2], 10)} ${mon}` : s;
  };
  // Début (parution) : « Naruto Chapter #1 » → « Naruto — chapitre 1 ».
  const frDebut = (s) =>
    s ? String(s).replace(/\s*Chapter\s*#?\s*/i, ' — chapitre ').replace(/\s*Episode\s*#?\s*/i, ' — épisode ').trim() : s;
  // Apparitions complètes (manga/anime/roman/film/jeu/OVA) — localise chapitre/épisode, garde les titres.
  const frDebutAll = (deb) => {
    if (!deb || typeof deb !== 'object') return null;
    const o = {};
    for (const [k, src] of [['manga', deb.manga], ['anime', deb.anime], ['novel', deb.novel], ['movie', deb.movie], ['game', deb.game], ['ova', deb.ova]]) {
      if (src) o[k] = k === 'manga' || k === 'anime' ? frDebut(String(src)) : String(src);
    }
    return Object.keys(o).length ? o : null;
  };
  // Doubleurs : retire les notes entre parenthèses (« (Sexy Technique) »…), dédoublonne, garde le principal.
  const vaClean = (list) => arr(list).map((s) => String(s).replace(/\s*\(.*$/, '').trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  const cleanVA = (va) => {
    if (!va || typeof va !== 'object') return null;
    const jp = vaClean(va.japanese).slice(0, 3);
    const en = vaClean(va.english).slice(0, 3);
    return jp.length || en.length ? { jp, en } : null;
  };
  const RANK_ORDER = ['Academy Student', 'Genin', 'Chūnin', 'Jōnin', 'Anbu', 'Sannin', 'Kage'];
  const pickRank = (rank) => {
    const nr = rank?.ninjaRank;
    const vals = nr ? (typeof nr === 'object' ? Object.values(nr) : [nr]) : [];
    let best = null, bi = -1;
    for (const v of vals) { const i = RANK_ORDER.indexOf(cleanNote(v)); if (i > bi) { bi = i; best = cleanNote(v); } }
    return best || (vals[0] ? cleanNote(vals[0]) : null);
  };
  const purge = (o) => { for (const k of Object.keys(o)) { const v = o[k]; if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) delete o[k]; } return o; };
  // Caps larges (garde-fou anti-bloat), PAS des troncatures de contenu : l'ancien slice(0,12)/slice(0,8)
  // coupait sur l'ORDRE ALPHABÉTIQUE brut de l'API → pour Naruto (94 jutsu) ça amputait ses techniques
  // signature (Rasengan, Shadow Clone Technique… toutes après "C") en ne gardant que des combos mineurs.
  const JUTSU_CAP = 100, TOOLS_CAP = 20;
  // priorité optionnelle par perso (c.jutsuPriority) : fait remonter les techniques signature en tête
  // avant le reste (ordre API), pour un rendu utile même si le total dépasse le cap.
  const orderJutsu = (list, priority) => {
    if (!priority?.length) return list;
    const set = new Set(list);
    const head = priority.filter((p) => set.has(p));
    const headSet = new Set(head);
    return [...head, ...list.filter((j) => !headSet.has(j))];
  };

  // Personnages — attributs riches (stat-block « carte »)
  for (const c of CHARACTERS) {
    const api = byName.get(c.key);
    if (!api) { console.warn('  ⚠ perso introuvable dans l\'API:', c.key); continue; }
    const slug = c.slug || slugify(c.key);
    const facts = FACTS[slug];
    const p = api.personal || {};
    const villageName = PLACES.find((pl) => pl[0] === c.village)?.[1] ?? (arr(p.affiliation)[0] || null);
    const attributes = purge({
      role: c.role,
      clan: typeof p.clan === 'string' ? p.clan : arr(p.clan)[0] || null,
      clanSlug: c.clan || null,
      village: villageName,
      villageSlug: c.village || null,
      sex: firstVal(p.sex),
      age: firstVal(p.age),
      height: firstVal(p.height),
      weight: firstVal(p.weight),
      bloodType: firstVal(p.bloodType),
      birthdate: frDate(firstVal(p.birthdate)),
      // classification/affiliation : SMW Narutopedia (canon, FR) si dispo, sinon API.
      classification: facts ? frList(facts.classification) : arr(p.classification).map(cleanNote),
      titles: c.titles ?? arr(p.titles).map(cleanTitle),
      nindo: c.nindo || null,
      nindoLabel: c.nindoLabel || null,
      occupation: arr(p.occupation).map(cleanNote),
      // kekkei genkai = CURÉ (canon). Plus de dump API (corrige Naruto = Lava/Magnet/Boil).
      kekkeiGenkai: c.kg ?? [],
      // natures perso curées si fournies (ex. Naruto = Vent), sinon API (les icônes filtrent l'exotique).
      natureType: c.nat ?? arr(api.natureType).map(cleanNote),
      tools: c.tools ?? arr(api.tools).map(cleanNote).slice(0, TOOLS_CAP),
      jutsu: orderJutsu(arr(api.jutsu).map(cleanNote), c.jutsuPriority).slice(0, JUTSU_CAP),
      signature: (c.powers || []).map((s) => POWERS.find((p) => p[0] === s)?.[1]).filter(Boolean),
      rank: pickRank(api.rank),
      affiliation: facts ? frList(facts.affiliation) : arr(p.affiliation),
      sourceUrl: facts?.sourceUrl ?? null, // attribution CC-BY-SA (Narutopedia)
      team: arr(p.team),
      debut: frDebut(api.debut?.manga) || null,
      // Champs enrichis surfacés (génériques, tous persos) + contenu curé FR (par perso via c.*)
      tailedBeast: c.biju || null, // curé (l'API dump les 9 bijū pour Naruto) ; défaut null si non curé
      voiceActors: cleanVA(api.voiceActors),
      debutAll: frDebutAll(api.debut),
      status: c.status || null,
      squad: c.squad || null,
      bio: c.bio || null,
      personality: c.personality || null,
      quotes: c.quotes || [],
      trivia: c.trivia || [],
      family: api.family && typeof api.family === 'object' ? Object.entries(api.family).map(([rel, name]) => ({ rel, name: String(name) })) : [],
      gallery: arr(api.images),
      // forms = instantanés évolutifs : image + snapshot cohérent (âge, rang, natures, techniques…).
      forms: (c.forms || []).map((f) => ({
        label: f.label,
        url: f.g != null ? arr(api.images)[f.g] : f.img,
        caption: f.caption,
        summary: f.summary,
        age: f.age, height: f.height, weight: f.weight, rank: f.rank,
        classification: f.classification, natures: f.natures, kekkeiGenkai: f.kg,
        occupation: f.occupation, affiliation: f.affiliation, signature: f.signature, arc: f.arc,
        // Sprites pixel « idle » par forme (style validé par Dan) : inline `f.idle` pour les
        // légendaires, map IDLE_SLUG (par label) réservée à Naruto — jamais les deux mélangés,
        // sinon les formes homonymes héritent des sprites d'un autre perso.
        idle: f.idle ?? (c.key === 'Naruto Uzumaki' && IDLE_SLUG[f.label] ? `/images/akasha/naruto/idle/${IDLE_SLUG[f.label]}.webp` : undefined),
        stats: f.stats ?? NARUTO_STATS[f.label], // stats inline (autres légendaires) ou map Naruto
        jutsu: f.jutsu,
      })).filter((f) => f.url),
      animations: c.anims || [],
    });
    add(entry(slug, 'character', c.key, c.summary, c.rarity, attributes, attributes.gallery?.[0] || (c.forms || []).find((f) => f.img)?.img || null, c.summary));

    if (c.village) relations.push([slug, 'habite', c.village]);
    if (c.clan) relations.push([slug, 'appartient', c.clan]);
    for (const r of c.ranks || []) relations.push([slug, 'appartient', r]);
    relations.push([slug, 'exerce', c.medical ? 'ninja-medical' : 'shinobi']);
    if (c.medical) relations.push([slug, 'exerce', 'shinobi']);
    for (const pw of c.powers || []) relations.push([slug, 'maitrise', pw]);
    for (const s of c.skills || []) relations.push([slug, 'maitrise', s]);
    for (const a of c.artifacts || []) relations.push([slug, 'possede', a]);
    if (c.beast) relations.push([slug, 'possede', c.beast]);
  }

  // Tailed beasts (personnages)
  for (const b of BEASTS) {
    const api = tbByName.get(b.key);
    const p = api?.personal || {};
    const attributes = purge({
      role: b.role || 'Bête à queues (Bijū)', race: 'Bijū',
      classification: arr(p.classification).map(cleanNote),
      natureType: arr(api?.natureType).map(cleanNote),
      jutsu: arr(api?.jutsu).map(cleanNote).slice(0, JUTSU_CAP),
      gallery: arr(api?.images),
      // Profondeur curée (bio, credo, formes…) — même moteur que les personnages.
      status: b.status, titles: b.titles, nindo: b.nindo, nindoLabel: b.nindoLabel,
      bio: b.bio, personality: b.personality, quotes: b.quotes, trivia: b.trivia,
      forms: (b.forms || []).map((f) => ({
        label: f.label, url: f.g != null ? arr(api?.images)[f.g] : f.img, caption: f.caption, summary: f.summary,
        age: f.age, height: f.height, weight: f.weight, rank: f.rank,
        classification: f.classification, natures: f.natures, kekkeiGenkai: f.kg,
        occupation: f.occupation, affiliation: f.affiliation, signature: f.signature, arc: f.arc,
        idle: f.idle, stats: f.stats,
      })).filter((f) => f.url),
    });
    add(entry(b.slug, 'character', `${b.key} (Bijū)`, b.summary, b.rarity, attributes, attributes.gallery?.[0] || (b.forms || []).find((f) => f.img)?.img || null));
  }

  // Relations manuelles (rivalités / alliances)
  const EXTRA = [
    ['naruto-uzumaki', 'rival', 'sasuke-uchiha'],
    ['naruto-uzumaki', 'allie', 'sakura-haruno'],
    ['naruto-uzumaki', 'allie', 'kakashi-hatake'],
    ['sasuke-uchiha', 'allie', 'sakura-haruno'],
    ['madara-uchiha', 'rival', 'hashirama-senju'],
    ['might-guy', 'rival', 'kakashi-hatake'],
    ['itachi-uchiha', 'allie', 'sasuke-uchiha'],
  ];
  relations.push(...EXTRA);

  // ── Import de MASSE : tous les personnages restants de l'API (Naruto / Shippuden / Boruto / films / novels) ──
  // Les fiches curées ci-dessus restent prioritaires (slug déjà pris → skip). Filtre qualité : image requise.
  // Résumé FR généré à partir des faits (clan · village · rang) ; rareté par richesse de moveset.
  const VILLAGE_SLUGS = { Konohagakure: 'konohagakure', Sunagakure: 'sunagakure', Kirigakure: 'kirigakure', Iwagakure: 'iwagakure', Kumogakure: 'kumogakure', Amegakure: 'amegakure', Otogakure: 'otogakure' };
  const CLAN_SLUGS = { Uchiha: 'uchiha', Senju: 'senju', Uzumaki: 'uzumaki', Hyūga: 'hyuga', Nara: 'nara' };
  // Slugs déjà pris par les AUTRES univers (upsert par slug → un homonyme écraserait leur entrée !
  // cas réels : le bijū « Son Gokū » vs Goku (Dragon Ball), « Shinigami » du Shiki Fūjin vs la
  // profession Bleach, Iggy (JoJo), Komugi (HxH)) → suffixe -naruto.
  let externalSlugs = new Set();
  try {
    externalSlugs = new Set(JSON.parse(readFileSync(join(ROOT, 'data', 'akasha-universes.json'), 'utf8')).entries.map((e) => e.slug));
  } catch { /* akasha-universes.json pas encore généré : rien à protéger */ }
  let mass = 0, skippedNoImg = 0;
  for (const c of chars) {
    if (!c?.name) continue;
    const img = arr(c.images)[0] ?? null;
    if (!img) { skippedNoImg++; continue; }
    let slug = slugify(c.name);
    if (slug && externalSlugs.has(slug)) slug = `${slug}-naruto`;
    if (!slug || slugs.has(slug)) continue;
    const p = c.personal || {};
    const clanName = typeof p.clan === 'string' ? cleanNote(p.clan) : arr(p.clan)[0] ? cleanNote(String(arr(p.clan)[0])) : null;
    const aff = arr(p.affiliation).map((a) => cleanNote(String(a)));
    const villageName = Object.keys(VILLAGE_SLUGS).find((v) => aff.some((a) => a.includes(v))) ?? null;
    const rank = pickRank(c.rank);
    const jc = arr(c.jutsu).length;
    const massRarity = jc >= 25 ? 'epic' : jc >= 8 ? 'rare' : 'common';
    const bits = [clanName && `clan ${clanName}`, villageName ?? aff[0], rank && `rang ${rank}`].filter(Boolean);
    const summary = bits.length ? `Personnage de l'univers Naruto — ${bits.join(' · ')}.` : "Personnage de l'univers Naruto.";
    add(entry(slug, 'character', c.name, summary, massRarity, purge({
      clan: clanName, village: villageName, rank,
      sex: firstVal(p.sex), age: firstVal(p.age), birthdate: frDate(firstVal(p.birthdate)),
      voiceActors: cleanVA(c.voiceActors),
      family: c.family && typeof c.family === 'object' ? Object.entries(c.family).map(([rel, name]) => ({ rel, name: String(name) })) : [],
    }), img));
    if (villageName) relations.push([slug, 'habite', VILLAGE_SLUGS[villageName]]);
    const clanKey = clanName ? Object.keys(CLAN_SLUGS).find((k) => clanName.includes(k)) : null;
    if (clanKey) relations.push([slug, 'appartient', CLAN_SLUGS[clanKey]]);
    mass++;
  }
  console.log(`✓ import de masse : +${mass} personnages (${skippedNoImg} sans image ignorés)`);

  // ── Import de MASSE des ARTEFACTS : tous les outils/armes portés par les personnages ──
  // L'API n'a pas d'endpoint /tools → on AGRÈGE le champ `tools` des 1431 personnages.
  // cleanNote fusionne les variantes « (Anime only) ». Les 3 artefacts curés (kusanagi/gunbai/samehada)
  // restent prioritaires. Relation : chaque porteur du registre `possède` l'artefact → la fiche
  // artefact liste ses porteurs (EntityRelations « Référencé par »), et chaque perso liste ses armes.
  const charNameBySlug = new Map();
  for (const e of entries) if (e.type === 'character') charNameBySlug.set(e.slug, e.name);
  // Nom du perso (API) → slug registre, pour rattacher les porteurs (l'outil est un champ du perso).
  const charSlugByApiName = new Map();
  for (const c of chars) { const s = slugify(externalSlugs.has(slugify(c.name)) ? `${slugify(c.name)}-naruto` : slugify(c.name)); if (slugs.has(s)) charSlugByApiName.set(c.name, s); }

  // Traduction FR des outils courants (fallback : nom nettoyé — beaucoup sont déjà des noms propres JP).
  const TOOL_FR = {
    'Sword': 'Sabre', 'Poison': 'Poison', 'Sand': 'Sable', 'Wire Strings': "Fils d'acier",
    'Explosive Tag': 'Parchemin explosif', 'Antidote': 'Antidote', 'Chakra Blade': 'Lame à chakra',
    'Umbrella': 'Ombrelle', 'Shinobi Gauntlet': 'Gantelet shinobi', 'Club': 'Massue', 'Scalpel': 'Scalpel',
    'Konoha Chakra Blade': 'Lame à chakra de Konoha', 'Crossbow': 'Arbalète', 'Spear': 'Lance', 'Bell': 'Grelot',
    'Sword of Kusanagi': 'Sabre de Kusanagi', 'Nunchaku': 'Nunchaku', 'Makibishi': 'Makibishi',
    "First Hokage's Necklace": 'Collier du Premier Hokage', 'Sword of Nunoboko': 'Épée de Nunoboko',
    'White Light Chakra Sabre': 'Sabre à chakra de lumière blanche', 'Katar': 'Katar', 'Bow & Arrow': 'Arc et flèches',
    'Military Rations Pill': 'Pilule de rations militaires', 'Mind Awakening Pill': "Pilule d'éveil",
    'Flying Thunder God Kunai': 'Kunai du Dieu du Tonnerre Volant', 'Weights': "Poids d'entraînement",
    'Tonfa': 'Tonfa', 'Space-Time Gate': 'Portail spatio-temporel', 'Fūma Shuriken': 'Shuriken Fūma',
    'Bō': 'Bâton bō', 'Kama': 'Kama', 'Kusari': 'Chaîne kusari', 'Bow': 'Arc', 'Chain': 'Chaîne',
    'Cursed Seal Device': 'Dispositif du Sceau Maudit', 'Infinite Armour': 'Armure infinie',
    'Absorbing Hand': 'Main absorbante', 'Chakra-Suppressing Seal': 'Sceau de suppression du chakra',
  };
  // Catégorie (attribut `material`) inférée par mots-clés.
  const toolCategory = (n) => {
    const s = n.toLowerCase();
    if (/sword|blade|sabre|tant|katana|kubik|kusanagi|nunoboko|kabutowari|sabre/.test(s)) return 'Lame';
    if (/shuriken|kunai|senbon|makibishi|bow|arrow|crossbow|needle/.test(s)) return 'Arme de jet';
    if (/poison|antidote|pill|drug|ration/.test(s)) return 'Consommable';
    if (/tag|scroll|seal|talisman|parchemin/.test(s)) return 'Parchemin & sceau';
    if (/staff|bō|club|spear|lance|kama|shakuj|nunchaku|tonfa|gauntlet|gunbai|kusari|chain/.test(s)) return 'Arme de mêlée';
    return 'Outil ninja';
  };
  const ICONIC_ART = { 'Kubikiribōchō': 'epic', 'Sword of Nunoboko': 'legendary', "First Hokage's Necklace": 'epic', 'Kohaku no Jōhei': 'epic', 'White Light Chakra Sabre': 'epic', 'Flying Thunder God Kunai': 'rare', 'Sword of Kusanagi': 'epic', 'Bashōsen': 'legendary', 'Benihisago': 'epic', 'Shichiseiken': 'rare' };

  const artMap = new Map(); // nom nettoyé → { count, owners:Set<slug> }
  for (const c of chars) {
    const owner = charSlugByApiName.get(c.name);
    for (const raw of arr(c.tools)) {
      const s = String(raw);
      // Garde-fou : le champ `tools` de l'API contient parfois des légendes HTML d'images ou des
      // chaînes de jeux vidéo (dates) qui ont fui → on rejette HTML / URL / fichier / année.
      if (/[<>]|\/wiki\/|\.(?:png|jpe?g|gif|svg)|https?:|\d{4}/i.test(s)) continue;
      const name = cleanNote(s);
      if (!name || name.length < 2) continue;
      if (!artMap.has(name)) artMap.set(name, { count: 0, owners: new Set() });
      const rec = artMap.get(name);
      rec.count++;
      if (owner) rec.owners.add(owner);
    }
  }
  let massArt = 0;
  for (const [name, rec] of artMap) {
    const frName = TOOL_FR[name] || name;
    let slug = slugify(frName);
    if (!slug) continue;
    if (externalSlugs.has(slug)) slug = `${slug}-naruto`;
    const owners = [...rec.owners].slice(0, 40); // borne le nb de relations par artefact (« Sabre » = 124 porteurs)
    if (slugs.has(slug)) { for (const o of owners) relations.push([o, 'possede', slug]); continue; } // curé/homonyme : on rattache juste les porteurs
    const names = [...rec.owners].map((s) => charNameBySlug.get(s)).filter(Boolean).slice(0, 3);
    const others = rec.owners.size - names.length;
    const summary = names.length
      ? `Arme / outil de l'univers Naruto — porté par ${names.join(', ')}${others > 0 ? ` et ${others} autre${others > 1 ? 's' : ''}` : ''}.`
      : "Arme / outil de l'univers Naruto.";
    const rarity = ICONIC_ART[name] || (rec.count >= 10 ? 'rare' : 'common');
    add(entry(slug, 'artifact', frName, summary, rarity, purge({ material: toolCategory(name), origin: 'Univers Naruto', category: 'Arme & outil' }), refImg(slug)));
    for (const o of owners) relations.push([o, 'possede', slug]);
    massArt++;
  }
  console.log(`✓ import de masse artefacts : +${massArt} (${artMap.size} outils uniques agrégés)`);

  // ── Import de MASSE générique depuis un champ des personnages (jutsu, natures, kekkei genkai,
  //    classifications, métiers, équipes) → entités typées + relation perso→entité. ──
  // Filtre garde-fou commun (mêmes fuites que pour les outils : HTML, URL, dates, gabarits wiki).
  const GARBAGE_RE = /[<>]|\/wiki\/|\.(?:png|jpe?g|gif|svg)|https?:|\d{4}|wiki has an article|article about this|\btopic:/i;
  const flatten = (v) => {
    if (v == null) return [];
    if (Array.isArray(v)) return v.flatMap(flatten);
    if (typeof v === 'object') return Object.values(v).flatMap(flatten);
    return [v];
  };
  function massField({ getter, type, relation, noun, link, frMap = {}, iconic = {}, catKey, catFn, cat, category, cap = 40, minCount = 1, epicAt = 10 }) {
    const map = new Map(); // nom nettoyé → { count, owners:Set<slug> }
    for (const c of chars) {
      const owner = charSlugByApiName.get(c.name);
      for (const rawItem of flatten(getter(c))) {
        const raw = String(rawItem);
        if (GARBAGE_RE.test(raw)) continue;
        const name = cleanNote(raw);
        if (!name || name.length < 2) continue;
        if (!map.has(name)) map.set(name, { count: 0, owners: new Set() });
        const rec = map.get(name); rec.count++; if (owner) rec.owners.add(owner);
      }
    }
    let n = 0;
    for (const [name, rec] of map) {
      if (rec.count < minCount) continue;
      const frName = frMap[name] || name;
      let slug = slugify(frName);
      if (!slug) continue;
      if (externalSlugs.has(slug)) slug = `${slug}-naruto`;
      const owners = [...rec.owners].slice(0, cap);
      if (slugs.has(slug)) { for (const o of owners) relations.push([o, relation, slug]); continue; }
      const names = [...rec.owners].map((s) => charNameBySlug.get(s)).filter(Boolean).slice(0, 3);
      const others = rec.owners.size - names.length;
      const who = names.length ? ` — ${link} ${names.join(', ')}${others > 0 ? ` et ${others} autre${others > 1 ? 's' : ''}` : ''}` : '';
      const rarity = iconic[name] || (rec.count >= epicAt ? 'rare' : 'common');
      const attrs = catKey ? { [catKey]: catFn ? catFn(name) : cat } : {};
      if (category) attrs.category = category; // regroupement navigable du registre (?cat=)
      add(entry(slug, type, frName, `${noun}${who}.`, rarity, purge(attrs), refImg(slug)));
      for (const o of owners) relations.push([o, relation, slug]);
      n++;
    }
    console.log(`✓ import de masse ${type} (${noun.split(' de')[0].toLowerCase()}) : +${n} (${map.size} uniques)`);
    return n;
  }

  // Natures de chakra → POUVOIR (avant les jutsu, pour réserver les slugs élémentaires).
  const NATURE_FR = {
    'Fire Release': 'Libération du Feu (Katon)', 'Water Release': "Libération de l'Eau (Suiton)",
    'Earth Release': 'Libération de la Terre (Doton)', 'Wind Release': 'Libération du Vent (Fūton)',
    'Lightning Release': 'Libération de la Foudre (Raiton)', 'Yin Release': 'Libération du Yin',
    'Yang Release': 'Libération du Yang', 'Yin–Yang Release': 'Libération du Yin-Yang',
    'Wood Release': 'Libération du Bois (Mokuton)', 'Lava Release': 'Libération de la Lave (Yōton)',
    'Ice Release': 'Libération de la Glace (Hyōton)', 'Magnet Release': 'Libération du Magnétisme (Jiton)',
    'Boil Release': "Libération de l'Ébullition (Futton)", 'Storm Release': 'Libération de la Tempête (Ranton)',
    'Scorch Release': 'Libération de la Calcination (Shakuton)', 'Dust Release': 'Libération de la Poussière (Jinton)',
    'Explosion Release': "Libération de l'Explosion (Bakuton)", 'Steel Release': "Libération de l'Acier (Kōton)",
    'Crystal Release': 'Libération du Cristal (Shōton)', 'Dark Release': "Libération des Ténèbres (Meiton)",
  };
  massField({ getter: (c) => c.natureType, type: 'power', relation: 'maitrise', noun: 'Nature de chakra de l\'univers Naruto', link: 'maîtrisée par', frMap: NATURE_FR, catKey: 'element', cat: 'Nature de chakra', category: 'Nature de chakra', epicAt: 40 });

  // Jutsu → POUVOIR (le gros lot : ~1400 techniques). Noms canon conservés (romaji/EN) faute de FR.
  const jutsuCat = (n) => {
    if (/Release/.test(n)) return 'Ninjutsu élémentaire';
    if (/Seal(ing)?|Fūin/.test(n)) return 'Fūinjutsu';
    if (/Summoning|Kuchiyose/.test(n)) return 'Invocation';
    if (/Genjutsu|Illusion/.test(n)) return 'Genjutsu';
    if (/Sage|Senjutsu|Sennin/.test(n)) return 'Senjutsu';
    if (/Fist|Gate|Taijutsu|Kick|Punch/.test(n)) return 'Taijutsu';
    if (/Medical|Healing|Palm/.test(n)) return 'Ninjutsu médical';
    return 'Ninjutsu';
  };
  const JUTSU_ICONIC = { 'Shadow Clone Technique': 'epic', 'Tailed Beast Ball': 'epic', 'Flying Thunder God Technique': 'epic', 'Eight Gates': 'epic', 'Summoning Technique': 'rare', 'Mystical Palm Technique': 'rare' };
  massField({ getter: (c) => c.jutsu, type: 'power', relation: 'maitrise', noun: 'Technique de l\'univers Naruto', link: 'maîtrisée par', iconic: JUTSU_ICONIC, catKey: 'element', catFn: jutsuCat, category: 'Jutsu', epicAt: 15 });

  // Kekkei genkai → COMPÉTENCE (dōjutsu & lignées ; ceux déjà pris en power/curé reçoivent juste les relations).
  massField({ getter: (c) => c.personal?.kekkeiGenkai, type: 'skill', relation: 'maitrise', noun: 'Aptitude héréditaire (kekkei genkai) de l\'univers Naruto', link: 'portée par', catKey: 'discipline', cat: 'Kekkei genkai', category: 'Kekkei genkai', epicAt: 8 });

  // Classifications → STATUT (Jinchūriki, Sannin, Sage, Missing-nin…).
  const CLASS_FR = { 'Missing-nin': 'Ninja déserteur (Missing-nin)', 'Medical-nin': 'Ninja médical', 'Sensor Type': 'Type sensoriel', 'Jinchūriki': 'Jinchūriki', 'Sage': 'Ermite (Sage)', 'Sannin': 'Sannin légendaire', 'Mercenary Ninja': 'Ninja mercenaire', 'Summon': 'Créature invoquée', 'Daimyō': 'Daimyō (seigneur)' };
  massField({ getter: (c) => c.personal?.classification, type: 'status', relation: 'appartient', noun: 'Statut de l\'univers Naruto', link: 'incarné par', frMap: CLASS_FR, catKey: 'scope', cat: 'Classification', category: 'Classification', epicAt: 20 });

  // Équipes / organisations → STATUT (Akatsuki, Épéistes de la Brume, Konoha 11…).
  const TEAM_FR = { 'Seven Ninja Swordsmen of the Mist': 'Sept Épéistes de la Brume', 'Konoha Military Police Force': 'Police militaire de Konoha', 'Allied Shinobi Forces': 'Force Shinobi Alliée', 'Medic Corps': 'Corps médical', 'Twelve Guardian Ninja': 'Douze Ninjas Gardiens' };
  massField({ getter: (c) => c.personal?.team, type: 'status', relation: 'appartient', noun: 'Groupe de l\'univers Naruto', link: 'réunit', frMap: TEAM_FR, catKey: 'scope', cat: 'Organisation', category: 'Organisation', minCount: 2, epicAt: 8 });

  // Occupations → MÉTIER (filtré ≥2 titulaires pour couper le bruit des rôles uniques).
  const OCC_FR = { 'Village Head': 'Chef de village', 'Academy Teacher': "Professeur de l'Académie", 'Chūnin Exams Proctor': "Examinateur de l'examen chūnin", 'Scientist': 'Scientifique', 'Thief': 'Voleur', 'Mercenary': 'Mercenaire', 'Merchant': 'Marchand', 'Blacksmith': 'Forgeron', 'Bounty Hunter': 'Chasseur de primes' };
  massField({ getter: (c) => c.personal?.occupation, type: 'profession', relation: 'exerce', noun: 'Métier de l\'univers Naruto', link: 'exercé par', frMap: OCC_FR, catKey: 'sector', cat: 'Métier ninja', category: 'Métier', minCount: 2, epicAt: 8 });

  // Affiliations → ORGANISATION. ⚠ C'est ICI que vit l'Akatsuki (jamais dans `team` : 47 membres via
  // affiliation) + Racine, Taka, etc. On exclut les villages (déjà des lieux, relation habite) et les
  // pays (« Land of … », hors périmètre) pour ne créer que les organisations manquantes.
  const AFF_FR = { 'Akatsuki': 'Akatsuki', 'Root': 'Racine (Anbu)', 'Allied Shinobi Forces': 'Force Shinobi Alliée', 'Mount Myōboku': 'Mont Myōboku', 'Ryūchi Cave': 'Caverne Ryūchi', 'Shikkotsu Forest': 'Forêt Shikkotsu' };
  const AFF_ICONIC = { 'Akatsuki': 'legendary', 'Root': 'epic', 'Allied Shinobi Forces': 'epic' };
  massField({
    getter: (c) => arr(c.personal?.affiliation).map((x) => cleanNote(String(x))).filter((x) => !Object.keys(VILLAGE_SLUGS).some((v) => x.includes(v)) && !/^Land of|^Konoha$/i.test(x)),
    type: 'status', relation: 'appartient', noun: 'Organisation de l\'univers Naruto', link: 'réunit',
    frMap: AFF_FR, iconic: AFF_ICONIC, catKey: 'scope', cat: 'Organisation', category: 'Organisation', minCount: 3, epicAt: 15,
  });

  // ── Catégorie normalisée pour les entités CURÉES (carte slug→catégorie + fallback par type) ──
  const CATEGORY_BY_SLUG = {
    sharingan: 'Dōjutsu', byakugan: 'Dōjutsu', rinnegan: 'Dōjutsu',
    uchiha: 'Clan', senju: 'Clan', uzumaki: 'Clan', hyuga: 'Clan', nara: 'Clan',
    hokage: 'Titre & rang', kage: 'Titre & rang', sannin: 'Titre & rang', jinchuriki: 'Classification',
    shinobi: 'Métier', 'ninja-medical': 'Métier',
    kusanagi: 'Arme & outil', gunbai: 'Arme & outil', samehada: 'Arme & outil',
    konohagakure: 'Village', sunagakure: 'Village', kirigakure: 'Village', iwagakure: 'Village', kumogakure: 'Village', amegakure: 'Village', otogakure: 'Village',
  };
  for (const e of entries) {
    if (e.attributes.category) continue;
    if (CATEGORY_BY_SLUG[e.slug]) { e.attributes.category = CATEGORY_BY_SLUG[e.slug]; continue; }
    if (e.type === 'power') e.attributes.category = 'Jutsu';
    else if (e.type === 'skill') e.attributes.category = 'Aptitude';
    else if (e.type === 'artifact') e.attributes.category = 'Arme & outil';
    else if (e.type === 'profession') e.attributes.category = 'Métier';
    else if (e.type === 'status') e.attributes.category = String(e.attributes.scope || '').includes('Clan') ? 'Clan' : 'Statut';
    else if (e.type === 'place') e.attributes.category = 'Lieu';
    // characters : pas de catégorie (le regroupement passe déjà par village / clan / rôle).
  }

  // ── Popularité Naruto (favorites MAL via Jikan) → rareté = palier de popularité (comme les autres univers) ──
  // L'API Dattebayo n'a pas de favorites → on croise les casts Naruto/Shippuden/Boruto de Jikan par tokens.
  const JIKAN = 'https://api.jikan.moe/v4';
  const jget = async (url) => { try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; } };
  const favTier = (v) => (v >= 25000 ? 'legendary' : v >= 5000 ? 'epic' : v >= 600 ? 'rare' : 'common');
  const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };
  const rarityMax = (x, y) => (RANK[y] > (RANK[x] ?? 0) ? y : x);
  const favMap = new Map();
  for (const id of [20, 1735, 34566]) { // Naruto, Shippuden, Boruto
    const j = await jget(`${JIKAN}/anime/${id}/characters`);
    for (const cc of j?.data ?? []) { const nm = cc.character?.name; const fv = typeof cc.favorites === 'number' ? cc.favorites : 0; if (nm) favMap.set(nm, Math.max(favMap.get(nm) || 0, fv)); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const tokset = (s) => new Set(slugify(s).split('-').filter((t) => t.length >= 3));
  const favIndex = [...favMap.entries()].map(([nm, fv]) => ({ toks: tokset(nm), fv }));
  const matchFav = (name) => {
    const want = tokset(name); if (!want.size) return 0;
    let best = 0, bestHit = 0;
    for (const cand of favIndex) { let hit = 0; for (const t of want) if (cand.toks.has(t)) hit++; if (hit > bestHit && hit >= Math.min(2, want.size)) { bestHit = hit; best = cand.fv; } }
    return best;
  };
  let popN = 0;
  for (const e of entries) {
    if (e.type !== 'character') continue;
    const fv = matchFav(e.name);
    if (fv > 0) { e.attributes.favorites = fv; popN++; }
    e.rarity = rarityMax(e.rarity, favTier(fv)); // masse → palier popularité ; curé → boosté si plus haut
  }
  console.log(`✓ popularité Naruto : ${popN}/${entries.filter((e) => e.type === 'character').length} persos notés (favorites MAL)`);

  // ── Enrichissement ANILIST : favoris manquants + descriptions BRUTES (descRaw, anglais) ──
  // descRaw stockée pour enrichissement + traduction FR future (jamais affichée telle quelle).
  const { fetchAniListChars, anilistIndex } = await import('./lib/anilist.mjs');
  let aniN = 0, aniD = 0;
  const aniChars = [];
  for (const id of [20, 1735, 34566]) { const c = await fetchAniListChars(id, 10); aniChars.push(...c); }
  if (aniChars.length) {
    const aniLookup = anilistIndex(aniChars);
    for (const e of entries) {
      if (e.type !== 'character') continue;
      const hit = aniLookup(e.name);
      if (!hit) continue;
      if ((!e.attributes.favorites || e.attributes.favorites === 0) && hit.fav > 0) { e.attributes.favorites = hit.fav; e.rarity = rarityMax(e.rarity, favTier(hit.fav)); aniN++; }
      if (!e.attributes.descRaw && hit.descRaw) { e.attributes.descRaw = hit.descRaw; e.attributes.descLang = 'en'; aniD++; }
    }
  }
  console.log(`✓ AniList Naruto : +${aniN} favoris, +${aniD} descriptions brutes (${aniChars.length} persos AniList)`);

  // ── GÉNÉRATIONS (axe taxonomique du hub /learn/akasha/u/naruto) — curation par nom ──
  const GENERATIONS = [
    [['Hashirama Senju', 'Tobirama Senju', 'Madara Uchiha', 'Mito Uzumaki', 'Izuna Uchiha', 'Tōka Senju'], 'Fondateurs'],
    [['Jiraiya', 'Tsunade', 'Orochimaru'], 'Sannin'],
    [['Kakashi Hatake', 'Obito Uchiha', 'Rin Nohara', 'Might Guy', 'Asuma Sarutobi', 'Kurenai Yūhi', 'Anko Mitarashi', 'Yamato', 'Minato Namikaze', 'Kushina Uzumaki', 'Itachi Uchiha', 'Shisui Uchiha'], 'Génération de Kakashi'],
    [['Naruto Uzumaki', 'Sasuke Uchiha', 'Sakura Haruno', 'Sai', 'Shikamaru Nara', 'Ino Yamanaka', 'Chōji Akimichi', 'Kiba Inuzuka', 'Shino Aburame', 'Hinata Hyūga', 'Neji Hyūga', 'Rock Lee', 'Tenten', 'Gaara', 'Temari', 'Kankurō'], 'Konoha 11'],
    [['Boruto Uzumaki', 'Sarada Uchiha', 'Mitsuki', 'Himawari Uzumaki', 'Kawaki', 'Shikadai Nara', 'Inojin Yamanaka', 'Chōchō Akimichi', 'Metal Lee', 'Mirai Sarutobi', 'Iwabee Yuino', 'Denki Kaminarimon'], 'Nouvelle ère'],
  ];
  const normGen = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let genN = 0;
  for (const e of entries) {
    if (e.type !== 'character' || e.attributes.generation) continue;
    const en = normGen(e.name);
    const hit = GENERATIONS.find(([names]) => names.some((n) => normGen(n) === en));
    if (hit) { e.attributes.generation = hit[1]; genN++; }
  }
  console.log(`✓ générations Naruto : ${genN} persos rattachés`);

  // Validation : ne garder que les relations dont les 2 extrémités existent.
  const clean = relations.filter(([f, , t]) => {
    const ok = slugs.has(f) && slugs.has(t) && f !== t;
    if (!ok) console.warn(`  ⚠ relation ignorée: ${f} → ${t}`);
    return ok;
  }).map(([from, relation, to]) => ({ from, relation, to }));

  // Dédoublonnage des relations (from|rel|to)
  const seen = new Set();
  const dedup = clean.filter((r) => {
    const k = `${r.from}|${r.relation}|${r.to}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Liens famille → slug si le membre est dans le registre.
  for (const e of entries) {
    const fam = e.attributes?.family;
    if (Array.isArray(fam)) for (const f of fam) { const s = slugify(f.name); if (slugs.has(s)) f.slug = s; }
  }

  // ── DÉDUP : fusion des doublons de personnages Naruto (clé canonique romanisation-insensible) ──
  // Slugs curés (config CHARACTERS) toujours gardés comme keeper.
  const { dedupeChars } = await import('./lib/dedup.mjs');
  const curatedNaruto = new Set(CHARACTERS.map((c) => c.slug || slugify(c.key)));
  const ddN = dedupeChars(entries, dedup, [], curatedNaruto);
  console.log(`✓ dédup Naruto : ${ddN.merges.length} doublons fusionnés → ${ddN.entries.length} entrées`);
  writeFileSync(join(ROOT, 'data', 'akasha-merges-naruto.json'), JSON.stringify(ddN.merges, null, 1));

  mkdirSync(join(ROOT, 'data'), { recursive: true });
  const out = { generatedFrom: 'dattebayo-api', universe: 'Naruto', entries: ddN.entries, relations: ddN.relations };
  writeFileSync(join(ROOT, 'data', 'akasha-naruto.json'), JSON.stringify(out, null, 2));
  console.log(`✓ ${ddN.entries.length} entrées, ${ddN.relations.length} relations → data/akasha-naruto.json`);
  const byType = {};
  for (const e of ddN.entries) byType[e.type] = (byType[e.type] || 0) + 1;
  console.log('  par type:', JSON.stringify(byType));
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
