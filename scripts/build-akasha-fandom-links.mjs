// scripts/build-akasha-fandom-links.mjs — RELATIONS de masse depuis les INFOBOX Fandom (0 jeton d'IA).
// Cible les entrées SANS relation sortante (triées par favorites : le gain se voit d'abord sur les
// fiches que les visiteurs ouvrent), lit l'infobox de leur page canon et mappe ses champs vers nos
// sept natures (appartient / exerce / habite / famille / allie / rival / maitrise / possede).
// Sortie : data/akasha-fandom-links.json { relations:[{from,to,relation,…}] } → seed-akasha-relations.ts.
//   node --env-file=.env.local scripts/build-akasha-fandom-links.mjs --universe="Bleach" --limit=50
//   node --env-file=.env.local scripts/build-akasha-fandom-links.mjs            (tous les univers)
import { writeFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { WIKIS, wikiApi, sameEntityName, searchTitles, fandomSleep as dormir } from './lib/fandom.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const UNIVERS = arg('universe', null);
const LIMITE = Number(arg('limit', 0)) || Infinity;
const CONCURRENCE = Number(arg('concurrence', 3));
const SORTIE = arg('sortie', 'data/akasha-fandom-links.json');
const SANS_CACHE = process.argv.includes('--sans-cache');
const INVERSES_ACTIFS = process.argv.includes('--inverses');
const ECHANTILLON = Number(arg('echantillon', 0));

/* ═══════════════════ 1. Le graphe actuel (pagination obligatoire) ═══════════════════ */

// Supabase plafonne TOUTE réponse à 1 000 lignes, sans erreur ni avertissement : un scan non paginé
// de akasha_entries (7 691 lignes) rend un échantillon qui a l'air complet et ment (leçon du 01/08).
async function scanComplet(table, colonnes) {
  const tout = [];
  let pages = 0;
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await supabase.from(table).select(colonnes).range(debut, debut + 999);
    if (error) { console.error(`✗ ${table}:`, error.message); process.exit(1); }
    tout.push(...(data ?? []));
    pages++;
    if ((data?.length ?? 0) < 1000) break;
  }
  console.log(`  ${table} : ${tout.length} lignes en ${pages} pages`);
  return tout;
}

/* ═══════════════════ 2. Normalisation et résolution des cibles ═══════════════════ */

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const slugify = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Mêmes mots vides que sameEntityName côté lib : les deux garde-fous doivent voir le même nom.
const MOTS_VIDES = new Set(['the', 'of', 'de', 'du', 'la', 'le', 'les', 's', 'gou', 'san', 'kun']);
const motsSignifiants = (s) => norm(s).split(' ').filter((m) => m && !MOTS_VIDES.has(m));

// Squelette phonétique, copié de sameEntityName (lib/fandom.mjs) : il sert ici d'INDEX (comparer
// « Juushirou Ukitake » à 3 318 noms un par un ferait 140 millions d'appels sur Naruto seul).
// sameEntityName reste l'arbitre : l'index propose, la garde de la lib dispose.
const squelette = (m) => (m[0] + m.slice(1).replace(/[aeiouy]/g, ''))
  .replace(/h/g, '').replace(/r/g, 'l').replace(/v/g, 'w').replace(/[cq]/g, 'k').replace(/z/g, 's')
  .replace(/(.)\1+/g, '$1');
const signature = (mots) => mots.map(squelette).sort().join('|');

// Quand plusieurs entrées portent le même nom normalisé, la nature tranche. Sans cela, « Shikai :
// Katen Kyōkotsu » tombait au hasard sur l'un des trois homonymes en base (le power atk-bl-…, l'artefact
// katen-kyokotsu, le personnage katen-kyoukotsu) — l'ordre d'insertion décidait. L'ordre ci-dessous
// reprend les paires de types déjà majoritaires dans akasha_relations (maitrise: character→power ×4781,
// appartient: character→status ×1778, habite: →place ×798, possede: →artifact ×706, exerce: →profession ×387).
const TYPES_PREFERES = {
  maitrise: ['power', 'skill', 'artifact', 'status', 'character'],
  appartient: ['status', 'place', 'profession', 'character'],
  habite: ['place', 'status', 'character'],
  possede: ['artifact', 'power', 'character'],
  // Pas de personnage en cible d'`exerce` : « Occupation : Nnoitra Gilga » (un Fracción au service de
  // Nnoitra) donnerait « Tesla exerce Nnoitra », qui ne veut rien dire. `appartient` le tolère en
  // revanche — « Affiliation : Sōsuke Aizen » se lit bien « rattaché à Aizen » et c'est ce que dit le wiki.
  exerce: ['profession', 'status'],
  famille: ['character'], allie: ['character'], rival: ['character'],
  acteur: ['character'],                             // clé interne, réservée aux relations inversées
};

