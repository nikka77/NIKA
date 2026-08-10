// Chantier 4 — étape C : second gisement, NOS PROPRES textes (descFr) des 146 isolées.
// Le wiki plafonne (mesuré étape B). Ici on n'extrait QU'UNE relation PRÉDIQUÉE : un motif
// relationnel explicite + un nom qui est celui d'une fiche EXISTANTE du même univers.
// Une co-occurrence ne compte pas (leçon 10/08 : « une mention n'est pas une identité »).
// Lecture seule — la phrase entière sert de preuve.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Même normalisation, mais en gardant l'INDEX d'origine de chaque caractère produit :
 *  c'est ce qui permet de rendre la phrase-preuve exacte du texte source. */
function normAvecCarte(s) {
  const src = String(s ?? '');
  let out = '', carte = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const t = /^[a-z0-9]$/.test(c) ? c : ' ';
    if (t === ' ' && (out === '' || out.endsWith(' '))) continue;
    out += t; carte.push(i);
  }
  if (out.endsWith(' ')) { out = out.slice(0, -1); carte.pop(); }
  return { tn: out, carte };
}

const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const deg = new Set();
for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const isolees = entries.filter((e) => !deg.has(e.id) && e.universe === 'Dragon Ball');
const memeUnivers = entries.filter((e) => e.universe === 'Dragon Ball');

// Index des noms du corpus, mots pleins ≥ 3 caractères, sans homonyme.
const parNom = new Map();
for (const e of memeUnivers) {
  const n = norm(e.name);
  if (n.length < 3) continue;
  if (!parNom.has(n)) parNom.set(n, []);
  parNom.get(n).push(e);
}
const nomsUniques = [...parNom.entries()].filter(([, v]) => v.length === 1).map(([k, v]) => ({ cle: k, e: v[0] }));
// Recherche du plus long nom d'abord (« Commando Ginyu » avant « Ginyu »).
nomsUniques.sort((a, b) => b.cle.length - a.cle.length);

// MOTIFS RELATIONNELS — chacun exige un prédicat explicite, pas une simple présence du nom.
// `avant` = ce qui doit précéder immédiatement le nom (le prédicat), `relation` = la nature posée.
// ⚠️ Ces motifs se lisent sur la chaîne NORMALISÉE (accents retirés, ponctuation → espace) :
// un « élèves du » y devient « eleves du ». Écrire « élèves » ici ne matcherait JAMAIS.
const MOTIFS = [
  { nom: 'membre', re: /\b(?:membre|membres)\s+(?:le plus [a-z]+\s+)?(?:du|de la|de l|des)\s+$/, relation: 'appartient', typesCible: ['organization', 'status', 'group'] },
  { nom: 'fait partie', re: /\bfait partie\s+(?:du|de la|de l|des)\s+$/, relation: 'appartient', typesCible: ['organization', 'status', 'group'] },
  { nom: 'sbire/serviteur', re: /\b(?:sbire|sbires|serviteur|serviteurs|homme de main|assistant|assistante|majordome)\s+(?:du|de la|de l|des|de)\s+$/, relation: 'appartient', typesCible: ['character', 'organization', 'status'] },
  { nom: 'eleve', re: /\b(?:eleve|eleves|disciple|disciples|apprenti|apprentis)\s+(?:du|de la|de l|des|de)\s+$/, relation: 'eleve', typesCible: ['character'] },
  { nom: 'maitre/mentor', re: /\b(?:maitre|maitres|mentor|mentors|entraineur|entraineurs)\s+(?:du|de la|de l|des|de)\s+$/, relation: 'mentor', typesCible: ['character'] },
  { nom: 'habite village/planete', re: /\b(?:du|de la|de l|des|le|la)\s+(?:village|planete|ile|royaume|cite|ville)\s+$/, relation: 'habite', typesCible: ['place'] },
  { nom: 'reside a', re: /\b(?:reside|vit|habite|demeure|originaire)\s+(?:a|au|sur|dans|dans le|dans la|de|du)\s+$/, relation: 'habite', typesCible: ['place'] },
];

const trouves = [];
const parMotif = {};
for (const e of isolees) {
  const t = typeof e.attributes?.descFr === 'string' ? e.attributes.descFr : '';
  if (!t) continue;
  const { tn, carte } = normAvecCarte(t);
  for (const { cle, e: cible } of nomsUniques) {
    if (cible.id === e.id) continue;
    let pos = tn.indexOf(cle);
    while (pos >= 0) {
      const avantFin = tn.slice(0, pos);
      const apres = tn.slice(pos + cle.length);
      // frontière de mot des DEUX côtés (sur la chaîne normalisée, où tout est [a-z0-9 ])
      const bordG = pos === 0 || tn[pos - 1] === ' ';
      const bordD = apres === '' || apres[0] === ' ';
      if (bordG && bordD) {
        for (const m of MOTIFS) {
          if (!m.re.test(avantFin)) continue;
          if (!m.typesCible.includes(cible.type)) continue;
          // phrase-preuve : la phrase du texte ORIGINAL, retrouvée par la carte d'index
          // (pas par une règle de trois sur les longueurs — les accents décalent).
          const io = carte[pos];
          const deb = Math.max(0, t.lastIndexOf('.', io) + 1);
          const finP = t.indexOf('.', io + 1);
          const phrase = t.slice(deb, finP < 0 ? t.length : finP + 1).trim();
          trouves.push({ deSlug: e.slug, de: e.name, deType: e.type, motif: m.nom, relation: m.relation, versSlug: cible.slug, vers: cible.name, versType: cible.type, phrase });
          parMotif[m.nom] = (parMotif[m.nom] ?? 0) + 1;
        }
      }
      pos = tn.indexOf(cle, pos + 1);
    }
  }
}
// une seule arête par paire
const vues = new Set();
const uniques = trouves.filter((x) => { const k = `${x.deSlug}>${x.versSlug}>${x.relation}`; if (vues.has(k)) return false; vues.add(k); return true; });

const trace = path.join(ROOT, `data/audits/poche-db-aretes-textes-${STAMP}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: 'chantier 4 — étape C : arêtes prédiquées extraites de NOS descFr (isolées Dragon Ball)',
  quand: new Date().toISOString(), mode: 'MESURE (lecture seule)',
  isolees: isolees.length, avecDescFr: isolees.filter((e) => (e.attributes?.descFr ?? '').length > 0).length,
  nomsUniquesIndexes: nomsUniques.length,
  motifs: MOTIFS.map((m) => ({ nom: m.nom, re: String(m.re), relation: m.relation, typesCible: m.typesCible })),
  trouvees: uniques.length, parMotif,
  fichesSorties: new Set(uniques.map((u) => u.deSlug)).size,
  candidats: uniques,
}, null, 1));
console.log('trace →', path.relative(ROOT, trace));
console.log(`isolées ${isolees.length} · noms indexés ${nomsUniques.length} · candidats ${uniques.length} · fiches sorties ${new Set(uniques.map((u) => u.deSlug)).size}`);
console.log('par motif :', JSON.stringify(parMotif));
for (const u of uniques.slice(0, 40)) console.log(`  ${u.de} --${u.relation}--> ${u.vers} (${u.versType})  [${u.motif}]  « ${u.phrase.slice(0, 130)} »`);
