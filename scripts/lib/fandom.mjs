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
  // PANNE ≠ ABSENCE (audit 02/08). Arriver ici signifie : réseau mort, Cloudflare, ou 429
  // épuisé — jamais « page inexistante » (MediaWiki répond 200 avec {error:{code:missingtitle}}
  // pour une vraie absence, et ce JSON est rendu plus haut). Renvoyer null ici faisait classer
  // des fiches légitimes « sans source exploitable » pendant un blocage passager — un état qui
  // se figeait. On CRIE : le worker marquera la tâche failed (rejouable), pas refused (définitif).
  throw new Error(`fandom injoignable après ${tries} essais : ${url.slice(0, 90)}`);
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

/** REGISTRE D'ALIAS CURÉ (02/08) — notre nom → le titre canon du wiki, vérifié À LA MAIN.
 *  La résolution automatique échoue quand nos noms (français, ou romanisés « ou ») ne partagent
 *  aucun mot avec le titre anglais : « Cellule d'enquête Kira » ≡ Japanese Task Force,
 *  « Kyousuke » ≡ Kyosuke. La garde d'identité refusait — à raison : deviner, c'est comme ça
 *  qu'on a publié quatre sections de L sur la fiche « Détective ». Ici l'identité n'est pas
 *  devinée, elle est CURÉE : chaque paire a été vérifiée contre la page réelle (sonde du 02/08).
 *  Une entrée d'ici l'emporte sur la résolution automatique ET vaut preuve d'identité. */
/** REGISTRE D'ALIAS CURÉ — data/alias-cures.json (02/08). Notre nom → titre canon du wiki,
 *  chaque paire VÉRIFIÉE contre la page réelle avant d'entrer (sonde parse). Fichier de DONNÉES
 *  et non de code : le Curateur (ops-curer-alias.mjs, rôle Claude activé par Dan) y écrit ses
 *  trouvailles confirmées sans toucher au connecteur. Une entrée l'emporte sur la résolution
 *  automatique ET vaut preuve d'identité — la curation ne se re-juge pas à vue. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join as joinPath } from 'node:path';
const ICI = dirname(fileURLToPath(import.meta.url));
export const ALIAS_REGISTRE = (() => {
  try { return JSON.parse(readFileSync(joinPath(ICI, '..', '..', 'data', 'alias-cures.json'), 'utf8')); }
  catch { return {}; }
})();

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
  // Déwikifier EN BOUCLE : les liens imbriqués ([[File:x|vignette de [[Gon]] enfant]]) laissaient
  // des débris « an]] » en tête de section — 739 sections de la file en portaient (QC du 03/08,
  // note tombée à 6,8). Une passe ne suffit jamais sur du wikitext réel ; on itère jusqu'à
  // stabilité puis on balaie les crochets orphelins.
  for (let i = 0; i < 4; i++) {
    const avant = s;
    s = s.replace(/\[\[(?:[^[\]|]*\|)?([^[\]]*)\]\]/g, '$1');
    if (s === avant) break;
  }
  s = s.replace(/\[\[|\]\]/g, '');
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

/** Le SLUG comme seconde preuve d'identité (04/08/2026).
 *
 *  La garde compare le nom NIKA au titre du wiki. Quand notre nom est une TRADUCTION, les deux ne
 *  partagent aucun mot : « Île Cactus » contre « Cactus Island », « Docteur Wheelo » contre
 *  « Dr. Wheelo ». La garde refusait, à tort — 1 037 refus « mauvaise entité » dans la pile des
 *  écartées, dont une majorité de ce seul genre.
 *
 *  Or nos slugs sont souvent frappés sur le nom D'ORIGINE (`cactus-island`, `dr-wheelo`) : c'est
 *  notre propre trace de l'entité côté source. On s'en sert comme second témoin — mesuré sur les
 *  216 alias confirmés à la main, il en reconnaît 45 (21 %) sans un seul appel de modèle.
 *
 *  Ce n'est PAS un assouplissement : le slug doit passer la même épreuve que le nom. Un slug
 *  français (`archipel-des-sabaody`) ne matche rien et la garde refuse comme avant.
 */
export function sameEntityBySlug(slug, title) {
  if (!slug || !title) return false;
  return sameEntityName(String(slug).replace(/-/g, ' '), title);
}

/** LE TITRE EST-IL UNE ÉCRITURE PLUS RICHE DE NOTRE NOM ? (07/08/2026)
 *
 *  Défaut mesuré le 07/08 : la garde anti-homonyme du worker ne s'efface que sur une égalité
 *  STRICTE des titres. Or le wiki titre presque toujours plus richement que nous — titre
 *  honorifique (« Mutaito » → « Master Mutaito »), ordre japonais (« Minoru Kazeno » →
 *  « Kazeno Minoru »), glose entre parenthèses (« Hiru » → « Leech (Hiru) »), page qui réunit
 *  deux comparses (« Dip » → « Chip and Dip »), sous-page de porteur (« Goethe » →
 *  « Yoshino Sōma/Goethe »). Dans les cinq cas, TOUS les mots de notre nom sont dans le titre :
 *  il n'y a aucun doute d'identité à lever, et la garde refusait quand même — 2 640 tentatives
 *  écartées, 5 faux positifs sur 6 lus par l'audit.
 *
 *  CE QUI RESTE REFUSÉ, et c'est le cœur de la règle : la DÉSAMBIGUÏSATION PURE. « Ain (Neo
 *  Marines) » pour notre « Ain » — le titre nu EST déjà notre nom, la parenthèse ne fait que
 *  trier entre plusieurs porteurs du même nom, et rien ne dit que celui du wiki est le nôtre.
 *  C'est exactement le cas qui a fait naître la garde (Ain/Egghead contre Ain/Neo Marines).
 *  À l'inverse « Leech (Hiru) » met NOTRE nom DANS la parenthèse : c'est une glose, pas un tri.
 *
 *  Ce n'est PAS une preuve d'identité en soi — sameEntityName, l'alias curé et pageDOeuvre
 *  gardent le dernier mot. C'est seulement le constat qu'un DOUTE anti-homonyme n'a plus d'objet.
 *
 *  ── PAS DE COUSIN PHONÉTIQUE DANS UN TITRE PLUS LONG (07/08/2026, même jour) ──────────────
 *  Trou trouvé par le contre-vérificateur anti-laxisme, quelques heures après la règle
 *  ci-dessus : elle appariait les mots par `sameWord`, qui rapproche deux mots de cinq lettres
 *  au SQUELETTE identique. Le commentaire promettait « tous les mots de notre nom sont dans le
 *  titre » ; le code disait « ont un COUSIN dans le titre ». Sur Bleach, « Gunjou » se laissait
 *  ainsi apparier à « Kūgo Ginjō » (gunjo ≡ ginjo au squelette) — un AUTRE personnage — et la
 *  garde anti-homonyme, dont c'était le dernier mot, se taisait. Le vice n'est pas la tolérance
 *  en soi : c'est qu'elle ÔTE LEUR INDÉPENDANCE aux gardes. `sameEntityName` avait déjà laissé
 *  passer la garde n°1 sur ce même squelette ; la garde anti-homonyme n'existe que pour pouvoir
 *  la CONTREDIRE. La réduire à la même mesure de ressemblance, c'est n'avoir plus qu'un avis.
 *
 *  La ligne de partage est nette, et mesurée sur les couples réels : quand le titre compte
 *  AUTANT de mots que notre nom, le squelette rapproche de vraies variantes d'écriture (Musse
 *  ≡ Mousse, Katopesla ≡ Catopesra, Sarkies ≡ Sarquiss, Minoru Kazeno ≡ Kazeno Minoru) ; quand
 *  il en compte PLUS, il n'y a plus de variante à reconnaître — un titre qui AJOUTE des mots
 *  aux nôtres doit contenir les nôtres tels quels (« Master Mutaito », « Chip and Dip »,
 *  « Leech (Hiru) », « Yoshino Sōma/Goethe » les contiennent tous à la lettre). On exige donc
 *  l'égalité stricte dès que le titre est plus long. Ferme aussi, au passage, le vieux
 *  « Councillor » → « Konoha Council » de Naruto, qui passait avant même la règle du 07/08.
 */
