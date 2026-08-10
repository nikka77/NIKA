// scripts/ops-alleger-visuels.mjs — RAMENER LES VIGNETTES TROP LOURDES SOUS LE PLAFOND.
//
// POURQUOI. `image_url` part dans un `<img>` NU : AkashaList, AkashaMosaic, OmniSearch, Leaderboard
// et l'image OpenGraph le servent sans optimiseur. Une rangée de liste qui tire 2 Mo est un défaut
// même quand l'image est JUSTE. Le 10/08 la vague 1 a corrigé UNE vignette (617 Ko → 13,8 Ko) et
// documenté deux GIF ; elle n'avait pas mesuré le stock. `scripts/audit-poids-visuels.mjs` le fait.
//
// CE QUE CE SCRIPT NE FAIT PAS. Il ne DEVINE aucune adresse (leçon du 09/08 : trois adresses
// reconstruites à la main étaient fausses, et le CDN sert son carton d'erreur en HTTP 200). Il part
// de l'URL EXACTE déjà en base, y remplace le seul segment d'échelle documenté du CDN
// (`/revision/latest[/scale-to-width-down/N]`), puis RE-TÉLÉCHARGE : la définition lue dans les
// octets et le poids réel décident. Rien n'est écrit sur la foi d'un code HTTP.
//
// LE CAS QUI RÉSISTE. Sur un GIF animé, le CDN refuse parfois de redimensionner et rend 16 octets
// de texte ; d'autres fois il rend un webp animé encore au-dessus du plafond. Dans les deux cas on
// NE TOUCHE PAS la fiche et on le consigne : supprimer une image juste pour son poids est une
// décision produit, pas une décision d'agent.
//
// N'écrit QUE `image_url`, et seulement là où la valeur est ENCORE celle qu'on a mesurée
// (`.eq('image_url', ancienne)`) — quatre autres chantiers tournent en parallèle.
//
// Usage :
//   node --env-file=.env.local scripts/ops-alleger-visuels.mjs --rapport=data/audits/poids-visuels-….json --dry
//   node --env-file=.env.local scripts/ops-alleger-visuels.mjs --rapport=… --largeur=480
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { dimensions } from './lib/image-octets.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DRY = process.argv.includes('--dry');
const RAPPORT_IN = arg('rapport');
const LARGEUR = Number(arg('largeur', 480));
const PLAFOND = Number(arg('seuil', 300 * 1024));
if (!RAPPORT_IN) { console.error('✗ --rapport=<chemin du rapport de audit-poids-visuels.mjs> est requis'); process.exit(1); }

const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Le segment d'échelle du CDN Fandom, remplacé — jamais reconstruit. `null` si la forme d'URL
 *  n'est pas celle qu'on connaît : mieux vaut ne rien faire que bricoler une adresse. */
const enLargeur = (url, px) => {
  const [avant, apres] = String(url).split('/revision/latest');
  if (apres === undefined) return null;
  return `${avant}/revision/latest/scale-to-width-down/${px}${apres.replace(/^\/scale-to-width-down\/\d+/, '')}`;
};
async function telecharger(url, essais = 3) {
  let dernier = 'inconnu';
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) { dernier = `HTTP ${r.status}`; await sleep(700 * (i + 1)); continue; }
      const buf = await r.arrayBuffer();
      const d = dimensions(buf);
      // 16 octets de texte = le refus du CDN sur un GIF animé. C'est un verdict, pas un aléa.
      if (!d) return { refus: `octets illisibles (${buf.byteLength} o) — le CDN ne redimensionne pas ce fichier` };
      return { d, octets: buf.byteLength };
    } catch (e) { dernier = String(e?.message ?? e?.name ?? e).slice(0, 60); await sleep(700 * (i + 1)); }
  }
  return { panne: dernier };
}

const rap = JSON.parse(await readFile(RAPPORT_IN, 'utf8'));
const lourdes = (rap.lourdes ?? []).filter((l) => l.octets > PLAFOND);
console.log(`${lourdes.length} URL au-dessus de ${(PLAFOND / 1024).toFixed(0)} Ko (source : ${RAPPORT_IN})`);
if (!lourdes.length) process.exit(0);