// Clés qui décrivent l'entrée de départ VUE PAR LES AUTRES : sur la page d'un jutsu, « Users » liste
// les personnages qui l'emploient. La relation part alors de l'utilisateur, pas de l'orpheline — donc
// elle ne la désorpheline pas, et elle recoupe en partie akasha-attacks-users.json. Hors du cahier des
// charges : sous --inverses uniquement, pour pouvoir chiffrer le gisement avant de décider.
const INVERSES = {
  user: 'maitrise', 'current user': 'maitrise', inventor: 'maitrise',
  member: 'appartient', 'known member': 'appartient', 'notable member': 'appartient',
};

function indexerUnivers(entrees) {
  const parNorm = new Map(), parSlug = new Map(), parSig = new Map();
  const sigAmbigues = new Set();
  const ajouter = (map, cle, e) => { if (!cle) return; if (!map.has(cle)) map.set(cle, []); map.get(cle).push(e); };
  for (const e of entrees) {
    ajouter(parSlug, e.slug, e);
    for (const alias of [e.name, e.attributes?.roman_name].filter(Boolean)) {
      ajouter(parNorm, norm(alias), e);
      const mots = motsSignifiants(alias);
      const cles = [mots];
      // Les noms MAL portent les prénoms intermédiaires que les wikis omettent (« Shunsui Jirou
      // Sakuranosuke Kyouraku » ≡ « Shunsui Kyōraku ») : on indexe aussi le couple prénom+nom.
      if (mots.length >= 3) cles.push([mots[0], mots[mots.length - 1]]);
      for (const c of cles) {
        if (c.length < 2) continue;                    // un mot seul passe par parNorm, jamais par le flou
        const sig = signature(c);
        const dejaLa = parSig.get(sig);
        if (dejaLa && dejaLa.id !== e.id) sigAmbigues.add(sig);   // homonymes : on préfère ne rien lier
        else if (!dejaLa) parSig.set(sig, e);
      }
    }
  }
  const trancher = (lot, nature) => {
    if (!lot?.length) return null;
    for (const t of TYPES_PREFERES[nature] ?? []) { const hit = lot.find((e) => e.type === t); if (hit) return hit; }
    return TYPES_PREFERES[nature] ? null : lot[0];     // nature typée mais aucun type plausible → on renonce
  };
  return (candidat, nature) => {
    const brut = String(candidat ?? '').replace(/\([^)]*\)/g, ' ').trim();   // « (Older Brother) », « (former) »
    if (!brut || brut.length > 60) return null;
    const n = norm(brut);
    if (!n) return null;
    const exact = trancher(parNorm.get(n) ?? parSlug.get(slugify(brut)), nature);
    if (exact) return exact;
    // Les wikis suffixent le toponyme, pas nous : « Karakura Town » ≡ « Karakura » (52 cibles perdues
    // sur le seul banc Bleach). Liste FERMÉE et match EXACT ensuite : « Shiba Clan » → « Shiba »
    // toucherait un personnage, on ne veut pas de raccourci générique.
    const court = n.replace(/ (town|city|village|island)$/, '');
    if (court !== n) { const h = trancher(parNorm.get(court), nature); if (h) return h; }
    // DEUX mots significatifs au minimum. Essayé à un mot le 01/08 pour rattraper « Visored » ≡
    // « Vizard » : le squelette phonétique, calibré pour comparer un nom à UN titre de wiki, devient
    // une passoire quand on l'oppose à tout un index — « Raika » ≡ « Haruko » (rk→lk), « Leona » ≡
    // « Ririn » (ln). 3 liens gagnés, 8 faux. Un nom d'un seul mot doit tomber juste, ou rien.
    const mots = motsSignifiants(brut);
    if (mots.length < 2 || mots.length > 5) return null;
    const sig = signature(mots);
    if (sigAmbigues.has(sig)) return null;
    const flou = parSig.get(sig);
    // Confirmation par la garde de la lib : elle a déjà attrapé les voisins (« Super 17 » ≠ « Android 17 »).
    if (!flou || !sameEntityName(brut, flou.name)) return null;
    return (TYPES_PREFERES[nature] ?? []).includes(flou.type) ? flou : null;
  };
}