export function titrePlusRiche(nom, titre) {
  const n = nameWords(nom), t = nameWords(titre);
  if (!n.size || !t.size) return false;
  // Titre plus long que notre nom : appariement À LA LETTRE, aucun cousin phonétique admis.
  const apparie = t.size > n.size ? (w) => t.has(w) : (w) => [...t].some((x) => sameWord(w, x));
  if (![...n].every(apparie)) return false;                                     // notre nom entier ?
  // LE POSSESSIF DÉSIGNE UN PORTEUR, IL N'ENRICHIT PAS UN NOM (07/08/2026, soir).
  //
  //  Second trou, trouvé en auditant les 145 couples débloqués : notre entité « Mother »
  //  (Dragon Ball), au résumé entièrement générique, tombait sur la page « Chi-Chi's mother » —
  //  l'Ox-Queen — et la garde anti-homonyme se taisait, puisque « mother » figure bel et bien
  //  dans le titre. Or « X's Y » ne dit pas notre nom plus richement : il dit « le Y DE X »,
  //  c'est-à-dire qu'il TRIE entre tous les porteurs possibles de Y. C'est mot pour mot ce que
  //  fait la parenthèse d'« Ain (Neo Marines) », traitée trois lignes plus bas depuis le matin ;
  //  le possessif est la même chose écrite autrement, et il avait été oublié.
  //  Ne mord que si le possessif est dans LE TITRE et pas dans notre nom : « Katasuke Tōno's
  //  Assistant » → « Katasuke Tōno » relève de pagePlusGenerale, et continue d'en relever.
  const possessif = (s) => /['’]s\b|s['’](?=\s|$)/.test(String(s ?? ''));
  if (possessif(titre) && !possessif(nom)) return false;
  if (!/\([^)]*\)/.test(String(titre))) return true;
  // Parenthèse présente : elle ne disculpe que si notre nom N'EST PAS déjà le titre nu.
  const nu = nameWords(String(titre).replace(/\([^)]*\)/g, ' '));
  return ![...n].every((w) => [...nu].some((x) => sameWord(w, x)));
}

/** Notre nom et le titre sont-ils LE MÊME libellé, aux signes près ? (07/08/2026)
 *  Sur le wiki DE l'univers, un titre égal au nôtre ne peut pas désigner un homonyme d'ailleurs :
 *  l'identité est acquise par construction. On replie la casse, les diacritiques (nos noms
 *  portent les macrons des API japonaises, « Shakujō », quand le wiki titre parfois en ASCII) et
 *  la ponctuation (« Z-Sword » ≡ « Z Sword »). Rien d'autre — ce n'est pas un rapprochement
 *  phonétique, c'est une égalité. */
export const libelleNu = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

export function titreStrictementEgal(nom, titre) {
  const a = libelleNu(nom), b = libelleNu(titre);
  return Boolean(a) && a === b;
}

/** LA PAGE TROUVÉE EST-ELLE UNE ŒUVRE PLUTÔT QU'UNE ENTITÉ ? (05/08/2026)
 *
 *  La recherche plein texte ne ramène pas seulement des entités voisines : elle ramène des
 *  CHAPITRES, des ÉPISODES, des ARCS, des pages-listes et des pages d'homonymie. Une fiche
 *  rédigée depuis l'une d'elles raconte l'œuvre au lieu de son sujet — vécu le 04/08 avec
 *  « Fool » → « Anime Bonus Corner », « Man X » → « SO Chapter 103 », « Jujika » → « Episode 325 »,
 *  « Île de Drum » → « Drum Island Arc », « Vegeta SSJ4 » → une page d'épisode de Dragon Ball GT.
 *
 *  Deux signaux, parce qu'un seul ne suffit pas : le TITRE trahit la plupart des cas, mais pas
 *  « Super Saiyan 4 Vegeta » — celui-là ne se voit que dans l'INFOBOX (« Episode # : 59 »).
 *  Validé sur les 12 fautes réelles du 04/08 (12/12 attrapées) et 11 résolutions légitimes
 *  (11/11 épargnées, dont « Dragon Ball (object) » et « Zangetsu (Quincy Powers) » : une
 *  parenthèse de désambiguïsation n'est pas une page d'œuvre).
 *
 *  @returns {string|null} le motif du refus, ou null si la page est bien une entité.
 */
const TITRE_OEUVRE = /\((chapter|episode|disambiguation|saga|arc)\)|^list of |^minor characters|bonus corner|^(so|db|op) chapter |^episode \d| (arc|saga)$|\/(history|gallery|techniques|relationships|abilities)/i;
const INFOBOX_OEUVRE = /^(episode|chapter)\s*#|^volume\s*:|^air ?date\s*:|^series\s*:|^previous episode\s*:|^next episode\s*:/im;

export function pageDOeuvre(titre, texte) {
  if (TITRE_OEUVRE.test(String(titre ?? ''))) return `page d'œuvre ou de liste : « ${titre} »`;
  // Seules les premières lignes : c'est là que vit l'infobox, et « Episode » peut apparaître
  // légitimement dans la prose d'une fiche de personnage.
  const entete = String(texte ?? '').split('\n').slice(0, 22).join('\n');
  if (INFOBOX_OEUVRE.test(entete)) return `infobox d'épisode ou de chapitre sous le titre « ${titre} »`;
  return null;
}

/** Un mot significatif du nom demandé manque-t-il au titre retenu ? Signal, pas verdict. */
export function resolutionPartielle(nom, titre) {
  const t = String(titre ?? '').toLowerCase();
  return String(nom ?? '').toLowerCase().split(/[^a-zà-ÿ0-9]+/)
    .filter((m) => m.length > 2).some((m) => !t.includes(m));
}

