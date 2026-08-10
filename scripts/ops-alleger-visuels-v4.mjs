// scripts/ops-alleger-visuels-v4.mjs — LE POIDS, EN DEMANDANT LA VIGNETTE AU WIKI.
//
// ══════════════════ CE QUE LA VAGUE 3 A MANQUÉ, ET POURQUOI ══════════════════
// `ops-alleger-visuels.mjs` (10/08, 11 h) a allégé 18 vignettes et refusé 24 « pas plus légère ».
// Sa méthode : remplacer le segment `/scale-to-width-down/N` par une largeur FIXE de 480 px, puis
// re-télécharger. Deux angles morts, mesurés ici sur les 29 URL restantes :
//
//  1. `scale-to-width-down` ne fait que RÉDUIRE. Demander 480 px à un fichier qui en fait 190 rend
//     l'ORIGINAL, à l'octet près — d'où le verdict « pas plus légère (3412 Ko) » sur les neuf GIF
//     de Bleach. Le script ne connaissait pas la définition SOURCE, il ne pouvait pas le savoir.
//  2. Il exigeait la forme `/revision/latest` dans l'URL en base. Six visuels Naruto (Sarada, Nue,
//     Ashimaru, Kinshiki, Kuroma, Ten-Tails de Kara) sont stockés SANS ce segment : verdict
//     « URL de forme inattendue — non redimensionnable ». Leur source fait pourtant 2 800 à
//     3 840 px de large et le wiki en rend une vignette de 7 à 32 Ko.
//
// ══════════════════ LA MÉTHODE ══════════════════
// On ne DEVINE aucune adresse (leçon du 09/08 : trois URL reconstruites à la main étaient fausses,
// et le CDN sert son carton d'erreur en HTTP 200). On lit dans l'URL en base le sous-domaine du
// wiki et le NOM DE FICHIER — les deux y sont écrits, rien n'est reconstruit — puis on demande à
// l'API `prop=imageinfo&iiurlwidth=480` :
//   · `width`/`height`   : la définition SOURCE, qui dit si une réduction est seulement possible ;
//   · `thumburl`         : l'adresse de la vignette, RENDUE PAR LA SOURCE, `?cb=` compris.
// Si le wiki rend l'original comme vignette (source ≤ 480 px), il n'y a pas de variante allégée :
// on ne touche à rien et on le CONSIGNE avec le poids exact. Sinon on télécharge la vignette,
// on lit sa définition dans ses octets, et on n'écrit que si elle est réellement plus légère.
//
// `path-prefix=fr` dans l'URL ⇒ le fichier a été téléversé sur le wiki FRANCOPHONE : on interroge
// `…fandom.com/fr/api.php`, sans quoi le fichier est rendu « absent » (cas Kageoni, Utsusemi,
// Navire Brise Glace).
//
// N'ÉCRIT QUE `image_url`, et seulement là où la valeur est ENCORE celle qu'on a mesurée
// (`.eq('image_url', ancienne)`). NE SUPPRIME AUCUN VISUEL : décision produit, elle est à Dan.
//
// Usage :
//   node --env-file=.env.local scripts/ops-alleger-visuels-v4.mjs --dry
//   node --env-file=.env.local scripts/ops-alleger-visuels-v4.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { dimensions } from './lib/image-octets.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DRY = process.argv.includes('--dry');
// L'ÉCHELLE, ET POURQUOI ELLE COMMENCE À 720. La vague 3 posait 480 px pour tout le monde ; or
// 720 est la convention de la maison (mesuré : 2 103 URL en base portent `scale-to-width-down/720`,
// 19 seulement portent 480) et c'est aussi la largeur dont le grand cadre de portrait a besoin
// (CharacterZone / EntityZone montent jusqu'à 729 px — leçon du 08/08 sur les têtes d'affiche
// agrandies). On prend donc la PLUS GRANDE largeur qui passe sous le plafond d'octets : 720 si
// elle suffit, 480 sinon. Descendre plus bas dégraderait l'affichage pour gagner des octets, et
// c'est un arbitrage produit, pas une décision d'agent.
const ECHELLE = (arg('largeurs', '720,480')).split(',').map(Number).filter((n) => n > 0);
const PLAFOND = Number(arg('seuil', 300 * 1024));
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = `${AUDITS}alleger-v4-trace-${HORO}.json`;
const RAPPORT = `${AUDITS}alleger-v4-${HORO}.json`;

