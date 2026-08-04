// scripts/ops-descfr-appliquer.mjs — pose les descriptions d'un BLITZ DESCRIPTIONS sur les fiches.
//
// Deux gardes, les mêmes que pour les sections (03/08) :
//  · GARDE STRICTE : un slug absent des chargeurs de CETTE vague est jeté. C'est ce filet qui a
//    intercepté 9 hallucinations sans qu'aucune n'atteigne la base.
//  · JAMAIS par-dessus une descFr existante — l'usine publie en parallèle et sa version est passée
//    par le double jury ; le blitz ne recouvre pas un travail déjà validé.
//
// Usage : node --env-file=.env.local scripts/ops-descfr-appliquer.mjs --universe="Naruto" \
//           --sortie=<tasks/xxx.output> --prefixe=ndfr --chargeurs=25 [--dry]
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const UNIVERSE = arg('universe');
const SORTIE = arg('sortie');
const DIR = arg('dir', '/tmp');
const PREFIXE = arg('prefixe', 'dfr');
const N = Number(arg('chargeurs', 25));
const SIGNATURE = arg('signature', 'claude-haiku-4-5 (blitz fenêtre — rédigé depuis la page Fandom, contre-vérifié)');
if (!UNIVERSE || !SORTIE) { console.error('--universe et --sortie obligatoires'); process.exit(1); }

// 1. Ce que la vague avait le DROIT d'écrire.
const autorises = new Set();
for (let i = 0; i < N; i++) {
  const p = `${DIR}/${PREFIXE}_${i}.json`;
  if (!fs.existsSync(p)) continue;
  for (const e of JSON.parse(fs.readFileSync(p, 'utf8'))) autorises.add(e.slug);
}

// 2. Ce qu'elle a rendu.
const brut = JSON.parse(fs.readFileSync(SORTIE, 'utf8'));
const rendues = brut.result?.valides ?? brut.valides ?? [];
const vus = new Set(); const retenues = []; let horsChargeur = 0, doublons = 0, vides = 0;
for (const f of rendues) {
  if (!(f.descFr ?? '').trim()) { vides++; continue; }
  if (!autorises.has(f.slug)) { horsChargeur++; continue; }
  if (vus.has(f.slug)) { doublons++; continue; }
  vus.add(f.slug); retenues.push(f);
}
console.log(`chargeurs : ${autorises.size} entrée(s) · rendues : ${rendues.length}`);
console.log(`retenues ${retenues.length} · hors chargeur ${horsChargeur} (JETÉES) · doublons ${doublons} · vides ${vides}`);
if (process.argv.includes('--dry') || !retenues.length) process.exit(0);

// 3. État actuel des fiches, lu en lots (une fiche déjà décrite ne se réécrit pas).
const s = clientSite();
const slugs = retenues.map((f) => f.slug);
const etat = new Map();
for (let i = 0; i < slugs.length; i += 40) {
  const { data, error } = await s.from('akasha_entries').select('id,slug,attributes')
    .eq('universe', UNIVERSE).in('slug', slugs.slice(i, i + 40));
  if (error) { console.error('✗ lecture :', error.message); process.exit(1); }
  for (const e of data ?? []) etat.set(e.slug, e);
}

let posees = 0, deja = 0, absentes = 0, echecs = 0;
for (const f of retenues) {
  const e = etat.get(f.slug);
  if (!e) { absentes++; continue; }
  if (e.attributes?.descFr) { deja++; continue; }
  const attributes = { ...(e.attributes ?? {}), descFr: f.descFr.trim(), descFrSource: SIGNATURE };
  const { error } = await s.from('akasha_entries').update({ attributes }).eq('id', e.id);
  if (error) { echecs++; if (echecs <= 3) console.log(`  ✗ ${f.slug} : ${error.message}`); continue; }
  posees++;
  if (posees % 100 === 0) console.log(`  … ${posees} posées`);
}
console.log(`FINAL — ${posees} description(s) posée(s) · ${deja} déjà décrites (respectées) · ${absentes} fiches introuvables · ${echecs} échecs`);
