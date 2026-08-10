// scripts/ops-reparer-resumes-rang.mjs — LA PREMIÈRE PHRASE DIT CE QUE C'EST ; LA DEUXIÈME EN PARLE.
//
// POURQUOI (10/08/2026)
// Le chantier « résumés de remplissage » a réécrit 131 résumés en prenant, dans `attributes.descFr`,
// la première phrase d'au moins 90 caractères. Sur 117 fiches c'est la phrase de tête, et le
// résultat est juste. Sur 14, la phrase de tête faisait moins de 90 caractères : le plancher l'a
// écartée et la deuxième phrase est passée à sa place. Or c'est presque toujours la phrase de tête
// qui DÉFINIT, et la suivante qui commente.
//
//   shen-long   → « Le Shenron des Black Star Dragon Balls est rouge, contrairement à celui de la
//                  Terre. » Le sujet de la fiche est le Shenron DE LA TERRE : son résumé parlait
//                  d'un autre dragon, et ne disait jamais ce qu'il est.
//   gregory     → un trait de caractère au lieu de « un petit grillon volant, animal de compagnie
//                  bavard du Kaiô du Nord ».
//   jaco…       → une description physique au lieu de « un flic extraterrestre venu sur Terre ».
//   gokuu-jr-son→ une comparaison avec son aïeul au lieu de sa filiation.
//
// Les quatre phrases de tête écartées faisaient 76 à 84 caractères. Un plancher de longueur mesure
// la taille, jamais la valeur : il a fait écrire pire là où mieux existait, à quatre caractères près.
//
// CE QUE FAIT CE SCRIPT : pour les 131 fiches réécrites, si la PHRASE DE TÊTE de descFr est
// définitoire — elle nomme le sujet et le rattache à une catégorie par une copule — et que le
// résumé actuel n'est pas elle, on la remet. Aucune fiche hors de ces 131. Aucun texte inventé :
// on ne fait que choisir une autre phrase du même texte déjà en base.
//
// Usage : node --env-file=.env.local scripts/ops-reparer-resumes-rang.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const WRITE = process.argv.includes('--write');
const s = clientSite();
const trace = JSON.parse(readFileSync(new URL('../data/audits/resumes-creux-ecriture-20260810-100918.json', import.meta.url), 'utf8'));

