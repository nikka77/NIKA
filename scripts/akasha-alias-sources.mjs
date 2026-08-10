// scripts/akasha-alias-sources.mjs — LE REGISTRE D'ALIAS « NOTRE FICHE → TITRE DE WIKI ».
// C'est le SECOND VERSANT du mur, celui que la vague 4 n'a vu qu'en le heurtant sur Naruto.
//
// POURQUOI (10/08/2026, vague 5)
// `akasha-isolees-html.mjs` demande au wiki ANGLAIS une page au nom de NOTRE fiche. Nos fiches One
// Piece sont nommées en français : « Navire-Cercueil », « Île Obscuria », « L'équipage des Acumates ».
// Mesuré ce jour sur les 451 isolées One Piece (data/audits/isolees-op-sonde-source-*.json) :
//   · 191 ont bien une page sur onepiece.fandom.com sous NOTRE nom
//   ·  62 seulement grâce aux paires déjà présentes dans data/alias-cures.json
//   ·  12 ne tombent que sur une redirection vers une SECTION (refusée : autre sujet)
//   · 186 n'ont AUCUNE page, sous aucun de leurs trois titres — elles ne sont pas CHERCHABLES,
//     tombent dans `journal.pageAbsente` et le script ne dit rien de plus.
// Ce fichier s'attaque à ces 186 + 12.
//
// DEUX TÉMOINS, tous deux redemandables à la source. Aucune ressemblance de chaînes, jamais.
//
//   S1 « provenance »   — NOTRE fiche porte `attributes.descFrSource` qui NOMME sa page d'origine
//                         sur le wiki français (URL complète). On ouvre CETTE page et on lit son
//                         lien interlangue `en`. Deux affirmations indépendantes : la nôtre (d'où
//                         vient le texte) et celle du wiki (quelle page anglaise est la même).
//   S2 « interlangue »  — le wiki FRANÇAIS porte une page au titre de notre fiche (redirection dure
//                         suivie, redirection vers une SECTION refusée) et DÉCLARE son équivalent
//                         anglais (`prop=langlinks&lllang=en`). C'est le témoin T2 de la vague 4,
//                         pris dans l'autre sens.
//
// Dans les deux cas, le titre anglais obtenu est VÉRIFIÉ sur le wiki anglais avant d'entrer au
// registre : une page qui n'existe pas, ou qui redirige vers une section, est rejetée.
//
// N'ÉCRIT RIEN EN BASE. Sort `data/alias-sources-<univers>.json` + une trace horodatée.
// Usage :
//   node --env-file=.env.local scripts/akasha-alias-sources.mjs --sonde   (mesure, n'écrit pas)
//   node --env-file=.env.local scripts/akasha-alias-sources.mjs           (écrit le registre)
//   … --univers="One Piece"  (défaut)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { norm, wikitextes } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const ARG = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const SONDE = process.argv.includes('--sonde');
const UNIVERS = ARG('univers', 'One Piece');
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Un wiki anglais et son jumeau francophone, par univers. Le second n'existe pas partout : sans
 *  lui, ce script n'a rien à dire et le déclare au lieu de deviner. */
const WIKIS = {
  'One Piece': { en: 'onepiece.fandom.com', fr: 'onepiece.fandom.com/fr' },
  Naruto: { en: 'naruto.fandom.com', fr: 'naruto.fandom.com/fr' },
};
const cfg = WIKIS[UNIVERS];
if (!cfg) throw new Error(`univers « ${UNIVERS} » absent de WIKIS (aucun wiki fr connu)`);

const fichierRegistre = path.join(ROOT, `data/alias-sources-${UNIVERS.toLowerCase().replace(/\W+/g, '-')}.json`);

