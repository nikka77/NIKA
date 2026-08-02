// scripts/lib/fandom.mjs — connecteur Fandom (API MediaWiki publique, sans clé) pour AKASHA.
// Récupère les attaques/techniques d'un univers depuis son wiki communautaire, avec le lien
// personnage→technique quand le wiki expose des pages « List of techniques used by X ».
// Rate-limit courtois (~5 req/s max) : Fandom tolère mais on temporise.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wget(url, tries = 3) {
  // maxlag=5 sur toute requête api.php : l'étiquette bot officielle (valeur par défaut de
  // Pywikibot). En surcharge, le serveur répond une erreur maxlag avec Retry-After — on
  // attend ce qu'il demande au lieu de le pousser (audit 02/08, Manual:Maxlag_parameter).
  const u = url.includes('/api.php?') && !url.includes('maxlag=') ? `${url}&maxlag=5` : url;
  for (let i = 0; i < tries; i++) {
    try {
      // Timeout indispensable : sans lui, une connexion Fandom qui traîne bloque le script
      // indéfiniment (constaté le 25/07 — un scoring figé à 0 % CPU pendant 20 min).
      const r = await fetch(u, {
        // Coordonnées de contact : l'étiquette MediaWiki demande un moyen de nous joindre
        // plutôt que de nous bloquer à l'aveugle si le trafic pose problème.
        headers: { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' },
        signal: AbortSignal.timeout(25_000),
      });
      if (r.status === 429) {
        // Retry-After d'abord : le serveur SAIT quand il sera prêt, notre backoff devine.
        const apres = Number(r.headers.get('retry-after'));
        await sleep(Number.isFinite(apres) && apres > 0 ? apres * 1000 : 1500 * (i + 1));
        continue;
      }
      if (r.ok) {
        const j = await r.json();
        if (j?.error?.code === 'maxlag') { await sleep(Math.max(5, Number(r.headers.get('retry-after')) || 0) * 1000); continue; }
        return j;
      }
    } catch { /* retry */ }
    await sleep(500 * (i + 1));
  }
  return null;
}

const META = /^(List of|Template:|Category:|File:|User:|Help:|Forum:|Blog:|Talk:|Module:)/i;

/** Tous les membres-PAGE d'une catégorie (paginé). Filtre les pages méta (List of…, Template:…). */
export async function categoryMembers(api, category, maxPages = 8) {
  const out = new Set();
  let cont = null;
  for (let p = 0; p < maxPages; p++) {
    const u = `${api}?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmlimit=500&cmtype=page&format=json${cont ? '&cmcontinue=' + encodeURIComponent(cont) : ''}`;
    const j = await wget(u);
    if (!j?.query?.categorymembers) break;
    for (const m of j.query.categorymembers) if (!META.test(m.title)) out.add(m.title);
    cont = j.continue?.cmcontinue;
    if (!cont) break;
    await sleep(220);
  }
  return out;
}

/** Titres de pages correspondant à une recherche (ex. « List of techniques used by »). */
export async function searchTitles(api, query, prefixFilter = null, limit = 120) {
  const out = [];
  let off = 0;
  while (out.length < limit) {
    const j = await wget(`${api}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=50&sroffset=${off}&format=json`);
    const hits = j?.query?.search || [];
    if (!hits.length) break;
    for (const h of hits) if (!prefixFilter || h.title.startsWith(prefixFilter)) out.push(h.title);
    if (!j.continue) break;
    off = j.continue.sroffset;
    await sleep(220);
  }
  return out;
}

/** Liens ns0 d'une page ∩ un ensemble de titres valides (→ techniques réelles d'un perso). */
export async function pageLinksIn(api, page, validSet) {
  const j = await wget(`${api}?action=parse&page=${encodeURIComponent(page)}&prop=links&format=json`);
  const links = (j?.parse?.links || []).filter((l) => l.ns === 0).map((l) => l['*']);
  return links.filter((l) => validSet.has(l));
}

export { sleep as fandomSleep };

/* ════════ NIKA OPS — « yeux » des agents locaux (25/07/2026) ════════
   Les modèles locaux ne naviguent pas : le worker récupère ici la page canon,
   la nettoie en prose et la met en cache disque avant de la passer au modèle. */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/** univers AKASHA → sous-domaine fandom.com */
