// scripts/ops-fill-toilettage.mjs — met en file les textes dont le FRANÇAIS cloche.
//
// Les juges du parc contrôlent l'ancrage aux faits : un texte peut être parfaitement exact
// et mal écrit — ils le valident, et ils ont raison, ce n'est pas leur métier.
//
// ── RECALIBRAGE DU 02/08 sur Naruto + One Piece (2 283 descriptions lues) ──────────────
// La première mouture avait été taillée sur Death Note, dont la prose est faite de SECTIONS.
// Deux surprises en mesurant sur les deux gros univers :
//
//  1. Naruto et One Piece n'ont QUASIMENT PAS de sections (1 fiche sur 5 588) : leur prose,
//     c'est `descFr`. Un filtre qui ne regarde que les sections n'y trouve rien — il aurait
//     rendu « 0 fiche à toiletter » sur 43 % de textes défectueux.
//  2. Leurs travers ne sont PAS ceux de Death Note. Les calques anglais (« est montré »,
//     mots en -ing) ne touchent que 45 textes sur 2 283 (2 %). Les vrais défauts sont :
//       · 583 fiches où l'INFOBOX A ÉTÉ RECOPIÉE EN PROSE (« Date de naissance : 1er
//         décembre. Sexe : Masculin. Taille : 210,1 cm. ») — 555 sur One Piece ;
//       · 382 fiches au PASSÉ SIMPLE (« prit la tête », « fut capturé ») alors que la
//         consigne maison est le présent de narration — réparties à parts égales ;
//       · 79 descriptions One Piece qui COMMENCENT SANS SUJET ni majuscule (« celui qui le
//         mange peut se transformer… ») ;
//       · 14 fiches à MARKDOWN résiduel (*Genjutsu Protect*), toutes sur Naruto.
//
// Deux familles sont écartées à dessein : elles ne relèvent PAS du toilettage mais d'une
// RE-PRODUCTION, et confier un texte vide à un correcteur, c'est lui demander d'inventer —
//       · 22 descriptions qui ne sont QUE de l'infobox (« Épisodes : 527-529, 558 ») ;
//       · 61 descriptions coupées en pleine phrase (troncature d'un ancien producteur).
//     `--a-reproduire` les liste au lieu de les mettre en file.
//
// La détection reste un FILTRE, pas un juge : elle sur-sélectionne volontairement (un texte
// sain ressort à l'identique avec corrige:false, et rien n'est écrit — coût : un appel).
//
// Usage : node --env-file=.env.local scripts/ops-fill-toilettage.mjs --universe="One Piece"
//         [--dry] [--limit=40] [--slug=…] [--tout] [--a-reproduire]
import { createClient } from '@supabase/supabase-js';
import { clientOps, clientSite } from '../lib/ops/db.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const TOUT = process.argv.includes('--tout');          // toiletter même sans marqueur détecté
const A_REPRODUIRE = process.argv.includes('--a-reproduire');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 40);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];
const SLUG = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];

// Un champ d'infobox recopié en prose : « Clé : valeur courte. »
const CLE_INFOBOX = '(Date de naissance|Sexe|Statut|Taille|Poids|Groupe sanguin|Âge|Identité de genre|Première apparition\\w*|Début|Épisodes?|Chapitres?|Occupation|Affiliation|Fonction|Anniversaire|Prime|Élément de chakra)';
const MOTIF_SEG = `${CLE_INFOBOX}\\s*:\\s*[^.]{1,60}(\\.|$)`;
// Deux exemplaires : un GLOBAL pour compter (matchAll l'exige), un SANS `g` pour tester.
// Un littéral /g garde son lastIndex entre deux .test() — sur une boucle de 5 588 fiches,
// une fiche sur deux serait déclarée saine au hasard de la position laissée par la précédente.
const SEG_INFOBOX_G = new RegExp(MOTIF_SEG, 'g');
const A_INFOBOX = (t) => new RegExp(MOTIF_SEG).test(t);
const partInfobox = (t) => [...t.matchAll(SEG_INFOBOX_G)].reduce((n, m) => n + m[0].length, 0) / Math.max(1, t.length);

