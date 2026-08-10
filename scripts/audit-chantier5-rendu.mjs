// scripts/audit-chantier5-rendu.mjs — CHANTIER 5 : la VÉRIFICATION AU RENDU.
//
// La leçon du 10/08 : « la charge RSC contient la valeur même quand rien ne l'affiche, et un grep
// de l'URL répond “présent” dans les deux cas ». Ce script retire donc TOUS les <script> (là où
// vit `self.__next_f.push`), puis dépouille les balises, et ne cherche l'aiguille que dans le
// TEXTE réellement servi au lecteur. Aucune écriture, aucune requête Supabase.
//
// Usage : node scripts/audit-chantier5-rendu.mjs <sortie.json> <slug:aiguille> [...]
import fs from 'node:fs';

const sortie = process.argv[2];
const cas = process.argv.slice(3).map((s) => {
  const i = s.indexOf(':');
  return { slug: s.slice(0, i), aiguille: s.slice(i + 1) };
});

const texteVisible = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');

const res = [];
for (const { slug, aiguille } of cas) {
  const url = `http://localhost:3000/learn/akasha/${slug}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const html = await r.text();
  const txt = texteVisible(html);
  const dansLeTexte = txt.includes(aiguille);
  const dansLaCharge = html.includes(aiguille);
  res.push({ slug, aiguille, statut: r.status, visible: dansLeTexte, presentDansLaChargeRSC: dansLaCharge, longueurTexte: txt.length });
  console.log(`${dansLeTexte ? 'VU   ' : 'MUET '} ${slug} · « ${aiguille} » · charge RSC=${dansLaCharge} · http=${r.status}`);
}
fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), methode: 'HTML servi, <script> retirés (la charge RSC ne compte pas)', cas: res }, null, 1));
console.log(`écrit → ${sortie}`);