/* ═══════════════════ 3. Lecture de l'infobox rendue ═══════════════════ */

// Les valeurs d'infobox sont des LISTES DE LIENS. fetchFandomInfobox (lib) les aplatit en texte —
// « Affiliation : Gotei 13 , Soul Society Kyōraku Family » — trois cibles soudées qu'aucun découpage
// ne sépare de façon fiable (constat mesuré sur Shunsui Kyōraku le 01/08). On relit donc le HTML ici
// pour garder un lien = une cible ; la lib reste la source de la garde d'identité et du rythme.
const NAMESPACES = /^(File|Image|Category|Template|Help|User|Special|Talk|Forum|Blog|Module|MediaWiki|w|wikipedia|c):/i;

const deshtml = (s) => String(s ?? '')
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

async function wiki(url, essais = 3) {
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative)' },
        signal: AbortSignal.timeout(25_000),   // sans borne, une connexion qui traîne fige le script
      });
      if (r.status === 429) { await dormir(1500 * (i + 1)); continue; }
      if (r.ok) return await r.json();
    } catch { /* on retente */ }
    await dormir(500 * (i + 1));
  }
  return null;
}

/** Segment HTML de l'infobox : `<aside class="portable-infobox">` (7 wikis) ou `<table class="infobox">` (Naruto). */
function segmentInfobox(html) {
  // Les <img> de Fandom embarquent un GIF base64 par icône : sur Kakashi l'infobox pèse 30 ko rien
  // qu'en images et débordait la fenêtre de lecture de 20 000 caractères de la lib.
  const propre = html.replace(/<img\b[^>]*>/g, ' ').replace(/<sup\b[^>]*class="reference"[\s\S]*?<\/sup>/g, ' ');
  const iP = propre.indexOf('portable-infobox');
  if (iP >= 0) {
    const debut = propre.lastIndexOf('<aside', iP);
    const fin = propre.indexOf('</aside>', iP);
    return { mode: 'portable', seg: propre.slice(debut >= 0 ? debut : iP, fin > 0 ? fin : iP + 60_000) };
  }
  const iT = propre.search(/<table[^>]*class="[^"]*infobox/);
  if (iT < 0) return null;
  // Les infobox Naruto imbriquent des tables : on suit la profondeur jusqu'à la fermeture de la racine.
  const re = /<table\b|<\/table>/g; re.lastIndex = iT;
  let prof = 0, fin = -1, m;
  while ((m = re.exec(propre))) {
    prof += m[0] === '</table>' ? -1 : 1;
    if (prof === 0) { fin = m.index + m[0].length; break; }
  }
  return { mode: 'table', seg: propre.slice(iT, fin > 0 ? fin : iT + 80_000) };
}

/** Lignes { cle, cibles[] } : un lien wiki = une cible ; à défaut, les fragments de texte. */
function lignesInfobox(html) {
  const s = segmentInfobox(html);
  if (!s) return [];
  const paires = s.mode === 'portable'
    ? [...s.seg.matchAll(/pi-data-label[^>]*>([\s\S]*?)<\/h3>[\s\S]*?pi-data-value[^>]*>([\s\S]*?)<\/div>/g)]
    : [...s.seg.matchAll(/<tr[^>]*>[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/g)];

  const lignes = [];
  for (const [, brutCle, brutVal] of paires) {
    const cle = deshtml(brutCle.replace(/<[^>]+>/g, ' ')).replace(/\s*:\s*$/, '');
    if (!cle || cle.length > 40) continue;

    const cibles = [];
    for (const [, attrs] of brutVal.matchAll(/<a\b([^>]*)>/g)) {
      const href = /href="([^"]*)"/.exec(attrs)?.[1] ?? '';
      const titre = deshtml(/title="([^"]*)"/.exec(attrs)?.[1] ?? '');
      if (!titre || !href.startsWith('/wiki/') || NAMESPACES.test(titre)) continue;   // externes, notes, fichiers
      cibles.push(titre);
    }
    // Texte hors liens : certains champs ne sont pas wikifiés (« Shikai : <b>Katen Kyōkotsu</b> »).
    const texte = deshtml(brutVal.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(li|p|div)>/gi, '\n').replace(/<[^>]+>/g, ' '));
    for (const frag of texte.split(/[\n,;·•]/)) {
      const f = frag.replace(/\([^)]*\)/g, ' ').trim();
      if (f && f.length <= 60) cibles.push(f);
    }
    if (cibles.length) lignes.push({ cle, cibles: [...new Set(cibles)] });
  }
  return lignes;
}

