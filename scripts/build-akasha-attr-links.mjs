// scripts/build-akasha-attr-links.mjs — LIENS fabriqués à partir de ce que la base sait DÉJÀ.
// Audit du 01/08 : 5 678 entrées (74 %) n'ont aucune relation sortante, alors que leurs attributs
// désignent souvent une AUTRE entrée existante (category='Fruit du Démon', region='Univers 7',
// family=[{rel,name,slug}]…). Aucun réseau, aucun modèle : on relit la base et on émet les arêtes.
// Sortie : data/akasha-attr-links.json { relations } → seed-akasha-relations.ts (n'écrit RIEN en base).
//   node --env-file=.env.local scripts/build-akasha-attr-links.mjs
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// Le seeder valide les slugs (zod /^[a-z0-9-]+$/) et JETTE sur le premier invalide : une entrée au
// slug exotique ferait échouer TOUT le fichier, pas seulement sa ligne. On filtre donc en amont.
const slugSeedable = (s) => /^[a-z0-9-]+$/.test(s ?? '');

/**
 * Supabase plafonne toute réponse à 1 000 lignes, SANS erreur ni avertissement.
 * Leçon du 01/08 : un scan non paginé « trouvait » 3 anomalies sur 69 et paraissait crédible.
 */
async function paginer(table, colonnes) {
  const lignes = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await sb.from(table).select(colonnes).range(debut, debut + 999);
    if (error) { console.error(`✗ ${table}: ${error.message}`); process.exit(1); }
    lignes.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`  ${table} : ${lignes.length} lignes scannées`);
  return lignes;
}

/* ─────────────────────────────────────────────────────────────────────────────
   AXES → NATURE. Un commentaire par axe : POURQUOI cette nature et pas une autre.
   Le vocabulaire déjà en base (mesuré) est maitrise 5018 · appartient 1900 · habite 801 ·
   possede 730 · exerce 404 · allie 44 · rival 34 ; on s'y tient partout où il dit vrai.
   `cible` = type attendu de la cible, sert UNIQUEMENT à départager les homonymes ;
   'source' signifie « du même type que l'entrée de départ ».
   ───────────────────────────────────────────────────────────────────────────── */
const AXES = {
  // 'category' est un nœud de TAXONOMIE, pas une étiquette : « Fruit du Démon », « Stand »,
  // « Haki » existent comme entrées à part entière. Gomu Gomu no Mi appartient à la famille
  // des Fruits du Démon — même sens que le `skill --appartient--> status` déjà en base.
  // Une taxonomie est toujours du type de ce qu'elle classe (un fruit est un power, comme
  // le nœud « Fruit du Démon ») : c'est ce qui départage Senbonzakura(power/artifact).
  category: { nature: 'appartient', cible: 'source' },
  // Idem : chez JoJo l'axe 'element' redit la famille (« Stand »). Doublon assumé avec
  // 'category' pour les mêmes fiches — la déduplication l'absorbe, on ne perd rien.
  element: { nature: 'appartient', cible: 'source' },
  // Contenance géographique : Namek est DANS l'Univers 7, Alabasta DANS East Blue.
  // Surtout pas 'habite', réservé en base au personnage qui réside quelque part.
  region: { nature: 'appartient', cible: 'place' },
  // Espèce : le personnage appartient aux Saiyans / Shinigami. Précédent en base :
  // `character --appartient--> profession` (Kabuto → Ninja médical).
  race: { nature: 'appartient', cible: null },
  // Camp / faction Death Note (Groupe Yotsuba, Wammy's House) : appartenance à un groupe,
  // exactement le sens des 1 778 `character --appartient--> status` existants.
  camp: { nature: 'appartient', cible: null },
  // Piège de nommage : chez Bleach l'axe 'material' ne contient pas une matière mais la
  // FAMILLE de l'arme (« Zanpakutō », qui est lui-même une entrée artifact). D'où 'appartient'
  // et non 'possede' — l'épée ne possède rien, elle EST un Zanpakutō.
  material: { nature: 'appartient', cible: 'source' },
  // École de pouvoir (Kidō, Haki) : la technique relève de la discipline. 'maitrise' dirait
  // l'inverse (c'est le personnage qui maîtrise), 'exerce' est réservé aux professions.
  discipline: { nature: 'appartient', cible: 'source' },
  // ── Quatre axes hors palette, assumés (voir le rapport) ──
  // Univers jumelés de Dragon Ball (6↔7, 2↔11 : la somme fait toujours 13). Ni contenance,
  // ni possession, ni maîtrise : aucune nature existante ne dit ça sans mentir. Relation
  // symétrique, émise des deux côtés puisque les 12 univers sont tous orphelins.
  twin: { nature: 'jumeau', cible: 'place' },
  // Dieu de la Destruction / Ange / Kaiōshin d'un univers. Les aplatir en 'possede' donnerait
  // « l'Univers 7 possède Beerus, Whis et Shin » — faux (un univers ne possède personne) et
  // surtout indistinguable : on perdrait la seule information que l'axe porte, le RÔLE.
  // La colonne relation est en texte libre et relationLabel() retombe sur la chaîne brute
  // (« dieu destruction »), donc l'UI encaisse sans modification.
  god: { nature: 'dieu_destruction', cible: 'character' },
  angel: { nature: 'ange', cible: 'character' },
  kai: { nature: 'kaio_shin', cible: 'character' },
};

