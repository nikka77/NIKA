// scripts/lib/dossier-fr.mjs — LA MATIÈRE DES DOSSIERS, PRISE OÙ ELLE EST DÉJÀ EN FRANÇAIS.
//
// ── POURQUOI CE MODULE ────────────────────────────────────────────────────────────────────────
// Le démonstrateur (`akasha-dossier-demonstrateur.mjs`) a prouvé la voie sur six fiches : le texte
// vient de la page du wiki ANGLAIS, traduit À LA MAIN, l'URL en source. Traduire à la main ne
// passe pas à 2 916 fiches, et traduire à la machine, c'est FABRIQUER le texte — la classe
// d'erreur que toutes les leçons du jour désignent.
//
// `descfr-wiki-fr.mjs` a tranché la même question pour le CHAPEAU des pages, et sa réponse tient
// ici mot pour mot : « Le wiki francophone de chaque univers écrit déjà en français : on EXTRAIT,
// on ne rédige pas. Quand il n'a pas la page, la fiche reste vide et compte dans les plafonds. »
// Ce module fait pour les SECTIONS ce que ce script fait pour le chapeau.
//
// Les trois exigences du chantier tombent alors d'elles-mêmes :
//   · le texte vient de la page du wiki, avec l'URL exacte en source — et il n'est même pas
//     traduit par nous : c'est le wiki francophone qui l'écrit ;
//   · les titres viennent des intertitres de la page source — MediaWiki les déclare lui-même
//     (`prop=sections`), on ne plaque aucune liste ;
//   · la garde de contradiction vit ici, en `contradictions()`.
//
// ── LA DÉCOUPE ────────────────────────────────────────────────────────────────────────────────
// On ne coupe PAS sur `<h2>` : mesuré sur naruto.fandom.com/fr, l'infobox portable ouvre elle-même
// des `<h2 class="pi-item pi-title">` (« Sasuke Uchiwa », « Débuts ») et des `<h3 class="pi-data-
// label">` (« Manga », « Anime ») — un découpage naïf servirait le chrome de l'infobox comme des
// sections. On coupe sur les ANCRES que MediaWiki déclare (`<span class="mw-headline" id="…">`),
// appariées à `prop=sections` : c'est la source qui délimite sa propre structure, elle ne peut pas
// se tromper dessus. `number` (« 4.1 ») donne l'index hiérarchique, exactement la forme des 19 060
// `idx` numériques déjà en base.
//
// Aucune écriture ici : ce module lit, découpe et refuse.
import {
  libelleNu, sameEntityName, sameEntityBySlug, titreStrictementEgal, titrePlusRiche,
  pageDOeuvre, pagePlusGenerale, formeCourteAttestee, nameWords, sameWord,
  fetchFandomProse,
} from './fandom.mjs';
import { jetons as jetonsPleins, normMot } from './redondance-sections.mjs';

export const API_FR = {
  'One Piece': 'https://onepiece.fandom.com/fr/api.php',
  'Naruto': 'https://naruto.fandom.com/fr/api.php',
  'Bleach': 'https://bleach.fandom.com/fr/api.php',
  'Dragon Ball': 'https://dragonball.fandom.com/fr/api.php',
};
/** Témoin par univers : si LUI ne répond pas, c'est l'hôte qui est en cause, pas nos noms
 *  (leçon du 10/08 : un rendement nul mesure d'abord l'extracteur, jamais la source). */
export const TEMOIN_FR = {
  'One Piece': 'Monkey D. Luffy', 'Naruto': 'Naruto Uzumaki',
  'Bleach': 'Ichigo Kurosaki', 'Dragon Ball': 'Son Goku',
};
export const HOTE_FR = (u) => API_FR[u].replace('/api.php', '');
export const urlDe = (univers, titre) => `${HOTE_FR(univers)}/wiki/${encodeURIComponent(String(titre).replace(/ /g, '_'))}`;

const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
export const dort = (ms) => new Promise((s) => setTimeout(s, ms));

