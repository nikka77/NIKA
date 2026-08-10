// scripts/verifier-candidats-vague2.mjs — ÉPROUVER LES CANDIDATS AVANT D'ÉCRIRE LES MILLE.
//
// POURQUOI. « Mesurer son taux d'erreur sur vingt cas avant d'écrire les mille » : le connecteur
// se juge sur SES propres critères, donc il ne peut pas se contredire. Ce script apporte une
// preuve d'une AUTRE nature — les catégories de la page (ce que le wiki dit ÊTRE le sujet) et le
// résumé déjà en base (ce que NOUS disons qu'elle est) — pour que la lecture les compare.
// Le contrôle du 07/08 (leçon : « une attestation ne se pose qu'après relecture de la PAGE ») a été
// payé exactement là : le titre « Potato » passait toutes les épreuves de forme, seule l'infobox
// disait « Pirate ».
//
// Aucune écriture, ni en base ni ailleurs : la sortie va sur la console pour être LUE.
//
// Usage : node --env-file=.env.local scripts/verifier-candidats-vague2.mjs --rapport=data/audits/images-v2-….json
import { readFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';
import { fandomSleep as sleep } from './lib/fandom.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const RAPPORT = arg('rapport');
if (!RAPPORT) { console.error('✗ --rapport=<rapport de ops-images-vague2.mjs> requis'); process.exit(1); }
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)' };
const API_FR = {
  'One Piece': 'https://onepiece.fandom.com/fr/api.php', 'Naruto': 'https://naruto.fandom.com/fr/api.php',
  'Bleach': 'https://bleach.fandom.com/fr/api.php', 'Dragon Ball': 'https://dragonball.fandom.com/fr/api.php',
  "JoJo's Bizarre Adventure": 'https://jjba.fandom.com/fr/api.php', 'Death Note': 'https://deathnote.fandom.com/fr/api.php',
};
const API_EN = { 'One Piece': 'onepiece', 'Naruto': 'naruto', 'Bleach': 'bleach', 'Dragon Ball': 'dragonball',
  "JoJo's Bizarre Adventure": 'jojo', 'Death Note': 'deathnote', 'Initial D': 'initiald', 'Hunter x Hunter': 'hunterxhunter' };

const rap = JSON.parse(await readFile(RAPPORT, 'utf8'));
const poses = rap.posees_detail ?? [];
console.log(`${poses.length} candidat(s) dans ${RAPPORT}\n`);
if (!poses.length) process.exit(0);

const site = clientSite();
const { data: fiches } = await site.from('akasha_entries')
  .select('slug,name,type,universe,summary').in('slug', poses.map((p) => p.slug));
const parSlug = new Map((fiches ?? []).map((f) => [f.slug, f]));

for (const p of poses) {
  const f = parSlug.get(p.slug) ?? {};
  const api = p.lang === 'fr' ? API_FR[p.universe] : `https://${API_EN[p.universe]}.fandom.com/api.php`;
  let cats = [];
  try {
    const r = await fetch(`${api}?action=query&prop=categories&cllimit=30&format=json&formatversion=2&redirects=1`
      + `&titles=${encodeURIComponent(p.titre_wiki)}&maxlag=5`, { headers: UA, signal: AbortSignal.timeout(20_000) });
    const j = await r.json();
    cats = (j?.query?.pages?.[0]?.categories ?? []).map((c) => c.title.replace(/^Cat[ée]gor(y|ie):/i, ''));
  } catch { cats = ['(catégories illisibles)']; }
  const fichier = decodeURIComponent(String(p.image_url).split('/images/').pop() ?? '').split('/revision')[0].replace(/^[0-9a-f]\/[0-9a-f]{2}\//, '');
  console.log(`── ${p.slug}  [${p.type} · ${p.universe}]`);
  console.log(`   NOUS   : « ${f.name} » — ${String(f.summary ?? '').slice(0, 110)}`);
  console.log(`   WIKI   : « ${p.titre_wiki} » (${p.lang}, ${p.voie})`);
  console.log(`   CATÉG. : ${cats.slice(0, 6).join(' · ') || '(aucune)'}`);
  console.log(`   FICHIER: ${fichier}   [${p.dimensions_reelles}, ${(p.octets / 1024).toFixed(0)} Ko${p.allegee_480 ? ', allégée 480' : ''}]`);
  console.log(`   URL    : ${p.image_url}`);
  await sleep(260);
}