const motsSignificatifs = (s) => new Set(String(s ?? '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).filter((m) => m.length > 2));

/** LA PAGE EST-ELLE PLUS GÉNÉRALE QUE CE QU'ON DEMANDE ? (05/08/2026)
 *
 *  Classe d'erreur mesurée le 04/08 puis re-mesurée le 05 : notre nom désigne une VARIANTE, la
 *  recherche rend la page PARENTE, et l'agent décrit consciencieusement le parent. Six fiches
 *  publiées ainsi, retirées à la main — « Eternal Mangekyō Sharingan » décrit par la page du
 *  Mangekyō de base (elle n'explique jamais ce qui rend l'Éternel éternel), « Summoning Technique
 *  (Hōzuki Castle's Ninken) » par la page générique de l'invocation, « Chūnin Exams Assistant »
 *  par la page de l'examen. La garde d'identité les laissait toutes passer : les mots du titre
 *  SONT dans notre nom, donc l'inclusion est vraie — c'est justement le problème.
 *
 *  La règle : si les mots du titre forment un sous-ensemble STRICT des mots de notre nom, la page
 *  couvre moins que ce qu'on demande. Validée sur les 6 cas réels (6/6 bloqués) et sur 12
 *  résolutions légitimes (12/12 épargnées — traductions, romanisations, désambiguïsations).
 *
 *  Ne couvre PAS l'entité voisine à nombre de mots égal (« Clan Yūhi » → « Kurenai Yūhi ») :
 *  celle-là relève d'une autre garde, et il vaut mieux une règle étroite et sûre qu'une large
 *  qui refuse du bon travail.
 *
 *  ── FORME COURTE DU MÊME INDIVIDU (07/08/2026) ───────────────────────────────────────────
 *  Défaut mesuré le 07/08 : la règle mordait aussi quand le titre est simplement le nom USUEL
 *  de notre entité — « Son Gohan » refusé pour la page « Gohan », « Carol Masterson » pour
 *  « Carol ». 216 tentatives écartées, 3 faux positifs sur 6 lus. Il fallait un témoin qui
 *  sépare la forme courte (« Gohan » EST Son Gohan) de la page parente (« Mangekyō Sharingan »
 *  n'est PAS l'Éternel) — sans rien deviner nous-mêmes.
 *
 *  Ce témoin, c'est le wiki lui-même, et il tient en deux signaux que la même requête ramène :
 *    1. il REDIRIGE notre nom exact vers cette page, SANS fragment. Une redirection sans
 *       fragment dit « même sujet, même page » ; avec fragment (« Pseudo-Jinchūriki » →
 *       Jinchūriki#Similar Cases) elle dit « ton sujet est un MORCEAU de cette page » — ce qui
 *       est précisément le refus à conserver. Une page atteinte par la RECHERCHE n'atteste
 *       rien du tout (les 4 cas Naruto de l'audit : Summoning Technique (Hōzuki Castle's
 *       Ninken), Katasuke Tōno's Assistant, Chūnin Exams Assistant, Wood Release…).
 *    2. AUCUNE SECTION de la page ne porte notre nom. Le contre-exemple qui a fait ajouter ce
 *       second signal : « Eternal Mangekyō Sharingan » redirige bien vers « Mangekyō
 *       Sharingan » SANS fragment — mais cette page a une section « Eternal Mangekyō
 *       Sharingan ». Le wiki dit donc que notre sujet est une PARTIE de la page : refus tenu,
 *       comme le 05/08. Les pages « Gohan » et « Carol » n'ont aucune section de ce genre.
 *
 *  Sans attestation (appelant qui ne la fournit pas, résolution par recherche), la règle du
 *  05/08 s'applique inchangée : le refus est le défaut, l'exemption doit se prouver.
 *
 *  @param {{redirections?:Array<{from:string,to:string,tofragment?:string}>,sections?:string[]}} [attestation]
 */
export function formeCourteAttestee(nom, titre, attestation) {
  const red = (attestation?.redirections ?? []).find((r) => libelleNu(r.from) === libelleNu(nom));
  if (!red || red.tofragment) return false;              // pas de redirection de NOTRE nom, ou vers un morceau
  const n = motsSignificatifs(nom);
  if (!n.size) return false;
  for (const ligne of attestation?.sections ?? []) {
    const s = motsSignificatifs(ligne);
    if (s.size && [...n].every((m) => s.has(m))) return false;   // notre nom est une SECTION : sujet partiel
  }
  return true;
}

export function pagePlusGenerale(nom, titre, attestation = null) {
  const n = motsSignificatifs(nom), t = motsSignificatifs(titre);
  if (!n.size || !t.size || t.size >= n.size) return null;
  if (![...t].every((m) => n.has(m))) return null;
  if (formeCourteAttestee(nom, titre, attestation)) return null;
  return `page plus générale que l'entité : « ${titre} » ne couvre pas « ${nom} »`;
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
export async function fetchFandomProse(universe, name, { maxChars = 5000, slug = null } = {}) {
  const api = wikiApi(universe);
  if (!api) return null;

  await mkdir(CACHE_DIR, { recursive: true });
  // La version du nettoyeur fait partie de la clé : après correction, les vieilles entrées sont
  // ignorées d'office (sinon un worker encore en mémoire avec l'ancien code repeuple le cache).
  // L'alias curé fait partie de la clé : poser une curation invalide d'office l'ancienne
  // résolution fautive en cache (« Cellule d'enquête Kira » y pointait sur Light Yagami).
  // v6 (07/08) : la réponse porte désormais les REDIRECTIONS et la table des SECTIONS —
  // l'attestation dont pagePlusGenerale a besoin. Les entrées v5 ne les contiennent pas ; les
  // relire sans les invalider aurait fait durer le faux positif « Son Gohan » indéfiniment.
  // v7 (07/08, soir) : la RÉSOLUTION elle-même a changé (essai des voyelles longues avant la
  // recherche plein texte). Le cache garde un TITRE : le relire, c'est resservir « Kūgo Ginjō »
  // pour « Gunjou » indéfiniment. Une garde réparée ne vaut rien tant que le cache sert
  // l'ancienne réponse — leçon du 05/08 appliquée au cache et non plus seulement à la pile.
  const cleCache = `v7:${universe}:${name}${ALIAS_REGISTRE[universe]?.[name] ? ':cure=' + ALIAS_REGISTRE[universe][name] : ''}`;
  const file = `${CACHE_DIR}${createHash('sha1').update(cleCache).digest('hex').slice(0, 16)}.json`;
  // sameEntity est RECALCULÉ à la lecture : la garde évolue (squelettes de romanisation du 26/07)
  // et un verdict figé dans le cache la court-circuiterait — sans avoir à invalider tout le cache.
  try {
    const c = JSON.parse(await readFile(file, 'utf8'));
    // Un alias curé ne se re-juge pas « à vue » : la curation l'emporte sur le recalcul.
    // Les gardes sont RECALCULÉES à la lecture, jamais lues du cache : elles évoluent (slug le
    // 04/08, nature de page le 05/08) et un verdict figé les court-circuiterait sans qu'on ait à
    // invalider tout le cache.
    return { ...c,
      sameEntity: c.aliasCure ? true
        : c.title ? sameEntityName(name, c.title) || sameEntityBySlug(slug, c.title) : c.sameEntity,
      pageOeuvre: pageDOeuvre(c.title, c.text)
        ?? (c.aliasCure ? null
          : pagePlusGenerale(name, c.title, { redirections: c.redirections, sections: c.sections })),
      identiteAttestee: formeCourteAttestee(name, c.title, { redirections: c.redirections, sections: c.sections }),
      resolutionPartielle: resolutionPartielle(name, c.title) };
  } catch { /* cache froid */ }

  // redirects=1 : « Haiya Dragon » → « Icarus » (sinon on ne récupère que « #REDIRECT »)
  // prop=wikitext|sections : la table des sections vient dans LA MÊME réponse (aucun appel de
  // plus) et sert de témoin à pagePlusGenerale — « Mangekyō Sharingan » a une section
  // « Eternal Mangekyō Sharingan », « Gohan » n'a aucune section « Son Gohan ».
  const parseUrl = (t) => `${api}?action=parse&page=${encodeURIComponent(t)}&prop=wikitext%7Csections&redirects=1&format=json&formatversion=2`;
  // L'alias CURÉ d'abord : titre vérifié à la main, identité garantie par la curation.
  const cure = ALIAS_REGISTRE[universe]?.[name];
  let title = cure ?? name;
  let j = await wget(parseUrl(title));

  let resolvedBy = cure ? 'alias-cure' : 'exact';
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
  // VOYELLES LONGUES, DANS L'AUTRE SENS (07/08) — l'essai ASCII ci-dessus ne couvre qu'un cas :
  // NOTRE nom porte le macron, le wiki titre en ASCII. Le cas inverse n'était essayé NULLE PART,
  // et c'est lui qui a produit la seule fiche fausse trouvée par les contre-vérificateurs :
  // notre « Gunjou » (Bleach) n'existe pas tel quel, la recherche plein texte a donc ramené
  // « Kūgo Ginjō » — un autre personnage — alors que la BONNE page, « Gunjō », est là, sur le
  // même wiki, à un accent près. Même mécanique pour « Shuu » → « Shu » (l'homme de Pilaf, et
  // non « Mr. Shu » le précepteur de Gohan) et pour « Bongou »/« Bungou » → « Bongo »/« Bungo »,
  // deux personnages DISTINCTS de Wano que la recherche confondait sur une seule page.
  // Deux écritures à essayer, jamais plus, et seulement si le titre exact a déjà échoué :
  // la forme à macron (ou→ō, uu→ū) puis la forme contractée (ou→o, uu→u). Ce n'est pas un
  // assouplissement — on demande au wiki un titre EXACT, ce qui vaut infiniment mieux que la
  // recherche plein texte à laquelle on tombait sinon ; et toutes les gardes s'appliquent après.
  if (!j?.parse?.wikitext && /ou|uu|oo/i.test(name)) {
    const variantes = [
      ['macron', name.replace(/ou/g, 'ō').replace(/uu/g, 'ū').replace(/oo/g, 'ō')],
      ['contracte', name.replace(/ou/g, 'o').replace(/uu/g, 'u').replace(/oo/g, 'o')],
    ];
    for (const [forme, essai] of variantes) {
      if (j?.parse?.wikitext || essai === name) continue;
      const k = await wget(parseUrl(essai));
      if (k?.parse?.wikitext) { title = essai; resolvedBy = `voyelle-longue:${forme}`; j = k; }
    }
  }
  // LE SLUG COMME TITRE (04/08) : avant de tomber dans la recherche plein texte — qui ramène
  // n'importe quel article citant le nom — on essaie le slug dékébabé. Nos slugs gardent souvent
  // le nom d'origine là où le champ `name` porte la traduction : `cactus-island` trouve la page
  // du premier coup quand « Île Cactus » n'existe sur aucun wiki anglophone.
  if (!j?.parse?.wikitext && slug) {
    const parSlug = String(slug).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (parSlug.toLowerCase() !== name.toLowerCase()) {
      const k = await wget(parseUrl(parSlug));
      if (k?.parse?.wikitext) { title = parSlug; resolvedBy = 'slug'; j = k; }
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

  const titreFinal = j.parse.title ?? title;
  const texte = (await fetchFandomInfobox(universe, titreFinal)) + cleanWikitext(j.parse.wikitext).slice(0, maxChars);
  // ATTESTATION DU WIKI (07/08) — ce que le wiki DIT du rapport entre notre nom et cette page :
  // ses redirections (avec ou sans fragment) et le découpage qu'il donne à la page. Deux
  // témoins bruts, conservés tels quels : c'est pagePlusGenerale qui les interprète.
  const redirections = (j.parse.redirects ?? []).map((r) => ({ from: r.from, to: r.to, tofragment: r.tofragment }));
  const sections = (j.parse.sections ?? []).map((s) => String(s.line ?? ''));
  const out = {
    title: titreFinal,
    redirections,
    sections,
    url: `https://${WIKIS[universe]}.fandom.com/wiki/${encodeURIComponent(title)}`,
    text: texte,
    resolvedBy,
    // GARDE D'IDENTITÉ (25/07) : la recherche plein texte ramenait des entités VOISINES
    // (« Giorno's Mother » → article de Giorno ; « Super 17-gou » → Android 17). On compare
    // les ensembles de mots significatifs : titre et nom doivent désigner la même entité.
    sameEntity: cure ? true
      : sameEntityName(name, titreFinal) || sameEntityBySlug(slug, titreFinal),
    aliasCure: Boolean(cure),
    // GARDE DE NATURE (05/08) : la page trouvée est-elle seulement une page d'ENTITÉ ?
    // L'ALIAS CURÉ NE SE RE-JUGE PAS (07/08) : pagePlusGenerale est un verdict d'IDENTITÉ
    // (« cette page couvre-t-elle bien notre entité ? ») et la curation a déjà tranché cette
    // question-là, à la main. Sans cette exception, « Son Goku » — curé vers « Goku » depuis le
    // 02/08 — était refusé « page plus générale » à chaque passage : la garde défaisait la
    // curation. pageDOeuvre RESTE actif : la NATURE de la page (chapitre, épisode, liste) est
    // une autre question, et une curation qui pointe sur une page d'œuvre est une erreur à voir.
    pageOeuvre: pageDOeuvre(titreFinal, texte)
      ?? (cure ? null : pagePlusGenerale(name, titreFinal, { redirections, sections })),
    // IDENTITÉ ATTESTÉE PAR LE WIKI (07/08) : il redirige NOTRE nom exact vers cette page, sans
    // fragment, et aucune de ses sections ne porte ce nom. Le wiki affirme donc « ce nom désigne
    // ce sujet » — s'il y avait homonymie, il servirait une page d'homonymie ou un titre
    // parenthésé. C'est la même preuve que celle qui lève pagePlusGenerale ; les gardes du
    // producteur s'en servent pour ne pas rouvrir un doute que la source a déjà tranché.
    identiteAttestee: formeCourteAttestee(name, titreFinal, { redirections, sections }),
    // RÉSOLUTION PARTIELLE : un mot du nom demandé manque au titre retenu. Ce n'est pas une
    // faute en soi (« Île Cactus » → « Cactus Island » est une traduction), mais c'est là que
    // se concentrent les erreurs d'espèce — 5 fautes sur 46 mesurées côté One Piece le 04/08.
    // On le SIGNALE ; c'est à l'appelant de faire contrôler ces cas-là.
    resolutionPartielle: resolutionPartielle(name, titreFinal),
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

/** Position CARACTÈRE réelle d'une section dans le wikitext, quelle que soit l'unité du wiki.
 *  La doc MediaWiki donne parse.sections[].byteoffset en OCTETS UTF-8 — mais onepiece.fandom.com
 *  le sert en CARACTÈRES (mesuré le 07/08 : titre « King of Hell Three Sword Style » à l'octet
 *  41026, byteoffset annoncé 40567 = index caractère exact ; l'écart, 459, est le japonais des
 *  {{Nihongo}} en amont). Trancher le Buffer en octets sur ce wiki corrompait les DEUX bornes
 *  de chaque section — 7 extractions parties en vague avec le début dans la section précédente
 *  et la fin coupée en plein mot. On ne DEVINE pas l'unité : on retient le candidat qui tombe
 *  exactement sur un début de titre (« = » en début de ligne), l'unité documentée d'abord.
 *  Aucun des deux ne tombe juste (section transcluse, gabarit) → null : mieux vaut sauter la
 *  section que découper au milieu d'une phrase. */
export function posSection(wikitext, octets, byteoffset) {
  const brut = Number(byteoffset);
  if (!Number.isFinite(brut)) return null;
  const estTitre = (i) => i >= 0 && i < wikitext.length && wikitext[i] === '='
    && (i === 0 || wikitext[i - 1] === '\n');
  const depuisOctets = octets.subarray(0, Math.min(brut, octets.length)).toString('utf8').length;
  if (estTitre(depuisOctets)) return depuisOctets;
  if (estTitre(brut)) return brut;
  return null;
}

export async function fetchFandomSections(universe, name, { minChars = 350, maxSections = 24, slug = null } = {}) {
  const api = wikiApi(universe);
  if (!api) return null;

  // On réutilise la résolution de titre éprouvée (redirections, alias, recherche plein texte).
  const page = await fetchFandomProse(universe, name, { maxChars: 1200, slug });
  if (!page?.title) return null;
  const titre = page.title;

  // GARDE D'IDENTITÉ (02/08) — la même que celle du producteur, appliquée AVANT de découper.
  // La recherche plein texte tombe parfois sur un article voisin : « Détective » → « L
  // (character) », « Ginzou Kaneboshi » → « Give-and-Take (chapter) », « Cellule d'enquête
  // Kira » → « Separation ». Sans cette garde on payait douze sections par fiche pour du
  // contenu qui parle de quelqu'un d'autre — et les juges les refusaient une à une, à raison.
  // Deux issues seulement : même entité (titre concordant), ou ALIAS PROUVÉ par les champs
  // de nommage de l'article (Jealous ≡ Gelus). Tout le reste est refusé à la source.
  // Le slug vaut la même preuve d'identité ici que dans la prose : sans lui, une entité au nom
  // traduit repartait en « mauvaise entité » alors que la page trouvée était la bonne.
  // Une page d'ŒUVRE (chapitre, épisode, arc, page-liste) n'est jamais la source d'une entité :
  // on refuse AVANT de découper, comme pour une entité étrangère.
  if (page.pageOeuvre) return { title: titre, url: page.url, sections: [], refus: `mauvaise entité : ${page.pageOeuvre}` };
  const identite = page.aliasCure || sameEntityBySlug(slug, titre) ? 'alias' : identiteEntre(name, titre, page.text);
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

  // L'unité de byteoffset dépend du wiki (octets d'après la doc, CARACTÈRES constatés sur
  // Fandom — voir posSection) : chaque section est ancrée sur son vrai début de titre, puis on
  // découpe en unités JS. Une section court jusqu'à la prochaine de niveau égal ou supérieur —
  // c'est ce que servait &section=N (une section emporte ses sous-sections), même périmètre.
  const octets = Buffer.from(wikitext, 'utf8');
  const posDe = new Map(brutes.map((s) => [s, posSection(wikitext, octets, s.byteoffset)]));
  const finDe = (s) => {
    const ici = posDe.get(s);
    return brutes
      .filter((x) => posDe.get(x) != null && posDe.get(x) > ici && Number(x.toclevel) <= Number(s.toclevel))
      .reduce((min, x) => Math.min(min, posDe.get(x)), wikitext.length);
  };

  const sections = [];
  for (const s of retenues) {
    if (posDe.get(s) == null) continue;                     // transcluse, ou offset qui ne tombe sur aucun titre
    const brut = wikitext.slice(posDe.get(s), finDe(s))
      .replace(/^=+[^=\n]*=+\s*/, '');                      // la ligne de titre « == X == » ouvre le bloc
    const texte = cleanWikitext(brut).replace(/\s+/g, ' ').trim();
    // Une section trop courte n'a pas de quoi nourrir une fiche — on ne paie pas pour du vide.
    if (texte.length >= minChars) sections.push({ index: String(s.index), titre: String(s.line).trim(), texte });
  }
  return { title: titre, url: page.url, sections, alias };
}

/* ════════ TECHNIQUES SANS PAGE PROPRE (07/08/2026, entrée 29) ════════
   Sondé sur onepiece.fandom.com : les attaques restantes n'ont PAS d'article — leur prose vit en
   SECTIONS (souvent toclevel 3+) de pages HÔTES dont le titre ne matche pas l'attaque : le fruit
   (« Hiken » → Mera Mera no Mi), le style (« Oni Giri » → Three Sword Style), une sous-page
   /Techniques (Gomu Gomu no Mi/Techniques) ou une sous-page d'arme (Battle Frankies/BF-36).
   fetchFandomSections ne peut pas les servir : il écarte les toclevel 3+ ET sa garde exige que le
   TITRE DE PAGE désigne l'entité. Ici l'identité se prouve autrement — par le TITRE DE SECTION
   (ou par une redirection à fragment, où c'est le wiki lui-même qui affirme l'équivalence). */

// La recherche plein texte ramène aussi des pages de jeux vidéo, de produits dérivés,
// d'épisodes et de sommaires — jamais la bonne hôte. Complète META (qui ne voit que les
// espaces de noms). Familles constatées sur les sondes du 07/08 : Figuarts (figurines),
// Funimation/DVD (diffusion), Bounty Rush et Jumputi (jeux), novels, SBS et volumes (édition).
const REBUT_TECHNIQUE = /video game|merchandise|bento|episode|chapter|figuarts|funimation|dvd|bounty rush|jumputi|novel|sbs|volume/i;

// Équivalence CANONIQUE entre un titre de section et un nom d'attaque : les wikis décorent leurs
// lignes de section (italique wiki ''X'', balises HTML, guillemets, diacritiques des romanisations)
// et nos noms portent parfois des accents français. On compare des squelettes nus ; la forme
// compactée (sans espaces) rapproche en plus « Oni Giri » d'un éventuel « Onigiri ».
const canonTechnique = (s) => String(s ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/''+/g, ' ')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// ENTRÉE DE LISTE NOMMÉE — le format réel des attaques sur les pages hôtes (vérifié 07/08 sur
// Three Sword Style) : `*{{Nihongo|'''Oni Giri'''|鬼斬り|…}}: description…`. Ce ne sont PAS des
// titres de section : la table des sections de Three Sword Style ne contient ni Oni Giri ni
// Tatsumaki — les techniques vivent en items de liste sous « Techniques ». L'identité se prouve
// donc par le NOM EN GRAS qui ouvre l'item (ou le premier paramètre du gabarit Nihongo).
const LISTE_WIKI = /^([*#;:]+)/;
const nomDEntree = (ligne) => {
  const m = LISTE_WIKI.exec(ligne);
  if (!m) return null;
  // Le nom vit en TÊTE d'item ; un gras à 300 caractères du bord est une emphase de prose,
  // pas un intitulé (l'intro de Three Sword Style cite '''Oni Giri''' en pleine phrase — mais
  // sans marqueur de liste, donc déjà écartée ici).
  const tete = ligne.slice(0, 200);
  const gras = /'''([^'\n]+?)'''/.exec(tete);
  if (gras) return { profondeur: m[1].length, nom: gras[1] };
  const nihongo = /\{\{[Nn]ihongo\|([^|{}]+)\|/.exec(tete);
  if (nihongo) return { profondeur: m[1].length, nom: nihongo[1] };
  return null;
};

/**
 * PROSE D'UNE ATTAQUE SANS ARTICLE PROPRE, extraite de sa page hôte.
 * Quatre routes constatées (sonde du 07/08) :
 *   R1 : redirection avec fragment (« Room » → Ope Ope no Mi#Techniques)
 *   R2 : entrée/section d'une page de style ou de fruit (« Oni Giri » → Three Sword Style)
 *   R3 : sous-page …/Techniques (« Gomu Gomu no Mi/Gear 5 Techniques »)
 *   R4 : sous-page d'arme (Battle Frankies/BF-36)
 * IDENTITÉ = match canonique d'un TITRE DE SECTION ou du NOM EN GRAS d'une entrée de liste —
 * ou le fragment de la redirection (là, l'équivalence est affirmée par le wiki lui-même).
 * Le porteur sert d'ARBITRE entre pages candidates multiples : à qualité égale, on préfère la
 * page dont le wikitext cite un des porteurs connus de l'attaque.
 * PANNE ≠ ABSENCE : wget CRIE sur réseau mort ; null ne signifie ici qu'une absence vraie.
 *
 * @returns {Promise<{pageTitre:string,sectionTitre:string,url:string,route:'R1'|'R2'|'R3'|'R4',sections:Array<{titre:string,texte:string}>}|null>}
 */
export async function fetchFandomTechnique(universe, nomAttaque, { porteurs = [], slug = null } = {}) {
  const api = wikiApi(universe);
  if (!api) return null;
  const base = `https://${WIKIS[universe]}.fandom.com/wiki/`;

  // Formes canoniques acceptées pour le titre de section : le nom, et le slug dékébabé (il garde
  // souvent la graphie d'origine quand le champ `name` porte une variante — même témoin qu'en 04/08).
  const cibles = new Set([canonTechnique(nomAttaque)]);
  if (slug) cibles.add(canonTechnique(String(slug).replace(/^atk-[a-z0-9]+-/, '').replace(/-/g, ' ')));
  cibles.delete('');
  const compactes = new Set([...cibles].map((c) => c.replace(/ /g, '')));
  const matchLine = (line) => {
    const c = canonTechnique(line);
    if (cibles.has(c) || compactes.has(c.replace(/ /g, ''))) return true;
    // PRÉFIXE POSSESSIF DU WIKI (constaté 07/08) : l'entrée s'appelle « Gomu Gomu no Bajrang
    // Gun » quand notre nom est « Bajrang Gun » — le wiki préfixe du fruit, pas nous. L'entrée
    // matche si elle SE TERMINE par notre nom ET que le préfixe s'achève par la particule « no »
    // (le possessif japonais). Étroit à dessein : « Purgatory Oni Giri » ne matche pas « Oni
    // Giri » (préfixe sans « no ») — c'est une AUTRE attaque, pas un préfixe de style.
    for (const t of cibles) {
      if (t && c.endsWith(' ' + t) && c.slice(0, c.length - t.length - 1).endsWith(' no')) return true;
    }
    return false;
  };

  // Mots significatifs des porteurs, SANS le rapprochement ou→o de nameWords : ici on cherche la
  // citation LITTÉRALE dans le wikitext (« Brook » ne s'y écrit jamais « Brok »).
  const nu = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const motsPorteurs = (porteurs ?? []).flatMap((p) => nu(p).split(/[^a-z0-9]+/).filter((w) => w.length >= 4));
  const citePorteur = (wikitext) => {
    const wt = nu(wikitext);
    return motsPorteurs.some((w) => new RegExp(`\\b${w}\\b`).test(wt));
  };

  // ── a. sonde de redirection : le wiki connaît-il déjà ce nom ? (R1 si fragment) ──
  const jr = await wget(`${api}?action=query&titles=${encodeURIComponent(nomAttaque)}&redirects=1&format=json&formatversion=2`);
  await sleep(250);
  const redir = (jr?.query?.redirects ?? [])[0] ?? null;
  const fragment = redir?.tofragment ?? null;

  const essayes = new Set();

  // NIVEAUX DE PREUVE d'un intitulé (section ou entrée), du plus sûr au moins sûr :
  //   1 — équivalence canonique (nom, forme compactée « Fire Bird Star » ≡ « Firebird Star »,
  //       préfixe possessif « no »)
  //   2 — segment d'un intitulé à DEUX-POINTS (« Ittoryu Iai: Shishi Sonson » porte notre
  //       « Shishi Sonson » ; « Poêle à Frire: Spectre » porte notre « Poêle à Frire ») ;
  //       préfixe = le PORTEUR (« Franky Radical Beam » pour notre « Radical Beam ») ;
  //       mots-outils insérés (« Swallow Bond en Avant » ≡ « Swallow Bond Avant »)
  //   3 — TRADUCTION ATTESTÉE PAR LA LIGNE MÊME : même nombre de mots, UN seul d'écart, et le mot
  //       manquant est écrit dans la ligne — le champ « literally meaning » du gabarit Nihongo
  //       (« Rengoku Oni Giri … literally meaning "Purgatory Ogre Cutter" » prouve notre
  //       « Purgatory Oni Giri »). Rien n'est deviné : la preuve est dans la ligne.
  //   4 — le champ « literally meaning » PORTE notre nom : « Kamusari … literally meaning
  //       "Divine Departure" » prouve notre « Divine Departure ». Même logique : la preuve est
  //       écrite dans la ligne, on ne traduit rien nous-mêmes.
  const sansPetits = (c) => c.split(' ').filter((w) => w.length > 2).join(' ');
  const tierNom = (brut, ligne = '') => {
    if (matchLine(brut)) return 1;
    const c = canonTechnique(brut);
    const segs = String(brut).split(':');
    // DIRECTIONNEL (vague 07/08) : seul le sens « Préfixe: NotreNom » (« Ittoryu Iai: Shishi
    // Sonson ») vaut preuve directe — le sens inverse « NotreNom: Variante » (« Midori Boshi:
    // Devil ») livre une variante précise pour un nom générique ; il descend en tier 5, dernier
    // ressort, servi seulement quand le wiki ne connaît AUCUN autre référent (cas légitime :
    // « Poêle à Frire: Spectre », unique entrée du wiki pour ce nom).
    if (segs.length > 1 && matchLine(segs[segs.length - 1])) return 2;
    for (const t of cibles) {
      if (t && c.endsWith(' ' + t)) {
        const prefixe = c.slice(0, c.length - t.length - 1).split(' ').filter(Boolean);
        if (prefixe.length && prefixe.every((w) => motsPorteurs.includes(w))) return 2;
      }
      const sp = sansPetits(t);
      if (sp && sp.split(' ').length >= 2 && sansPetits(c) === sp) return 2;
    }
    if (ligne) {
      const motsLigne = new Set(canonTechnique(ligne).split(' '));
      const ce = c.split(' ');
      for (const t of cibles) {
        const ct = t.split(' ');
        if (ct.length !== ce.length || ct.length < 2) continue;
        const diff = ct.filter((w, k) => w !== ce[k]);
        if (diff.length === 1 && diff[0].length >= 3 && motsLigne.has(diff[0])) return 3;
      }
      // ÉGALITÉ STRICTE, pas « contient » : chaque technique Ryusoken porte « Dragon Claw
      // Fist » dans son literal — un « contient » faisait résoudre notre « Dragon Claw » sur
      // « Moeru Ryusoken: Kaen Ryuo », une variante enflammée qui n'est pas notre sujet.
      const lit = /literally meaning "([^"]+)"/i.exec(ligne);
      if (lit && cibles.has(canonTechnique(lit[1]))) return 4;
    }
    if (segs.length > 1 && segs.slice(0, -1).some((s) => matchLine(s))) return 5;
    return 0;
  };

  // Cherche dans `texteStr` la MEILLEURE entrée de liste (au sens des tiers) ; le bloc court
  // jusqu'à la prochaine entrée NOMMÉE de profondeur égale ou moindre, ou au prochain titre —
  // les sous-items (variantes en **) et lignes de continuation restent DANS le bloc, même
  // périmètre qu'une section qui emporte ses sous-sections.
  const chercheEntree = (texteStr) => {
    const lignes = texteStr.split('\n');
    let best = null;
    for (let li = 0; li < lignes.length; li++) {
      const e = nomDEntree(lignes[li]);
      if (!e) continue;
      const tier = tierNom(e.nom, lignes[li]);
      if (!tier || (best && best.tier <= tier)) continue;
      let finLi = lignes.length;
      for (let k = li + 1; k < lignes.length; k++) {
        if (/^=/.test(lignes[k])) { finLi = k; break; }
        const ek = nomDEntree(lignes[k]);
        if (ek && ek.profondeur <= e.profondeur) { finLi = k; break; }
      }
      best = {
        tier,
        nom: e.nom.replace(/\[\[|\]\]/g, '').replace(/''+/g, '').trim(),
        charIdx: lignes.slice(0, li).reduce((n, x) => n + x.length + 1, 0),
        bloc: lignes.slice(li, finLi).join('\n'),
      };
      if (tier === 1) break;                                // rien ne battra une preuve exacte
    }
    return best;
  };

  // UN SEUL parse par page candidate (prop combinés, comme fetchFandomSections) ; renvoie
  // { resultat, citePorteur } si une section OU une entrée porte le nom, null sinon (page
  // absente comprise — MediaWiki répond missingtitle en 200, wget le rend tel quel).
  async function essaie(titre, { fragmentCible = null, viaRedirect = false } = {}) {
    if (!titre || essayes.has(titre)) return null;
    essayes.add(titre);
    const j = await wget(`${api}?action=parse&page=${encodeURIComponent(titre)}&prop=wikitext%7Csections&redirects=1&format=json&formatversion=2`);
    await sleep(250);                                       // politesse Fandom (~4 req/s)
    const secs = j?.parse?.sections ?? [];
    const wikitext = String(j?.parse?.wikitext ?? '');
    if (!wikitext) return null;

    const pageTitre = j.parse.title ?? titre;
    const route = viaRedirect && fragmentCible ? 'R1'
      : /\/[^/]*techniques$/i.test(pageTitre) ? 'R3'
        : pageTitre.includes('/') ? 'R4'
          : 'R2';
    // Ancrage des sections en unités JS via posSection — l'unité de byteoffset dépend du wiki
    // (7 extractions corrompues en vague quand on tranchait le Buffer en octets, ce wiki servant
    // des offsets en caractères).
    const octets = Buffer.from(wikitext, 'utf8');
    const posDe = new Map(secs.map((s) => [s, posSection(wikitext, octets, s.byteoffset)]));
    const nettoie = (a, b) => cleanWikitext(
      wikitext.slice(a, b).replace(/^=+[^=\n]*=+\s*/, ''),
    ).replace(/\s+/g, ' ').trim();
    const titreDe = (s) => String(s.line).replace(/<[^>]+>/g, '').replace(/''+/g, '').trim();
    const bornes = (cible) => {
      const debut = posDe.get(cible);
      if (debut == null) return null;
      const fin = secs
        .filter((x) => posDe.get(x) != null && posDe.get(x) > debut && Number(x.toclevel) <= Number(cible.toclevel))
        .reduce((min, x) => Math.min(min, posDe.get(x)), wikitext.length);
      return [debut, fin];
    };
    const livre = (sectionTitre, anchor, sections) => ({
      resultat: {
        pageTitre,
        sectionTitre,
        url: `${base}${encodeURIComponent(pageTitre)}${anchor ? '#' + encodeURIComponent(anchor) : ''}`,
        route,
        sections,
      },
      // Une redirection vaut preuve d'identité à elle seule — pas besoin d'arbitre.
      citePorteur: viaRedirect || citePorteur(wikitext),
    });

    // Découpe d'une SECTION avec ses sous-sections, en unités JS ancrées par posSection.
    // Même périmètre que fetchFandomSections, mais SANS filtre toclevel.
    const coupeSection = (cible) => {
      const b0 = bornes(cible);
      if (!b0) return null;                                 // offset irrésolu : on saute, on ne devine pas
      const [debut, fin] = b0;
      const total = nettoie(debut, fin);
      if (total.length < 120) return null;                  // plancher : pas de quoi nourrir une fiche
      const sous = secs.filter((x) => posDe.get(x) != null && posDe.get(x) > debut && posDe.get(x) < fin);
      if (sous.length) {
        // Des sous-sections riches (> ~4 000 car. cumulés) écraseraient une fiche unique : on les
        // rend comme sections séparées, découpées au niveau des enfants directs.
        const minLvl = Math.min(...sous.map((x) => Number(x.toclevel)));
        const enfants = sous.filter((x) => Number(x.toclevel) === minLvl);
        const finEnfant = (s) => {
          const ap = secs.find((x) => posDe.get(x) != null && posDe.get(x) > posDe.get(s) && Number(x.toclevel) <= Number(s.toclevel));
          return ap ? Math.min(posDe.get(ap), fin) : fin;
        };
        const blocs = enfants.map((s) => ({ titre: titreDe(s), texte: nettoie(posDe.get(s), finEnfant(s)) }));
        if (blocs.reduce((n, b) => n + b.texte.length, 0) > 4000) {
          const tete = nettoie(debut, posDe.get(enfants[0]));
          const detail = tete.length >= 120 ? [{ titre: titreDe(cible), texte: tete }] : [];
          for (const b of blocs) if (b.texte.length >= 120) detail.push(b);
          if (detail.length) return detail;
        }
      }
      return [{ titre: titreDe(cible), texte: total }];
    };

    // ── 1. le fragment de redirection prime : c'est le wiki qui désigne la section, pas nous ──
    if (fragmentCible) {
      const parFrag = secs.find((s) => s.anchor === fragmentCible && posDe.get(s) != null)
        ?? secs.find((s) => posDe.get(s) != null && canonTechnique(s.line) === canonTechnique(fragmentCible.replace(/_/g, ' ')));
      if (parFrag) {
        // Fragment CONTENEUR (« Room » → #Techniques) : la section liste PLUSIEURS techniques —
        // on isole l'entrée de la nôtre plutôt que de livrer vingt attaques d'un bloc. Mais
        // SEULEMENT sur preuve EXACTE (tier 1) : la redirection « Midori Boshi » → #Pop Green
        // désigne la section ENTIÈRE comme notre sujet — en isoler « Midori Boshi: Devil »
        // (preuve faible) livrait une variante précise pour un nom générique (vague 07/08).
        if (!matchLine(fragmentCible.replace(/_/g, ' '))) {
          const b1 = bornes(parFrag);
          const e = b1 ? chercheEntree(wikitext.slice(b1[0], b1[1])) : null;
          if (e && e.tier === 1) {
            const texte = cleanWikitext(e.bloc).replace(/\s+/g, ' ').trim();
            if (texte.length >= 120) return livre(e.nom, parFrag.anchor, [{ titre: e.nom, texte }]);
          }
          // L'entrée exacte peut vivre dans une section SŒUR du fragment : la redirection
          // « Shima Yurashi » → #Techniques désigne un conteneur dont l'unique entrée est
          // Hakua — la nôtre vit sous « Unnamed Techniques » (servie FAUSSE en vague 07/08,
          // rattrapée à la main). Une preuve tier 1 n'importe où sur la page bat un conteneur
          // générique ; sans elle, la désignation du wiki reste la bonne réponse
          // (« Midori Boshi » → la section #Pop Green entière).
          const eg = chercheEntree(wikitext);
          if (eg && eg.tier === 1) {
            const texte = cleanWikitext(eg.bloc).replace(/\s+/g, ' ').trim();
            if (texte.length >= 120) {
              let englobante = null;
              for (const s of secs) {
                const off = posDe.get(s);
                if (off != null && off <= eg.charIdx && (!englobante || off > posDe.get(englobante))) englobante = s;
              }
              return livre(eg.nom, englobante?.anchor ?? parFrag.anchor, [{ titre: eg.nom, texte }]);
            }
          }
        }
        const coupe = coupeSection(parFrag);
        if (coupe) return livre(titreDe(parFrag), parFrag.anchor, coupe);
      }
      // fragment introuvable sur la page : on retombe sur la résolution par nom, ci-dessous
    }

    // ── 2. une SECTION porte le nom en preuve exacte (TOUS les toclevels : c'est précisément
    //       parce que ces attaques vivent en toclevel 3+ que fetchFandomSections ne les voyait pas) ──
    const parLigne = secs.find((s) => posDe.get(s) != null && tierNom(s.line) === 1);
    if (parLigne) {
      const coupe = coupeSection(parLigne);
      if (coupe) return livre(titreDe(parLigne), parLigne.anchor, coupe);
    }

    // ── 3. une ENTRÉE DE LISTE porte le nom en preuve DIRECTE (tiers 1-2) — le format
    //       majoritaire (Oni Giri, Concasse, Franky Radical Beam…) ──
    const e = chercheEntree(wikitext);
    const livreEntree = (e2) => {
      const texte = cleanWikitext(e2.bloc).replace(/\s+/g, ' ').trim();
      if (texte.length < 120) return null;
      // Ancre de la section ENGLOBANTE pour l'URL : la dernière dont la position précède l'entrée.
      let englobante = null;
      for (const s of secs) {
        const off = posDe.get(s);
        if (off == null) continue;
        if (off <= e2.charIdx && (!englobante || off > posDe.get(englobante))) englobante = s;
      }
      return livre(e2.nom, englobante?.anchor ?? null, [{ titre: e2.nom, texte }]);
    };
    if (e && e.tier <= 2) {
      const r = livreEntree(e);
      if (r) return r;
    }

    // ── 4. section COMPOSÉE « notre nom + le style de la page » : « King of Hell Three Sword
    //       Style » sur la page « Three Sword Style » désigne bien notre « King of Hell » — le
    //       reste du titre de section est exactement le sujet de la page hôte, pas une autre
    //       attaque. Preuve étroite : chaque mot du reste doit appartenir au titre de la page.
    //       AVANT les preuves par traduction : la section couvre l'état entier, pas une seule
    //       de ses techniques. ──
    const motsPage = new Set(canonTechnique(pageTitre).split(' '));
    const parCompose = secs.find((s) => {
      if (posDe.get(s) == null) return false;
      const c = canonTechnique(s.line);
      for (const t of cibles) {
        if (t && c.startsWith(t + ' ') && c.slice(t.length + 1).split(' ').every((w) => motsPage.has(w))) return true;
      }
      return false;
    });
    if (parCompose) {
      const coupe = coupeSection(parCompose);
      if (coupe) return livre(titreDe(parCompose), parCompose.anchor, coupe);
    }

    // ── 5. dernier ressort : entrée puis section prouvées par TRADUCTION (tiers 3-4) ──
    if (e) {
      const r = livreEntree(e);
      if (r) return r;
    }
    const parTier = secs.find((s) => posDe.get(s) != null && tierNom(s.line) > 0);
    if (parTier) {
      const coupe = coupeSection(parTier);
      if (coupe) return livre(titreDe(parTier), parTier.anchor, coupe);
    }
    return null;
  }

  // Meilleur match SANS citation de porteur : gardé en secours, au cas où aucun candidat cité ne sort.
  let secours = null;

  // ── la redirection d'abord : identité affirmée par le wiki lui-même (R1/R4) ──
  if (redir?.to) {
    const r = await essaie(redir.to, { fragmentCible: fragment, viaRedirect: true });
    if (r) return r.resultat;
    if (!redir.to.includes('/')) {
      const r3 = await essaie(`${redir.to}/Techniques`);
      if (r3) {
        if (r3.citePorteur || !motsPorteurs.length) return r3.resultat;
        secours ??= r3.resultat;
      }
    }
  }

  // ── b. recherche exacte (guillemets = phrase entière) : la page hôte sort en tête (R2) ──
  const filtreHits = (js) => (js?.query?.search ?? []).map((h) => h.title)
    .filter((t) => !META.test(t) && !REBUT_TECHNIQUE.test(t));
  // srlimit=10 et pas 5 : les épisodes et chapitres monopolisent la tête du classement (« Gamma
  // Knife » place Ope Ope no Mi en 9e position) — le filtre à rebut fait le tri derrière.
  const js = await wget(`${api}?action=query&list=search&srsearch=${encodeURIComponent(`"${nomAttaque}"`)}&srlimit=10&format=json&formatversion=2`);
  await sleep(250);
  let hits = filtreHits(js);
  if (!hits.length) {
    // La phrase EXACTE ne replie pas les diacritiques : « Poele à Frire » (notre graphie) ne
    // trouve jamais « Poêle à Frire » (celle du wiki). La recherche par MOTS, elle, replie —
    // on ne s'en sert qu'à sec, la phrase exacte restant plus précise quand elle répond.
    const js2 = await wget(`${api}?action=query&list=search&srsearch=${encodeURIComponent(nomAttaque)}&srlimit=10&format=json&formatversion=2`);
    await sleep(250);
    hits = filtreHits(js2);
  }

  // ── c+d+e. chaque candidat puis sa sous-page /Techniques (R3) ; le porteur arbitre ──
  // Pages de BASE avant les sous-pages (tri stable : l'ordre de la recherche survit dans chaque
  // groupe) : « Concassé » existe sur Black Leg Style (la version de base) ET sur la sous-page
  // /Diable Jambe (sa variante enflammée, qui se décrit elle-même comme « the Diable Jambe
  // version ») — le classement de recherche servait la variante en premier (vague 07/08).
  hits.sort((a, b) => (a.includes('/') ? 1 : 0) - (b.includes('/') ? 1 : 0));
  for (const t of hits) {
    for (const cand of [t, t.includes('/') ? null : `${t}/Techniques`]) {
      if (!cand) continue;
      const r = await essaie(cand);
      if (!r) continue;
      if (r.citePorteur || !motsPorteurs.length) return r.resultat;
      secours ??= r.resultat;
    }
  }

  // ── recherche QUALIFIÉE PAR PORTEUR, dernier filet avant l'absence : « Liberation » seul
  //     noie la page hôte sous les épisodes (Yami Yami no Mi hors du top 10), « Liberation
  //     Teach » la fait remonter. On n'y passe qu'à sec — et l'identité reste prouvée par le
  //     titre de section ou d'entrée, jamais par le classement de la recherche. ──
  if (!secours) {
    for (const p of (porteurs ?? []).slice(0, 2)) {
      const mots = nu(p).split(/[^a-z0-9]+/).filter((w) => w.length >= 4).join(' ');
      if (!mots) continue;
      const jp = await wget(`${api}?action=query&list=search&srsearch=${encodeURIComponent(`${nomAttaque} ${mots}`)}&srlimit=5&format=json&formatversion=2`);
      await sleep(250);
      for (const t of filtreHits(jp)) {
        const r = await essaie(t);
        if (!r) continue;
        if (r.citePorteur || !motsPorteurs.length) return r.resultat;
        secours ??= r.resultat;
      }
    }
  }
  return secours;                                           // null = absence vraie, à sec de candidats
}