const site = clientSite();
await mkdir(AUDITS, { recursive: true });
const TRACE = `${AUDITS}alleger-visuels-trace-${HORO}.json`;
await writeFile(TRACE, JSON.stringify({
  chantier: 'allègement des vignettes', pris_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application',
  colonne: 'image_url', plafond_octets: PLAFOND, largeur_cible: LARGEUR, source: RAPPORT_IN,
  avant: lourdes.map((l) => ({ fiches: l.fiches, octets: l.octets, url: l.url })),
}, null, 1));
console.log(`trace d'avant : ${TRACE}\n`);

const journal = [];
let posees = 0, fichesTouchees = 0, refuses = 0, pannes = 0, echecs = 0;
for (const l of lourdes) {
  const cible = enLargeur(l.url, LARGEUR);
  if (!cible) { refuses++; journal.push({ ...l, verdict: 'URL de forme inattendue — non redimensionnable' }); continue; }
  if (cible === l.url) { refuses++; journal.push({ ...l, verdict: `déjà en ${LARGEUR} px et toujours ${(l.octets / 1024).toFixed(0)} Ko` }); continue; }
  const r = await telecharger(cible);
  await sleep(120);
  if (r.panne) { pannes++; journal.push({ ...l, verdict: `panne réseau (${r.panne}) — à retenter`, cible }); continue; }
  if (r.refus) { refuses++; journal.push({ ...l, verdict: r.refus, cible }); continue; }
  if (r.d.w < 80 || r.d.h < 80) { refuses++; journal.push({ ...l, verdict: `vignette dégénérée (${r.d.w}×${r.d.h})`, cible }); continue; }
  if (r.octets >= l.octets) { refuses++; journal.push({ ...l, verdict: `pas plus légère (${(r.octets / 1024).toFixed(0)} Ko)`, cible }); continue; }
  if (r.octets > PLAFOND) { refuses++; journal.push({ ...l, verdict: `${(r.octets / 1024).toFixed(0)} Ko même en ${LARGEUR} px (${r.d.type}) — le CDN ne sait pas l'alléger`, cible }); continue; }
  const ligne = { fiches: l.fiches, avant_octets: l.octets, apres_octets: r.octets,
    gain: `${(l.octets / 1024).toFixed(0)} Ko → ${(r.octets / 1024).toFixed(0)} Ko`,
    dimensions_reelles: `${r.d.w}×${r.d.h} ${r.d.type}`, avant: l.url, apres: cible, verdict: 'allégée' };
  if (!DRY) {
    // `.eq('image_url', l.url)` : on ne réécrit QUE ce qu'on a mesuré. Si un autre chantier a
    // changé la valeur entre la mesure et maintenant, zéro ligne rendue et on ne recouvre rien.
    const { data, error } = await site.from('akasha_entries')
      .update({ image_url: cible }).eq('image_url', l.url).select('slug');
    if (error) { echecs++; ligne.verdict = `échec d'écriture : ${error.message}`; }
    else { posees++; fichesTouchees += data?.length ?? 0; ligne.fiches_ecrites = (data ?? []).map((x) => x.slug); }
  }
  journal.push(ligne);
}

const alleges = journal.filter((j) => j.verdict === 'allégée');
const gainTotal = alleges.reduce((a, j) => a + (j.avant_octets - j.apres_octets), 0);
const RAPPORT = `${AUDITS}alleger-visuels-${HORO}.json`;
await writeFile(RAPPORT, JSON.stringify({
  chantier: 'allègement des vignettes', passe_le: new Date().toISOString(), mode: DRY ? 'à blanc' : 'application',
  plafond_octets: PLAFOND, largeur_cible: LARGEUR,
  compte: { au_dessus_du_plafond: lourdes.length, allegeables: alleges.length, refuses, pannes,
    urls_ecrites: posees, fiches_touchees: fichesTouchees, echecs_ecriture: echecs,
    octets_economises: gainTotal, economie_lisible: `${(gainTotal / 1024 / 1024).toFixed(1)} Mo` },
  journal,
}, null, 1));
console.log(`\n${alleges.length} allégeable(s) · ${refuses} refus · ${pannes} panne(s)`);
console.log(DRY ? '→ --dry : aucune écriture.' : `→ ${posees} URL réécrite(s) sur ${fichesTouchees} fiche(s) · ${echecs} échec(s)`);
console.log(`économie : ${(gainTotal / 1024 / 1024).toFixed(1)} Mo`);
console.log(`rapport : ${RAPPORT}`);