// Cache à part de celui de la lib (clés et contenu différents) et hors du dépôt : le dépôt vit dans
// iCloud, un cache de plusieurs milliers de fichiers y serait resynchronisé en boucle.
const CACHE = join(homedir(), '.cache', 'nika', 'fandom-infobox');

/** Infobox d'une entrée : { titre, url, memeEntite, via, lignes[] } — null si aucune page. */
async function infoboxDe(univers, nom) {
  const api = wikiApi(univers);
  if (!api) return null;
  await mkdir(CACHE, { recursive: true });
  const fichier = join(CACHE, `${createHash('sha1').update(`v1:${univers}:${nom}`).digest('hex').slice(0, 16)}.json`);
  if (!SANS_CACHE) {
    try {
      const c = JSON.parse(await readFile(fichier, 'utf8'));
      // Une absence de page est mise en cache elle aussi (`{vide:true}`) — la relire comme une page
      // trouvée gonflait le taux de découverte de 339/349 à 349/349 sur le banc Bleach.
      if (c?.vide) return null;
      // memeEntite est RECALCULÉ : la garde évolue et un verdict figé dans le cache la court-circuiterait.
      return c.titre ? { ...c, memeEntite: sameEntityName(nom, c.titre) } : null;
    } catch { /* cache froid */ }
  }

  // On demande la page ENTIÈRE, pas `&section=0`. L'entête pèse pourtant 10 à 20 fois moins (Jotaro
  // Kujo : 949 ko → 51 ko) — mais elle n'est pas dans le cache de bord de Fandom : mesuré sur
  // naruto.fandom.com le 01/08, section=0 met 1,2 à 2,2 s là où la page complète répond en 0,4 s.
  // Ici c'est la latence qui coûte, pas les octets.
  const lire = (t) => `${api}?action=parse&page=${encodeURIComponent(t)}&prop=text&redirects=1&format=json&formatversion=2`;
  let via = 'exact';
  let j = await wiki(lire(nom));
  if (!j?.parse?.text) {
    const trouves = await searchTitles(api, nom, null, 1);
    if (!trouves.length) { await ecrire(fichier, null); return null; }
    via = 'recherche';
    j = await wiki(lire(trouves[0]));
    if (!j?.parse?.text) { await ecrire(fichier, null); return null; }
  }
  const titre = j.parse.title ?? nom;
  const lignes = lignesInfobox(j.parse.text);
  const res = {
    titre, via,
    url: `https://${WIKIS[univers]}.fandom.com/wiki/${encodeURIComponent(titre.replace(/ /g, '_'))}`,
    memeEntite: sameEntityName(nom, titre),
    lignes,
  };
  await ecrire(fichier, res);
  await dormir(250);                                   // politesse Fandom (~5 req/s tous ouvriers confondus)
  return res;
}
const ecrire = (f, v) => writeFile(f, JSON.stringify(v ?? { vide: true })).catch(() => {});

/* ═══════════════════ 4. Clés d'infobox → natures de relation ═══════════════════ */

// Clé normalisée (sans accent, sans « Previous/Former », sans pluriel) → nature.
// Le socle vient du cahier des charges ; les ajouts sont les noms réels des mêmes champs sur les
// wikis (« Shikai »/« Bankai » au lieu de « Zanpakutō », « Kekkei Genkai » au lieu de « Abilities »).
const NATURES = {
  affiliation: 'appartient', team: 'appartient', squad: 'appartient', division: 'appartient',
  allegiance: 'appartient', crew: 'appartient', organization: 'appartient', organisation: 'appartient',
  clan: 'appartient',
  epithet: null,
  occupation: 'exerce', profession: 'exerce', position: 'exerce', role: 'exerce',
  residence: 'habite', 'base of operations': 'habite', origin: 'habite', home: 'habite',
  homeland: 'habite', homeworld: 'habite', birthplace: 'habite', 'place of birth': 'habite',
  address: 'habite',
  relative: 'famille', family: 'famille', 'family member': 'famille',
  partner: 'allie', ally: 'allie', rival: 'rival', enemy: 'rival',
  stand: 'maitrise', 'devil fruit': 'maitrise', zanpakuto: 'maitrise', shikai: 'maitrise',
  bankai: 'maitrise', resurreccion: 'maitrise', fullbring: 'maitrise',
  // « Abilities » ne se ramène pas à « ability » par la règle du pluriel : on la nomme en toutes lettres.
  ability: 'maitrise', abilities: 'maitrise',
  'nen type': 'maitrise', 'kekkei genkai': 'maitrise', 'signature skill': 'maitrise',
  technique: 'maitrise', 'unique trait': 'maitrise', jutsu: 'maitrise', 'team jutsu': 'maitrise',
  weapon: 'possede', vehicle: 'possede', ship: 'possede', 'main ship': 'possede',
  tool: 'possede', 'spirit weapon': 'possede',
};

