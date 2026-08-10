// scripts/ops-scinder-axe-organization.mjs — LE DERNIER AXE SALE DE NARUTO, SCINDÉ PAR NATURE.
//
// POURQUOI (10/08/2026)
// `attributes.organization` porte 124 valeurs sur 471 fiches Naruto, et l'axe est masqué au hub
// depuis le LOT 3b parce qu'il est illisible. Le LOT 6 a établi que ce n'est PAS un problème de
// graphie — renommer n'y changerait rien : une seule clé y range trois natures étrangères l'une à
// l'autre. « Akatsuki » (38 fiches) et « Team 40 » (3 fiches) ne répondent pas à la même question.
//
//   · une ORGANISATION est permanente, on y adhère : Akatsuki, Root, Kara, les Sept Épéistes, la
//     police militaire, l'Anbu, les conseils de village, les gangs, le Temple du Feu ;
//   · une ÉQUIPE est une poignée de gens sous un chef, souvent le temps d'un arc : Team 7, Team
//     Guren, le trio Ino-Shika-Chō, les Frères Démons ;
//   · une DIVISION n'existe que pendant la Quatrième Guerre, et regroupe des milliers de shinobi
//     de tous les villages : Première à Cinquième Division, corps médical, Force Shinobi Alliée.
//
// Les trois méritent d'être filtrables — mais pas dans le même rail. Ce script les sépare en trois
// clés, sans rien perdre : aucune valeur n'est supprimée, chacune change de tiroir.
//
// CE QUI DÉCIDE, ET CE QUI NE DÉCIDE PAS
// Chaque valeur est classée par une RÈGLE NOMMÉE, écrite dans la trace à côté d'elle. Une valeur
// qu'aucune règle ne reconnaît reste `organization` — le tiroir par défaut est celui qui existait,
// jamais un tiroir neuf : une erreur de classement doit laisser la donnée où elle était, pas
// l'exiler dans un axe où personne ne la cherchera.
//
// Usage : node --env-file=.env.local scripts/ops-scinder-axe-organization.mjs [--write]
import { writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const WRITE = process.argv.includes('--write');
const s = clientSite();

// ── ÉQUIPES ────────────────────────────────────────────────────────────────
// Le gros du lot se reconnaît à son préfixe (« Team X »), le reste est nommé à la main : un trio
// canon ne s'annonce pas par un motif régulier (« Ino–Shika–Chō », « Demon Brothers »).
const EQUIPE_MOTIFS = [
  { re: /^Team\b/i, regle: 'préfixe « Team » — escouade nommée d’après son chef ou son numéro' },
  { re: /\b(Three|Four|Two|Twelve)\b.*\b(Brothers|Siblings|Men|Warriors|Toads)\b/i, regle: 'fratrie ou petit groupe compté dans son nom' },
  { re: /\bQuadruplets\b/i, regle: 'groupe compté dans son nom' },
  // Le suffixe « Team » seul est TROP LARGE — premier essai, il a emporté le corps d'analyse, la
  // barrière de Konoha, la cryptanalyse et l'atelier d'armes scientifiques, qui sont des services
  // PERMANENTS du village et non des escouades. On n'accepte donc que la forme possessive ou
  // comptée, celle qui nomme un chef ou un effectif : « Hiruko's Team », « Furido's 4-Man Team ».
  { re: /(?:'s|’s)\s+Team$|-Man-Team$/i, regle: 'escouade nommée d’après son chef' },
];
const EQUIPE_NOMMEES = new Map([
  ['Konoha 11', 'les onze genin de Konoha — promotion, pas institution'],
  ['Ino–Shika–Chō', 'trio de formation canon (Yamanaka-Nara-Akimichi)'],
  ['Demon Brothers', 'duo de déserteurs de Kiri, arc du Pays des Vagues'],
  ['Haze Quadruplets', 'quatuor de genin d’Amegakure'],
  ['A–B Combo', 'duo de combat (A et Killer B)'],
  ['Gang of Four', 'quatuor de shinobi d’Otogakure'],
  ['Legendary Stupid Brothers', 'duo comique de l’arc du Pays des Vagues'],
  ['Shirogane Three', 'trio de marionnettes du clan Shirogane'],
  ['Gold and Silver Brothers', 'duo Kinkaku-Ginkaku de Kumogakure'],
  ['Honoured Siblings', 'fratrie de l’arc du Pays du Riz'],
  ['Exploding-Till-You-Eat', 'duo de l’Akatsuki (nom de code d’équipe)'],
  ['Eight-Tails Subduing Team', 'escouade formée pour capturer Hachibi'],
  ['Escort Unit', 'escouade d’escorte, formée pour une mission'],
  ['Sealing Team', 'escouade de scellement de la Quatrième Guerre'],
  ['Infiltration and Reconnaissance Party', 'détachement d’infiltration, formé pour une mission'],
  ['Daimyō Protection Squad', 'escouade de protection du daimyō'],
  // « 4-Man Team » avec une espace, pas un trait d'union : le motif ne l'attrape pas, et je préfère
  // nommer le cas plutôt qu'élargir une règle pour un seul exemplaire.
  ["Furido's 4-Man Team", 'escouade de quatre nommée d’après son chef'],
]);

// ── DIVISIONS DE LA QUATRIÈME GUERRE ───────────────────────────────────────
// Elles n'existent que pendant le conflit et rassemblent tous les villages : c'est ce qui les
// sépare d'un corps permanent de village, pas leur taille.
const DIVISION_MOTIFS = [
  { re: /\bDivision$/i, regle: 'suffixe « Division » — unité de la Force Shinobi Alliée' },
];
const DIVISION_NOMMEES = new Map([
  ['Corps médical', 'corps médical de la Force Shinobi Alliée'],
  ['Force Shinobi Alliée', 'l’armée alliée elle-même'],
  ['Allied Mothers Force', 'unité alliée de la Quatrième Guerre'],
  ['Impure World Reincarnation Allied Forces', 'les réincarnés opposés à l’alliance'],
  ['Twenty Platoons', 'découpage de la Force Shinobi Alliée'],
  ['Surprise Attack and Diversion Platoon', 'peloton de la Force Shinobi Alliée'],
  ['Explosion Corps', 'corps d’explosifs de la Force Shinobi Alliée'],
]);

function classer(v) {
  if (EQUIPE_NOMMEES.has(v)) return { axe: 'equipe', regle: EQUIPE_NOMMEES.get(v) };
  if (DIVISION_NOMMEES.has(v)) return { axe: 'division', regle: DIVISION_NOMMEES.get(v) };
  for (const { re, regle } of DIVISION_MOTIFS) if (re.test(v)) return { axe: 'division', regle };
  for (const { re, regle } of EQUIPE_MOTIFS) if (re.test(v)) return { axe: 'equipe', regle };
  return { axe: 'organization', regle: 'aucune règle ne la reconnaît — reste où elle était' };
}

const rows = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await s.from('akasha_entries')
    .select('id, slug, name, attributes').eq('universe', 'Naruto').range(d, d + 999);
  if (error) { console.error(error.message); process.exit(1); }
  rows.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

const parValeur = new Map();
for (const r of rows) {
  const v = r.attributes?.organization;
  if (typeof v !== 'string' || !v.trim()) continue;
  if (!parValeur.has(v)) parValeur.set(v, []);
  parValeur.get(v).push(r);
}

const plan = { equipe: [], division: [], organization: [] };
for (const [v, fiches] of parValeur) {
  const { axe, regle } = classer(v);
  plan[axe].push({ valeur: v, fiches: fiches.length, regle, slugs: fiches.map((f) => f.slug) });
}
for (const k of Object.keys(plan)) plan[k].sort((a, b) => b.fiches - a.fiches);

console.log(`${parValeur.size} valeurs · ${rows.filter((r) => r.attributes?.organization).length} fiches\n`);
for (const [axe, liste] of Object.entries(plan)) {
  const n = liste.reduce((t, x) => t + x.fiches, 0);
  console.log(`── ${axe.toUpperCase()} : ${liste.length} valeurs, ${n} fiches`);
  for (const x of liste) console.log(`   ${String(x.fiches).padStart(3)} ${x.valeur.padEnd(44)} ${x.regle.slice(0, 52)}`);
  console.log();
}

const trace = {
  chantier: 'scission de l’axe organization (Naruto)', quand: new Date().toISOString(), write: WRITE,
  avant: { valeurs: parValeur.size, fiches: rows.filter((r) => r.attributes?.organization).length },
  plan,
};

if (WRITE) {
  let deplacees = 0;
  for (const axe of ['equipe', 'division']) {
    for (const x of plan[axe]) {
      for (const r of parValeur.get(x.valeur)) {
        // On RETIRE `organization` et on pose la nouvelle clé : la valeur ne doit pas exister dans
        // deux tiroirs à la fois, sinon le rail masqué reste peuplé et l'axe ne sortira jamais.
        const { organization, ...reste } = r.attributes ?? {};
        await s.from('akasha_entries').update({ attributes: { ...reste, [axe]: x.valeur } }).eq('id', r.id);
        deplacees++;
      }
    }
  }
  trace.deplacees = deplacees;
  console.log(`→ ${deplacees} fiche(s) déplacée(s)`);
}

await writeFile(new URL('../data/audits/scission-organization-trace.json', import.meta.url), JSON.stringify(trace, null, 1));
console.log(`${WRITE ? '' : '(à blanc — relancer avec --write) '}trace : data/audits/scission-organization-trace.json`);
