// scripts/akasha-meta-recensement.mjs — CHANTIER 4 (carte de partage) : recensement des textes de
// métadonnées du registre. LECTURE SEULE côté base ; écrit une trace horodatée dans data/audits/.
//
// Réplique EXACTEMENT ce que `app/learn/akasha/[slug]/generateMetadata` produit aujourd'hui
// (title / description), pour compter les descriptions dupliquées « à un nom près ».
// La réplique est ÉPROUVÉE contre le HTML réellement servi par `--verifier` (cf. plus bas) :
// on ne conclut rien de ce fichier sans que cette épreuve soit passée.
import { writeFileSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

// ─── copie verbatim de lib/akasha/flavor.ts (types retirés) ────────────────────────────────────
function sentences(text) {
  return text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/);
}
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
function clamp(s, max) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 18)).trimEnd() + '…';
}
function flavorExcerpt(descFr, max = 155) {
  if (!descFr || descFr.trim().length < 30) return null;
  const prose = firstProse(descFr);
  return prose ? clamp(prose, max) : null;
}
// ───────────────────────────────────────────────────────────────────────────────────────────────

const TYPE_LABEL = {
  character: 'Personnage', place: 'Lieu', artifact: 'Artefact', profession: 'Métier',
  status: 'Statut', power: 'Pouvoir', skill: 'Compétence',
};

// MODE : AVANT = réplique du code d'avant le correctif ; APRES = réplique du code d'après
// (fait propre tiré des arêtes + borne à 165). `APRES=1 node …`
const APRES = !!process.env.APRES;

/** Fait propre tiré des arêtes — réplique de `faitPropre()` d'app/learn/akasha/[slug]/page.tsx. */
function faitPropre(e, rin, rout) {
  const cibles = (arr, kind) => [...new Set(arr.filter((r) => r.relation === kind).map((r) => r.name).filter(Boolean))];
  if (e.type === 'power' || e.type === 'skill') {
    const par = cibles(rin, 'maitrise');
    if (par.length) return `Maîtrisée par ${par.slice(0, 2).join(' et ')}`;
  }
  for (const [rel, label] of [['appartient', 'Appartient à'], ['habite', 'Réside à'], ['exerce', 'Exerce']]) {
    const n = cibles(rout, rel);
    if (n.length) return `${label} ${n.slice(0, 2).join(' et ')}`;
  }
  return null;
}

/** Ce que generateMetadata rend AUJOURD'HUI. */
function metaActuelle(e) {
  const label = TYPE_LABEL[e.type] ?? e.type;
  const title = `${e.name} — ${label} | AKASHA`;
  const prose = flavorExcerpt(e.descFr, 155);
  if (prose) return { title, description: prose, ogDescription: flavorExcerpt(e.descFr, 200), source: 'descFr' };
  const source = e.summary ? 'summary' : 'gabarit';
  const socle = e.summary
    ? `${e.name} — ${e.summary}`
    : `${e.name}, ${label.toLowerCase()} du registre AKASHA${e.universe ? ` (${e.universe})` : ''}.`;
  if (!APRES) return { title, description: socle, ogDescription: socle, source };
  const fait = faitPropre(e, e._in ?? [], e._out ?? []);
  const repli = fait ? `${socle.replace(/[\s.·—-]+$/, '')}. ${fait}.` : socle;
  return { title, description: clamp(repli, 165), ogDescription: clamp(repli, 200), source, fait };
}

/** Empreinte « à un nom près ».
 *  PIÈGE MESURÉ (14 h 03) : une première version retirait aussi chaque MOT du nom. Sur les SMILE
 *  de One Piece, le mot retiré était justement le discriminant — « SMILE d'hippopotame → il permet
 *  de se transformer en hippopotame » et « SMILE de caïman → … en caïman » tombaient dans la même
 *  empreinte alors que les deux descriptions servies diffèrent. On ne retire donc QUE le nom
 *  complet, qui est exactement ce que le gabarit `${name} — ${summary}` ajoute devant. */
function normal(s) {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function empreinte(desc, name) {
  const d = normal(desc), n = normal(name);
  return (n ? d.split(n).join(' ') : d).replace(/\s+/g, ' ').trim();
}
// TÉMOINS — un filtre doit prouver qu'il sait rendre 1 ET 0 avant qu'on lise ses totaux.
{
  const a = empreinte("SMILE d'hippopotame — il permet de se transformer en hippopotame.", "SMILE d'hippopotame");
  const b = empreinte('SMILE de caïman — il permet de se transformer en caïman.', 'SMILE de caïman');
  if (a === b) throw new Error('TÉMOIN 1 ÉCHOUÉ : deux descriptions distinctes fondues par l’empreinte');
  const c = empreinte('Arm Point — Attaque de One Piece — attaque signature.', 'Arm Point');
  const e = empreinte('Horn Point — Attaque de One Piece — attaque signature.', 'Horn Point');
  if (c !== e) throw new Error('TÉMOIN 2 ÉCHOUÉ : deux descriptions identiques à un nom près non détectées');
}

async function lireTout() {
  const db = clientSite();
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db
      .from('akasha_entries')
      .select('slug,type,name,universe,summary,descFr:attributes->>descFr')
      .order('slug', { ascending: true })
      .range(d, d + 999);
    if (error) throw new Error(`${error.message} @${d}`);
    out.push(...data);
    process.stderr.write(`\r  lues ${out.length}`);
    if (data.length < 1000) break;
  }
  process.stderr.write('\n');
  return out;
}