// Certaines clés n'ont de sens que si l'entrée de DÉPART est un acteur. La garde d'identité de la lib
// accepte l'inclusion de mots : « Wood Release: Underground Roots Technique » a été reconnue dans la
// page générale « Wood Release », qui liste TOUS les jutsu de la nature — et la technique se retrouvait
// à « maîtriser » ses cousines. Un clan ou un personnage, lui, maîtrise bien ce que sa page énumère.
const SOURCE_REQUISE = { jutsu: ['character', 'status'], 'team jutsu': ['character', 'status'] };

const cleNormalisee = (cle) => {
  const k = norm(cle).replace(/^(previous|former|current|first|main)\s+/, '').replace(/\s*\(s\)$/, '').trim();
  if (NATURES[k] !== undefined) return k;
  if (k.endsWith('s') && NATURES[k.slice(0, -1)] !== undefined) return k.slice(0, -1);
  return k;
};
const natureDe = (cle) => NATURES[cleNormalisee(cle)];

/* ═══════════════════ 5. Le pipeline ═══════════════════ */

async function enParallele(items, n, tache) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; await tache(items[k], k); }
  }));
}

const compte = (m, k, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const top = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
  .map(([k, c]) => `${k} (${c})`).join(' · ');

async function main() {
  console.log('→ lecture du graphe…');
  const entrees = await scanComplet('akasha_entries', 'id, slug, name, type, universe, attributes');
  const relations = await scanComplet('akasha_relations', 'from_entry');
  const aDejaUneSortante = new Set(relations.map((r) => r.from_entry));

  const parUnivers = new Map();
  for (const e of entrees) {
    if (!parUnivers.has(e.universe)) parUnivers.set(e.universe, []);
    parUnivers.get(e.universe).push(e);
  }
  const resolveurs = new Map([...parUnivers].map(([u, l]) => [u, indexerUnivers(l)]));

  const orphelines = entrees
    .filter((e) => !aDejaUneSortante.has(e.id) && WIKIS[e.universe] && (!UNIVERS || e.universe === UNIVERS))
    .sort((a, b) => (Number(b.attributes?.favorites) || 0) - (Number(a.attributes?.favorites) || 0))
    .slice(0, LIMITE);
  console.log(`\n${orphelines.length} entrées sans relation sortante à traiter${UNIVERS ? ` [${UNIVERS}]` : ''}`
    + ` (concurrence ${CONCURRENCE})\n`);

  const stats = {
    traitees: 0, pageTrouvee: 0, memeEntite: 0, viaRecherche: 0, sansInfobox: 0, avecRelation: 0,
    ciblesVues: 0, ciblesResolues: 0,
  };
  const parNature = new Map(), parUniv = new Map(), clesInconnues = new Map(), ciblesPerdues = new Map();
  const mauvaisesEntites = [];
  const sorties = [];
  const vues = new Set();

  await enParallele(orphelines, CONCURRENCE, async (e, i) => {
    if (i % 50 === 0 && i) console.log(`  … ${i}/${orphelines.length} (${sorties.length} relations)`);
    stats.traitees++;
    const page = await infoboxDe(e.universe, e.name);
    if (!page) return;
    stats.pageTrouvee++;
    if (page.via === 'recherche') stats.viaRecherche++;
    // GARDE D'IDENTITÉ AVANT TOUTE EXPLOITATION : la recherche plein texte ramène des voisins
    // (« Mail Jeevas » → « Matt », « Reiko » → « Minor Characters ») dont l'infobox nous ferait
    // écrire des relations franchement fausses.
    if (!page.memeEntite) {
      if (mauvaisesEntites.length < 40) mauvaisesEntites.push(`${e.name} [${e.universe}] → « ${page.titre} »`);
      return;
    }
    stats.memeEntite++;
    if (!page.lignes.length) { stats.sansInfobox++; return; }

    const resoudre = resolveurs.get(e.universe);
    let n = 0;
    for (const ligne of page.lignes) {
      const nature = natureDe(ligne.cle);
      if (nature === undefined && INVERSES[cleNormalisee(ligne.cle)]) {
        if (!INVERSES_ACTIFS) { compte(clesInconnues, `${e.universe}/${ligne.cle}`); continue; }
        const inv = INVERSES[cleNormalisee(ligne.cle)];
        for (const cible of ligne.cibles) {
          const acteur = resolveurs.get(e.universe)(cible, 'acteur');
          if (!acteur || acteur.id === e.id) continue;
          const k = `${acteur.slug}|${inv}|${e.slug}`;
          if (vues.has(k)) continue;
          vues.add(k);
          sorties.push({ from: acteur.slug, to: e.slug, relation: inv, via: `↩ ${ligne.cle}`, source: page.url });
          compte(parNature, inv); compte(parUniv, e.universe);
        }
        continue;
      }
      if (nature === undefined) { compte(clesInconnues, `${e.universe}/${ligne.cle}`); continue; }
      if (nature === null) continue;                       // champ connu mais volontairement ignoré
      const requise = SOURCE_REQUISE[cleNormalisee(ligne.cle)];
      if (requise && !requise.includes(e.type)) continue;
      for (const cible of ligne.cibles) {
        stats.ciblesVues++;
        const cE = resoudre(cible, nature);
        if (!cE) { compte(ciblesPerdues, `${e.universe}/${cible}`); continue; }
        stats.ciblesResolues++;
        if (cE.id === e.id) continue;                      // « Zangetsu » se cite lui-même en Shikai
        const k = `${e.slug}|${nature}|${cE.slug}`;
        if (vues.has(k)) continue;
        vues.add(k);
        sorties.push({ from: e.slug, to: cE.slug, relation: nature, via: ligne.cle, source: page.url });
        compte(parNature, nature); compte(parUniv, e.universe);
        n++;
      }
    }
    if (n) stats.avecRelation++;
  });

  /* ── Rapport ── */
  const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)} %` : 'n/a');
  console.log(`\n═══ INFOBOX FANDOM → RELATIONS ═══`);
  console.log(`Entrées traitées      : ${stats.traitees}`);
  console.log(`Page trouvée          : ${stats.pageTrouvee} (${pct(stats.pageTrouvee, stats.traitees)}) dont ${stats.viaRecherche} par recherche`);
  console.log(`Même entité (garde)   : ${stats.memeEntite} (${pct(stats.memeEntite, stats.pageTrouvee)}) — ${stats.pageTrouvee - stats.memeEntite} rejets`);
  console.log(`Page sans infobox     : ${stats.sansInfobox}`);
  console.log(`Cibles résolues       : ${stats.ciblesResolues}/${stats.ciblesVues} (${pct(stats.ciblesResolues, stats.ciblesVues)})`);
  console.log(`Entrées désorphelinées: ${stats.avecRelation} (${pct(stats.avecRelation, stats.traitees)})`);
  console.log(`RELATIONS ÉMISES      : ${sorties.length}`);
  console.log(`\nPar nature   : ${top(parNature)}`);
  console.log(`Par univers  : ${top(parUniv)}`);
  if (mauvaisesEntites.length) console.log(`\n⚠ mauvaises entités écartées (${stats.pageTrouvee - stats.memeEntite}) : ${mauvaisesEntites.slice(0, 10).join(' | ')}`);
  console.log(`\n⚠ clés d'infobox non mappées (top) : ${top(clesInconnues, 20)}`);
  console.log(`⚠ cibles non résolues (top) : ${top(ciblesPerdues, 20)}`);

  if (ECHANTILLON) {
    const nomParSlug = new Map(entrees.map((e) => [e.slug, e.name]));
    const pas = Math.max(1, Math.floor(sorties.length / ECHANTILLON));
    console.log(`\n─── ÉCHANTILLON À VÉRIFIER À LA MAIN (1 sur ${pas}) ───`);
    for (let i = 0, k = 0; i < sorties.length && k < ECHANTILLON; i += pas, k++) {
      const r = sorties[i];
      console.log(`${String(k + 1).padStart(2)}. ${nomParSlug.get(r.from)} —${r.relation}→ ${nomParSlug.get(r.to)}   [${r.via}]  ${r.source}`);
    }
  }

  writeFileSync(SORTIE, JSON.stringify({ relations: sorties }, null, 1));
  console.log(`\n✓ écrit ${SORTIE} (${sorties.length} relations)`);
}
main().catch((e) => { console.error('✗ build-akasha-fandom-links:', e); process.exit(1); });
