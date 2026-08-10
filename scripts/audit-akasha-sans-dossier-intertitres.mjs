// scripts/audit-akasha-sans-dossier-intertitres.mjs — CHANTIER 6, troisième temps : LA RÈGLE RESSERRÉE.
//
// POURQUOI. La lecture à la main des vingt cas (contrôle B) donne un taux d'erreur écrasant pour la
// règle large « descFr > 600 c ⇒ découper » : sur 20 textes, UN SEUL porte des intertitres explicites
// (`ilforte-grantz` : « I. Histoire », « II. Première apparition dans Bleach »), trois sont
// discutables, seize sont un bloc de prose que rien n'articule. Découper les seize, ce serait
// plaquer « Apparence / Personnalité / Histoire » — des titres pris dans une liste générique, pas
// dans le texte. La consigne l'interdit, et c'est exactement ce que la vague 1 a passé son temps à
// défaire. Règle 4 : au-delà de 5 % d'erreur, RESSERRER la règle plutôt qu'écrire.
//
// La règle resserrée au maximum : ne découper que les textes qui portent un intertitre EXPLICITE,
// c'est-à-dire un titre que le texte fournit lui-même. Ce script compte combien de fiches sans
// dossier y répondent — c'est la vraie taille du chantier, si chantier il y a.
//
// Le premier audit cherchait des intertitres en DÉBUT DE LIGNE (`^=+ … =+`, `^#`) : il en a trouvé
// zéro, et pour cause — 177 textes sur 177 n'ont AUCUN saut de ligne. Quand un intertitre a survécu
// à la mise en prose, il est INLINE (« … Cancer Taille : 185 cm Poids : 67 kg I. Histoire Ilforte
// était un Menos… »). C'est donc inline qu'il faut le chercher. La leçon du 07/08 s'applique :
// tokenisation Unicode `\p{L}` — les plages Latin-1 cassent « Hyūga » et « Chōjūrō ».
//
// N'écrit RIEN en base.
// Usage : node --env-file=.env.local scripts/audit-akasha-sans-dossier-intertitres.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();

const page = async (table, sel, tri = 'id') => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).order(tri).range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const secs = await page('akasha_sections', 'entry_id');
const avecDossier = new Set(secs.map((s) => s.entry_id));
const descFr = (e) => (typeof e.attributes?.descFr === 'string' ? e.attributes.descFr.trim() : '');

const sansDossier = entries.filter((e) => !avecDossier.has(e.id) && descFr(e).length > 0);

// Un intertitre INLINE en chiffres romains : « I. Histoire », « II. Première apparition ». Le point
// et la majuscule qui suit sont l'invariant STRUCTUREL — pas une liste de titres attendus (leçon du
// 07/08 sur les offsets : ancrer sur ce qui est vérifiable dans le texte, jamais sur un postulat).
const ROMAIN = /(?:^|[\s.])\b(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+\p{Lu}[\p{L}’'-]+/gu;
// Un intertitre inline en chiffres arabes : « 1. Histoire ».
const ARABE = /(?:^|[\s.])\b([1-9])\.\s+\p{Lu}[\p{L}’'-]+/gu;

const compteRomain = (t) => {
  const vus = new Set();
  for (const m of t.matchAll(ROMAIN)) vus.add(m[1]);
  return vus.size;
};
const compteArabe = (t) => {
  const vus = new Set();
  for (const m of t.matchAll(ARABE)) vus.add(m[1]);
  return vus.size;
};

const candidats = [];
for (const e of sansDossier) {
  const t = descFr(e);
  const r = compteRomain(t), a = compteArabe(t);
  // « Au moins DEUX repères distincts » : un « I. » solitaire peut être une initiale ou une
  // énumération avortée ; deux repères successifs sont une table des matières mise à plat.
  if (r >= 2 || a >= 2) candidats.push({ slug: e.slug, name: e.name, type: e.type, universe: e.universe, longueur: t.length, romains: r, arabes: a, texte: t });
}

// Contrôle croisé : la même règle appliquée aux fiches qui ONT déjà un dossier — si elle y trouve
// beaucoup de monde, c'est qu'elle attrape du bruit et non des intertitres.
const temoinAvecDossier = entries.filter((e) => avecDossier.has(e.id) && descFr(e).length > 0)
  .filter((e) => compteRomain(descFr(e)) >= 2 || compteArabe(descFr(e)) >= 2).length;

const rapport = {
  chantier: 'CHANTIER 6 — la règle resserrée : combien de textes portent un intertitre explicite ?',
  quand: new Date().toISOString(),
  ecritEnBase: 'RIEN — audit en lecture seule',
  population: {
    sansDossierAvecDescFr: sansDossier.length,
    sansDossierAvecDescFrSup600: sansDossier.filter((e) => descFr(e).length > 600).length,
  },
  regleResserree: {
    critere: 'au moins 2 repères de numérotation inline distincts (I. II. … ou 1. 2. …) suivis d’une majuscule',
    candidats: candidats.length,
    dontSup600: candidats.filter((c) => c.longueur > 600).length,
    temoinSurFichesDejaDotees: temoinAvecDossier,
  },
  candidats: candidats.map((c) => ({ ...c, texte: c.texte.slice(0, 700) })),
};

const sortie = path.join(ROOT, `data/audits/sans-dossier-intertitres-${rapport.quand.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));

console.log(`population sans dossier AVEC descFr : ${rapport.population.sansDossierAvecDescFr} (dont >600 c : ${rapport.population.sansDossierAvecDescFrSup600})`);
console.log(`\nRÈGLE RESSERRÉE — ${rapport.regleResserree.critere}`);
console.log(`  candidats : ${candidats.length} (dont >600 c : ${rapport.regleResserree.dontSup600})`);
console.log(`  témoin sur fiches DÉJÀ dotées d'un dossier : ${temoinAvecDossier}`);
for (const c of candidats) console.log(`   · ${c.slug.padEnd(34)} ${String(c.longueur).padStart(5)} c · ${c.universe} · romains ${c.romains} · arabes ${c.arabes}`);
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
