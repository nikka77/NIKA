// scripts/ops-resumes-sans-compte.mjs — UN RÉSUMÉ NE DOIT PAS COMPTER CE QUE LA PAGE COMPTE.
//
// POURQUOI (10/08/2026)
// 129 résumés se terminent par « … et N autres » : « porté par Naruto Uzumaki, Konohamaru Sarutobi,
// Boruto Uzumaki et 8 autres. » Le nombre a été figé dans le texte le jour où la fiche a été
// rédigée. Or le graphe bouge — 381 arêtes rien qu'aujourd'hui — et la page, elle, recompte à
// chaque rendu. Le résumé annonce donc un chiffre que la page contredit, de plus en plus souvent.
//
// Un chantier a voulu réparer en RECOMPTANT les 29 écarts trouvés. Son propre contre-vérificateur a
// montré qu'il en avait cassé 4 qui étaient justes : son compteur n'appliquait pas le même filtre
// que le gabarit de rendu (qui ne retient que les sources de type `character`, et pas pour toutes
// les natures de lien). Et j'ai recompté à mon tour, avec un troisième filtre, et j'obtiens encore
// d'autres chiffres. C'est le signe que le problème n'est pas le compteur : c'est qu'il y en a
// plusieurs, et qu'aucun ne sera jamais celui de la page.
//
// LA RÉPARATION N'EST DONC PAS DE RECOMPTER, C'EST DE NE PLUS COMPTER. On retire la queue « et N
// autres » et on laisse les trois noms cités, suivis de points de suspension : le texte reste vrai
// quoi qu'il arrive au graphe, et le décompte exact vit à un seul endroit — la page, qui le tient
// de la base au moment où elle rend.
//
// Usage : node --env-file=.env.local scripts/ops-resumes-sans-compte.mjs [--write]
import { writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const WRITE = process.argv.includes('--write');
const s = clientSite();

const rows = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await s.from('akasha_entries').select('id, slug, name, summary').order('slug').range(d, d + 999);
  if (error) { console.error(error.message); process.exit(1); }
  rows.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

// « X, Y, Z et 8 autres. » → « X, Y, Z… » · « X et 1 autre. » → « X… »
// On coupe la conjonction ET le compte, jamais les noms : ce sont eux qui portent l'information.
const QUEUE = /\s*(?:,)?\s*et\s+\d+\s+autres?\s*\.?\s*$/i;

const aCorriger = [];
for (const r of rows) {
  const avant = String(r.summary ?? '');
  if (!QUEUE.test(avant)) continue;
  const apres = avant.replace(QUEUE, '…');
  aCorriger.push({ id: r.id, slug: r.slug, avant, apres });
}

console.log(`${aCorriger.length} résumé(s) annoncent un compte que la page recalcule\n`);
for (const c of aCorriger.slice(0, 6)) {
  console.log(`── ${c.slug}`);
  console.log(`   avant : ${c.avant.slice(-84)}`);
  console.log(`   après : ${c.apres.slice(-84)}`);
}

if (WRITE) {
  for (const c of aCorriger) await s.from('akasha_entries').update({ summary: c.apres }).eq('id', c.id);
  console.log(`\n→ ${aCorriger.length} résumé(s) délestés de leur compte`);
}
const nom = `resumes-sans-compte-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(new URL(`../data/audits/${nom}`, import.meta.url),
  JSON.stringify({ chantier: 'retirer les comptes figés des résumés', quand: new Date().toISOString(), write: WRITE, corriges: aCorriger }, null, 1));
console.log(`${WRITE ? '' : '(à blanc — relancer avec --write) '}trace : data/audits/${nom}`);
