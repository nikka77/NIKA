// Chantier 4 — RÈGLE 6 appliquée AVANT écriture : où se voit `summary` pour les 132 creux DB ?
// Lecture seule. Port fidèle de lib/akasha/flavor.ts (copié, pas paraphrasé).
import { clientSite } from '../lib/ops/db.mjs';
import fs from 'node:fs';

const db = clientSite();
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

async function pageAll(table, select, tweak = (q) => q) {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await tweak(db.from(table).select(select)).range(d, d + 999);
    if (error) throw new Error(`${table} @${d}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

// ── port de lib/akasha/flavor.ts ──
const sentences = (t) => t.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/);
const NARRATIVE = /\b(est|était|fut|furent|sont|devient|devint|deviendra|vit|vivait|incarne|dirige|dirigeait|appartient|appartenait|combat|combattit|possède|possédait|porte|portait|reste|demeure|sert|servait|travaille|naquit|grandit|rejoint|rejoignit|mène|menait|règne|protège|apparaît|apparut|débute|surnommé|connu|considéré)\b/i;
function isProse(s) {
  if (s.length < 40) return false;
  if (/^[\w'’À-ÿ ()\-\/.]{1,32}\s*:/.test(s)) return false;
  const colons = (s.match(/:/g) || []).length;
  if (colons >= 2 || (colons === 1 && !NARRATIVE.test(s))) return false;
  return NARRATIVE.test(s) || s.length >= 90;
}
function firstProse(text) {
  const parts = sentences(text);
  for (let i = 0; i < parts.length; i++) if (isProse(parts[i])) return parts.slice(i).join(' ');
  return null;
}
function flavorText(descFr, max = 150) {
  if (!descFr || descFr.trim().length < 30) return null;
  const prose = firstProse(descFr);
  if (!prose) return null;
  return clamp(sentences(prose)[0] ?? prose, max);
}
function flavorExcerpt(descFr, max = 155) {
  if (!descFr || descFr.trim().length < 30) return null;
  const prose = firstProse(descFr);
  return prose ? clamp(prose, max) : null;
}
function clamp(s, max) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 18)).trimEnd() + '…';
}

const entries = await pageAll('akasha_entries', 'id,slug,name,universe,type,summary,attributes,rarity');
const MOTIF = /^(personnage|lieu|objet|technique|créature|groupe)\s+(secondaire|mineur|de l'univers)[^.]{0,60}\.?$/i;
const creux = entries.filter((e) => e.universe === 'Dragon Ball' && e.summary && MOTIF.test(e.summary.trim()));

// Top 48 par popularité = ce que le hub Dragon Ball sert à <DragonBallCards> (2 pages × PAGE_SIZE 24,
// sort 'pop' = attributes->favorites desc nullsLast puis name asc).
const dbChars = entries.filter((e) => e.universe === 'Dragon Ball' && e.type === 'character');
const fav = (e) => {
  const v = e.attributes?.favorites;
  return typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null;
};
const tri = [...dbChars].sort((a, b) => {
  const fa = fav(a); const fb = fav(b);
  if (fa === null && fb !== null) return 1;
  if (fb === null && fa !== null) return -1;
  if (fa !== null && fb !== null && fa !== fb) return fb - fa;
  return String(a.name).localeCompare(String(b.name));
});
const top48 = new Set(tri.slice(0, 48).map((e) => e.slug));

let visibleCarte = 0, visibleListe = 0, visibleMeta = 0, visibleFiche = 0;
const detail = creux.map((e) => {
  const d = typeof e.attributes?.descFr === 'string' ? e.attributes.descFr : null;
  const fl = flavorText(d, 150);
  const fe = flavorExcerpt(d, 155);
  const carte = top48.has(e.slug);          // CharacterCard : summary rendu SANS condition de descFr
  const liste = fl === null;                // AkashaList/Mosaic : flavor ?? summary
  const meta = fe === null;                 // page.tsx metadata : flavorExcerpt ?? `nom — summary`
  const fiche = !d;                         // CharacterZone bio : descFr || summary
  if (carte) visibleCarte++;
  if (liste) visibleListe++;
  if (meta) visibleMeta++;
  if (fiche) visibleFiche++;
  return { slug: e.slug, name: e.name, carte, liste, meta, fiche, descFrLen: d?.length ?? 0, flavor: fl };
});

const rapport = {
  quand: new Date().toISOString(),
  mode: 'MESURE (lecture seule)',
  question: 'Avant d’écrire summary : qui le LIT pour ces 132 fiches ?',
  lecteursDeSummary: {
    'components/akasha/CharacterCard.tsx:101': 'f.summary ?? entry.summary — rendu INCONDITIONNEL (ne regarde pas descFr). Alimenté par app/learn/akasha/u/[slug]/page.tsx:93 → top 48 par popularité.',
    'components/akasha/AkashaList.tsx:124': 'flavor ?? entry.summary — summary seulement si flavorText(descFr) est null',
    'components/akasha/AkashaMosaic.tsx:39': 'idem liste',
    'app/learn/akasha/[slug]/page.tsx:40': 'flavorExcerpt(descFr) ?? `nom — summary` (méta description)',
    'components/akasha/zone/CharacterZone.tsx:395': 'bio = a.bio || a.descFr || summary',
    'lib/akasha/queries.ts:134': 'recherche : or(name, universe, summary, descFr) — summary cherchable mais descFr aussi',
  },
  creux: creux.length,
  visibles: {
    carteTCGhubDragonBall: visibleCarte,
    listeOuMosaique: visibleListe,
    metaDescription: visibleMeta,
    bioDeLaFiche: visibleFiche,
    auMoinsUnEndroit: detail.filter((d) => d.carte || d.liste || d.meta || d.fiche).length,
  },
  detail,
};
const p = `data/audits/poche-db-resumes-visibilite-${STAMP}.json`;
fs.writeFileSync(p, JSON.stringify(rapport, null, 2));
console.log('trace →', p);
console.log(JSON.stringify({ ...rapport, detail: undefined }, null, 2));
console.log('visibles quelque part :', detail.filter((d) => d.carte || d.liste || d.meta || d.fiche).map((d) => d.slug).join(', '));
