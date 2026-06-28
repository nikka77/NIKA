// scripts/build-akasha-naruto.mjs — construit data/akasha-naruto.json pour le registre AKASHA.
// Source : Dattebayo API (faits + images). Les RÉSUMÉS sont rédigés ici (originaux, FR),
// jamais copiés de Narutopedia. Run : node scripts/build-akasha-naruto.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
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
    forms: [
      { label: 'Partie I', g: 0, caption: '12 ans · Genin · Pays des Vagues & Examens Chūnin' },
      { label: '1 Queue', img: '/images/akasha/naruto/naruto-1tail.webp', caption: '12 ans · Premier manteau de Kurama (déchaîné)' },
      { label: 'Mode Sage', img: '/images/akasha/naruto/naruto-sage.webp', caption: '16 ans · Ermite du mont Myōboku' },
      { label: 'Partie II', g: 1, caption: '16 ans · Guerre des ninjas' },
      { label: 'Mode Kurama', img: '/images/akasha/naruto/naruto-kurama.webp', caption: '17 ans · Manteau de chakra complet' },
      { label: 'Mode Baryon', img: '/images/akasha/naruto/naruto-baryon.webp', caption: 'Adulte · Forme ultime (Boruto)' },
    ],
    anims: [
      { label: 'Multiclonage', image: '/images/akasha/naruto/naruto-multiclonage.webp', anim: 'poof' },
      { label: 'Fūma Shuriken', image: '/images/akasha/naruto/fuma-shuriken.webp', anim: 'spin' },
    ] },
  { key: 'Sasuke Uchiha', village: 'konohagakure', clan: 'uchiha', powers: ['chidori', 'amaterasu', 'susanoo'], skills: ['sharingan', 'rinnegan'], artifacts: ['kusanagi'], rarity: 'legendary',
    role: 'Dernier vengeur Uchiha', summary: "Prodige du clan Uchiha, rival éternel de Naruto, hanté par la vengeance avant la rédemption." },
  { key: 'Sakura Haruno', village: 'konohagakure', powers: [], medical: true, rarity: 'rare',
    role: 'Kunoichi médicale', summary: "Kunoichi de l'équipe 7, ninja médicale d'élite à la force colossale, élève de Tsunade." },
  { key: 'Kakashi Hatake', village: 'konohagakure', clan: 'hatake', ranks: ['hokage'], powers: ['chidori'], skills: ['sharingan'], rarity: 'epic',
    role: 'Ninja copieur, Hokage', summary: "Le « ninja copieur » au Sharingan, mentor de l'équipe 7 puis Sixième Hokage." },
  { key: 'Itachi Uchiha', village: 'konohagakure', clan: 'uchiha', powers: ['amaterasu', 'susanoo'], skills: ['sharingan'], rarity: 'epic',
    role: 'Anbu, membre de l’Akatsuki', summary: "Génie Uchiha qui sacrifia tout — y compris sa réputation — pour protéger Konoha." },
  { key: 'Madara Uchiha', village: 'konohagakure', clan: 'uchiha', powers: ['susanoo', 'wood-release'], skills: ['sharingan', 'rinnegan'], artifacts: ['gunbai'], rarity: 'legendary',
    role: 'Cofondateur de Konoha', summary: "Légende Uchiha et cofondateur de Konoha, devenu l'un de ses plus grands ennemis." },
  { key: 'Hashirama Senju', village: 'konohagakure', clan: 'senju', ranks: ['hokage'], powers: ['wood-release'], rarity: 'legendary',
    role: 'Premier Hokage', summary: "Le « Dieu des shinobi », Premier Hokage et maître unique du Mokuton (libération du bois)." },
  { key: 'Minato Namikaze', village: 'konohagakure', ranks: ['hokage'], powers: ['rasengan', 'flying-raijin'], rarity: 'epic',
    role: 'Quatrième Hokage', summary: "L'« Éclair jaune de Konoha », Quatrième Hokage et père de Naruto, créateur du Rasengan." },
  { key: 'Jiraiya', village: 'konohagakure', ranks: ['sannin'], powers: ['rasengan'], rarity: 'epic',
    role: 'Sannin, ermite', summary: "L'un des trois légendaires Sannin, ermite des crapauds et maître de Naruto." },
  { key: 'Tsunade', village: 'konohagakure', clan: 'senju', ranks: ['hokage', 'sannin'], medical: true, rarity: 'epic',
    role: 'Cinquième Hokage', summary: "Sannin et Cinquième Hokage, la plus grande ninja médicale du monde shinobi." },
  { key: 'Orochimaru', village: 'konohagakure', ranks: ['sannin'], powers: ['edo-tensei'], artifacts: ['kusanagi'], rarity: 'epic',
    role: 'Sannin renégat', summary: "Sannin obsédé par l'immortalité et le savoir interdit, créateur d'Otogakure." },
  { key: 'Gaara', village: 'sunagakure', ranks: ['jinchuriki'], beast: 'shukaku', rarity: 'epic',
    role: 'Cinquième Kazekage', summary: "Ancien Jinchūriki de Shukaku devenu Cinquième Kazekage et symbole de rédemption." },
  { key: 'Rock Lee', village: 'konohagakure', rarity: 'rare',
    role: 'Spécialiste du taijutsu', summary: "Ninja incapable de ninjutsu qui compense par une maîtrise absolue du combat physique." },
  { key: 'Neji Hyūga', village: 'konohagakure', clan: 'hyuga', skills: ['byakugan'], rarity: 'rare',
    role: 'Prodige Hyūga', summary: "Génie de la branche secondaire du clan Hyūga, maître du Poing Souple et du Byakugan." },
  { key: 'Hinata Hyūga', village: 'konohagakure', clan: 'hyuga', skills: ['byakugan'], rarity: 'rare',
    role: 'Héritière Hyūga', summary: "Héritière timide puis vaillante du clan Hyūga, future épouse de Naruto." },
  { key: 'Shikamaru Nara', village: 'konohagakure', clan: 'nara', rarity: 'rare',
    role: 'Stratège', summary: "Le plus brillant stratège de sa génération, manipulateur des ombres du clan Nara." },
  { key: 'Obito Uchiha', village: 'konohagakure', clan: 'uchiha', skills: ['sharingan'], rarity: 'epic',
    role: 'Membre masqué de l’Akatsuki', summary: "Camarade de Kakashi cru mort, devenu le marionnettiste masqué derrière la guerre." },
  { key: 'Nagato', village: 'amegakure', clan: 'uzumaki', skills: ['rinnegan'], rarity: 'epic',
    role: 'Chef de l’Akatsuki (Pain)', summary: "Porteur du Rinnegan et véritable « Pain », chef de l'Akatsuki en quête de paix par la douleur." },
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
  const add = (e) => { entries.push(e); slugs.add(e.slug); };

  // Entités rédigées
  for (const [slug, name, region, summary, rarity] of PLACES) add(entry(slug, 'place', name, summary, rarity, { region }));
  for (const [slug, name, element, summary, rarity] of POWERS) add(entry(slug, 'power', name, summary, rarity, { element }));
  for (const [slug, name, discipline, summary, rarity] of SKILLS) add(entry(slug, 'skill', name, summary, rarity, { discipline }));
  for (const [slug, name, material, summary, rarity] of ARTIFACTS) add(entry(slug, 'artifact', name, summary, rarity, { material }));
  for (const [slug, name, sector, summary, rarity] of PROFESSIONS) add(entry(slug, 'profession', name, summary, rarity, { sector }));
  for (const [slug, name, scope, summary, rarity] of STATUSES) add(entry(slug, 'status', name, summary, rarity, { scope }));

  // Helpers attributs riches
  const arr = (x) => (Array.isArray(x) ? x.filter(Boolean) : x ? [x] : []);
  const firstVal = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.values(x)[0] : x) || null;
  const cleanNote = (s) => String(s).replace(/\s*\((?:Affinity|Anime only|Manga only|Movie only|Game only|Novel only|Anime|Manga)\)/gi, '').trim();
  const RANK_ORDER = ['Academy Student', 'Genin', 'Chūnin', 'Jōnin', 'Anbu', 'Sannin', 'Kage'];
  const pickRank = (rank) => {
    const nr = rank?.ninjaRank;
    const vals = nr ? (typeof nr === 'object' ? Object.values(nr) : [nr]) : [];
    let best = null, bi = -1;
    for (const v of vals) { const i = RANK_ORDER.indexOf(cleanNote(v)); if (i > bi) { bi = i; best = cleanNote(v); } }
    return best || (vals[0] ? cleanNote(vals[0]) : null);
  };
  const purge = (o) => { for (const k of Object.keys(o)) { const v = o[k]; if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) delete o[k]; } return o; };

  // Personnages — attributs riches (stat-block « carte »)
  for (const c of CHARACTERS) {
    const api = byName.get(c.key);
    if (!api) { console.warn('  ⚠ perso introuvable dans l\'API:', c.key); continue; }
    const slug = c.slug || slugify(c.key);
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
      birthdate: firstVal(p.birthdate),
      classification: arr(p.classification).map(cleanNote),
      titles: arr(p.titles).map(cleanNote),
      occupation: arr(p.occupation).map(cleanNote),
      kekkeiGenkai: arr(p.kekkeiGenkai).map(cleanNote),
      natureType: arr(api.natureType).map(cleanNote),
      tools: arr(api.tools).map(cleanNote).slice(0, 8),
      jutsu: arr(api.jutsu).map(cleanNote).slice(0, 12),
      signature: (c.powers || []).map((s) => POWERS.find((p) => p[0] === s)?.[1]).filter(Boolean),
      rank: pickRank(api.rank),
      affiliation: arr(p.affiliation),
      team: arr(p.team),
      debut: api.debut?.manga || null,
      family: api.family && typeof api.family === 'object' ? Object.entries(api.family).map(([rel, name]) => ({ rel, name: String(name) })) : [],
      gallery: arr(api.images),
      forms: (c.forms || []).map((f) => ({ label: f.label, url: f.g != null ? arr(api.images)[f.g] : f.img, caption: f.caption })).filter((f) => f.url),
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
      jutsu: arr(api?.jutsu).map(cleanNote).slice(0, 8),
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