export const WIKIS = {
  'Naruto': 'naruto',
  'One Piece': 'onepiece',
  'Bleach': 'bleach',
  'Dragon Ball': 'dragonball',
  'Hunter x Hunter': 'hunterxhunter',
  "JoJo's Bizarre Adventure": 'jojo',
  'Death Note': 'deathnote',
  'Initial D': 'initiald',
};

export const wikiApi = (universe) =>
  WIKIS[universe] ? `https://${WIKIS[universe]}.fandom.com/api.php` : null;

/** Champs d'infobox sans intérêt pour nos agents (médias, apparitions, physique, doublage). */
const INFOBOX_IGNORE = /^(manga|anime|novel|movie|game|ova|appears|japanese|english|voice|seiyu|image|caption|birthdate|deathdate|height|weight|blood|ninja registration|academy|ch(u|ū)nin prom|debut|kanji|romaji|literal|other names?)/i;

/**
 * FICHE TECHNIQUE depuis l'infobox RENDUE (action=parse&prop=text).
 * Les wikis Fandom ne stockent PAS l'infobox dans le wikitext : sur naruto.fandom.com par exemple,
 * la page contient un simple `{{Infobox}}` et les valeurs vivent sur une page « Infobox:X » (constat
 * du 26/07). Il faut donc lire le HTML rendu. C'est là que se trouvent les attributs structurés
 * (Affiliation, Classification, Team, Partner…) que nos agents doivent renseigner — les demander à
 * la prose seule revenait à faire deviner ce qui est écrit noir sur blanc juste à côté.
 */
