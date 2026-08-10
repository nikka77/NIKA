// scripts/audit-chantier5-lecteurs.mjs — CHANTIER 5 : QUI LIT QUOI.
// Pour chaque clé de `attributes` recensée dans le corpus, cherche dans app/ + components/ + lib/
// (le code de RENDU, jamais scripts/) les endroits qui la lisent. LECTURE SEULE.
//
// Motifs cherchés — une clé de jsonb se lit toujours d'une de ces façons dans ce dépôt :
//   attributes.cle / attrs.cle / a.cle / .cle (accès pointé)   → /[.]cle\b/
//   ['cle'] ou ["cle"] ou `'cle'` dans une liste (BELONG_ATTRS, HIDDEN, ATTRIBUTE_FIELDS…)
// On garde le fichier + la ligne pour pouvoir juger à la main (une occurrence dans HIDDEN ou dans
// un commentaire n'est PAS une lecture — le tri final est manuel, ce script ne fait que cadrer).
//
// Usage : node scripts/audit-chantier5-lecteurs.mjs <cles.json> <sortie.json>
import fs from 'node:fs';
import path from 'node:path';

const cles = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const sortie = process.argv[3];
const racines = ['app', 'components', 'lib'];

const fichiers = [];
const walk = (p) => {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(tsx?|mjs|js)$/.test(e.name)) fichiers.push(f);
  }
};
for (const r of racines) walk(r);

const contenus = fichiers.map((f) => ({ f, lignes: fs.readFileSync(f, 'utf8').split('\n') }));

const res = {};
for (const cle of cles) {
  const esc = cle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 3 formes d'écriture dans ce dépôt : accès pointé, chaîne littérale (listes HIDDEN /
  // BELONG_ATTRS / ATTRIBUTE_FIELDS), et CLÉ NUE d'objet littéral (`roman_name: 'Nom original',`
  // dans EXTRA_LABELS_FR) — c'est cette troisième forme qui manquait au premier jet et faisait
  // passer 23 clés pour muettes alors qu'elles ont un libellé FR.
  const re = new RegExp(`(\\.${esc}\\b)|(['"\`]${esc}['"\`])|(^\\s*${esc}\\s*:)`);
  const hits = [];
  for (const { f, lignes } of contenus) {
    lignes.forEach((l, i) => {
      if (!re.test(l)) return;
      const t = l.trim();
      // Une ligne de commentaire pur ne rend rien — on la marque au lieu de la jeter.
      const commentaire = t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
      hits.push({ fichier: f, ligne: i + 1, commentaire, texte: t.slice(0, 150) });
    });
  }
  res[cle] = hits;
}

fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), fichiersScannes: fichiers.length, lecteurs: res }, null, 1));
const muettes = cles.filter((c) => res[c].filter((h) => !h.commentaire).length === 0);
console.log(`fichiers scannés: ${fichiers.length}`);
console.log(`clés sans AUCUNE occurrence hors commentaire (${muettes.length}) :`, muettes.join(', '));
console.log(`écrit → ${sortie}`);
