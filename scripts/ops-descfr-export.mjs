// scripts/ops-descfr-export.mjs — prépare un BLITZ DESCRIPTIONS : les entrées SANS descFr dont la
// page Fandom porte assez de prose pour en écrire une.
//
// POURQUOI À CÔTÉ DU BLITZ DE SECTIONS (04/08/2026)
// Le blitz de sections découpe les grosses pages ; il laisse tomber tout ce qui fait moins de 250
// caractères par section. Or les 1 981 « autres entrées » de Naruto (jutsu, artefacts, statuts)
// ont typiquement 300 à 1 000 caractères de prose EN TOUT : aucune section, mais largement de quoi
// écrire la description française qui manque à 72 % d'entre elles. Deux gisements, deux outils.
//
// Usage : node --env-file=.env.local scripts/ops-descfr-export.mjs --universe="Naruto" \
//           [--prefixe=ndfr] [--dir=…] [--limit=2000] [--par-chargeur=25] [--autres-seuls]
import fs from 'node:fs';
import { fetchFandomProse } from './lib/fandom.mjs';
import { clientSite } from '../lib/ops/db.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const UNIVERSE = arg('universe');
const PREFIXE = arg('prefixe', 'dfr');
const DIR = arg('dir', '/tmp');
const LIMIT = Number(arg('limit', 2000));
const PAR = Number(arg('par-chargeur', 25));
const AUTRES_SEULS = process.argv.includes('--autres-seuls');
if (!UNIVERSE) { console.error('--universe obligatoire'); process.exit(1); }

const s = clientSite();
const cibles = [];
for (let d = 0; cibles.length < LIMIT; d += 1000) {
  let q = s.from('akasha_entries').select('slug,name,type,summary,attributes')
    .eq('universe', UNIVERSE).is('attributes->descFr', null).range(d, d + 999);
  if (AUTRES_SEULS) q = q.neq('type', 'character');
  const { data, error } = await q;
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  cibles.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
console.log(`cibles : ${cibles.length} entrée(s) sans descFr [${UNIVERSE}]`);

// Le seuil : 220 caractères de prose. En deçà, l'agent n'aurait qu'une phrase à reformuler et
// produirait de la paraphrase creuse — mieux vaut laisser la fiche vide qu'y poser du remplissage.
const entrees = []; let maigres = 0, refus = 0;
for (const e of cibles.slice(0, LIMIT)) {
  let page = null;
  try { page = await fetchFandomProse(UNIVERSE, e.name, { maxChars: 3000, slug: e.slug }); } catch { /* réseau */ }
  if (!page?.text) { maigres++; continue; }
  if (!page.sameEntity) { refus++; continue; }        // la garde d'identité prime, comme partout
  const prose = String(page.text).trim();
  if (prose.length < 220) { maigres++; continue; }
  entrees.push({ slug: e.slug, name: e.name, type: e.type, titre: page.title,
    resume: String(e.summary ?? '').slice(0, 160), source: prose.slice(0, 3000) });
  if (entrees.length % 100 === 0) console.log(`  … ${entrees.length} préparées (${maigres} trop maigres, ${refus} refusées)`);
}

const n = Math.ceil(entrees.length / PAR);
for (let i = 0; i < n; i++) fs.writeFileSync(`${DIR}/${PREFIXE}_${i}.json`, JSON.stringify(entrees.slice(i * PAR, (i + 1) * PAR)));
fs.writeFileSync(`${DIR}/${PREFIXE}-meta.json`, JSON.stringify({ universe: UNIVERSE, entrees: entrees.length, chargeurs: n, maigres, refus }));
console.log(`FINAL — ${entrees.length} entrée(s) · ${n} chargeur(s) · ${maigres} sans prose exploitable · ${refus} refusées par la garde`);