async function main() {
  console.log('→ lecture de la base (paginée)…');
  const entrees = await paginer('akasha_entries', 'id, slug, name, type, universe, attributes');
  const relations = await paginer('akasha_relations', 'from_entry, relation, to_entry');

  const avecSortante = new Set(relations.map((r) => r.from_entry));
  const orphelines = entrees.filter((e) => !avecSortante.has(e.id));
  console.log(`\n${orphelines.length} entrées sans relation sortante (sur ${entrees.length})`);

  /* Index de résolution PAR UNIVERS : deux univers ont des homonymes (Shinigami existe chez
     Bleach ET chez Death Note), résoudre à plat créerait des arêtes inter-univers absurdes.
     Trois passes de priorité décroissante — le nom exact prime sur le roman_name, qui prime sur
     le slug. À l'intérieur d'une passe, plusieurs entrées peuvent revendiquer la même clé : on
     les GARDE toutes en candidates, on ne tranche qu'au moment de résoudre, avec le type attendu.
     Résidus de dédup bien réels dans la base : « East Blue » existe en place ET en status,
     « Senbonzakura » en power ET en artifact. */
  const index = new Map();
  const cleParPasse = (e, passe) =>
    passe === 0 ? e.name : passe === 1 ? e.attributes?.roman_name : e.slug;
  for (let passe = 0; passe < 3; passe++) {
    for (const e of entrees) {
      const brut = cleParPasse(e, passe);
      const cle = brut ? norm(brut) : '';
      if (!cle) continue;
      if (!index.has(e.universe)) index.set(e.universe, new Map());
      const parUnivers = index.get(e.universe);
      const dejaLa = parUnivers.get(cle);
      if (!dejaLa) { parUnivers.set(cle, { passe, candidats: [e] }); continue; }
      if (dejaLa.passe !== passe) continue;           // la passe la plus forte garde la main
      if (!dejaLa.candidats.some((c) => c.id === e.id)) dejaLa.candidats.push(e);
    }
  }

  let ambiguitesIrreductibles = 0;
  const litiges = new Map();
  /**
   * Résout une valeur d'attribut vers une entrée du MÊME univers.
   * `typeAttendu` départage les homonymes : ce n'est pas un tirage au sort mais une contrainte
   * portée par l'axe lui-même (un `region` désigne forcément un lieu, un `god` un personnage,
   * une taxonomie la même espèce d'entrée que sa source). Si le doute subsiste, on renonce.
   */
  const resoudre = (univers, valeur, typeAttendu) => {
    if (typeof valeur !== 'string' || !valeur.trim()) return null;
    const cle = norm(valeur);
    const trouve = index.get(univers)?.get(cle);
    if (!trouve) return null;
    if (trouve.candidats.length === 1) return trouve.candidats[0];
    const filtres = typeAttendu ? trouve.candidats.filter((c) => c.type === typeAttendu) : [];
    if (filtres.length === 1) return filtres[0];
    ambiguitesIrreductibles++;
    litiges.set(`${univers} · ${valeur}`, trouve.candidats.map((c) => `${c.name}(${c.type})`).join(' vs '));
    return null;
  };

  const sortie = [];
  const vues = new Set();
  const parNature = new Map(), parUnivers = new Map(), parAxe = new Map();
  const traitees = new Set();
  let rejetsReflexifs = 0, rejetsSlug = 0, doublons = 0;
  const nonResolus = new Map();

  const emettre = (source, cible, nature, axe) => {
    if (!cible) return false;
    if (source.id === cible.id) { rejetsReflexifs++; return false; }   // « X appartient à X » : bruit pur
    if (!slugSeedable(source.slug) || !slugSeedable(cible.slug)) { rejetsSlug++; return false; }
    const cle = `${source.slug}|${nature}|${cible.slug}`;
    if (vues.has(cle)) { doublons++; return false; }
    vues.add(cle);
    sortie.push({ from: source.slug, to: cible.slug, relation: nature });
    parNature.set(nature, (parNature.get(nature) ?? 0) + 1);
    parUnivers.set(source.universe, (parUnivers.get(source.universe) ?? 0) + 1);
    parAxe.set(axe, (parAxe.get(axe) ?? 0) + 1);
    traitees.add(source.id);
    return true;
  };

  const exemples = [];
  for (const e of orphelines) {
    const attrs = e.attributes ?? {};

    // family[] : {rel:'father', name:'Michiru Tsuki', slug:'michiru-tsuki'} — le slug est fourni
    // par la source Naruto, mais il peut pointer sur une fiche jamais créée : on le résout comme
    // n'importe quelle valeur, contre l'index de l'univers, et on ignore ce qui ne tombe pas.
    // Le lien PRÉCIS (père, fils, frère…) reste dans attributes.family ; une seule nature ici,
    // 'famille', pour ne pas ouvrir 20 natures sur 65 arêtes.
    if (Array.isArray(attrs.family)) {
      for (const membre of attrs.family) {
        const cible = resoudre(e.universe, membre?.slug, 'character')
          ?? resoudre(e.universe, membre?.name, 'character');
        if (!cible) { nonResolus.set('family', (nonResolus.get('family') ?? 0) + 1); continue; }
        if (emettre(e, cible, 'famille', 'family') && exemples.length < 40)
          exemples.push(`${e.name} → famille (${membre?.rel ?? '?'}) → ${cible.name}  [${e.universe}]`);
      }
    }

    for (const [axe, { nature, cible: typeCible }] of Object.entries(AXES)) {
      const valeur = attrs[axe];
      // 'inconnu' est la réponse standard des agents quand la source ne dit rien (cf. akasha-axes.mjs).
      if (typeof valeur !== 'string' || valeur === 'inconnu') continue;
      const cible = resoudre(e.universe, valeur, typeCible === 'source' ? e.type : typeCible);
      if (!cible) { nonResolus.set(axe, (nonResolus.get(axe) ?? 0) + 1); continue; }
      if (emettre(e, cible, nature, axe) && exemples.length < 40)
        exemples.push(`${e.name} → ${nature} → ${cible.name}  [${e.universe} · ${axe}]`);
    }
  }

  const tri = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\n=== LIENS DEPUIS LES ATTRIBUTS ===`);
  console.log(`Entrées traitées (au moins 1 arête) : ${traitees.size}`);
  console.log(`Relations émises                    : ${sortie.length}`);
  console.log(`\nPar nature :`);
  for (const [n, c] of tri(parNature)) console.log(`  ${n.padEnd(18)} ${c}`);
  console.log(`Par univers :`);
  for (const [u, c] of tri(parUnivers)) console.log(`  ${String(u).padEnd(28)} ${c}`);
  console.log(`Par axe :`);
  for (const [a, c] of tri(parAxe)) console.log(`  ${a.padEnd(18)} ${c}`);
  console.log(`\nÉcartés : ${rejetsReflexifs} réflexifs · ${doublons} doublons · ${rejetsSlug} slugs non seedables`);
  console.log(`Valeurs non résolues (ignorées, aucun nœud inventé) : ${tri(nonResolus).map(([a, c]) => `${a}=${c}`).join(' · ')}`);
  if (ambiguitesIrreductibles) {
    console.log(`⚠ ${ambiguitesIrreductibles} valeurs abandonnées : homonymes que le type attendu ne départage pas`);
    for (const [v, qui] of [...litiges].slice(0, 6)) console.log(`    ${v} → ${qui}`);
  }

  console.log(`\n10 exemples :`);
  for (const x of exemples.slice(0, 10)) console.log(`  · ${x}`);

  writeFileSync('data/akasha-attr-links.json', JSON.stringify({ relations: sortie }, null, 1));
  console.log(`\n✓ écrit data/akasha-attr-links.json (${sortie.length} relations)`);
}
main().catch((e) => { console.error('✗ build-akasha-attr-links:', e); process.exit(1); });
