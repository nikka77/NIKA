// Chantier 4 — RÉSUMÉS de remplissage Dragon Ball. À blanc par défaut ; `--appliquer` pour écrire.
// UNE SEULE COLONNE ÉCRITE : `summary`.
//
// POPULATION — pas les 132, les 13. Mesuré avant d'écrire (data/audits/poche-db-resumes-visibilite-*) :
// sur les 132 fiches au résumé de remplissage, `summary` n'est LU nulle part pour 112 d'entre elles.
//   · components/akasha/AkashaList.tsx:124 et AkashaMosaic.tsx:39 → `flavor ?? entry.summary`
//   · app/learn/akasha/[slug]/page.tsx:40 → `flavorExcerpt(descFr) ?? …summary`
//   · components/akasha/zone/CharacterZone.tsx:395 → `descFr || summary`
//   ⇒ dès que `flavorText(descFr)` rend une phrase, le résumé est en SECONDE ligne et invisible.
//   · SEUL lecteur inconditionnel : components/akasha/CharacterCard.tsx:101 (`f.summary ?? entry.summary`),
//     alimenté par app/learn/akasha/u/[slug]/page.tsx:93 → les 48 premiers personnages Dragon Ball
//     par popularité, c'est-à-dire les cartes TCG du hub.
// Mesure : 9 fiches visibles en carte TCG, 11 en liste/méta, dont 7 SANS descFr — celles-là, on
// n'y touche pas et on les compte (consigne). Reste 13.
//
// RÈGLES D'EXTRACTION (leçons du 10/08 payées par les vagues 1 et 3) :
//  · la longueur n'est qu'un GARDE-FOU, jamais le critère de choix (Shenron, 4 caractères) ;
//  · on prélève à la TÊTE ; un rang > 0 n'est accepté QUE si la phrase commence par le même nom
//    propre que la phrase de tête — c'est le seul cas où le sujet ne pend pas à un antécédent parti ;
//  · une garde lexicale connaît son exception : « personnage » interdit dans « est un personnage de
//    fiction/remplissage » (note de production), permis dans « les personnages Caulifla et Kale ».
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const APPLIQUER = process.argv.includes('--appliquer');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const MIN = 20, MAX = 190, CONFORT = 150;

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