const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ko = (n) => `${(n / 1024).toFixed(0)} Ko`;

/** Le wiki et le nom de fichier LUS dans l'URL. `null` si la forme n'est pas celle du CDN Fandom. */
function decoupe(url) {
  const m = /^https:\/\/static\.wikia\.nocookie\.net\/([^/]+)\/images\/[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)/.exec(url);
  if (!m) return null;
  const prefixe = /[?&]path-prefix=([a-z-]+)/.exec(url)?.[1];
  return {
    api: `https://${m[1]}.fandom.com${prefixe && prefixe !== 'en' ? `/${prefixe}` : ''}/api.php`,
    fichier: decodeURIComponent(m[2]).replace(/_/g, ' '),
  };
}

async function imageinfo(api, fichier, largeur) {
  const u = `${api}?action=query&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=${largeur}`
    + `&format=json&formatversion=2&titles=${encodeURIComponent('File:' + fichier)}`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${u}&maxlag=5`, { headers: UA, signal: AbortSignal.timeout(25_000) });
      if (!r.ok) { await sleep(700 * (i + 1)); continue; }
      const j = await r.json();
      if (j?.error) { await sleep(700 * (i + 1)); continue; }
      const p = j?.query?.pages?.[0];
      if (!p) { await sleep(700 * (i + 1)); continue; }
      if (p.missing) return { absent: true };
      const ii = p.imageinfo?.[0];
      return ii ? { ii } : { absent: true };
    } catch { await sleep(700 * (i + 1)); }
  }
  return { panne: 'API injoignable' };
}

/** Télécharge et LIT LA DÉFINITION DANS LES OCTETS — un CDN sert son erreur en 200. */
async function telecharger(url) {
  let dernier = 'inconnu';
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40_000) });
      if (!r.ok) { dernier = `HTTP ${r.status}`; await sleep(1200 * (i + 1)); continue; }
      const buf = await r.arrayBuffer();
      const d = dimensions(buf);
      if (!d) return { octets: buf.byteLength, illisible: Buffer.from(buf).toString('latin1', 0, 48).replace(/[^\x20-\x7e]/g, '.') };
      return { octets: buf.byteLength, d };
    } catch (e) { dernier = String(e?.message ?? e).slice(0, 60); await sleep(1200 * (i + 1)); }
  }
  return { panne: dernier };
}

/* ─────────── 1. L'ÉTAT, LU EN BASE (paginé : un select nu s'arrête à 1 000 sans le dire) ─────── */
const site = clientSite();
let toutes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await site.from('akasha_entries')
    .select('id,slug,name,type,universe,image_url').order('slug').range(de, de + 999);
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  toutes = toutes.concat(data ?? []);
  if ((data ?? []).length < 1000) break;
}
const distantes = toutes.filter((e) => e.image_url && /^https?:/i.test(e.image_url));
const parUrl = new Map();
for (const e of distantes) {
  if (!parUrl.has(e.image_url)) parUrl.set(e.image_url, []);
  parUrl.get(e.image_url).push(e);
}
console.log(`${toutes.length} fiches · ${distantes.length} avec URL distante · ${parUrl.size} URL distinctes`);

/* ─────────── 2. LE POIDS RÉEL, MESURÉ MAINTENANT (HEAD sur chaque URL distincte) ─────────── */
const urls = [...parUrl.keys()];
const pesees = [];
let fait = 0;
const peseur = async () => {
  for (;;) {
    const u = urls.shift();
    if (!u) return;
    let octets = null, type = null, motif = null;
    for (let i = 0; i < 2 && octets === null; i++) {
      try {
        const r = await fetch(u, { method: 'HEAD', headers: UA, signal: AbortSignal.timeout(20_000) });
        if (r.ok) {
          const cl = Number(r.headers.get('content-length'));
          type = r.headers.get('content-type');
          if (Number.isFinite(cl) && cl > 0) octets = cl;
          else motif = 'sans content-length';
        } else motif = `HTTP ${r.status}`;
      } catch (e) { motif = String(e?.name ?? e).slice(0, 40); }
      if (octets === null) await sleep(400);
    }
    pesees.push({ url: u, octets, type, motif, fiches: parUrl.get(u).map((f) => f.slug) });
    if (++fait % 1000 === 0) console.log(`   pesée ${fait}/${parUrl.size}…`);
  }
};
await Promise.all(Array.from({ length: 10 }, peseur));

const lourdes = pesees.filter((p) => p.octets !== null && p.octets > PLAFOND).sort((a, b) => b.octets - a.octets);
const nonPesables = pesees.filter((p) => p.octets === null);
console.log(`\n${lourdes.length} URL au-dessus de ${ko(PLAFOND)} · ${nonPesables.length} non pesable(s) en HEAD\n`);

/* ─────────── 3. TRACE AVANT ÉCRITURE ─────────── */
await mkdir(AUDITS, { recursive: true });
await writeFile(TRACE, JSON.stringify({
  chantier: 'allègement des visuels — vague 4', pris_le: new Date().toISOString(),
  mode: DRY ? 'à blanc' : 'application', colonne: 'image_url',
  plafond_octets: PLAFOND, echelle_largeurs: ECHELLE,
  urls_distinctes: parUrl.size, au_dessus_du_plafond: lourdes.length, non_pesables: nonPesables.length,
  avant: [...lourdes, ...nonPesables].map((l) => ({ fiches: l.fiches, octets: l.octets, type: l.type, url: l.url })),
}, null, 1));
console.log(`trace d'avant : ${TRACE}\n`);

/* ─────────── 4. UNE PAR UNE : LE WIKI DIT S'IL EXISTE UNE VARIANTE ─────────── */
const journal = [];
let posees = 0, fichesTouchees = 0, echecs = 0;

for (const l of [...lourdes, ...nonPesables]) {
  const base = { fiches: l.fiches, octets: l.octets, poids: l.octets ? ko(l.octets) : 'non pesable en HEAD',
    type_servi: l.type, url: l.url };
  const d = decoupe(l.url);
  if (!d) {
    journal.push({ ...base, verdict: 'aucune variante : hôte sans service de redimensionnement',
      detail: `${new URL(l.url).host} sert un fichier statique ; ni paramètre de largeur ni vignette (vérifié)` });
    continue;
  }
  // L'échelle, du plus défini au moins défini. On s'arrête à la PREMIÈRE largeur qui passe sous le
  // plafond ; si aucune n'y passe, on garde la plus légère mesurée — à condition qu'elle soit
  // strictement plus légère que ce qui est en base — et on le signale.
  let src = null, meilleur = null, echecMotif = null, essais = [];
  for (const px of ECHELLE) {
    const r = await imageinfo(d.api, d.fichier, px);
    await sleep(220);
    if (r.panne) { echecMotif = `panne — à retenter (${r.panne})`; break; }
    if (r.absent) { echecMotif = `le wiki ne connaît pas « File:${d.fichier} » — à instruire, NE RIEN VIDER`; break; }
    const ii = r.ii;
    src ??= `${ii.width}×${ii.height} ${ii.mime} ${ko(ii.size)}`;
    // Le wiki rend l'original comme vignette ⇒ la source est déjà sous la largeur demandée :
    // « scale-to-width-down » ne fait que RÉDUIRE. Pas de variante à cette largeur.
    if (!ii.thumburl || ii.thumburl === ii.url) {
      essais.push({ largeur: px, resultat: `le wiki rend l'original (source ${ii.width} px de large)` });
      continue;
    }
    const t = await telecharger(ii.thumburl);
    await sleep(160);
    if (t.panne) { essais.push({ largeur: px, resultat: `panne au téléchargement (${t.panne})` }); continue; }
    if (t.illisible) { essais.push({ largeur: px, resultat: `pas une image (${t.octets} o : « ${t.illisible} »)` }); continue; }
    if (t.d.w < 80 || t.d.h < 80) { essais.push({ largeur: px, resultat: `vignette dégénérée (${t.d.w}×${t.d.h})` }); continue; }
    essais.push({ largeur: px, resultat: `${ko(t.octets)} · ${t.d.w}×${t.d.h} ${t.d.type}` });
    if (l.octets !== null && t.octets >= l.octets) continue;      // pas un gain : on n'écrit pas
    if (!meilleur || t.octets < meilleur.octets) meilleur = { px, url: ii.thumburl, ...t };
    if (t.octets <= PLAFOND) break;                                // sous le plafond : inutile de descendre
  }
  if (echecMotif) { journal.push({ ...base, verdict: echecMotif, wiki: d.api, source: src ?? undefined }); continue; }
  if (!meilleur) {
    journal.push({ ...base, verdict: 'aucune variante allégée', source: src, essais, wiki: d.api,
      detail: `« scale-to-width-down » ne fait que RÉDUIRE : à ${ECHELLE.join(' et ')} px le CDN rend l'original à l'octet près (source ${src})` });
    continue;
  }
  const t = meilleur;
  const ligne = { ...base, source: src, verdict: 'allégée', largeur_retenue: t.px, essais,
    gain: `${l.octets ? ko(l.octets) : '?'} → ${ko(t.octets)}`,
    apres_octets: t.octets,
    definition_reelle: `${t.d.w}×${t.d.h} ${t.d.type}`,
    reste_au_dessus_du_plafond: t.octets > PLAFOND || undefined,
    apres: t.url, adresse_rendue_par: `${d.api} · prop=imageinfo · iiurlwidth=${t.px}` };
  if (!DRY) {
    const { data, error } = await site.from('akasha_entries')
      .update({ image_url: t.url }).eq('image_url', l.url).select('slug');
    if (error) { echecs++; ligne.verdict = `échec d'écriture : ${error.message}`; }
    else { posees++; fichesTouchees += data?.length ?? 0; ligne.fiches_ecrites = (data ?? []).map((x) => x.slug); }
  }
  journal.push(ligne);
}

/* ─────────── 5. COMPTE CROISÉ ET RAPPORT ─────────── */
const alleges = journal.filter((j) => j.verdict === 'allégée');
const gain = alleges.reduce((a, j) => a + ((j.octets ?? 0) - j.apres_octets), 0);
const compte = {
  urls_distinctes: parUrl.size,
  au_dessus_du_plafond: lourdes.length,
  non_pesables_en_head: nonPesables.length,
  allegees: alleges.length,
  restent_au_dessus_du_plafond_apres_allegement: alleges.filter((j) => j.reste_au_dessus_du_plafond).length,
  sans_variante: journal.filter((j) => String(j.verdict).startsWith('aucune variante')).length,
  autres_refus: journal.length - alleges.length - journal.filter((j) => String(j.verdict).startsWith('aucune variante')).length,
  urls_ecrites: posees, fiches_touchees: fichesTouchees, echecs_ecriture: echecs,
  octets_economises: gain, economie_lisible: `${(gain / 1024 / 1024).toFixed(2)} Mo`,
};
if (journal.length !== lourdes.length + nonPesables.length) {
  console.error(`✗ COMPTE CROISÉ FAUX : ${journal.length} lignes de journal ≠ ${lourdes.length + nonPesables.length} cas`);
}
await writeFile(RAPPORT, JSON.stringify({
  chantier: 'allègement des visuels — vague 4 (vignette rendue par le wiki)',
  passe_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application',
  plafond_octets: PLAFOND, echelle_largeurs: ECHELLE, compte, journal,
}, null, 1));

console.log('─'.repeat(78));
for (const j of journal) console.log(`${(j.poids ?? '?').padStart(10)}  ${j.fiches.join(',').slice(0, 34).padEnd(36)} ${j.verdict}${j.gain ? ` (${j.gain})` : ''}`);
console.log('─'.repeat(78));
console.log(JSON.stringify(compte, null, 1));
console.log(`rapport : ${RAPPORT}`);
