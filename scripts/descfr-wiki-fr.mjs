// scripts/descfr-wiki-fr.mjs — CHANTIER « les fiches sans texte français » (attributes.descFr).
//
// ── LE PROBLÈME ────────────────────────────────────────────────────────────────────────────────
// Une fiche sans `descFr` n'a pas de corps : un titre, des attributs, rien à lire — et c'est elle
// qui alimente la méta-description (app/learn/akasha/[slug]/page.tsx, `flavorExcerpt(descFr, 155)`).
//
// ── POURQUOI LE WIKI FRANCOPHONE, ET LUI SEUL ─────────────────────────────────────────────────
// `scripts/lib/fandom.mjs` interroge le wiki ANGLOPHONE. Sa matière est en anglais : la poser dans
// `descFr` supposerait de la traduire, c'est-à-dire de FABRIQUER le texte. Le wiki francophone de
// chaque univers (onepiece.fandom.com/fr…) écrit déjà en français : on EXTRAIT, on ne rédige pas.
// Quand il n'a pas la page, la fiche reste vide et compte dans les plafonds — c'est la seule
// réponse honnête, et elle coûte moins cher qu'un texte inventé.
//
// ── POURQUOI LE HTML RENDU ET PAS LE WIKITEXTE ────────────────────────────────────────────────
// Premier essai fait au wikitexte + `cleanWikitext` : les wikis FR posent le NOM de leur sujet dans
// un gabarit (`{{Nihongo|…}}`), que le nettoyeur supprime avec tous les autres. Sortie mesurée :
// « Le est une transformation exclusive à la série Dragon Ball GT. », « Les est au centre du style
// de combat d'un , … » — des phrases amputées de leur sujet, plus les résidus « Catégorie:Armes ».
// Le HTML rendu (`action=parse&prop=text`) est ce que le wiki AFFICHE, gabarits déjà développés :
// c'est la même matière, lue là où elle est complète. Le connecteur lit déjà l'infobox de cette
// façon (`fetchFandomInfobox`) — on ne fait donc que réemployer un chemin éprouvé du dépôt.
//
// ── TROIS ROUTES, AUCUNE RECHERCHE PLEIN TEXTE ────────────────────────────────────────────────
// La recherche plein texte est la route qui a produit toutes les fautes d'identité de l'usine
// (« Giorno's Mother » → Giorno, « Ain » → Ain des Neo Marines). Elle est exclue ici.
//   1. TITRE EXACT sur le wiki FR — nos noms curés SONT ses titres (« Île Confiture »).
//   2. SLUG dékébabé comme titre — nos slugs gardent souvent le nom d'origine.
//   3. PONT INTERLANGUE — le wiki ANGLAIS (résolu par le connecteur existant, avec ses gardes)
//      DÉCLARE lui-même sa page française (`prop=langlinks`). C'est un des trois ponts admis
//      (leçon du 10/08) : ni deviné, ni traduit — écrit par la source. Exigence supplémentaire :
//      la page FR doit RENVOYER vers la même page EN (aller-retour), sinon la correspondance n'est
//      pas 1:1 et on décrirait un sujet voisin (« Chakra Threads » → FR « Marionnettisme »).
//
// ── GARDES (toutes déjà payées, reprises telles quelles) ──────────────────────────────────────
//   · le titre RÉSOLU doit désigner NOTRE entité : titre ≡ nom, ou slug ≡ titre, ou redirection
//     déclarée sans fragment (`formeCourteAttestee`), ou pont interlangue symétrique ;
//   · REFUS des redirections de SECTION (`tofragment`) — DES DEUX CÔTÉS. Côté anglais, c'est ce
//     qui sauve « Shima Yurai » : son alias curé mène à « Gura Gura no Mi » avec le fragment
//     « Techniques », donc notre technique n'est qu'un MORCEAU de la page du fruit ; en prendre le
//     chapeau donnerait au lecteur la description du fruit sur la fiche d'une technique ;
//   · REFUS des pages d'œuvre/liste (`pageDOeuvre`) et d'homonymie (variante FR ajoutée ici) ;
//   · REFUS des pages plus générales que l'entité (`pagePlusGenerale`) ;
//   · REFUS d'une page réclamée par PLUSIEURS de nos fiches — deux fiches distinctes décrites par
//     le même texte, c'est la classe d'erreur du 08/08 (`fu-yamanaka` portant la bio d'`ino`).
//
// Usage :
//   node --env-file=.env.local scripts/descfr-wiki-fr.mjs --dry [--n=60] [--sortie=nom]
//   node --env-file=.env.local scripts/descfr-wiki-fr.mjs --appliquer --candidats=<fichier.json>
import { writeFile, readFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import {
  fetchFandomProse, libelleNu,
  sameEntityName, sameEntityBySlug, titreStrictementEgal, titrePlusRiche,
  pageDOeuvre, pagePlusGenerale, formeCourteAttestee,
} from './lib/fandom.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DRY = !process.argv.includes('--appliquer');
const N = Number(arg('n', 0));

const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const API_FR = {
  'One Piece': 'https://onepiece.fandom.com/fr/api.php',
  'Naruto': 'https://naruto.fandom.com/fr/api.php',
  'Bleach': 'https://bleach.fandom.com/fr/api.php',
  'Dragon Ball': 'https://dragonball.fandom.com/fr/api.php',
};
const HOTE_FR = (u) => API_FR[u].replace('/api.php', '');
// Témoin par univers : si LUI ne répond pas, c'est l'hôte qui est en cause, pas nos noms
// (leçon du 10/08 : un rendement nul mesure d'abord l'extracteur, jamais la source).
const TEMOIN = { 'One Piece': 'Monkey D. Luffy', 'Naruto': 'Naruto Uzumaki', 'Bleach': 'Ichigo Kurosaki', 'Dragon Ball': 'Son Goku' };

const dort = (ms) => new Promise((s) => setTimeout(s, ms));
async function jget(u, essais = 3) {
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(25_000) });
      if (r.status === 429 || r.status >= 500) { await dort(1200 * (i + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { await dort(800 * (i + 1)); }
  }
  return null;
}
const parseUrl = (api, t) => `${api}?action=parse&page=${encodeURIComponent(t)}`
  + '&prop=text%7Csections%7Clanglinks&redirects=1&format=json&formatversion=2';

async function pageFr(univers, titre) {
  const j = await jget(parseUrl(API_FR[univers], titre));
  await dort(160);
  if (!j?.parse?.text) return null;
  return {
    titre: j.parse.title ?? titre,
    html: j.parse.text,
    redirections: (j.parse.redirects ?? []).map((r) => ({ from: r.from, to: r.to, tofragment: r.tofragment })),
    sections: (j.parse.sections ?? []).map((x) => String(x.line ?? '')),
    // Le lien interlangue que la page FR déclare vers l'anglais : c'est lui qui referme l'aller-retour.
    versEn: (j.parse.langlinks ?? []).find((l) => l.lang === 'en')?.['*']
      ?? (j.parse.langlinks ?? []).find((l) => l.lang === 'en')?.title ?? null,
  };
}

/** Page d'homonymie francophone — `pageDOeuvre` ne connaît que « (disambiguation) ». */
const HOMONYMIE = /\(homonymie\)/i;

/** LE TITRE EST-IL NOTRE NOM AMPUTÉ D'UN MOT PORTEUR ? (complément local à `pagePlusGenerale`)
 *
 *  `pagePlusGenerale` ne compte que les mots de plus de deux lettres : sur « Navire du G-5 » face
 *  au titre « G-5 », elle ne voit AUCUN mot du côté du titre et se tait — c'est ainsi que notre
 *  navire s'est retrouvé décrit par la page de la BASE NAVALE G-5 (contrôle des 20). On repose donc
 *  la même question sur la tokenisation qui garde les mots courts, en exigeant que le mot perdu
 *  soit PORTEUR : « L'Équipage des Maquereaux » → « Équipage des Maquereaux » ne perd qu'un article
 *  et doit continuer de passer. */
const ARTICLES = new Set(['l', 'd', 'des', 'un', 'une', 'et', 'a', 'au', 'aux', 'en', 'no', 'to', 'and']);
const jetons = (s) => new Set(String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  .filter((w) => w && !['the', 'of', 'de', 'du', 'la', 'le', 'les', 's'].includes(w)));
function titreAmputeDuNom(nom, titre) {
  const n = jetons(nom), t = jetons(titre);
  if (!n.size || !t.size || t.size >= n.size) return false;
  if (![...t].every((w) => n.has(w))) return false;            // le titre dit autre chose : hors sujet ici
  return [...n].some((w) => !t.has(w) && !ARTICLES.has(w));    // un mot PORTEUR a disparu
}

// ── EXTRACTION DU CHAPEAU DEPUIS LE HTML RENDU ────────────────────────────────────────────────
/** Retire un bloc `<tag …>…</tag>` en partant des plus imbriqués : une simple regex non gourmande
 *  laisse traîner les fermetures des blocs englobants (tables de citation dans des `<center>`). */
function sansBloc(html, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>(?:(?!<${tag}\\b)[\\s\\S])*?<\\/${tag}>`, 'gi');
  let avant; let s = html; let tours = 0;
  do { avant = s; s = s.replace(re, ' '); } while (s !== avant && ++tours < 8);
  return s;
}
const ENTITES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", '#160': ' ', '#91': '[', '#93': ']', '#95': '_' };
const detag = (h) => h
  .replace(/<sup\b[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '')   // appels de note
  .replace(/<[^>]+>/g, '')
  .replace(/&(#?\w+);/g, (m, k) => ENTITES[k] ?? (/^#\d+$/.test(k) ? String.fromCharCode(Number(k.slice(1))) : m))
  .replace(/\[\s*\d+\s*\]/g, '')
  .replace(/\s+/g, ' ').trim();

/** Une note de renvoi en tête d'article (« Cette page parle de… », « Pour son Zanpakutō, voir X »)
 *  parle d'une AUTRE page : c'est justement le texte qu'il ne faut pas prendre pour une définition.
 *  Mesuré sur le contrôle des 20 : sur `wabisuke-bleach`, le renvoi s'était SOUDÉ à la définition
 *  (« …voir Izuru Kira Wabisuke est l'esprit manifesté… ») parce que les deux vivaient dans deux
 *  blocs HTML voisins et que le nettoyage les avait recollés sans ponctuation. D'où la coupure aux
 *  frontières de BLOCS avant tout filtrage — un filtre de phrases ne pouvait pas les séparer. */
const RENVOI = /^(cet article|cette page|pour (le|la|les|l'|un|une|son|sa|ses|d)|si vous (cherchez|recherchez)|voir aussi|redirig|remarque\s*:|article détaillé)/i;

/** UN LIEU SE DÉFINIT COMME UN LIEU (garde de NATURE, ajoutée après le contrôle des 40).
 *
 *  Le seul défaut survivant du contrôle : notre `place` « Noko » (une des 34 îles de Totto Land,
 *  ministre Charlotte Opera) est tombée sur la page FR « Noko » — un HIPPOCAMPE de jeu vidéo.
 *  Titre rigoureusement égal au nôtre : la preuve d'identité la plus forte du chantier disait oui,
 *  et elle avait raison sur le LIBELLÉ. C'est une homonymie franche entre deux natures d'entité,
 *  que seule la nature peut départager — et la nature, nous l'avons déjà en base (`type`).
 *  On ne l'applique qu'aux lieux : c'est là que le vocabulaire de définition est sûr (« est une
 *  île », « est un royaume »), et c'est le seul type où le défaut s'est produit. Ailleurs, une
 *  liste de mots serait une présomption, pas une preuve. */
const MOTS_DE_LIEU = /\b(île|iles|îles|archipel|ville|cité|capitale|royaume|pays|région|village|bourg|continent|planète|monde|territoire|domaine|mer|océan|baie|golfe|détroit|montagne|mont|colline|vallée|plaine|désert|forêt|jungle|lac|rivière|fleuve|port|quartier|base|quartier général|prison|château|palais|temple|sanctuaire|tour|caverne|grotte|station|camp|dimension|univers|localité|lieu|endroit|zone|secteur|route|chemin|col)\b/i;

/** CHAPEAU D'ARTICLE : tout ce qui précède le premier titre de section (ou le sommaire), c'est-à-dire
 *  la définition que le wiki donne de son sujet. Pris TEL QUEL — rien n'est rédigé ici.
 *
 *  On ne peut PAS se contenter des `<p>` : sur One Piece FR, la phrase de tête est du texte NU
 *  après l'infobox (« <b>Sweet City</b> est la capitale de… », sans balise de paragraphe). Un
 *  extracteur qui ne lit que les `<p>` rendait 0 caractère sur 16 pages de l'essai — il mesurait
 *  sa propre étroitesse, pas la source (leçon du 10/08). */
function chapeauHtml(html) {
  let h = html.replace(/<!--[\s\S]*?-->/g, ' ');
  // Blocs qui ne sont pas de la prose : infobox, tableaux, images, citations mises en scène,
  // notes de renvoi en tête d'article.
  h = h.replace(/<div\b[^>]*class="[^"]*(dablink|hatnote|notice)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ');
  for (const t of ['aside', 'table', 'figure', 'center', 'style']) h = sansBloc(h, t);
  // Le chapeau s'arrête au premier titre de section — ou au sommaire, qui le précède parfois.
  const bornes = [h.search(/<h[23]\b/i), h.indexOf('<div id="toc"'), h.indexOf('id="toc"')]
    .filter((i) => i > 0);
  if (bornes.length) h = h.slice(0, Math.min(...bornes));
  // Marquer les frontières de blocs AVANT de retirer les balises : sans ça, une note de renvoi et
  // la définition qui la suit se retrouvent dans la même phrase, et aucun filtre ne peut les
  // séparer (cas `wabisuke-bleach` du contrôle des 20).
  h = h.replace(/<\/(p|div|i|em|small|center|dd|dt|li|blockquote)>|<br\s*\/?>/gi, ' ¶ ');
  const blocs = detag(h).split('¶').map((b) => b.trim()).filter(Boolean);
  // Le renvoi ne se retire qu'en TÊTE : plus loin, « Pour la… » peut appartenir à la prose.
  while (blocs.length && RENVOI.test(blocs[0])) blocs.shift();
  // Le marqueur de bloc a fait son travail, il laisse une espace là où il n'y en avait pas :
  // « (マクロ一味, Makuro Ichimi ) », le nom romanisé vivant dans son propre <i>. Une espace avant
  // « ) », « , » ou « . » est toujours fautive en français — contrairement à celle qui précède
  // « : », « ; », « ! », « ? », « » », qui est la règle : on ne touche qu'aux trois premières.
  return blocs.join(' ').replace(/\s+([),.])/g, '$1').split(/(?<=[.!?])\s+/);
}

/** Coupe à la dernière phrase entière sous `max`. On ne tronque JAMAIS en plein mot : un texte
 *  coupé net est déjà passé une fois en base (audit « textes coupés » du 08/08). */
function couper(t, max = 700) {
  if (t.length <= max) return t;
  const seg = t.slice(0, max);
  const i = Math.max(seg.lastIndexOf('. '), seg.lastIndexOf('! '), seg.lastIndexOf('? '));
  return i > 120 ? seg.slice(0, i + 1).trim() : seg.slice(0, seg.lastIndexOf(' ')).trim() + '…';
}

const motsNus = (s) => new Set(String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().split(/[^a-z0-9]+/).filter((m) => m.length > 2));
/** LE CHAPEAU NOMME-T-IL SON SUJET ?
 *
 *  Sur les routes DIRECTES (titre exact, slug), ce n'est qu'un SIGNAL : beaucoup de fiches de
 *  technique décrivent l'effet sans nommer la technique (« L'utilisateur saute vers l'adversaire
 *  et attaque… » sur la page « Dynamic Action ») — refuser là-dessus jetterait de la bonne matière.
 *
 *  Sur le PONT INTERLANGUE, c'est un REFUS, et c'est la contrepartie d'une preuve d'identité
 *  indirecte : quand le chapeau d'une page ne nomme pas le titre de cette page, c'est le signe
 *  que la page et son titre ont divergé (fusion, renommage) — et alors la correspondance déclarée
 *  entre les deux langues n'est plus de un à un. Cas mesuré : notre « Chakra Threads » arrivait
 *  sur la page FR « Marionnettisme », dont le chapeau définit les « Techniques de Marionnettiste »
 *  (Kugutsu no Jutsu) : deux techniques distinctes côté anglais, fondues en une côté français. */
function nommeSonSujet(texte, nom, titre) {
  const dans = motsNus(texte); const cibles = [...motsNus(nom), ...motsNus(titre)];
  return cibles.length === 0 || cibles.some((m) => dans.has(m));
}

// ══════════════════════════════════════════════════════════════════════════════════════════════
async function main() {
  const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
  const s = clientSite();

  const temoins = {};
  for (const [u, t] of Object.entries(TEMOIN)) {
    const p = await pageFr(u, t);
    temoins[u] = { titre: t, repond: Boolean(p), octets: p?.html.length ?? 0 };
    if (!p) console.error(`✗ TÉMOIN MUET : ${u} — l'hôte FR ne répond pas, rien ne sera écrit pour cet univers`);
  }

  // ── POPULATION (PAGINÉE — un select nu s'arrête à 1 000 lignes sans le dire) ────────────────
  const PAS = 1000; const corpus = [];
  for (let d = 0; ; d += PAS) {
    const { data, error } = await s.from('akasha_entries')
      .select('id,slug,name,type,universe,attributes').order('id').range(d, d + PAS - 1);
    if (error) throw new Error(`lecture @${d} : ${error.message}`);
    corpus.push(...(data ?? []));
    if (!data || data.length < PAS) break;
  }
  const vide = (x) => typeof x !== 'string' || !x.trim();
  const sansDescFr = corpus.filter((l) => vide(l.attributes?.descFr));
  let cible = sansDescFr.filter((l) => API_FR[l.universe] && temoins[l.universe].repond);
  console.log(`corpus ${corpus.length} · sans descFr ${sansDescFr.length} · traitables ${cible.length}`);
  // `--slugs=` : rejouer les cas d'une batterie de garde sur le CODE DE PRODUCTION lui-même, pas
  // sur une copie (leçon du 07/08 : un test qui recopie la garde ne teste que sa copie).
  const seuls = arg('slugs')?.split(',').map((x) => x.trim()).filter(Boolean);
  if (seuls) cible = cible.filter((l) => seuls.includes(l.slug));
  if (N) cible = cible.slice(0, N);

  // ── RÉSOLUTION ─────────────────────────────────────────────────────────────────────────────
  const res = []; let n = 0;
  for (const f of cible) {
    n++;
    const r = { slug: f.slug, name: f.name, universe: f.universe, type: f.type };
    let p = await pageFr(f.universe, f.name); let route = p ? 'titre-exact' : null;
    let pontEn = null;

    if (!p) {
      const parSlug = String(f.slug).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      if (libelleNu(parSlug) !== libelleNu(f.name)) {
        p = await pageFr(f.universe, parSlug);
        if (p) route = 'slug';
      }
    }

    if (!p) {
      try {
        const en = await fetchFandomProse(f.universe, f.name, { maxChars: 300, slug: f.slug });
        const fragmentEn = (en?.redirections ?? []).find((x) => x.tofragment) ?? null;
        if (en?.title && !en.pageOeuvre && !fragmentEn && (en.sameEntity || en.aliasCure || en.identiteAttestee)) {
          const q = await jget(`${en.url.split('/wiki/')[0]}/api.php?action=query&prop=langlinks&lllang=fr`
            + `&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(en.title)}`);
          await dort(160);
          const fr = q?.query?.pages?.[0]?.langlinks?.[0]?.title ?? null;
          if (fr) {
            p = await pageFr(f.universe, fr);
            if (p) { route = 'langlink'; pontEn = { titreEn: en.title, resolvedBy: en.resolvedBy, titreFrDeclare: fr, retour: p.versEn }; }
          }
        } else if (en?.title) {
          r.pontRefuse = fragmentEn ? `redirection de section côté EN (${fragmentEn.from} → ${fragmentEn.to}#${fragmentEn.tofragment})`
            : en.pageOeuvre ?? 'identité EN non prouvée';
        }
      } catch { /* le connecteur EN est faillible : son échec n'arrête pas le lot */ }
    }

    if (!p) { r.etat = 'sans-page-fr'; res.push(r); continue; }

    r.route = route; r.titreFr = p.titre; if (pontEn) r.pontEn = pontEn;
    r.url = `${HOTE_FR(f.universe)}/wiki/${encodeURIComponent(p.titre.replace(/ /g, '_'))}`;
    r.redirections = p.redirections; r.sections = p.sections.slice(0, 10);

    const paras = chapeauHtml(p.html);
    const texte = paras.join(' ').replace(/\s+/g, ' ').trim();
    const att = { redirections: p.redirections, sections: p.sections };

    const fragment = p.redirections.find((x) => x.tofragment) ?? null;
    // UNE SEULE ÉCHELLE DE PREUVE POUR LES TROIS ROUTES. Le pont interlangue sert à TROUVER la
    // page, jamais à prouver l'identité : mesuré au contrôle des 20, le pont NU (aucune
    // correspondance de nom, seulement le lien déclaré entre les deux wikis) donnait 2 justes et
    // 2 faux sur 4 — « Eight-Tails » décrit par la page du bijû Gyûki, et « Magnet Release:
    // Conserving Bee Twin Blades » par « Jiton - Shuriken Magnétique », qui est la technique d'un
    // AUTRE ninja. Un pont à une chance sur deux n'est pas une preuve : la route reste, la preuve
    // doit venir du nom, du slug ou d'une redirection déclarée — les quatre témoins déjà payés.
    r.allerRetour = route === 'langlink'
      ? Boolean(pontEn?.retour && libelleNu(pontEn.retour) === libelleNu(pontEn.titreEn)) : null;
    r.identite = titreStrictementEgal(f.name, p.titre) ? 'titre-egal'
      : sameEntityName(f.name, p.titre) ? 'meme-nom'
        : sameEntityBySlug(f.slug, p.titre) ? 'slug-egal'
          : formeCourteAttestee(f.name, p.titre, att) ? 'redirection-declaree' : null;
    // PARENTHÈSE DE DÉSAMBIGUÏSATION — la faute des deux Bleach du contrôle des 20 : notre
    // artefact « Wabisuke » (le sabre) tombait sur « Wabisuke (Esprit Zanpakutō) », la page de
    // l'ESPRIT, et `sameEntityName` disait oui puisque tous nos mots y sont. `titrePlusRiche`
    // sait déjà séparer la glose (« Leech (Hiru) », qui enrichit) du tri entre homonymes (« Ain
    // (Neo Marines) », où le titre nu EST déjà notre nom) : on lui pose la question.
    r.desambiguisation = /\([^)]*\)/.test(p.titre)
      && !titreStrictementEgal(f.name, p.titre) && !titrePlusRiche(f.name, p.titre);
    // TITRE ENRICHI SANS ATTESTATION — la faute du second contrôle des 20. Notre artefact « Le One
    // Piece » (le trésor) est tombé sur la page « One Piece en France », qui raconte la parution du
    // manga chez Glénat : tous nos mots y sont, donc `sameEntityName` disait oui. Un titre qui
    // AJOUTE des mots aux nôtres ne désigne notre entité que si le wiki le dit — par une
    // redirection de notre nom exact (« Shichiseiken » → « Sabre des Sept Étoiles », gardé) ou par
    // une égalité de libellé. Sans témoin, un ajout de mots est un CHANGEMENT DE SUJET (« … en
    // France », « … de la Marine ») aussi souvent qu'une glose, et rien dans le libellé ne les
    // sépare. On exige donc l'attestation, comme partout ailleurs dans ce chantier.
    r.titreEnrichi = jetons(p.titre).size > jetons(f.name).size
      && jetons(p.titre).size > jetons(String(f.slug).replace(/-/g, ' ')).size
      && r.identite !== 'titre-egal' && r.identite !== 'redirection-declaree';
    r.oeuvre = pageDOeuvre(p.titre, texte);
    r.homonymie = HOMONYMIE.test(p.titre);
    // Vaut pour les TROIS routes : « Navire du G-5 » arrivait sur la page « G-5 », qui est la base
    // navale et non le navire — les mots du titre sont un sous-ensemble strict des nôtres.
    r.plusGenerale = pagePlusGenerale(f.name, p.titre, att)
      ?? (formeCourteAttestee(f.name, p.titre, att) || !titreAmputeDuNom(f.name, p.titre) ? null
        : `titre amputé d'un mot porteur : « ${p.titre} » ne dit pas « ${f.name} »`);
    r.longueur = texte.length;
    r.natureDeLieu = f.type === 'place' ? MOTS_DE_LIEU.test(texte) : null;
    r.nommeSujet = nommeSonSujet(texte, f.name, p.titre);
    r.nommeSonTitre = nommeSonSujet(texte, '', p.titre);

    r.etat = !r.identite ? (route === 'langlink' ? 'pont-nu-sans-preuve-de-nom' : 'identite-refusee')
      : fragment ? 'redirection-de-section'
        : r.desambiguisation ? 'parenthese-de-desambiguisation'
          : r.titreEnrichi ? 'titre-enrichi-non-atteste'
          : r.oeuvre ? 'page-oeuvre'
            : r.homonymie ? 'page-homonymie'
              : r.plusGenerale ? 'page-plus-generale'
              // Garde-fou de longueur, PAS un critère de qualité : « Kibi est une région du Pays
              // des Wa. » (35 signes) est une définition juste et complète, et un seuil haut la
              // jetterait au motif qu'elle est brève (leçon du 10/08 sur les seuils de longueur).
              // Ce plancher n'écarte que les pages vides et les redirections douces.
              : texte.length < 45 ? 'chapeau-trop-court'
                : (route === 'langlink' && !r.nommeSonTitre) ? 'pont-page-derivee'
                  : r.natureDeLieu === false ? 'lieu-decrit-comme-autre-chose'
                    : 'candidat';
    if (fragment) r.fragment = fragment;
    if (r.etat === 'candidat') {
      r.descFr = couper(texte);
      r.descFrSource = `wiki FR ${HOTE_FR(f.universe).replace('https://', '')} — « ${p.titre} » (CC BY-SA) ${r.url}`;
    } else {
      r.extrait = texte.slice(0, 180);
    }
    res.push(r);
    if (n % 25 === 0) console.log(`  … ${n}/${cible.length}`);
  }

  // ── GARDE DE DOUBLE RÉCLAMATION ────────────────────────────────────────────────────────────
  const parPage = new Map();
  for (const r of res.filter((x) => x.titreFr)) {
    const k = `${r.universe}|${libelleNu(r.titreFr)}`;
    parPage.set(k, [...(parPage.get(k) ?? []), r.slug]);
  }
  const disputees = [...parPage.entries()].filter(([, v]) => v.length > 1);
  const slugsDisputes = new Set(disputees.flatMap(([, v]) => v));
  for (const r of res) if (slugsDisputes.has(r.slug)) { r.etatAvantDispute = r.etat; r.etat = 'page-disputee'; delete r.descFr; }

  const compte = {}; for (const r of res) compte[r.etat] = (compte[r.etat] ?? 0) + 1;
  const candidats = res.filter((r) => r.etat === 'candidat');
  console.log('\nétats :', compte);
  console.log(`pages disputées : ${disputees.length} · candidats : ${candidats.length}`);
  console.log(`  dont chapeau qui ne nomme pas son sujet (signal) : ${candidats.filter((c) => !c.nommeSujet).length}`);

  // ── TRACE, TOUJOURS AVANT ÉCRITURE, CHEMIN NEUF À CHAQUE EXÉCUTION ─────────────────────────
  const nom = arg('sortie', DRY ? 'dry' : 'application');
  const chemin = `data/audits/descfr-wiki-fr-${nom}-${horodatage}.json`;
  await writeFile(new URL(`../${chemin}`, import.meta.url), JSON.stringify({
    chantier: 'descFr depuis le wiki francophone', mode: DRY ? 'dry' : 'application',
    quand: new Date().toISOString(), temoins, corpus: corpus.length,
    sansDescFr: sansDescFr.length, cible: cible.length, compte,
    disputees: disputees.map(([k, v]) => ({ page: k, fiches: v })), cas: res,
  }, null, 1));
  console.log(`trace → ${chemin}`);
  if (DRY) return;

  // ── ÉCRITURE ───────────────────────────────────────────────────────────────────────────────
  // UNE SEULE COLONNE, la mienne : `attributes` est relu JUSTE AVANT chaque écriture et seules
  // `descFr`/`descFrSource` y sont ajoutées. L'usine écrit en parallèle sur d'autres clés — un
  // objet lu en début de lot serait périmé au moment de le reposer.
  const liste = arg('candidats')
    ? (JSON.parse(await readFile(arg('candidats'), 'utf8')).cas ?? JSON.parse(await readFile(arg('candidats'), 'utf8')))
      .filter((c) => c.etat === 'candidat' && c.descFr)
    : candidats;
  console.log(`\nÉCRITURE de ${liste.length} description(s)`);
  let posees = 0, deja = 0, absentes = 0, echecs = 0; const journal = [];
  for (const c of liste) {
    const { data, error } = await s.from('akasha_entries').select('id,attributes')
      .eq('slug', c.slug).eq('universe', c.universe).limit(2);
    if (error) { echecs++; continue; }
    if (!data?.length) { absentes++; continue; }
    if (data.length > 1) { echecs++; console.log(`  ✗ ${c.slug} : ${data.length} lignes pour ce slug`); continue; }
    const e = data[0];
    if (typeof e.attributes?.descFr === 'string' && e.attributes.descFr.trim()) { deja++; continue; }
    const attributes = { ...(e.attributes ?? {}), descFr: c.descFr, descFrSource: c.descFrSource };
    const { error: err2 } = await s.from('akasha_entries').update({ attributes }).eq('id', e.id);
    if (err2) { echecs++; console.log(`  ✗ ${c.slug} : ${err2.message}`); continue; }
    posees++; journal.push({ slug: c.slug, id: e.id, url: c.url, route: c.route, longueur: c.descFr.length });
    if (posees % 25 === 0) console.log(`  … ${posees} posées`);
  }
  console.log(`FINAL — ${posees} posée(s) · ${deja} déjà décrite(s) · ${absentes} introuvable(s) · ${echecs} échec(s)`);
  await writeFile(new URL(`../data/audits/descfr-wiki-fr-journal-${horodatage}.json`, import.meta.url),
    JSON.stringify({ quand: new Date().toISOString(), posees, deja, absentes, echecs, journal }, null, 1));
}

await main();
