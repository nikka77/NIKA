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
    role: 'Dernier vengeur Uchiha', kg: ['Sharingan', 'Rinnegan'], summary: "Prodige du clan Uchiha, rival éternel de Naruto, hanté par la vengeance avant la rédemption." },
  { key: 'Sakura Haruno', village: 'konohagakure', powers: [], medical: true, rarity: 'rare',
    role: 'Kunoichi médicale', summary: "Kunoichi de l'équipe 7, ninja médicale d'élite à la force colossale, élève de Tsunade." },
  { key: 'Kakashi Hatake', village: 'konohagakure', clan: 'hatake', ranks: ['hokage'], powers: ['chidori'], skills: ['sharingan'], rarity: 'epic',
    role: 'Ninja copieur, Hokage', summary: "Le « ninja copieur » au Sharingan, mentor de l'équipe 7 puis Sixième Hokage." },
  { key: 'Itachi Uchiha', village: 'konohagakure', clan: 'uchiha', powers: ['amaterasu', 'susanoo'], skills: ['sharingan'], rarity: 'epic',
    role: 'Anbu, membre de l’Akatsuki', kg: ['Sharingan'], summary: "Génie Uchiha qui sacrifia tout — y compris sa réputation — pour protéger Konoha." },
  { key: 'Madara Uchiha', village: 'konohagakure', clan: 'uchiha', powers: ['susanoo', 'wood-release'], skills: ['sharingan', 'rinnegan'], artifacts: ['gunbai'], rarity: 'legendary',
    role: 'Cofondateur de Konoha', kg: ['Sharingan', 'Rinnegan', 'Mokuton (Bois)'], summary: "Légende Uchiha et cofondateur de Konoha, devenu l'un de ses plus grands ennemis." },
  { key: 'Hashirama Senju', village: 'konohagakure', clan: 'senju', ranks: ['hokage'], powers: ['wood-release'], rarity: 'legendary',
    role: 'Premier Hokage', kg: ['Mokuton (Bois)'], summary: "Le « Dieu des shinobi », Premier Hokage et maître unique du Mokuton (libération du bois)." },
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
  { key: 'Kurama', slug: 'kurama', rarity: 'legendary', summary: "Le Démon-renard à Neuf Queues, le plus puissant des Bijū, scellé en Naruto." },
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
        idle: IDLE_SLUG[f.label] ? `/images/akasha/naruto/idle/${IDLE_SLUG[f.label]}.webp` : undefined,
        stats: NARUTO_STATS[f.label],
      })).filter((f) => f.url),
      animations: c.anims || [],
    });
    add(entry(slug, 'character', c.key, c.summary, c.rarity, attributes, attributes.gallery?.[0] || null, c.summary));

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
      role: 'Bête à queues (Bijū)', race: 'Bijū',
      classification: arr(p.classification).map(cleanNote),
      natureType: arr(api?.natureType).map(cleanNote),
      jutsu: arr(api?.jutsu).map(cleanNote).slice(0, JUTSU_CAP),
      gallery: arr(api?.images),
    });
    add(entry(b.slug, 'character', `${b.key} (Bijū)`, b.summary, b.rarity, attributes, attributes.gallery?.[0] || null));
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
    add(entry(slug, 'artifact', frName, summary, rarity, purge({ material: toolCategory(name), origin: 'Univers Naruto' }), refImg(slug)));
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
  function massField({ getter, type, relation, noun, link, frMap = {}, iconic = {}, catKey, catFn, cat, cap = 40, minCount = 1, epicAt = 10 }) {
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
  massField({ getter: (c) => c.natureType, type: 'power', relation: 'maitrise', noun: 'Nature de chakra de l\'univers Naruto', link: 'maîtrisée par', frMap: NATURE_FR, catKey: 'element', cat: 'Nature de chakra', epicAt: 40 });

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
  massField({ getter: (c) => c.jutsu, type: 'power', relation: 'maitrise', noun: 'Technique de l\'univers Naruto', link: 'maîtrisée par', iconic: JUTSU_ICONIC, catKey: 'element', catFn: jutsuCat, epicAt: 15 });

  // Kekkei genkai → COMPÉTENCE (dōjutsu & lignées ; ceux déjà pris en power/curé reçoivent juste les relations).
  massField({ getter: (c) => c.personal?.kekkeiGenkai, type: 'skill', relation: 'maitrise', noun: 'Aptitude héréditaire (kekkei genkai) de l\'univers Naruto', link: 'portée par', catKey: 'discipline', cat: 'Kekkei genkai', epicAt: 8 });

  // Classifications → STATUT (Jinchūriki, Sannin, Sage, Missing-nin…).
  const CLASS_FR = { 'Missing-nin': 'Ninja déserteur (Missing-nin)', 'Medical-nin': 'Ninja médical', 'Sensor Type': 'Type sensoriel', 'Jinchūriki': 'Jinchūriki', 'Sage': 'Ermite (Sage)', 'Sannin': 'Sannin légendaire', 'Mercenary Ninja': 'Ninja mercenaire', 'Summon': 'Créature invoquée', 'Daimyō': 'Daimyō (seigneur)' };
  massField({ getter: (c) => c.personal?.classification, type: 'status', relation: 'appartient', noun: 'Statut de l\'univers Naruto', link: 'incarné par', frMap: CLASS_FR, catKey: 'scope', cat: 'Classification', epicAt: 20 });

  // Équipes / organisations → STATUT (Akatsuki, Épéistes de la Brume, Konoha 11…).
  const TEAM_FR = { 'Seven Ninja Swordsmen of the Mist': 'Sept Épéistes de la Brume', 'Konoha Military Police Force': 'Police militaire de Konoha', 'Allied Shinobi Forces': 'Force Shinobi Alliée', 'Medic Corps': 'Corps médical', 'Twelve Guardian Ninja': 'Douze Ninjas Gardiens' };
  massField({ getter: (c) => c.personal?.team, type: 'status', relation: 'appartient', noun: 'Groupe de l\'univers Naruto', link: 'réunit', frMap: TEAM_FR, catKey: 'scope', cat: 'Organisation', minCount: 2, epicAt: 8 });

  // Occupations → MÉTIER (filtré ≥2 titulaires pour couper le bruit des rôles uniques).
  const OCC_FR = { 'Village Head': 'Chef de village', 'Academy Teacher': "Professeur de l'Académie", 'Chūnin Exams Proctor': "Examinateur de l'examen chūnin", 'Scientist': 'Scientifique', 'Thief': 'Voleur', 'Mercenary': 'Mercenaire', 'Merchant': 'Marchand', 'Blacksmith': 'Forgeron', 'Bounty Hunter': 'Chasseur de primes' };
  massField({ getter: (c) => c.personal?.occupation, type: 'profession', relation: 'exerce', noun: 'Métier de l\'univers Naruto', link: 'exercé par', frMap: OCC_FR, catKey: 'sector', cat: 'Métier ninja', minCount: 2, epicAt: 8 });

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

  mkdirSync(join(ROOT, 'data'), { recursive: true });
  const out = { generatedFrom: 'dattebayo-api', universe: 'Naruto', entries, relations: dedup };
  writeFileSync(join(ROOT, 'data', 'akasha-naruto.json'), JSON.stringify(out, null, 2));
  console.log(`✓ ${entries.length} entrées, ${dedup.length} relations → data/akasha-naruto.json`);
  const byType = {};
  for (const e of entries) byType[e.type] = (byType[e.type] || 0) + 1;
  console.log('  par type:', JSON.stringify(byType));
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