// Les abréviations coupent une phrase en deux si on découpe naïvement sur le point : « Miss Piiza
// est l'agente promotionnelle de Mr. Satan » devenait « … de Mr. » — un résumé tronqué en plein
// milieu, pire que celui qu'on prétendait réparer. Vu au dry-run, avant écriture.
const ABREV = /\b(M|MM|Mr|Mrs|Ms|Dr|St|Ste|Jr|Sr|vs|etc|cf|env|réf|art|no|n°)\.$/i;
const phrases = (t) => {
  const brut = String(t ?? '').split(/(?<=[.!?])\s+(?=[A-ZÀ-ÜÉÈÊ«"'(])/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const p of brut) {
    if (out.length && ABREV.test(out[out.length - 1])) out[out.length - 1] += ' ' + p;
    else out.push(p);
  }
  return out;
};

/** Une phrase DÉFINIT si elle rattache le sujet à une catégorie : « X est un/le… », « Un flic… ».
 *  On refuse ce qui commente (« Tout comme… », « Il a des yeux… ») ou compare (« contrairement à »). */
function definitoire(p, nom) {
  if (!p || p.length < 40) return false;
  if (/^(tout comme|il |elle |ils |elles |son |sa |ses |lors|après|avant|durant|pendant|cependant|toutefois|en effet)\b/i.test(p)) return false;
  if (/contrairement à/i.test(p)) return false;
  // MÉTA-TEXTE : une phrase qui parle de l'ŒUVRE ne définit pas le PERSONNAGE. « Baby est un
  // super-vilain de fiction dans Dragon Ball GT, basé sur le manga… » situe la série, pas le sujet ;
  // « (Suprême Kaï dans le doublage, Seigneur des Seigneurs chez Viz Media) » situe les traductions.
  // Le site parle depuis l'intérieur de l'univers — c'est sa voix, on ne la casse pas pour gagner
  // une ligne. Les deux cas ci-dessus gardent donc le résumé que le chantier leur avait donné.
  if (/\bde fiction\b|bas[ée]e? sur le manga|doublage|Viz Media|édition du manga|version originale du manga/i.test(p)) return false;
  const tete = nom.split(/\s+/)[0].replace(/[^\p{L}\p{N}]/gu, '');
  const nomme = tete.length > 2 && p.toLowerCase().includes(tete.toLowerCase());
  const copule = /\b(est|était|sont|étaient|désigne|reste|demeure)\s+(un|une|le|la|l['’]|les|des)\b/i.test(p);
  const attaqueIndefinie = /^(un|une|le|la|l['’])\s+\S+/i.test(p);
  return (nomme && copule) || attaqueIndefinie;
}

const lot = trace.lot ?? [];
const ids = lot.map((x) => x.id);
const enBase = new Map();
for (let d = 0; d < ids.length; d += 200) {
  const { data } = await s.from('akasha_entries').select('id, slug, name, summary, attributes').in('id', ids.slice(d, d + 200));
  for (const r of data ?? []) enBase.set(r.id, r);
}

const aCorriger = [];
const laisses = [];
for (const x of lot) {
  // SEULES LES FICHES PRISES HORS PHRASE DE TÊTE. Au premier essai je repassais sur les 131 : sur
  // les rangs 0, l'écart n'était qu'une troncature au point franc, et « réparer » rallongeait le
  // résumé sans rien gagner — voire l'abîmait (« Baby est un super-vilain de fiction dans Dragon
  // Ball GT, basé sur le manga… », du méta-texte). Le défaut constaté portait sur le rang, pas sur
  // la longueur : on n'y touche que là.
  if (!(x.rangPhrase > 0)) { laisses.push({ slug: x.slug, motif: 'déjà écrit depuis la phrase de tête' }); continue; }
  const r = enBase.get(x.id);
  if (!r) continue;
  // GARDE DE CONCURRENCE : si le résumé n'est plus celui que le chantier a écrit, quelqu'un est
  // passé après — on ne touche pas.
  if (r.summary?.trim() !== String(x.apres ?? '').trim()) { laisses.push({ slug: x.slug, motif: 'résumé modifié depuis' }); continue; }
  const tete = phrases(r.attributes?.descFr)[0];
  if (!tete) { laisses.push({ slug: x.slug, motif: 'descFr sans phrase lisible' }); continue; }
  if (tete === r.summary.trim()) { laisses.push({ slug: x.slug, motif: 'déjà la phrase de tête' }); continue; }
  if (!definitoire(tete, r.name)) { laisses.push({ slug: x.slug, motif: 'phrase de tête non définitoire — on garde ce qui est écrit' }); continue; }
  aCorriger.push({ id: r.id, slug: r.slug, nom: r.name, avant: r.summary.trim(), apres: tete, rangInitial: x.rangPhrase });
}

console.log(`${lot.length} fiches réécrites par le chantier · ${aCorriger.length} à remettre sur leur phrase de tête\n`);
for (const c of aCorriger) {
  console.log(`── ${c.slug} (rang ${c.rangInitial})`);
  console.log(`   avant : ${c.avant.slice(0, 108)}`);
  console.log(`   après : ${c.apres.slice(0, 108)}`);
}

const sortie = { chantier: 'réparation des résumés pris hors phrase de tête', quand: new Date().toISOString(), write: WRITE, aCorriger, laisses };
if (WRITE) {
  for (const c of aCorriger) await s.from('akasha_entries').update({ summary: c.apres }).eq('id', c.id);
  sortie.ecrites = aCorriger.length;
  console.log(`\n→ ${aCorriger.length} résumé(s) corrigé(s)`);
}
const nom = `../data/audits/reparation-resumes-rang-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(new URL(nom, import.meta.url), JSON.stringify(sortie, null, 1));
console.log(`${WRITE ? '' : '(à blanc — relancer avec --write) '}trace : data/audits/${nom.split('/').pop()}`);