// Chaque marqueur a été VU dans nos textes et compté ; aucun n'est théorique. Le nombre
// entre parenthèses est la mesure du 02/08 sur Naruto + One Piece (2 283 descriptions).
const MARQUEURS = [
  [(t) => A_INFOBOX(t) && partInfobox(t) < 0.6, 'infobox recopiée en prose (583)'],
  [(t) => /\b(fut|furent|eut|eurent|vint|vinrent|prit|prirent|put|purent|parvint|devint|devinrent)\b/.test(t), 'passé simple (382)'],
  [(t) => /^\s*[a-zà-ÿ]/.test(t), 'commence sans majuscule (79)'],
  [(t) => /\*[A-Za-zÀ-ÿ][^*\n]{2,}\*/.test(t), 'markdown résiduel (14)'],
  // Les travers de Death Note : rares ici (45), mais le filtre sert les huit univers.
  [(t) => /\b(est|sont|était|étaient) (montré|montrée|montrés|montrées|vu|vue|vus|vues)\b/i.test(t), 'passif calqué (« is shown »)'],
  [(t) => /\bil est révélé que\b|\bau travers de\b|\bdans l['’]ordre de\b|\bfinit par être\b|\bpar le fait que\b|\bse retrouve être\b/i.test(t), 'tournure calquée'],
  [(t) => /\bAyant (tombé|été montré)\b/.test(t), 'participe fautif'],
  [(t) => /\b[a-z]{3,}ing\b/.test(t), 'mot anglais en -ing'],
  // Espace AVANT une virgule ou un point seulement : « ; » et « : » en prennent un en français.
  [(t) => / {2,}|\s+[,.]|,(?=[A-Za-zÀ-ÿ])/.test(t), 'ponctuation collée'],
];

// Ce qu'un correcteur ne peut pas réparer : il n'y a rien à corriger, il faudrait ÉCRIRE.
const A_REPRODUIRE_RAISONS = [
  [(t) => A_INFOBOX(t) && partInfobox(t) >= 0.6, 'ne contient QUE de l’infobox'],
  [(t) => /[a-zà-ÿ,]\s*$/.test(t), 'coupée en pleine phrase'],
];

const entrees = [];
for (let d = 0; ; d += 1000) {
  let q = clientSite().from('akasha_entries').select('slug, name, universe, attributes').order('slug').range(d, d + 999);
  if (UNIVERSE) q = q.eq('universe', UNIVERSE);
  if (SLUG) q = q.eq('slug', SLUG);
  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }
  entrees.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

// Idempotence : un texte déjà en attente ne repart pas en file. Clé = fiche + champ.
const { data: pendantes } = await supabase.from('agent_results')
  .select('target_slug, payload').eq('task_type', 'toilettage_fr').eq('review_status', 'pending');
const dejaEnFile = new Set((pendantes ?? []).map((r) => `${r.target_slug}#${r.payload?.section_index ?? 'descFr'}`));

// Un texte à examiner = une section, ou la description de la fiche.
const morceaux = [];
for (const e of entrees) {
  for (const s of e.attributes?.sections ?? [])
    morceaux.push({ e, cle: String(s.i), titre: s.titre, texte: String(s.texte ?? '') });
  if (e.attributes?.descFr) morceaux.push({ e, cle: 'descFr', titre: null, texte: String(e.attributes.descFr) });
}

const messages = [], aReproduire = [];
let vus = 0;
for (const m of morceaux) {
  // Plancher à 80 : en dessous il n y a pas une phrase. À 200 (premier jet), on écartait
  // 446 textes courts pourtant fautifs — la moitié du corpus Naruto/One Piece fait < 200 c.
  if (m.texte.length < 80) continue;
  vus++;
  const raisons = A_REPRODUIRE_RAISONS.filter(([f]) => f(m.texte)).map(([, quoi]) => quoi);
  if (raisons.length) { aReproduire.push({ ...m, raisons }); continue; }
  if (dejaEnFile.has(`${m.e.slug}#${m.cle}`)) continue;
  const motifs = MARQUEURS.filter(([f]) => f(m.texte)).map(([, quoi]) => quoi);
  if (!motifs.length && !TOUT) continue;
  if (messages.length >= LIMIT) continue;
  console.log(`  · ${m.e.slug.slice(0, 24).padEnd(24)} ${(m.titre ?? 'description').slice(0, 20).padEnd(20)} ${motifs.join(', ') || 'balayage complet'}`);
  messages.push({
    type: 'toilettage_fr',
    payload: {
      slug: m.e.slug, name: m.e.name, universe: m.e.universe,
      ...(m.cle === 'descFr' ? {} : { section_index: m.cle, titre: m.titre }),
      texte: m.texte,
    },
  });
}

console.log(`\n→ ${messages.length} texte(s) à toiletter sur ${vus} inspecté(s)${UNIVERSE ? ` [${UNIVERSE}]` : ''} · ${aReproduire.length} à RE-PRODUIRE (écartés)`);
if (A_REPRODUIRE) {
  console.log('\nÀ re-produire (un correcteur n’a rien à corriger là-dedans) :');
  for (const m of aReproduire.slice(0, 60)) console.log(`  ✗ ${m.e.slug.slice(0, 26).padEnd(26)} ${m.raisons.join(', ')}`);
}
if (DRY || !messages.length) { if (DRY) console.log('(à blanc — rien mis en file)'); process.exit(0); }

for (let i = 0; i < messages.length; i += 100) {
  const { error } = await supabase.rpc('ops_queue_send_batch', { messages: messages.slice(i, i + 100) });
  if (error) { console.error('mise en file :', error.message); process.exit(1); }
}
console.log(`✓ ${messages.length} texte(s) en file`);