// ── port de lib/akasha/flavor.ts (pour savoir QUI est visible, pas pour écrire) ──
const phrasesFlavor = (t) => t.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/);
const NARRATIVE = /\b(est|était|fut|furent|sont|devient|devint|deviendra|vit|vivait|incarne|dirige|dirigeait|appartient|appartenait|combat|combattit|possède|possédait|porte|portait|reste|demeure|sert|servait|travaille|naquit|grandit|rejoint|rejoignit|mène|menait|règne|protège|apparaît|apparut|débute|surnommé|connu|considéré)\b/i;
function isProse(s) {
  if (s.length < 40) return false;
  if (/^[\w'’À-ÿ ()\-\/.]{1,32}\s*:/.test(s)) return false;
  const c = (s.match(/:/g) || []).length;
  if (c >= 2 || (c === 1 && !NARRATIVE.test(s))) return false;
  return NARRATIVE.test(s) || s.length >= 90;
}
function flavorText(d) {
  if (!d || d.trim().length < 30) return null;
  const parts = phrasesFlavor(d);
  for (let i = 0; i < parts.length; i++) if (isProse(parts[i])) return parts[i];
  return null;
}

/** Découpe en phrases. Un point à l'intérieur d'une parenthèse ou de guillemets ne termine
 *  jamais une phrase (leçon du 10/08 : « litt. » cassait « (Nishi no Kaiô ; litt. « … ») »).
 *  Un point suivi d'un chiffre ou d'une minuscule non plus (« n°17, », « Dr. Gero »). */
function phrases(texte) {
  const t = texte.replace(/\s+/g, ' ').trim();
  const out = []; let prof = 0, guil = false, deb = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '(') prof++;
    else if (c === ')') prof = Math.max(0, prof - 1);
    else if (c === '«') guil = true;
    else if (c === '»') guil = false;
    else if ('.!?…'.includes(c) && !prof && !guil) {
      const suite = t.slice(i + 1);
      if (!/^\s+[A-ZÀ-Ý«"']/.test(suite) && suite.trim() !== '') continue;
      out.push(t.slice(deb, i + 1).trim()); deb = i + 1;
    }
  }
  if (deb < t.length) out.push(t.slice(deb).trim());
  return out.filter(Boolean);
}

const MAJUSCULE = /^[A-ZÀ-Ý][\p{L}'’-]*/u;
const premierMotPropre = (s) => (MAJUSCULE.exec(s)?.[0] ?? null);

// Gardes de refus, chacune avec son exception connue.
const REFUS = [
  { motif: 'note de production (personnage de fiction / de remplissage)', re: /\best un personnage (de fiction|de remplissage|secondaire|mineur)/i },
  { motif: 'note de production (première apparition / doublage / création)', re: /\b(introduit|apparaît|apparait) pour la première fois\b|\bdoublé par\b|\bcréé par (Akira )?Toriyama\b/i },
  { motif: 'étymologie en tête', re: /^son nom (est|vient|provient)/i },
  { motif: 'sujet anaphorique (pronom sans antécédent hors du texte)', re: /^(il|elle|ils|elles|on|celui-ci|celle-ci|ce dernier|cette dernière)\b/i },
  { motif: 'complément en tête suivi d’un pronom', re: /^[^,.]{1,40},\s*(il|elle|ils|elles)\b/i },
];
// Une phrase DÉFINITOIRE : soit une copule, soit un groupe nominal d'attribution en tête.
const COPULE = /\b(est|sont|était|étaient|fut|furent)\b|^c'est\b/i;
const NOMINAL = /^(un|une|le|la|les|l'|d'|des|l’)\s*\S/i;

const entries = await page('akasha_entries', 'id, slug, name, universe, type, summary, attributes');
const MOTIF_CREUX = /^(personnage|lieu|objet|technique|créature|groupe)\s+(secondaire|mineur|de l'univers)[^.]{0,60}\.?$/i;
const creux = entries.filter((e) => e.universe === 'Dragon Ball' && e.summary && MOTIF_CREUX.test(e.summary.trim()));

// Qui voit `summary` ? (même calcul que la trace de visibilité)
const dbChars = entries.filter((e) => e.universe === 'Dragon Ball' && e.type === 'character');
const fav = (e) => { const v = e.attributes?.favorites; return typeof v === 'number' ? v : (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null); };
const top48 = new Set([...dbChars].sort((a, b) => {
  const fa = fav(a), fb = fav(b);
  if (fa === null && fb !== null) return 1;
  if (fb === null && fa !== null) return -1;
  if (fa !== null && fb !== null && fa !== fb) return fb - fa;
  return String(a.name).localeCompare(String(b.name));
}).slice(0, 48).map((e) => e.slug));

const propositions = [], refuses = [];
for (const e of creux) {
  const d = typeof e.attributes?.descFr === 'string' ? e.attributes.descFr.trim() : '';
  const enCarte = top48.has(e.slug);
  const flavor = flavorText(d);
  const visible = enCarte || flavor === null;   // carte TCG (inconditionnel) OU pas de flavor
  const jeter = (motif) => refuses.push({ slug: e.slug, name: e.name, visible, enCarte, descFrLen: d.length, motif });

  if (!visible) { jeter('summary n’est lu nulle part pour cette fiche (flavorText(descFr) le devance partout)'); continue; }
  if (!d) { jeter('descFr absent — consigne : ne rien toucher, compter la fiche'); continue; }
  if (d.length < MIN) { jeter(`descFr creux (${d.length} car.) — ne rien toucher`); continue; }

  const ph = phrases(d);
  const tete = ph[0] ?? '';
  const nomTete = premierMotPropre(tete);
  const essais = [{ rang: 0, s: tete }];
  // Rang > 0 : uniquement si la phrase reprend le NOM PROPRE de tête comme premier mot.
  if (nomTete) for (let i = 1; i < ph.length && essais.length < 4; i++) {
    if (premierMotPropre(ph[i]) === nomTete) essais.push({ rang: i, s: ph[i] });
  }

  let retenu = null, pourquoi = [];
  for (const { rang, s0 } of essais.map((x) => ({ rang: x.rang, s0: x.s }))) {
    let s = s0;
    // Parenthèse FINALE seulement, et seulement si la phrase dépasse le confort de lecture.
    if (s.length > CONFORT) {
      const t = s.replace(/\s*\([^()]*\)\s*([.!?…])?\s*$/, '$1').trim();
      if (t.length >= MIN && /[.!?…]$/.test(t)) s = t;
    }
    const ko = REFUS.find((r) => r.re.test(s));
    if (ko) { pourquoi.push(`rang ${rang} : ${ko.motif}`); continue; }
    if (!COPULE.test(s) && !NOMINAL.test(s)) { pourquoi.push(`rang ${rang} : ni copule ni groupe nominal définitoire`); continue; }
    if (s.length < MIN || s.length > MAX) { pourquoi.push(`rang ${rang} : hors bande ${MIN}–${MAX} (${s.length} car.)`); continue; }
    retenu = { rang, texte: s.endsWith('.') || /[!?…]$/.test(s) ? s : `${s}.`, source: s0 };
    break;
  }
  if (!retenu) { jeter(pourquoi.join(' · ') || 'aucune phrase exploitable'); continue; }
  propositions.push({
    id: e.id, slug: e.slug, name: e.name, enCarte, visible,
    avant: e.summary, apres: retenu.texte, rang: retenu.rang, longueur: retenu.texte.length,
    preuve: `attributes.descFr de « ${e.name} », phrase de rang ${retenu.rang} : « ${retenu.source} »`,
  });
}

console.log(`creux Dragon Ball : ${creux.length} · propositions : ${propositions.length} · refus : ${refuses.length}`);
const parRefus = {};
for (const r of refuses) parRefus[r.motif.replace(/\(\d+ car\.\)/, '(…)').replace(/\d+ car\./, '… car.')] = (parRefus[r.motif.replace(/\(\d+ car\.\)/, '(…)').replace(/\d+ car\./, '… car.')] ?? 0) + 1;
console.log('refus :', JSON.stringify(parRefus, null, 1));
for (const p of propositions) {
  console.log(`\n· ${p.slug}${p.enCarte ? ' [carte TCG]' : ''}  rang ${p.rang}  ${p.longueur} car.`);
  console.log(`   avant : ${p.avant}`);
  console.log(`   après : ${p.apres}`);
}

const trace = path.join(ROOT, `data/audits/poche-db-resumes-${APPLIQUER ? 'application' : 'blanc'}-${STAMP}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: 'chantier 4 — résumés de remplissage Dragon Ball, restreints aux fiches où summary est LU',
  quand: new Date().toISOString(), mode: APPLIQUER ? 'APPLICATION' : 'à blanc', colonneEcrite: 'summary',
  corpus: entries.length, creuxDragonBall: creux.length,
  reglages: { min: MIN, max: MAX, confort: CONFORT, rangSuperieurSiMemeNomPropre: true },
  propositions, refuses, parRefus,
}, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, trace)}`);
if (!APPLIQUER) { console.log('(à blanc — relancer avec --appliquer)'); process.exit(0); }

let ok = 0; const echecs = [];
for (const p of propositions) {
  const { error } = await db.from('akasha_entries').update({ summary: p.apres }).eq('id', p.id);
  if (error) echecs.push({ slug: p.slug, erreur: error.message }); else ok++;
}
console.log(`${ok} résumés écrits · ${echecs.length} échecs`);
fs.writeFileSync(trace.replace('.json', '-bilan.json'), JSON.stringify({ ecrits: ok, echecs }, null, 1));
