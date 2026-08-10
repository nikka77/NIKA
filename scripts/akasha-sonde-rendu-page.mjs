// scripts/akasha-sonde-rendu-page.mjs — la sonde AVANT/APRÈS du CHANTIER 2.
// Elle lit le DOM SERVI, pas la charge RSC : les <script> (qui portent le flight payload, donc
// TOUS les noms de relations même quand rien ne les rend) sont retirés AVANT le dépouillement.
// C'est le piège exact du 10/08 — « un grep de l'URL ne prouve rien, la charge RSC la porte dans
// les DEUX états ». Elle cherche ce que le composant ÉCRIT : le texte « Libellé · Nom » des chips.
// Lecture seule (HTTP GET sur le dev local). Aucune écriture, aucune base.
//
// Usage : node scripts/akasha-sonde-rendu-page.mjs <slug> [motif...]
const [slug, ...motifs] = process.argv.slice(2);
if (!slug) { console.error('usage: <slug> [motif...]'); process.exit(1); }

const res = await fetch(`http://localhost:3000/learn/akasha/${slug}`);
const html = await res.text();
const texte = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')   // ← la charge RSC vit ici : on la jette
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&rsquo;/g, '’').replace(/&middot;/g, '·').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

console.log(`— ${slug} — HTTP ${res.status} — ${texte.length} car. de DOM servi`);
// Les titres de grappes : ce sont eux qui disent quels modules sont montés.
// Les titres SANS compteur (« Appartenances », « Rattachements ») doivent être cherchés à part :
// exiger « · N » les rendait invisibles à la sonde — la sonde doit chercher ce que le composant
// ÉCRIT, pas ce qu'on imagine qu'il écrit (leçon du 10/08).
const grappes = [
  // `\w` est ASCII en JavaScript : « Maîtris\w+ par » ne peut PAS matcher « Maîtrisée par »
  // (le « é » n'est pas un caractère de mot). Piège payé le 10/08 sur `\bîle` — on écrit la classe
  // en toutes lettres plutôt que de faire confiance à `\w`.
  ...(texte.match(/(Techniques|Famille|Liens|Appartenances|Possède|Autres liens|Membres|Arsenal[^·]*|Maîtrisée? par|Habité par|Possédé par|Exercé par|Regroupe|Rattachements)\s·\s\d+/g) ?? []),
  ...['Appartenances', 'Rattachements'].filter((t) => new RegExp(`${t}(?!\\s·\\s\\d)`).test(texte)),
];
console.log(`  grappes : ${grappes.length ? [...new Set(grappes)].join(' | ') : '(aucune)'}`);
for (const m of motifs) console.log(`  ${texte.includes(m) ? '✔ VU  ' : '✘ ABSENT'}  « ${m} »`);
if (process.env.DUMP) console.log('\n' + texte.slice(0, Number(process.env.DUMP)));