export async function jget(u, essais = 3) {
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

/** La page francophone, rendue : HTML développé, liste de sections déclarée, redirections suivies. */
export async function pageFr(univers, titre) {
  const api = API_FR[univers];
  if (!api) return null;
  const j = await jget(`${api}?action=parse&page=${encodeURIComponent(titre)}`
    + '&prop=text%7Csections%7Clanglinks%7Ccategories&redirects=1&format=json&formatversion=2');
  await dort(140);
  if (!j?.parse?.text) return null;
  return {
    titre: j.parse.title ?? titre,
    html: j.parse.text,
    categories: (j.parse.categories ?? []).map((c) => String(c.category ?? c['*'] ?? '').replace(/_/g, ' ')),
    redirections: (j.parse.redirects ?? []).map((r) => ({ from: r.from, to: r.to, tofragment: r.tofragment })),
    sectionsMeta: (j.parse.sections ?? []).map((s) => ({
      index: String(s.index ?? ''), number: String(s.number ?? ''), niveau: Number(s.level ?? 2),
      titre: String(s.line ?? '').replace(/<[^>]+>/g, '').trim(), ancre: String(s.anchor ?? ''),
    })),
    versEn: (j.parse.langlinks ?? []).find((l) => l.lang === 'en')?.title
      ?? (j.parse.langlinks ?? []).find((l) => l.lang === 'en')?.['*'] ?? null,
  };
}

// ── APPAREIL : ce qui n'est pas de la prose d'article ────────────────────────────────────────
// « Anecdotes » N'EST PAS de l'appareil : 641 sections du corpus le portent — c'est un intertitre
// de contenu, on ne le retire pas au motif qu'il s'appelle « Trivia » en anglais.
export const APPAREIL_FR = /^(r[ée]f[ée]rences?|notes? et r[ée]f[ée]rences?|voir aussi|articles? connexes?|liens? externes?|galerie|galeries|navigation|navigation du site|sources?|bibliographie|sommaire|citations?|r[ée]pliques?|images?|vid[ée]os?|sondage|commentaires?|apparence dans les autres m[ée]dias\??|liens?)$/i;

const ENTITES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", '#160': ' ', '#8217': '’' };
const detag = (h) => h
  .replace(/<sup\b[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&(#?\w+);/g, (m, k) => ENTITES[k] ?? (/^#\d+$/.test(k) ? String.fromCharCode(Number(k.slice(1))) : m))
  .replace(/\[\s*\d+\s*\]/g, '')
  .replace(/\s+/g, ' ').trim();

function sansBruit(html) {
  let s = html;
  for (const tag of ['table', 'aside', 'figure', 'figcaption', 'style', 'script', 'gallery']) {
    const re = new RegExp(`<${tag}\\b[^>]*>(?:(?!<${tag}\\b)[\\s\\S])*?<\\/${tag}>`, 'gi');
    let avant; let tours = 0;
    do { avant = s; s = s.replace(re, ' '); } while (s !== avant && ++tours < 8);
  }
  return s
    .replace(/<div\b[^>]*class="[^"]*(navbox|toc|reference|mw-references|wikia-gallery|dablink|hatnote|notice|quote)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

/** Un renvoi (« Cet article parle de… ») parle d'une AUTRE page — jamais de la prose. */
const RENVOI = /^(cet article|cette page|pour (le|la|les|l'|un|une|son|sa|ses|d)|si vous (cherchez|recherchez)|voir aussi|article détaillé|articles? connexes?)/i;

/** LES SECTIONS DE LA PAGE, DÉCOUPÉES PAR LES ANCRES QUE MEDIAWIKI DÉCLARE.
 *
 *  @returns [{ idx, titre, niveau, texte, ancre }] — `idx` est le `number` du sommaire (« 4.1 »),
 *  la forme même des 19 060 index numériques déjà en base.
 */
export function sectionsDeLaPage(page, { minChars = 120, maxSections = 20 } = {}) {
  const html = page.html;
  const parAncre = new Map(page.sectionsMeta.map((m) => [m.ancre, m]));
  // ── LES BORNES : TOUT `<hN>` DONT L'ANCRE EST DÉCLARÉE PAR `prop=sections` ────────────────
  // On ne présume AUCUNE forme de balisage. On lit chaque `<hN>` de la page, on en tire l'ancre
  // (portée par le `<hN>` lui-même, ou par un `<span class="mw-headline" id="…">` à l'intérieur),
  // et on ne garde que les ancres que MediaWiki a DÉCLARÉES. Deux bénéfices d'un seul geste :
  // les `<h2 class="pi-title">` de l'infobox tombent (leurs ancres ne sont dans aucune liste), et
  // le balisage peut changer sans que la découpe se taise.
  //
  // DÉFAUT MESURÉ SUR LES 20 (et corrigé ici) : la première écriture exigeait le `mw-headline`
  // IMMÉDIATEMENT après le `<hN>`. Or, dès que l'ancre porte un accent, MediaWiki insère d'abord
  // une ancre héritée vide : `<h2><span id="Comp.C3.A9tences"></span><span class="mw-headline"
  // id="Compétences">`. « Compétences », « Personnalité », « Références » : tous les intertitres
  // accentués étaient manqués, et leur prose se retrouvait recollée SOUS LE TITRE PRÉCÉDENT —
  // les capacités de Sekka servies sous « Apparence », le caractère de Rurichiyo sous « Apparence ».
  // Une découpe qui rate une borne ne perd pas une section : elle en falsifie deux.
  const bornes = [];
  const reH = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = reH.exec(html))) {
    const attrs = m[2], dedans = m[3];
    const ancre = (attrs.match(/\bid="([^"]*)"/) ?? [])[1]
      ?? (dedans.match(/<span[^>]*class="[^"]*mw-headline[^"]*"[^>]*id="([^"]*)"/i) ?? [])[1]
      ?? null;
    if (!ancre || !parAncre.has(ancre)) continue;
    bornes.push({ pos: m.index, fin: reH.lastIndex, niveau: Number(m[1]), ancre });
  }
  // ── LE CONTRÔLE : chaque section de CONTENU déclarée doit avoir été retrouvée ─────────────
  // Sans ce contrôle, une borne manquée est une corruption SILENCIEUSE (le texte d'une section
  // passe sous le titre d'une autre). On le renvoie : l'appelant refuse la page plutôt que
  // d'écrire un titre qui ment sur son contenu.
  const declareesContenu = page.sectionsMeta.filter((s) => s.titre && !APPAREIL_FR.test(s.titre));
  const trouvees = new Set(bornes.map((b) => b.ancre));
  const manquantes = declareesContenu.filter((s) => !trouvees.has(s.ancre)).map((s) => s.titre);

  const out = [];
  for (let k = 0; k < bornes.length; k++) {
    const b = bornes[k];
    const meta = parAncre.get(b.ancre);
    const titre = String(meta?.titre ?? '').trim();
    if (!titre || APPAREIL_FR.test(titre)) continue;
    const corps = sansBruit(html.slice(b.fin, k + 1 < bornes.length ? bornes[k + 1].pos : html.length));
    const paras = [...corps.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((x) => detag(x[1]))
      .filter((t) => t.length > 40 && !RENVOI.test(t));
    // ── LES LISTES SONT DE LA PROSE SUR CES WIKIS (mesuré sur les 40) ────────────────────────
    // « Clonage de Cadavre », « Lame de Kunaï », « Tornade de Konoha » : chacune déclare une
    // section « Anecdotes » et rend ZÉRO caractère à un lecteur qui ne regarde que les `<p>`.
    // Sur le wiki francophone, les anecdotes s'écrivent en puces. Le corpus, lui, porte déjà
    // 641 sections « Anecdotes » : le titre est admis, c'est notre lecture qui était trop
    // étroite (« un rendement nul mesure d'abord l'extracteur »).
    //
    // On ne prend PAS toutes les puces : une liste de navigation ou de renvois n'est faite que
    // d'étiquettes de liens. On garde l'item dont le texte HORS liens fait au moins 40 % du
    // total — la même question de FORME que `descfr-wiki-fr.mjs` pose aux barres d'onglets,
    // posée ici item par item.
    const puces = [...corps.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((x) => x[1])
      .filter((h) => !/<li\b/i.test(h))                       // seulement les feuilles
      .map((h) => ({ total: detag(h), horsLiens: detag(h.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' ')) }))
      .filter((o) => o.total.length > 40 && !RENVOI.test(o.total)
        && o.horsLiens.length >= 0.4 * o.total.length)
      .map((o) => o.total);
    const texte = [...paras, ...puces].join('\n');
    if (texte.length < minChars) continue;
    out.push({ idx: meta?.number || String(out.length + 1), titre, niveau: b.niveau, ancre: b.ancre, texte });
    if (out.length >= maxSections) break;
  }
  return { sections: out, intertitresManques: manquantes, bornes: bornes.length, declarees: declareesContenu.length };
}

// ══ RÉSOLUTION : QUELLE PAGE FRANÇAISE EST LA NÔTRE ? ════════════════════════════════════════
// L'échelle de preuve est celle de `descfr-wiki-fr.mjs`, et les gardes sont IMPORTÉES de
// `lib/fandom.mjs` — pas recopiées (leçon du 07/08 : un test qui recopie la garde ne teste que sa
// copie). Ce qui est écrit ici, c'est l'enchaînement des routes, rien d'autre.
const HOMONYMIE = /\(homonymie\)/i;
const ARTICLES = new Set(['l', 'd', 'des', 'un', 'une', 'et', 'a', 'au', 'aux', 'en', 'no', 'to', 'and']);
const jetonsTitre = (s) => new Set(String(s ?? '').normalize('NFD').replace(/\p{Mn}/gu, '')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  .filter((w) => w && !['the', 'of', 'de', 'du', 'la', 'le', 'les', 's'].includes(w)));

function titreAmputeDuNom(nom, titre) {
  const n = jetonsTitre(nom), t = jetonsTitre(titre);
  if (!n.size || !t.size || t.size >= n.size) return false;
  if (![...t].every((w) => n.has(w))) return false;
  return [...n].some((w) => !t.has(w) && !ARTICLES.has(w));
}
function titreAjouteUnMotPorteur(nom, slug, titre) {
  const notres = [...nameWords(nom), ...nameWords(String(slug).replace(/-/g, ' '))];
  const ajoutes = [...nameWords(titre)].filter((t) => !notres.some((w) => sameWord(w, t)));
  return ajoutes.length ? ajoutes : null;
}

/** UN SQUELETTE PHONÉTIQUE N'EST PAS UN NOM (défaut mesuré sur les 20, resserrage de la règle).
 *
 *  `sameEntityName('Dragon Punch', 'Pinich')` rend TRUE : `sameWord` replie les deux mots sur le
 *  même squelette consonantique (punch / pinich → p-n-ch). Notre fiche est l'ATTAQUE « Dragon
 *  Punch » ; la page rendue était celle du PERSONNAGE Pinich, et trois sections de sa biographie
 *  allaient être écrites sur une fiche de technique — la classe d'erreur du 04/08 (la biographie
 *  du capitaine Nezumi posée sur la fiche d'une attaque).
 *
 *  Le repli phonétique reste utile (« Gyanzack » ≡ « Ganzack », « Bungo » ≡ « Bungou ») : on ne le
 *  retire pas, on lui demande UN témoin de plus. Dès que l'identité ne repose que sur `meme-nom`
 *  ou `slug-egal` — les deux verdicts qui passent par `sameWord` —, il faut au moins UN mot
 *  rigoureusement commun entre notre libellé et le titre, accents et casse repliés. « Rurichiyo
 *  Kasumiouji » ≡ « Rurichiyo Kasumiōji » garde son mot « rurichiyo » ; « Dragon Punch » contre
 *  « Pinich » n'en a aucun. */
const motsReplies = (s) => new Set(String(s ?? '').normalize('NFD').replace(/\p{Mn}/gu, '')
  .toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
export function motEnCommunStrict(nom, slug, titre) {
  const notres = new Set([...motsReplies(nom), ...motsReplies(String(slug).replace(/-/g, ' '))]);
  return [...motsReplies(titre)].filter((w) => notres.has(w));
}

/** UN MOT PORTEUR DE NOTRE NOM QUE LE TITRE NE REPREND PAS (défaut trouvé APRÈS la pose).
 *
 *  `atk-db-double-galick-cannon` a reçu la page FR « Garrick Cannon » — la technique PARENTE.
 *  Le wiki francophone a bien une page « Double Garrick Cannon » ; sa section « Variantes »
 *  décrit d'ailleurs la nôtre. On a donc servi la description du parent sur la fiche de la
 *  variante. `pagePlusGenerale` et `titreAmputeDuNom` n'ont rien vu : les deux comparent les
 *  jetons À L'IDENTIQUE, et « Galick » n'est pas « Garrick » (leçon du 04/08 sur la romanisation).
 *  Même défaut sur « Lame à chakra de Konoha » → « Lame de Kunaï » : deux armes différentes.
 *
 *  On repose donc la question avec le repli du connecteur (`sameWord`, celui qui fait tenir
 *  « Gyanzack » pour « Ganzack ») : un mot PORTEUR de notre nom auquel AUCUN mot du titre ne
 *  répond, c'est un sujet plus étroit que le nôtre décrit par une page plus large — ou l'inverse.
 *
 *  Les articles et prépositions n'en sont pas : « L'équipage des Gros Casques » contre
 *  « Équipage des Gros Casques » ne perd que le « l' », et 16 équipages One Piece justes étaient
 *  refusés par un décompte qui comptait cet article (mesuré sur les 913 posés).
 *
 *  N'a de sens qu'entre deux libellés de la MÊME langue : sur un pont interlangue, « Corpse Clone
 *  Technique » contre « Clonage de Cadavre » n'est pas une amputation, c'est une traduction. Les
 *  identités attestées autrement (titre égal, redirection déclarée, pont symétrique) en sont donc
 *  exemptées — 146 d'entre elles auraient été refusées à tort. */
const OUTILS_TITRE = new Set(['l', 'd', 'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'a', 'au', 'aux', 'en', 'et', 's', 'the', 'of', 'and', 'no', 'to']);
export function motPorteurNonRepondu(nom, titre) {
  const notres = [...nameWords(nom)].filter((w) => !OUTILS_TITRE.has(w));
  const siens = [...nameWords(titre)].filter((w) => !OUTILS_TITRE.has(w));
  if (!notres.length || !siens.length) return null;
  const orphelins = notres.filter((w) => !siens.some((t) => t === w || sameWord(w, t)));
  return orphelins.length ? orphelins : null;
}

/** @returns {{page, route, identite, refus, pontEn, url}} — `refus` non nul = on n'écrit pas. */
export async function resoudreFr(fiche, { rechercheFr = true, pont = true } = {}) {
  const r = { slug: fiche.slug, name: fiche.name, universe: fiche.universe, type: fiche.type };
  if (!API_FR[fiche.universe]) return { ...r, refus: 'univers sans wiki francophone' };

  let p = await pageFr(fiche.universe, fiche.name); let route = p ? 'titre-exact' : null;
  let pontEn = null;

  if (!p) {
    const parSlug = String(fiche.slug).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (libelleNu(parSlug) !== libelleNu(fiche.name)) {
      p = await pageFr(fiche.universe, parSlug);
      if (p) route = 'slug';
    }
  }

  if (!p && pont) {
    try {
      const en = await fetchFandomProse(fiche.universe, fiche.name, { maxChars: 300, slug: fiche.slug });
      const fragmentEn = (en?.redirections ?? []).find((x) => x.tofragment) ?? null;
      if (en?.title && !en.pageOeuvre && !fragmentEn && (en.sameEntity || en.aliasCure || en.identiteAttestee)) {
        const q = await jget(`${en.url.split('/wiki/')[0]}/api.php?action=query&prop=langlinks&lllang=fr`
          + `&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(en.title)}`);
        await dort(140);
        const fr = q?.query?.pages?.[0]?.langlinks?.[0]?.title ?? null;
        if (fr) {
          p = await pageFr(fiche.universe, fr);
          if (p) { route = 'langlink'; pontEn = { titreEn: en.title, titreFrDeclare: fr, retour: p.versEn }; }
        }
      }
    } catch { /* le connecteur EN est faillible : son échec n'arrête pas le lot */ }
  }

  if (!p && rechercheFr) {
    const j = await jget(`${API_FR[fiche.universe]}?action=query&list=search&srlimit=6&srnamespace=0`
      + `&srsearch=${encodeURIComponent(fiche.name)}&format=json&formatversion=2`);
    await dort(140);
    const titres = (j?.query?.search ?? []).map((x) => x.title);
    if (titres.length) r.rechercheFr = titres;
    // La recherche TROUVE, elle ne prouve rien : le titre qu'elle rend passe l'échelle de preuve
    // inchangée (c'est elle qui a produit toutes les fautes d'identité de l'usine).
    const retenu = titres.find((t) => titreStrictementEgal(fiche.name, t))
      ?? titres.find((t) => sameEntityName(fiche.name, t) || sameEntityBySlug(fiche.slug, t));
    if (retenu) { p = await pageFr(fiche.universe, retenu); if (p) route = 'recherche-fr'; }
  }

  if (!p) return { ...r, refus: 'sans page FR' };

  const att = { redirections: p.redirections, sections: p.sectionsMeta.map((s) => s.titre) };
  const fragment = p.redirections.find((x) => x.tofragment) ?? null;
  const allerRetour = route === 'langlink'
    ? Boolean(pontEn?.retour && libelleNu(pontEn.retour) === libelleNu(pontEn.titreEn)) : null;
  const pontTitreEnEgal = route === 'langlink'
    ? Boolean(pontEn?.titreEn && titreStrictementEgal(fiche.name, pontEn.titreEn)) : null;

  const identite = titreStrictementEgal(fiche.name, p.titre) ? 'titre-egal'
    : sameEntityName(fiche.name, p.titre) ? 'meme-nom'
      : sameEntityBySlug(fiche.slug, p.titre) ? 'slug-egal'
        : formeCourteAttestee(fiche.name, p.titre, att) ? 'redirection-declaree'
          : (allerRetour && pontTitreEnEgal) ? 'pont-interlangue-symetrique' : null;

  const attesteLeTitre = identite === 'titre-egal' || identite === 'redirection-declaree'
    || identite === 'pont-interlangue-symetrique';
  const motsAjoutes = attesteLeTitre ? null : titreAjouteUnMotPorteur(fiche.name, fiche.slug, p.titre);
  const titreEnrichi = Boolean(motsAjoutes)
    || (jetonsTitre(p.titre).size > jetonsTitre(fiche.name).size
      && jetonsTitre(p.titre).size > jetonsTitre(String(fiche.slug).replace(/-/g, ' ')).size
      && !attesteLeTitre);
  const desambiguisation = /\([^)]*\)/.test(p.titre)
    && !titreStrictementEgal(fiche.name, p.titre) && !titrePlusRiche(fiche.name, p.titre);
  const plusGenerale = pagePlusGenerale(fiche.name, p.titre, att)
    ?? (formeCourteAttestee(fiche.name, p.titre, att) || !titreAmputeDuNom(fiche.name, p.titre) ? null
      : `titre amputé d'un mot porteur : « ${p.titre} » ne dit pas « ${fiche.name} »`);

  const base = {
    ...r, route, titreFr: p.titre, identite, url: urlDe(fiche.universe, p.titre),
    redirections: p.redirections, pontEn, allerRetour, pontTitreEnEgal, motsAjoutes,
    categories: p.categories ?? [],
  };
  // ── LA PAGE SE RANGE-T-ELLE ELLE-MÊME PARMI LES ŒUVRES ? (resserrage des 20) ─────────────
  // `ino-shika-cho` (notre trio, type `status`) est tombé sur la page FR « InoShikaChô », qui est
  // l'ÉPISODE 239 de Naruto Shippûden : titre rigoureusement égal au nôtre — la preuve d'identité
  // la plus forte du chantier disait oui —, et sa section « Résumé » racontait l'intrigue d'un
  // épisode. `pageDOeuvre` juge sur le LIBELLÉ et ne pouvait rien voir. La page, elle, se déclare :
  // `Catégorie:Épisodes`, `Catégorie:Épisodes Naruto Shippûden`. On lit ce que la source dit d'elle-
  // même plutôt que de deviner d'après son nom.
  // `formatversion=2` rend la catégorie NUE (« Épisodes »), sans le préfixe d'espace de noms :
  // un motif ancré sur « Catégorie: » ne mordait sur rien — vérifié en relançant les 20.
  const CAT_OEUVRE = /^(épisodes?|chapitres?|tomes?|volumes?|films?|ovas?|onas?|jeux vidéo|jeu vidéo|musiques?|chansons?|openings?|endings?|génériques?|sagas?|arcs?|romans?|light novels?|databooks?|animes?|mangas?|séries?|spin-offs?|homonymie|pages? d.homonymie|ébauches?)\b/i;
  const categoriesOeuvre = (p.categories ?? []).filter((c) => CAT_OEUVRE.test(c));

  const motsCommuns = motEnCommunStrict(fiche.name, fiche.slug, p.titre);
  const fuzzy = identite === 'meme-nom' || identite === 'slug-egal';
  const surSqueletteSeul = fuzzy && motsCommuns.length === 0;
  const orphelins = fuzzy ? motPorteurNonRepondu(fiche.name, p.titre) : null;

  const refus = !identite ? (route === 'langlink' ? 'pont nu sans preuve de nom' : 'identité refusée')
    : surSqueletteSeul ? `identité sur squelette phonétique seul — « ${p.titre} » n'a aucun mot commun avec « ${fiche.name} »`
      : orphelins ? `mot porteur de notre nom sans réponse dans le titre : ${orphelins.join(', ')} — « ${p.titre} » ne dit pas « ${fiche.name} »`
      : categoriesOeuvre.length ? `la page se range parmi les œuvres — ${categoriesOeuvre.join(', ')}`
        : fragment ? `redirection de section (${fragment.from} → ${fragment.to}#${fragment.tofragment})`
        : desambiguisation ? 'parenthèse de désambiguïsation'
          : titreEnrichi ? `titre enrichi non attesté (${(motsAjoutes ?? []).join(', ')})`
            : pageDOeuvre(p.titre, '') ? 'page d’œuvre'
              : HOMONYMIE.test(p.titre) ? 'page d’homonymie'
                : plusGenerale ? `page plus générale — ${plusGenerale}` : null;
  return { ...base, motsCommuns, page: p, refus };
}

// ══ LA GARDE DE CONTRADICTION ════════════════════════════════════════════════════════════════
// Le vérificateur du démonstrateur a trouvé « une chatte blanche » en section face à « un chat »
// dans le texte de la même fiche. Une section qui contredit le reste de la fiche est pire qu'une
// section absente : on ne cherche donc PAS qui a raison, on refuse la paire.
//
// Trois épreuves, chacune rendant sa PHRASE-PREUVE des deux côtés.

const replie = (s) => String(s ?? '').normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

/** Définitions du sujet : « <Nom|Il|Elle|C'> est/était/fut <un|une|le|la> <nom-tête> ».
 *  On n'accepte que les phrases dont le SUJET est la fiche (son nom, ou un pronom sujet en tête de
 *  phrase) — « son père est un homme » ne définit pas la fiche. */
export function definitionsDuSujet(texte, nom) {
  const mots = String(nom ?? '').split(/\s+/).filter(Boolean);
  const premier = mots[0] ? mots[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
  const sujets = ['[Ii]l', '[Ee]lle', '[Cc]e', "[Cc]'", ...(premier ? [premier] : [])];
  const re = new RegExp(
    `(?:^|[.!?]\\s+|\\n)\\s*(?:${sujets.join('|')})[^.!?\\n]{0,60}?\\b(?:est|était|fut|sont|étaient|reste|demeure)\\s+(?:l['’]|le |la |les |un |une |des )\\s*([\\p{L}’'-]{3,})`,
    'gu');
  const out = [];
  let m;
  while ((m = re.exec(texte))) {
    const phrase = texte.slice(m.index, Math.min(texte.length, m.index + 190)).replace(/\s+/g, ' ').trim();
    const det = (m[0].match(/\b(l['’]|le|la|les|un|une|des)\s*$/i) ?? [])[1] ?? null;
    const detReel = (/\b(un|le)\s+[\p{L}’'-]{3,}$/u.test(m[0].trim()) ? 'm'
      : /\b(une|la)\s+[\p{L}’'-]{3,}$/u.test(m[0].trim()) ? 'f' : null);
    out.push({ genre: detReel, tete: replie(m[1]), phrase, determinant: det });
  }
  return out;
}

/** Le féminin français se forme sur le masculin : chat/chatte, lion/lionne, chien/chienne,
 *  danseur/danseuse, acteur/actrice, prince/princesse. On ne prétend pas conjuguer la langue —
 *  on reconnaît la MÊME tête sous deux genres, ce qui suffit à voir la contradiction. */
export function memeTete(a, b) {
  if (a === b) return true;
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  if (!long.startsWith(court.slice(0, Math.max(3, court.length - 2)))) return false;
  const suffixes = ['e', 's', 'es', 'te', 'tte', 'ne', 'nne', 'le', 'lle', 'sse', 'esse', 'euse', 'rice', 'trice', 'ere', 'iere'];
  const racine = court.replace(/(eur|teur|er|f|x|c)$/, '');
  return suffixes.some((s) => long === court + s || long === racine + s
    || long === court.slice(0, -1) + s || long === racine + s);
}

/** Classes de nature attestées par le corpus lui-même : elles servent à voir qu'un texte décrit
 *  une PERSONNE là où la fiche décrit un LIEU. Une liste de mots n'est pas une preuve d'identité —
 *  elle ne sert ici qu'à REFUSER, jamais à valider. */
const NATURES = {
  personne: /^(homme|femme|garçon|fille|enfant|ninja|shinobi|pirate|marine|capitaine|guerrier|guerriere|combattant|humain|humaine|jeune|vieil|vieille|ancien|ancienne|membre|chef|roi|reine|prince|princesse|medecin|scientifique|soldat|officier|eleve|etudiant|maitre|maitresse|assassin|mercenaire|noble|marchand|forgeron|cuisinier|navigateur|sniper|charpentier|musicien|archeologue|docteur)$/,
  animal: /^(chat|chatte|chien|chienne|crapaud|serpent|limace|oiseau|loup|louve|ours|singe|tigre|lion|lionne|dragon|poisson|renard|cheval|jument|insecte|araignee|scarabee|papillon|corbeau|faucon|aigle|rat|souris|elephant|requin|baleine|tortue|grenouille|panda|cochon|sanglier|belier|taureau|vache|mouton|chevre|cerf|biche)$/,
  lieu: /^(ile|iles|archipel|ville|cite|capitale|royaume|pays|region|village|bourg|continent|planete|monde|territoire|mer|ocean|baie|golfe|detroit|montagne|mont|colline|vallee|plaine|desert|foret|jungle|lac|riviere|fleuve|port|quartier|prison|chateau|palais|temple|sanctuaire|tour|caverne|grotte|station|camp|dimension|univers|localite|lieu|endroit|zone|secteur|route|chemin|col|batiment|maison|ecole|academie|hopital|laboratoire|base)$/,
  organisation: /^(organisation|equipage|equipe|groupe|clan|famille|guilde|armee|flotte|division|escouade|unite|compagnie|societe|ordre|secte|alliance|federation|gouvernement|conseil|academie|ecole|corporation|entreprise|association)$/,
  technique: /^(technique|jutsu|attaque|capacite|pouvoir|mouvement|competence|art|style|forme|transformation|invocation|sort|sortilege|methode|manoeuvre)$/,
  objet: /^(epee|sabre|lame|katana|couteau|kunai|shuriken|arme|bouclier|armure|casque|anneau|bague|collier|pendentif|medaillon|livre|parchemin|carte|cle|pierre|joyau|gemme|cristal|fruit|potion|machine|appareil|navire|bateau|vaisseau|voiture|instrument|outil|objet|artefact|tresor|robe|manteau|chapeau|masque)$/,
};
const natureDe = (tete) => Object.entries(NATURES).find(([, re]) => re.test(tete))?.[0] ?? null;

/** LA GARDE. `fiche` porte name/type/summary/attributes ; `sections` est ce qu'on s'apprête à
 *  écrire. @returns [] si rien ne contredit, sinon la liste des contradictions AVEC LEURS PREUVES. */
export function contradictions(fiche, sections) {
  const out = [];
  const texteFiche = [fiche.summary, fiche.attributes?.descFr].filter((x) => typeof x === 'string').join(' ');
  const texteSecs = sections.map((s) => s.texte).join('\n');
  const defsF = definitionsDuSujet(texteFiche, fiche.name);
  const defsS = definitionsDuSujet(texteSecs, fiche.name);

  // (1) MÊME TÊTE, GENRE OPPOSÉ — le cas « un chat » / « une chatte », mesuré sur le démonstrateur.
  for (const a of defsF) {
    for (const b of defsS) {
      if (!a.genre || !b.genre || a.genre === b.genre) continue;
      if (!memeTete(a.tete, b.tete)) continue;
      out.push({
        espece: 'genre-oppose-sur-la-meme-tete',
        preuve_fiche: a.phrase, preuve_section: b.phrase,
        detail: `« ${a.determinant} ${a.tete} » (fiche) contre « ${b.determinant} ${b.tete} » (section)`,
      });
    }
  }

  // (2) NATURES INCOMPATIBLES — la fiche définit un lieu, la section une personne.
  const natF = [...new Set(defsF.map((d) => natureDe(d.tete)).filter(Boolean))];
  const natS = [...new Set(defsS.map((d) => natureDe(d.tete)).filter(Boolean))];
  if (natF.length && natS.length && !natF.some((n) => natS.includes(n))) {
    out.push({
      espece: 'natures-incompatibles',
      preuve_fiche: defsF.find((d) => natureDe(d.tete))?.phrase ?? '',
      preuve_section: defsS.find((d) => natureDe(d.tete))?.phrase ?? '',
      detail: `la fiche se définit comme ${natF.join('/')} et la section comme ${natS.join('/')}`,
    });
  }

  // (2 bis) LA NATURE DÉCLARÉE PAR LA COLONNE `type` — elle, au moins, ne dépend d'aucun texte.
  // `atk-db-dragon-punch` (type `power`) allait recevoir trois sections de la BIOGRAPHIE d'un
  // personnage : la fiche n'avait pas de définition exploitable dans son propre texte, donc
  // l'épreuve (2) se taisait. La colonne `type`, elle, parlait.
  const NATURE_DU_TYPE = {
    place: 'lieu', power: 'technique', skill: 'technique',
    artifact: 'objet', status: 'organisation',
  };
  const attenduDuType = NATURE_DU_TYPE[fiche.type];
  if (attenduDuType) {
    const contraires = defsS.filter((d) => {
      const nat = natureDe(d.tete);
      return nat && nat !== attenduDuType
        // Une organisation peut légitimement se dire « équipe »/« groupe » ; un lieu peut porter
        // le nom d'un bâtiment. On ne refuse que les natures franchement étrangères au type.
        && !(attenduDuType === 'organisation' && nat === 'lieu')
        && !(attenduDuType === 'lieu' && nat === 'organisation')
        && !(attenduDuType === 'objet' && nat === 'technique')
        && !(attenduDuType === 'technique' && nat === 'objet');
    });
    if (contraires.length) {
      out.push({
        espece: 'nature-contre-le-type-declare',
        preuve_fiche: `type = « ${fiche.type} » (colonne de la base)`,
        preuve_section: contraires[0].phrase,
        detail: `type ${fiche.type} → nature attendue « ${attenduDuType} », la section définit « ${contraires[0].determinant} ${contraires[0].tete} » (${natureDe(contraires[0].tete)})`,
      });
    }
  }

  // (3) SEXE DÉCLARÉ CONTRE PRONOM DE DÉFINITION — `attributes.sex` est une donnée de la base,
  // pas une lecture : quand la section définit le sujet au genre opposé, l'une des deux ment.
  const sexe = String(fiche.attributes?.sex ?? '').toLowerCase();
  if ((sexe === 'male' || sexe === 'female') && (fiche.type === 'character')) {
    const attendu = sexe === 'male' ? 'm' : 'f';
    const contre = defsS.filter((d) => d.genre && d.genre !== attendu
      && ['personne', 'animal'].includes(natureDe(d.tete) ?? ''));
    if (contre.length) {
      out.push({
        espece: 'sexe-declare-contre-definition',
        preuve_fiche: `attributes.sex = « ${fiche.attributes.sex} »`,
        preuve_section: contre[0].phrase,
        detail: `sexe déclaré ${sexe}, la section définit « ${contre[0].determinant} ${contre[0].tete} »`,
      });
    }
  }
  return out;
}

/** REDONDANCE — la page affiche DÉJÀ `descFr` en entier (leçon du 10/08 : le vrai coût du
 *  découpage ne s'est vu qu'au RENDU, la fiche servait deux fois le même texte). Une section dont
 *  tous les mots pleins sont déjà dans le texte servi n'ajoute rien au lecteur : on la retire.
 *  @returns {{gardees, retirees}} */
export function retirerLesRedondantes(fiche, sections, { minApports = 4 } = {}) {
  const deja = jetonsPleins([fiche.summary, fiche.attributes?.descFr].filter((x) => typeof x === 'string').join(' '));
  const gardees = [], retirees = [];
  for (const s of sections) {
    const neufs = [...jetonsPleins(s.texte)].filter((j) => !deja.has(j));
    if (neufs.length < minApports) retirees.push({ ...s, motif: `${neufs.length} mot(s) plein(s) neuf(s) — déjà dit par le texte servi` });
    else gardees.push(s);
  }
  return { gardees, retirees };
}

export { normMot };