const rows = await lireTout();

// En mode APRES : charger les arêtes des SEULES fiches sans prose (celles dont le texte change).
if (APRES) {
  const db = clientSite();
  const sansProse = rows.filter((e) => !flavorExcerpt(e.descFr, 155));
  console.error(`  fiches sans prose (texte susceptible de changer) : ${sansProse.length}`);
  const ids = new Map();
  for (let i = 0; i < sansProse.length; i += 200) {
    const lot = sansProse.slice(i, i + 200).map((e) => e.slug);
    const { data, error } = await db.from('akasha_entries').select('id,slug').in('slug', lot);
    if (error) throw new Error(error.message);
    for (const r of data) ids.set(r.id, r.slug);
  }
  const bySlug = new Map(sansProse.map((e) => [e.slug, e]));
  for (const e of sansProse) { e._in = []; e._out = []; }
  const allIds = [...ids.keys()];
  for (let i = 0; i < allIds.length; i += 150) {
    const lot = allIds.slice(i, i + 150);
    const [{ data: din, error: ein }, { data: dout, error: eout }] = await Promise.all([
      db.from('akasha_relations').select('to_entry, relation, src:akasha_entries!akasha_relations_from_entry_fkey(name)').in('to_entry', lot),
      db.from('akasha_relations').select('from_entry, relation, tgt:akasha_entries!akasha_relations_to_entry_fkey(name)').in('from_entry', lot),
    ]);
    if (ein) throw new Error(ein.message);
    if (eout) throw new Error(eout.message);
    for (const r of din) bySlug.get(ids.get(r.to_entry))?._in.push({ relation: r.relation, name: r.src?.name });
    for (const r of dout) bySlug.get(ids.get(r.from_entry))?._out.push({ relation: r.relation, name: r.tgt?.name });
    process.stderr.write(`\r  arêtes ${Math.min(i + 150, allIds.length)}/${allIds.length}`);
  }
  process.stderr.write('\n');
}

// compte exact indépendant (HEAD) pour prouver que la pagination n'a rien coupé
const { count: total } = await clientSite().from('akasha_entries').select('slug', { count: 'exact', head: true });

const parEmpreinte = new Map();
const parExact = new Map();
const parSource = { descFr: 0, summary: 0, gabarit: 0 };
const parTitre = new Map();
const fiches = [];
for (const e of rows) {
  const m = metaActuelle(e);
  parSource[m.source]++;
  const emp = empreinte(m.description, e.name);
  if (!parEmpreinte.has(emp)) parEmpreinte.set(emp, []);
  parEmpreinte.get(emp).push({ slug: e.slug, type: e.type, universe: e.universe, description: m.description });
  parExact.set(m.description, (parExact.get(m.description) ?? 0) + 1);
  parTitre.set(m.title, (parTitre.get(m.title) ?? 0) + 1);
  fiches.push({ slug: e.slug, type: e.type, universe: e.universe, source: m.source, title: m.title, description: m.description, ogDescription: m.ogDescription, fait: m.fait ?? null, emp });
}

const groupes = [...parEmpreinte.entries()]
  .map(([emp, membres]) => ({ emp, n: membres.length, exemples: membres.slice(0, 3) }))
  .filter((g) => g.n > 1)
  .sort((a, b) => b.n - a.n);
const fichesDupliquees = groupes.reduce((s, g) => s + g.n, 0);

const trace = {
  quand: new Date().toISOString(),
  script: 'scripts/akasha-meta-recensement.mjs',
  mode: APRES ? 'APRES' : 'AVANT',
  fiches_avec_fait_propre: fiches.filter((f) => f.fait).length,
  lecture: { lignes_paginees: rows.length, count_head_exact: total, coherent: rows.length === total },
  sources_de_la_description: parSource,
  duplication_stricte_chaine_identique: (() => {
    const g = [...parExact.entries()].filter(([, n]) => n > 1);
    return { fiches_concernees: g.reduce((s, [, n]) => s + n, 0), groupes: g.length, top: g.sort((a, b) => b[1] - a[1]).slice(0, 5) };
  })(),
  duplication_a_un_nom_pres: {
    fiches_concernees: fichesDupliquees,
    part: +(fichesDupliquees / rows.length * 100).toFixed(2),
    groupes: groupes.length,
    top30: groupes.slice(0, 30),
  },
  titres_dupliques: [...parTitre.entries()].filter(([, n]) => n > 1).map(([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n).slice(0, 20),
  longueur_description: (() => {
    const L = fiches.map((f) => f.description.length).sort((a, b) => a - b);
    return { min: L[0], p50: L[Math.floor(L.length / 2)], max: L[L.length - 1], sous_70: L.filter((x) => x < 70).length, sur_160: L.filter((x) => x > 160).length };
  })(),
};

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const p = `data/audits/meta-partage-recensement-${APRES ? 'apres' : 'avant'}-${stamp}.json`;
writeFileSync(p, JSON.stringify({ ...trace, fiches }, null, 2));
console.log(JSON.stringify(trace, null, 2));
console.log('\nTRACE →', p);
