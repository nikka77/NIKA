// scripts/descfr-controle-20.mjs — CONTRÔLE À LA MAIN de vingt textes AVANT d'écrire les autres.
//
// Deux questions, deux natures de réponse :
//   · MÉCANIQUE — le texte que je m'apprête à poser sort-il VRAIMENT de la page citée ? On redemande
//     la page à la source et on vérifie que chaque phrase extraite s'y retrouve mot pour mot. C'est
//     la parade au défaut du 08/08 : « une preuve inventée se réinvente ailleurs ».
//   · HUMAINE — la page décrit-elle bien NOTRE entité ? Ça, aucun script ne le tranche : on imprime
//     le nom, le type, le résumé en base, le titre du wiki et le texte, et on lit.
//
// Échantillon RÉPARTI (univers × route), pas les vingt premiers : les vingt premiers ne mesurent
// que la première famille de fiches.
//
// Usage : node --env-file=.env.local scripts/descfr-controle-20.mjs --decision=<fichier> [--n=20]
import { readFile, writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const N = Number(arg('n', 20));
const dec = JSON.parse(await readFile(arg('decision'), 'utf8'));
const aEcrire = dec.decisions.filter((d) => d.verdict === 'a-ecrire');

// Répartition : on prend à tour de rôle dans chaque classe (univers × route).
const classes = new Map();
for (const d of aEcrire) {
  const k = `${d.universe}|${d.route}`;
  classes.set(k, [...(classes.get(k) ?? []), d]);
}
const files = [...classes.values()]; const echantillon = [];
for (let i = 0; echantillon.length < Math.min(N, aEcrire.length); i++) {
  let pris = false;
  for (const f of files) if (f[i]) { echantillon.push(f[i]); pris = true; if (echantillon.length >= N) break; }
  if (!pris) break;
}

const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (contrôle ; contact : tulbured06@gmail.com)' };
const dort = (ms) => new Promise((r) => setTimeout(r, ms));
const nu = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const s = clientSite();
const slugs = echantillon.map((d) => d.slug);
const { data: fiches } = await s.from('akasha_entries').select('slug,name,type,universe,summary,attributes').in('slug', slugs);
const parSlug = new Map((fiches ?? []).map((f) => [f.slug, f]));

const sortie = [];
for (const d of echantillon) {
  const api = d.url.split('/wiki/')[0] + '/api.php';
  const titre = decodeURIComponent(d.url.split('/wiki/')[1]).replace(/_/g, ' ');
  const r = await fetch(`${api}?action=parse&page=${encodeURIComponent(titre)}&prop=text&redirects=1&format=json&formatversion=2`,
    { headers: UA, signal: AbortSignal.timeout(25_000) }).then((x) => x.json()).catch(() => null);
  await dort(200);
  const html = r?.parse?.text ?? '';
  // MON INSTRUMENT D'ABORD. Premier passage : 7 phrases sur 48 déclarées « absentes » de leur page.
  // Ce n'était pas l'extraction : les appels de note (`<sup class="reference">[1]</sup>`) sont
  // retirés à l'extraction et pas ici, si bien que la page aplatie portait un « 1 » au milieu de la
  // phrase et que la comparaison échouait. Un contrôle doit aplatir EXACTEMENT comme l'extracteur.
  const plat = nu(html
    .replace(/<sup\b[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (m, k) => (/^#\d+$/.test(k) ? String.fromCharCode(Number(k.slice(1))) : ' ')));
  // Chaque phrase du texte posé doit se retrouver dans la page rendue.
  const phrases = d.descFr.split(/(?<=[.!?])\s+/).filter((p) => p.length > 25);
  const absentes = phrases.filter((p) => !plat.includes(nu(p)));
  const f = parSlug.get(d.slug);
  sortie.push({ ...d, titreRenvoye: r?.parse?.title ?? null, phrases: phrases.length,
    phrasesAbsentes: absentes.length, absentes: absentes.slice(0, 2),
    resumeEnBase: f?.summary ?? null, typeEnBase: f?.type ?? null });
}

for (const o of sortie) {
  console.log(`\n### ${o.universe} | ${o.typeEnBase} | ${o.name}   (${o.slug})`);
  console.log(`    page   : « ${o.titreRenvoye} »  [${o.route} / ${o.identite}]  ${o.url}`);
  console.log(`    résumé : ${JSON.stringify(o.resumeEnBase)}`);
  console.log(`    texte  : ${o.descFr}`);
  console.log(`    verbatim : ${o.phrases - o.phrasesAbsentes}/${o.phrases} phrase(s) retrouvée(s) dans la page`
    + (o.phrasesAbsentes ? ` ✗ ABSENTES : ${JSON.stringify(o.absentes)}` : ' ✓'));
}
const total = sortie.reduce((a, o) => a + o.phrases, 0);
const abs = sortie.reduce((a, o) => a + o.phrasesAbsentes, 0);
console.log(`\nCONTRÔLE MÉCANIQUE : ${total - abs}/${total} phrases retrouvées mot pour mot dans la page citée`);
console.log(`fiches dont au moins une phrase manque : ${sortie.filter((o) => o.phrasesAbsentes).length}/${sortie.length}`);

const chemin = `data/audits/descfr-controle20-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(new URL(`../${chemin}`, import.meta.url), JSON.stringify({
  quand: new Date().toISOString(), decision: arg('decision'), echantillon: sortie.length,
  phrasesTotal: total, phrasesAbsentes: abs, cas: sortie }, null, 1));
console.log(`trace → ${chemin}`);