export async function fetchFandomInfobox(universe, name) {
  const api = wikiApi(universe);
  if (!api) return '';
  const j = await wget(`${api}?action=parse&page=${encodeURIComponent(name)}&prop=text&redirects=1&format=json&formatversion=2`);
  const html = j?.parse?.text;
  if (!html) return '';

  // deux familles de gabarits selon les wikis : table classique ou « portable infobox »
  let i = html.indexOf('<table class="infobox');
  if (i < 0) i = html.indexOf('portable-infobox');
  if (i < 0) return '';
  const seg = html.slice(i, i + 20000);
  const nu = (x) =>
    x.replace(/<[^>]+>/g, ' ')
      .replace(/&#160;|&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#91;/g, '[').replace(/&#93;/g, ']')
      .replace(/\[\s*\d+\s*\]/g, '')          // marqueurs de référence [ 7 ] : bruit pur
      .replace(/\s*:\s*$/, '')                  // certains wikis suffixent déjà les libellés
      .replace(/\s+/g, ' ').trim();

  const lignes = [];
  for (const [, r] of seg.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const th = /<th[^>]*>([\s\S]*?)<\/th>/.exec(r);
    const td = /<td[^>]*>([\s\S]*?)<\/td>/.exec(r);
    if (!th || !td) continue;
    const cle = nu(th[1]), val = nu(td[1]);
    if (!cle || !val || INFOBOX_IGNORE.test(cle) || val.length > 120) continue;
    lignes.push(`${cle} : ${val}`);
  }
  // gabarit portable : <h3 class="pi-data-label">…</h3><div class="pi-data-value">…</div>
  if (!lignes.length) {
    const labels = [...seg.matchAll(/pi-data-label[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => nu(m[1]));
    const values = [...seg.matchAll(/pi-data-value[^>]*>([\s\S]*?)<\/div>/g)].map((m) => nu(m[1]));
    labels.forEach((l, k) => {
      const v = values[k];
      if (l && v && !INFOBOX_IGNORE.test(l) && v.length <= 120) lignes.push(`${l} : ${v}`);
    });
  }
  await sleep(250);
  return lignes.length ? `FICHE TECHNIQUE (infobox du wiki)\n${lignes.slice(0, 18).join('\n')}\n\n` : '';
}

/** Wikitext brut → prose lisible (templates, liens wiki, refs, balises, titres). */
export function cleanWikitext(wt) {
  let s = wt ?? '';
  for (let i = 0; i < 6; i++) s = s.replace(/\{\{[^{}]*\}\}/g, '');       // templates imbriqués
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '');
  s = s.replace(/\[\[(?:File|Image|Fichier):[^\]]*\]\]/gi, '');
  // Liens INTERLANGUES ([[es:…]], [[pt-br:…]]) : une fois déwikifiés ils ressemblent à du contenu
  // et induisent le modèle en erreur — un juge a cru à une faute d'orthographe dans notre base
  // en lisant la translittération espagnole (25/07). À retirer AVANT de déwikifier.
  s = s.replace(/\[\[[a-z]{2,3}(?:-[a-z]{2,4})?:[^\]]*\]\]/g, '');
  s = s.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');                  // déwikifier
  s = s.replace(/<\/?[^>]+>/g, '');
  s = s.replace(/^=+\s*(.+?)\s*=+$/gm, '\n§ $1');                          // sections → marqueurs
  s = s.replace(/'''?/g, '').replace(/^\s*[*#:]+\s*/gm, '· ');
  return s.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

// ~/.cache et pas le dépôt : (1) le dépôt vit dans iCloud — un cache de 139+ fichiers y serait
// resynchronisé en boucle ; (2) l'ancien `.pathname` encodait l'espace de « Mobile Documents » en
// %20 et créait un dossier parasite hors iCloud (découvert le 26/07 — la leçon fileURLToPath du
// 25/07 n'avait pas été balayée sur TOUT le dépôt).
const CACHE_DIR = join(homedir(), '.cache', 'nika', 'fandom') + '/';

/** Mots significatifs d'un nom : sans accents, sans particules ni ponctuation. */
const nameWords = (s) =>
  new Set(
    (s ?? '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
      // Voyelles longues du japonais romanisé : « Tōta » (macron déjà tombé → « tota ») et
      // « Touta » sont le MÊME nom, mais le squelette ne les rapproche pas — il exige cinq
      // lettres de part et d'autre et « tota » en fait quatre. On aligne l'écriture avant de
      // comparer : ō = ou = oo, ū = uu. (Constaté le 02/08 : Tōta Matsuda / Touta Matsuda
      // classé « mauvaise entité » alors que c'est le même homme, à l'accent près.)
      .replace(/ou/g, 'o').replace(/oo/g, 'o').replace(/uu/g, 'u')
      .split(/\s+/)
      .filter((w) => w && !['the', 'of', 'de', 'du', 'la', 'le', 'les', 's', 'gou', 'san', 'kun'].includes(w)),
  );

/**
 * Le titre trouvé désigne-t-il bien l'entité demandée ?
 * Tolère l'inversion (« Shamrock Figarland » ≡ « Figarland Shamrock ») ; rejette les voisins
 * (« Giorno's Mother » vs « Giorno Giovanna », « Super 17 » vs « Android 17 »).
 */
// Squelette phonétique d'un mot romanisé : les variantes de translittération (« Oderschvank » ≡
// « Odelschwanck », « Anton » ≡ « Antoine » — refus injustes du 26/07) divergent presque toujours
// sur r/l, v/w, c/k, s/z, les voyelles insérées et les doublements — jamais sur la charpente.
// Une distance d'édition aveugle ne marche pas ici : le seuil qui accepte Odelschwanck (3 écarts)
// accepterait aussi Naruto≡Boruto (2 écarts). Le squelette, lui, sépare les deux.
const skeleton = (w) =>
  (w[0] + w.slice(1).replace(/[aeiouy]/g, ''))   // voyelles hors initiale
    .replace(/h/g, '')                            // h muets des romanisations
    .replace(/r/g, 'l').replace(/v/g, 'w')        // r↔l, v↔w (japonais translittéré)
    .replace(/[cq]/g, 'k').replace(/z/g, 's')     // c/q↔k, s↔z
    .replace(/(.)\1+/g, '$1');                    // doublements

// Deux mots se correspondent s'ils sont égaux, ou assez longs et de même squelette.
const sameWord = (w, x) => w === x || (w.length >= 5 && x.length >= 5 && skeleton(w) === skeleton(x));

export function sameEntityName(name, title) {
  const a = nameWords(name), b = nameWords(title);
  if (!a.size || !b.size) return false;
  const inter = [...a].filter((w) => [...b].some((x) => sameWord(w, x))).length;
  return inter === a.size || inter === b.size;   // l'un est inclus dans l'autre
}

/**
 * Champs de nommage d'un article : « Name : … », « Alias : … », « Also called : … ».
 * Un wiki déclare TOUJOURS les autres noms de son sujet — c'est la preuve d'alias.
 */
export const CHAMPS_NOMMAGE = /^\s*(name|true name|real name|alias(es)?|also called|other names?|romanized name|english name|epithet|nickname)\s*:.*$/gim;

/**
 * Le texte cite-t-il `nom` dans ses champs de nommage, HORS des mots du titre ?
 * Si oui, l'article parle de la même entité sous un autre nom (Jealous ≡ Gelus).
 * La condition « hors du titre » est ce qui rend la règle sûre : « Giorno's Mother » ne
 * passe pas sur l'article « Giorno Giovanna » (il ne reste que « Mother », absent des champs).
 * Vit ici depuis le 02/08 : le worker (garde du producteur) et le tri des sections
 * (réhabilitation des faux refus d'identité) doivent appliquer LA MÊME règle.
 */
export function citeLeNom(texte, nom, titre) {
  if (!texte || !nom) return false;
  const lignes = String(texte).match(CHAMPS_NOMMAGE) ?? [];
  if (!lignes.length) return false;
  const champs = nameWords(lignes.join(' | '));
  const dansTitre = nameWords(titre ?? '');
  // Mots d'au moins 4 lettres : « the », « of », « no » se rencontrent partout.
  const mots = [...nameWords(nom)].filter((m) => m.length >= 4 && ![...dansTitre].some((t) => sameWord(m, t)));
  // Comparaison par SQUELETTE, pas par égalité : les wikis translittèrent au petit bonheur
  // (« True Name : Kal Snydar » pour notre « Kal Snyder » — même homme, une lettre d'écart).
  // La même règle qu'ailleurs dans ce fichier, donc les mêmes garde-fous : ≥ 5 lettres.
  return mots.length > 0 && mots.some((m) => [...champs].some((c) => sameWord(m, c)));
}

/**
 * IDENTITÉ ENTRE NOTRE FICHE ET L'ARTICLE TROUVÉ — quatre issues, aucune opinion.
 *   'meme'     : même nom aux variantes de romanisation près (Tōta ≡ Touta)
 *   'alias'    : autre nom du même sujet, PROUVÉ par les champs de nommage (Jealous ≡ Gelus)
 *   'indecis'  : un mot significatif en commun mais aucune preuve (Œil de Shinigami /
 *                Shinigami Eyes : sans doute le bon article, mais notre nom est en français
 *                et le wiki en anglais — rien à prouver là-dessus, donc on ne tranche pas)
 *   'etranger' : rien en commun, aucune preuve (Détective → « L (character) », Ginzou
 *                Kaneboshi → « Give-and-Take (chapter) ») — l'article parle d'autre chose
 * @param {string} texte article (infobox + prose) servant de preuve
 */
export function identiteEntre(nom, titre, texte) {
  if (sameEntityName(nom, titre)) return 'meme';
  // Sigle : « SPK » ≡ « Special Provision for Kira ». Aucun champ de nommage ne le dira,
  // et pourtant l'identité est certaine — les initiales du titre FORMENT le sigle.
  const brut = String(nom).replace(/[^A-Za-z]/g, '');
  if (brut.length >= 2 && brut.length <= 5 && brut === brut.toUpperCase()) {
    // Initiales des mots PORTEURS : « for », « of », « the » ne comptent pas dans un sigle
    // (SPK = Special Provision [for] Kira). nameWords les écarte déjà.
    const OUTILS = ['for', 'and', 'to', 'in', 'on', 'a', 'an', 'pour', 'et', 'des'];
    const initiales = [...nameWords(titre)].filter((w) => !OUTILS.includes(w)).map((w) => w[0]).join('').toUpperCase();
    if (initiales.length >= 2 && initiales.includes(brut)) return 'meme';
  }
  if (citeLeNom(texte, nom, titre)) return 'alias';
  const a = nameWords(nom), b = nameWords(titre);
  return [...a].some((w) => w.length >= 4 && [...b].some((x) => sameWord(w, x))) ? 'indecis' : 'etranger';
}

/**
 * Page canon d'une entité, en prose + cache disque.
 * @returns {Promise<{title:string,url:string,text:string}|null>} null si univers/page introuvable.
 */
export async function fetchFandomProse(universe, name, { maxChars = 5000 } = {}) {
  const api = wikiApi(universe);
  if (!api) return null;

  await mkdir(CACHE_DIR, { recursive: true });
  // La version du nettoyeur fait partie de la clé : après correction, les vieilles entrées sont
  // ignorées d'office (sinon un worker encore en mémoire avec l'ancien code repeuple le cache).
  const file = `${CACHE_DIR}${createHash('sha1').update(`v5:${universe}:${name}`).digest('hex').slice(0, 16)}.json`;
  // sameEntity est RECALCULÉ à la lecture : la garde évolue (squelettes de romanisation du 26/07)
  // et un verdict figé dans le cache la court-circuiterait — sans avoir à invalider tout le cache.
  try {
    const c = JSON.parse(await readFile(file, 'utf8'));
    return { ...c, sameEntity: c.title ? sameEntityName(name, c.title) : c.sameEntity };
  } catch { /* cache froid */ }

  // redirects=1 : « Haiya Dragon » → « Icarus » (sinon on ne récupère que « #REDIRECT »)
  const parseUrl = (t) => `${api}?action=parse&page=${encodeURIComponent(t)}&prop=wikitext&redirects=1&format=json&formatversion=2`;
  let title = name;
  let j = await wget(parseUrl(title));

  let resolvedBy = 'exact';
  // MACRONS (02/08) : nos noms viennent des API japonaises (« Shūichi Aizawa », « Tōta
  // Matsuda ») quand les wikis titrent en ASCII (« Shuichi Aizawa », « Touta Matsuda »).
  // Sans cet essai, le titre exact échoue et la recherche plein texte ramène n'importe quel
  // article citant le nom — Aizawa était tombé sur « Finis (chapter) », et douze sections
  // ont été rédigées sur le mauvais sujet avant d'être refusées une à une par les juges.
  if (!j?.parse?.wikitext) {
    const ascii = name.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (ascii !== name) {
      const k = await wget(parseUrl(ascii));
      if (k?.parse?.wikitext) { title = ascii; resolvedBy = 'ascii'; j = k; }
    }
  }
  if (!j?.parse?.wikitext) {                       // titre exact absent → recherche plein texte
    const found = await searchTitles(api, name, null, 1);
    if (!found.length) return null;
    title = found[0];
    resolvedBy = 'search';
    j = await wget(parseUrl(title));
    if (!j?.parse?.wikitext) return null;
  }

  const out = {
    title: j.parse.title ?? title,
    url: `https://${WIKIS[universe]}.fandom.com/wiki/${encodeURIComponent(title)}`,
    text: (await fetchFandomInfobox(universe, title)) + cleanWikitext(j.parse.wikitext).slice(0, maxChars),
    resolvedBy,
    // GARDE D'IDENTITÉ (25/07) : la recherche plein texte ramenait des entités VOISINES
    // (« Giorno's Mother » → article de Giorno ; « Super 17-gou » → Android 17). On compare
    // les ensembles de mots significatifs : titre et nom doivent désigner la même entité.
    sameEntity: sameEntityName(name, j.parse.title ?? title),
  };
  await writeFile(file, JSON.stringify(out));
  await sleep(250);                                 // politesse Fandom
  return out;
}

/** LES SECTIONS D'UNE PAGE — le découpage du travail par le wiki lui-même (L26, 01/08/2026).
 *
 *  Pourquoi : une fiche de 800 caractères produite depuis une fenêtre de 6 000 ne pouvait pas
 *  rendre justice à une page de 246 738 caractères — mesuré sur Naruto Uzumaki, l'agent voyait
 *  2,4 % de la page et en produisait 0,3 %. Le remède n'est pas d'agrandir la fenêtre (aucun
 *  modèle n'avale 250 000 caractères utilement) mais de DÉCOUPER : une section fait ~3 000
 *  caractères, tient sans troncature, porte un sujet homogène, et se juge contre sa propre
 *  source — pas contre un résumé.
 *
 *  Le wiki fournit lui-même le découpage (prop=sections), et sert chaque section isolément
 *  (&section=N) : on ne devine rien, on suit sa structure.
 *
 *  @returns {Promise<{title:string,url:string,sections:Array<{index:string,titre:string,texte:string}>}|null>}
 */
export async function fetchFandomSections(universe, name, { minChars = 350, maxSections = 24 } = {}) {
  const api = wikiApi(universe);
  if (!api) return null;

  // On réutilise la résolution de titre éprouvée (redirections, alias, recherche plein texte).
  const page = await fetchFandomProse(universe, name, { maxChars: 1200 });
  if (!page?.title) return null;
  const titre = page.title;

  // GARDE D'IDENTITÉ (02/08) — la même que celle du producteur, appliquée AVANT de découper.
  // La recherche plein texte tombe parfois sur un article voisin : « Détective » → « L
  // (character) », « Ginzou Kaneboshi » → « Give-and-Take (chapter) », « Cellule d'enquête
  // Kira » → « Separation ». Sans cette garde on payait douze sections par fiche pour du
  // contenu qui parle de quelqu'un d'autre — et les juges les refusaient une à une, à raison.
  // Deux issues seulement : même entité (titre concordant), ou ALIAS PROUVÉ par les champs
  // de nommage de l'article (Jealous ≡ Gelus). Tout le reste est refusé à la source.
  const identite = identiteEntre(name, titre, page.text);
  if (identite === 'etranger') return { title: titre, url: page.url, sections: [], refus: `mauvaise entité : article « ${titre} »` };
  const alias = identite === 'alias' ? titre : null;

  // UN SEUL APPEL depuis le 02/08 (audit API) : parse accepte les prop combinés par « | » —
  // wikitext ET table des sections arrivent ensemble, et chaque section se DÉCOUPE LOCALEMENT
  // dans ce wikitext à son byteoffset. L'ancienne boucle re-téléchargeait chaque section rendue
  // en HTML (~12 appels + 12 × 250 ms de politesse PAR FICHE) alors que tout le texte était déjà
  // dans la première réponse : sur 7 691 fiches, ~92 000 appels de redondance pure.
  // Doc : https://www.mediawiki.org/wiki/API:Parsing_wikitext (prop multiples, byteoffset).
  const j = await wget(`${api}?action=parse&page=${encodeURIComponent(titre)}&prop=wikitext%7Csections&redirects=1&format=json&formatversion=2`);
  const brutes = j?.parse?.sections ?? [];
  const wikitext = String(j?.parse?.wikitext ?? '');
  if (!brutes.length || !wikitext) return { title: titre, url: page.url, sections: [] };

  // Sections de tête uniquement : les sous-sous-parties (toclevel 3+) sont trop fines pour
  // porter une fiche, et gonfleraient la facture sans rien ajouter au lecteur.
  // On écarte ce qui ne raconte rien (références, galeries, liens externes). Trivia RESTE :
  // c'est de la matière canon (14 anecdotes sourcées sur Sharingan), pas du remplissage.
  const IGNORE = /^(references?|notes?|gallery|galerie|external links?|see also|(site )?navigation|merchandise)$/i;
  const retenues = brutes
    .filter((s) => Number(s.toclevel) <= 2 && !IGNORE.test(String(s.line).trim()))
    .slice(0, maxSections);

  // byteOffset est en OCTETS UTF-8, pas en unités JS : on découpe sur le Buffer. Une section
  // court jusqu'à la prochaine de niveau égal ou supérieur — c'est ce que servait &section=N
  // (une section emporte ses sous-sections), on reproduit exactement ce périmètre.
  const octets = Buffer.from(wikitext, 'utf8');
  const finDe = (s) => {
    const apres = brutes.find((x) => Number(x.byteoffset) > Number(s.byteoffset) && Number(x.toclevel) <= Number(s.toclevel));
    return apres ? Number(apres.byteoffset) : octets.length;
  };

  const sections = [];
  for (const s of retenues) {
    if (!Number.isFinite(Number(s.byteoffset))) continue;   // section transcluse : offset null
    const brut = octets.subarray(Number(s.byteoffset), finDe(s)).toString('utf8')
      .replace(/^=+[^=\n]*=+\s*/, '');                      // la ligne de titre « == X == » ouvre le bloc
    const texte = cleanWikitext(brut).replace(/\s+/g, ' ').trim();
    // Une section trop courte n'a pas de quoi nourrir une fiche — on ne paie pas pour du vide.
    if (texte.length >= minChars) sections.push({ index: String(s.index), titre: String(s.line).trim(), texte });
  }
  return { title: titre, url: page.url, sections, alias };
}