async function api(hote, params) {
  const u = `https://${hote}/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params });
  for (let essai = 0; essai < 3; essai++) {
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) { await dormir(700 * (essai + 1)); continue; }
      const j = await r.json();
      if (j?.error?.code === 'maxlag') { await dormir(5000); continue; }
      return j;
    } catch { await dormir(700 * (essai + 1)); }
  }
  // PANNE ≠ ABSENCE : on crie plutôt que de rendre « vide » (leçon du 02/08, redite le 10/08).
  throw new Error(`${hote} injoignable : ${u.slice(0, 120)}`);
}

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;      // un select nu s'arrête à 1000 SANS erreur
  }
  console.log(`  ${t} : ${out.length} lignes`);
  return out;
};

console.log('→ lecture de la base (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const degre = new Set();
for (const r of rels) { degre.add(r.from_entry); degre.add(r.to_entry); }
const isolees = entries.filter((e) => !degre.has(e.id));
const lot = isolees.filter((e) => e.universe === UNIVERS);
console.log(`\nMESURE : ${entries.length} fiches · ${rels.length} arêtes · ${isolees.length} isolées dont ${lot.length} en ${UNIVERS}`);

/* ═══ Qui a DÉJÀ une page sous son propre nom ? On ne travaille que sur le reste. ══════════════ */
const aliasCures = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/alias-cures.json'), 'utf8'))[UNIVERS] ?? {};
console.log(`\n→ contrôle sur ${cfg.en} : lesquelles de ces ${lot.length} fiches y ont déjà une page ?`);
const titresDejaConnus = lot.map((e) => aliasCures[e.name] ?? e.name);
const pagesEn = await wikitextes(cfg.en, [...new Set(titresDejaConnus)]);
const aTraiter = [];
let dejaOk = 0, dejaFragment = 0;
for (const e of lot) {
  const t = aliasCures[e.name] ?? e.name;
  const p = pagesEn.get(t);
  if (p && !p.fragment) { dejaOk++; continue; }
  aTraiter.push({ e, motif: p?.fragment ? `redirection vers section (${p.fragment})` : 'aucune page' });
  if (p?.fragment) dejaFragment++;
}
console.log(`  ${dejaOk} déjà cherchables · ${aTraiter.length} à traiter (dont ${dejaFragment} bloquées par une redirection de section)`);

/* ═══ S1 — la provenance que NOUS avons consignée ════════════════════════════════════════════ */
// `descFrSource` porte, sur les fiches traduites depuis le wiki fr, l'URL exacte de la page source.
// Les autres valeurs sont des noms de modèles (« nvidia/… ») : elles ne nomment aucune page.
const rxSourceFr = new RegExp(`https?://${cfg.fr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/wiki/([^\\s"']+)`, 'i');
const titreFrDeclare = (e) => {
  const s = e.attributes?.descFrSource;
  if (typeof s !== 'string') return null;
  const m = rxSourceFr.exec(s);
  if (!m) return null;
  try { return decodeURIComponent(m[1]).replace(/_/g, ' ').trim(); } catch { return null; }
};

/* ═══ Interrogation du wiki FRANÇAIS ═════════════════════════════════════════════════════════ */
const demandes = new Map();       // titre fr demandé → [{ e, voie }]
const pousser = (titre, e, voie) => {
  if (!titre) return;
  if (!demandes.has(titre)) demandes.set(titre, []);
  demandes.get(titre).push({ e, voie });
};
for (const { e } of aTraiter) {
  const provenance = titreFrDeclare(e);
  if (provenance) pousser(provenance, e, 'S1 provenance');
  if (!provenance || norm(provenance) !== norm(e.name)) pousser(e.name, e, 'S2 interlangue');
}
console.log(`\n→ ${demandes.size} titres à demander à ${cfg.fr} (langlinks en + redirections)…`);

const declareFr = new Map();      // titre demandé → { titreRendu, fragment, en }
const titres = [...demandes.keys()];
for (let i = 0; i < titres.length; i += 20) {
  const j = await api(cfg.fr, {
    action: 'query', prop: 'langlinks', lllang: 'en', lllimit: '50', redirects: '1',
    titles: titres.slice(i, i + 20).join('|'),
  });
  const versDemande = new Map();
  const fragments = new Map();
  for (const n of j.query?.normalized ?? []) versDemande.set(n.to, n.from);
  for (const n of j.query?.redirects ?? []) {
    versDemande.set(n.to, versDemande.get(n.from) ?? n.from);
    if (n.tofragment) fragments.set(versDemande.get(n.to) ?? n.to, `${n.to}#${n.tofragment}`);
  }
  for (const p of j.query?.pages ?? []) {
    const demande = versDemande.get(p.title) ?? p.title;
    const en = p.langlinks?.[0]?.title ?? null;
    declareFr.set(demande, {
      manquante: !!p.missing, titreRendu: p.title,
      fragment: fragments.get(demande) ?? null,
      en,
      // RESSERRAGE 1 (mesuré : 1 cas sur 20 relus). Un interlangue peut désigner une SECTION —
      // « Sweet City » déclare en = « Whole Cake Island#Sweet City ». MediaWiki normalise ce titre
      // en « Whole Cake Island » et ne signale rien : la garde de fragment posée sur la réponse ne
      // voit donc RIEN, et on lirait l'infobox de l'ÎLE pour un de ses QUARTIERS. Le « # » est ici
      // la seule trace du changement de sujet — on le lit dans le titre déclaré, avant l'appel.
      enFragment: en && en.includes('#') ? en : null,
    });
  }
  process.stdout.write(`\r  ${Math.min(i + 20, titres.length)}/${titres.length}`);
  await dormir(250);
}
console.log('');

/* ═══ Vérification du titre anglais obtenu, sur le wiki anglais ══════════════════════════════ */
const titresEn = [...new Set([...declareFr.values()].map((d) => d.en).filter(Boolean))];
console.log(`→ contrôle des ${titresEn.length} titres anglais déclarés sur ${cfg.en}…`);
const pagesEnCandidates = titresEn.length ? await wikitextes(cfg.en, titresEn) : new Map();

/* ═══ Verdict, fiche par fiche ═══════════════════════════════════════════════════════════════ */
const verdicts = [];
for (const { e, motif } of aTraiter) {
  const essais = [];
  const provenance = titreFrDeclare(e);
  if (provenance) essais.push({ titreFr: provenance, voie: 'S1 provenance' });
  if (!provenance || norm(provenance) !== norm(e.name)) essais.push({ titreFr: e.name, voie: 'S2 interlangue' });

  const v = { nom: e.name, slug: e.slug, type: e.type, motifInitial: motif, temoin: null, titreEn: null, preuve: null, journal: [] };
  for (const { titreFr, voie } of essais) {
    if (v.temoin) break;
    const d = declareFr.get(titreFr);
    if (!d || d.manquante) { v.journal.push(`${voie} : « ${titreFr} » absente de ${cfg.fr}`); continue; }
    if (d.fragment) { v.journal.push(`${voie} : « ${titreFr} » redirige vers une SECTION (${d.fragment}) — refusé`); continue; }
    if (!d.en) { v.journal.push(`${voie} : « ${d.titreRendu} » existe sur ${cfg.fr} mais ne déclare aucun interlangue en`); continue; }
    if (d.enFragment) { v.journal.push(`${voie} : interlangue en = « ${d.enFragment} » désigne une SECTION d'un autre article — refusé`); continue; }
    const pe = pagesEnCandidates.get(d.en);
    if (!pe) { v.journal.push(`${voie} : interlangue en = « ${d.en} », mais cette page est absente de ${cfg.en} — refusé`); continue; }
    if (pe.fragment) { v.journal.push(`${voie} : « ${d.en} » redirige vers une SECTION (${pe.fragment}) — refusé`); continue; }
    v.temoin = voie;
    v.titreEn = pe.titre;
    v.preuve = (voie === 'S1 provenance'
      ? `notre fiche porte attributes.descFrSource = « …https://${cfg.fr}/wiki/${encodeURIComponent(titreFr.replace(/ /g, '_'))} » ; `
      : '')
      + `https://${cfg.fr}/api.php?action=query&prop=langlinks&lllang=en&titles=${encodeURIComponent(titreFr)} rend la page « ${d.titreRendu} »`
      + (d.titreRendu !== titreFr ? ` (redirection dure depuis « ${titreFr} »)` : '')
      + ` et déclare en = « ${d.en} » ; page vérifiée présente sur https://${cfg.en}/wiki/${encodeURIComponent(pe.titre.replace(/ /g, '_'))}`
      + (pe.titre !== d.en ? ` (elle-même redirigée depuis « ${d.en} »)` : '');
  }
  verdicts.push(v);
}

/* RESSERRAGE 2, mesuré : 4 cas sur 20 relus. Le wiki français redirige « Arrow », « Brahm »,
   « Hyota » et « Barrel » — quatre personnages — vers l'article de GROUPE « Gardes Tsumegeri ».
   Une redirection dure dit l'identité OU la FUSION, et une fusion vers un article collectif n'est
   pas une identité : lire l'infobox du groupe et l'attribuer à chacun des quatre serait attribuer
   à un homme ce qui est dit d'une escouade. Le signal mécanique est le même que la garde
   `pagePartagee` d'akasha-isolees-html.mjs : une page réclamée par PLUSIEURS de nos fiches n'en
   identifie aucune. On l'applique ici, à la source, plutôt que de laisser passer la paire. */
const compteEn = new Map();
for (const v of verdicts) if (v.temoin) compteEn.set(v.titreEn, (compteEn.get(v.titreEn) ?? 0) + 1);
let partagees = 0;
for (const v of verdicts) {
  if (!v.temoin || compteEn.get(v.titreEn) < 2) continue;
  v.journal.push(`${v.temoin} → « ${v.titreEn} » REFUSÉ : cette page anglaise est réclamée par ${compteEn.get(v.titreEn)} de nos fiches — elle n'en identifie aucune`);
  v.temoinEcarte = v.temoin; v.temoin = null; v.titreEn = null; v.preuve = null;
  partagees++;
}
if (partagees) console.log(`\n  ⚠ ${partagees} paires écartées : page anglaise réclamée par plusieurs de nos fiches`);

const cures = verdicts.filter((v) => v.temoin);
const parTemoin = {};
for (const v of cures) parTemoin[v.temoin] = (parTemoin[v.temoin] ?? 0) + 1;
const parTypeCure = {};
for (const v of cures) parTypeCure[v.type] = (parTypeCure[v.type] ?? 0) + 1;
console.log(`\n=== VERDICT ===`);
console.log(`  ${cures.length} / ${aTraiter.length} fiches rendues CHERCHABLES · témoins : `
  + Object.entries(parTemoin).map(([k, v]) => `${k}=${v}`).join(' · '));
console.log(`  par type : ` + Object.entries(parTypeCure).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · '));

// LES VINGT CAS (règle des 20 avant les mille). Sous quarante paires, on les imprime TOUTES :
// échantillonner une population qu'on peut lire en entier, c'est se priver gratuitement.
const aRelire = cures.length <= 40 ? cures : cures.filter((_, i) => i % Math.floor(cures.length / 20) === 0).slice(0, 20);
console.log(`\n=== ${aRelire.length} PAIRES À RELIRE À LA MAIN (sur ${cures.length}) ===`);
for (const v of aRelire) {
  console.log(`\n· « ${v.nom} » (${v.type}) → « ${v.titreEn} »   [${v.temoin}]`);
  console.log(`  ${v.preuve}`);
}

const echecs = verdicts.filter((v) => !v.temoin);
const motifsEchec = {};
for (const v of echecs) { const k = (v.journal.at(-1) ?? 'aucun essai').replace(/«[^»]*»/g, '«…»').replace(/\([^)]*\)/g, '(…)'); motifsEchec[k] = (motifsEchec[k] ?? 0) + 1; }
console.log(`\n=== ${echecs.length} SANS TÉMOIN ===`);
for (const [k, n] of Object.entries(motifsEchec).sort((a, b) => b[1] - a[1])) console.log(`  ${n} × ${k}`);

const trace = path.join(ROOT, `data/audits/alias-sources-${UNIVERS.toLowerCase().replace(/\W+/g, '-')}-${SONDE ? 'sonde' : 'ecriture'}-${HORODATE}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: `registre d'alias SOURCE (notre fiche → titre de wiki), ${UNIVERS}`, quand: new Date().toISOString(),
  mode: SONDE ? 'sonde' : 'écriture du registre', ecritEnBase: false, wikis: cfg,
  mesure: { fiches: entries.length, aretes: rels.length, isolees: isolees.length, isoleesUnivers: lot.length },
  dejaCherchables: dejaOk, aTraiter: aTraiter.length, curees: cures.length, parTemoin, parTypeCure, motifsEchec,
  verdicts,
}, null, 1));
console.log(`\ntrace AVANT écriture : ${path.relative(ROOT, trace)}`);

if (SONDE) { console.log('--sonde : registre non écrit.'); process.exit(0); }

const registre = {};
for (const v of cures) registre[v.nom] = { titreWiki: v.titreEn, slug: v.slug, type: v.type, temoin: v.temoin, preuve: v.preuve };
fs.writeFileSync(fichierRegistre, JSON.stringify({
  _lisezMoi: `Registre SOURCE : nom de NOTRE fiche → titre sur ${cfg.en}. Chaque paire porte son témoin `
    + `et l'adresse qui le prouve. Construit par scripts/akasha-alias-sources.mjs le ${new Date().toISOString().slice(0, 10)}. `
    + 'Ne pas éditer à la main : relancer le script, qui redemande chaque témoin à la source.',
  [UNIVERS]: registre,
}, null, 1) + '\n');
console.log(`registre écrit : ${path.relative(ROOT, fichierRegistre)} (${Object.keys(registre).length} paires)`);
