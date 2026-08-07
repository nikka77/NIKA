import { titrePlusRiche, sameEntityName } from '../lib/fandom.mjs';
const cas = [
  ['Gunjou','Kūgo Ginjō','PIÈGE (doit être false)'],
  ['Shuu','Mr. Shu','PIÈGE (doit être false)'],
  ['Bongou','Bungo','PIÈGE ? (même nb de mots)'],
  ['Musse','Mousse','BON'],
  ['Katopesla','Catopesra','BON'],
  ['Sarkies','Sarquiss','BON'],
  ['Sally','Sarie Nantokanette','BON ?'],
  ['Mutaito','Master Mutaito','BON'],
  ['Minoru Kazeno','Kazeno Minoru','BON'],
  ['Dip','Chip and Dip','BON'],
  ['Hiru','Leech (Hiru)','BON'],
  ['Goethe','Yoshino Sōma/Goethe','BON'],
  ['Ain','Ain (Neo Marines)','DOIT RESTER false'],
  ['Councillor','Konoha Council','PRÉ-EXISTANT'],
];
for (const [n,t,note] of cas) {
  console.log(String(titrePlusRiche(n,t)).padEnd(6), '| sameEntityName='+String(sameEntityName(n,t)).padEnd(6), '|', n, '→', t, '|', note);
}
