// Chantier 4 — étape D : POURQUOI `allegiance` rend zéro. Ce n'est pas l'extracteur, c'est la CIBLE.
// On chiffre le gisement bloqué : quelles organisations le wiki nomme-t-il, combien d'isolées
// chacune débloquerait, et laquelle existe déjà chez nous. Lecture seule.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { infoboxDuWikitexte } from './audit-isolees-gisement-4univers.mjs';
import { ciblesDuParametre } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const HOTE = 'dragonball.fandom.com';
const UA = { 'User-Agent': 'NIKA-AKASHA/1.0 (audit graphe, contact tulbured06@gmail.com)' };
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function titreSourceCite(d) {
  const s = String(d ?? ''); const i = s.lastIndexOf('·'); if (i < 0) return null;
  let t = s.slice(i + 1).trim();
  if (/^mentions?\s*:/i.test(t) || t.includes(',')) return null;
  const u = t.match(/\/wiki\/([^\s,]+)$/); if (u) return decodeURIComponent(u[1]).replace(/_/g, ' ');
  if (/^https?:/.test(t)) return null;
  return t.replace(/\s*\([A-Za-z' ]*Wiki\)\s*$/i, '').trim() || null;
}
async function pagesDe(titres) {
  const out = new Map();
  for (let i = 0; i < titres.length; i += 50) {
    const url = `https://${HOTE}/api.php?${new URLSearchParams({
      action: 'query', prop: 'revisions|langlinks', rvprop: 'content', rvslots: 'main',
      lllang: 'fr', lllimit: 'max', redirects: '1', format: 'json', formatversion: '2',
      titles: titres.slice(i, i + 50).join('|'),
    })}`;
    const r = await fetch(url, { headers: UA });
    await new Promise((x) => setTimeout(x, 200));
    if (!r.ok) continue;
    const j = await r.json();
    const origine = new Map(), fragment = new Map();
    for (const n of j.query?.normalized ?? []) origine.set(n.to, n.from);
    for (const n of j.query?.redirects ?? []) {
      const dem = origine.get(n.from) ?? n.from; origine.set(n.to, dem);
      if (n.tofragment) fragment.set(dem, `${n.to}#${n.tofragment}`);
    }
    for (const p of j.query?.pages ?? []) {
      const dem = origine.get(p.title) ?? p.title;
      out.set(dem, p.missing ? null : { titre: p.title, texte: p.revisions?.[0]?.slots?.main?.content ?? '', fragment: fragment.get(dem) ?? null, fr: p.langlinks?.[0]?.title ?? null });
    }
  }
  return out;
}

const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const deg = new Set(); for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const isolees = entries.filter((e) => !deg.has(e.id) && e.universe === 'Dragon Ball');
const memeUnivers = entries.filter((e) => e.universe === 'Dragon Ball');
const nomsCorpus = new Set(memeUnivers.map((e) => norm(e.name)));

const candidats = new Map();
for (const e of isolees) {
  candidats.set(e.name, e);
  const s = titreSourceCite(e.attributes?.descFrSource); if (s && !candidats.has(s)) candidats.set(s, e);
}
const pages = await pagesDe([...candidats.keys()]);
const lues = new Map();
for (const [titre, e] of candidats) { if (lues.has(e.id)) continue; const p = pages.get(titre); if (p && !p.fragment) lues.set(e.id, { e, p, titreDemande: titre }); }

const CHAMPS = ['allegiance', 'occupation', 'race', 'address', 'famconnect', 'mentors', 'students', 'user', 'homeworld'];
const parCible = new Map();     // cible EN → { champ, isolees:Set, valeurs:[] }
const valeursBrutes = [];
for (const { e, p, titreDemande } of lues.values()) {
  const ib = infoboxDuWikitexte(p.texte);
  for (const champ of CHAMPS) {
    const v = ib.params[champ]; if (!v) continue;
    valeursBrutes.push({ de: e.name, deSlug: e.slug, deType: e.type, titreWiki: p.titre, titreDemande, redirige: norm(titreDemande) !== norm(p.titre), champ, valeur: String(v).slice(0, 300) });
    for (const c of ciblesDuParametre(v)) {
      const k = `${champ}|${c.titre}`;
      if (!parCible.has(k)) parCible.set(k, { champ, cible: c.titre, isolees: new Set(), dejaEnBase: nomsCorpus.has(norm(c.titre)) });
      parCible.get(k).isolees.add(e.name);
    }
  }
}
// pour les cibles d'allegiance/occupation non résolues : leur nom FR déclaré par le wiki
const aTester = [...parCible.values()].filter((v) => ['allegiance', 'occupation', 'race'].includes(v.champ) && !v.dejaEnBase).map((v) => v.cible);
const pagesCibles = aTester.length ? await pagesDe([...new Set(aTester)]) : new Map();

const gisement = [...parCible.values()]
  .map((v) => ({ champ: v.champ, cible: v.cible, isolees: [...v.isolees], n: v.isolees.size, dejaEnBase: v.dejaEnBase, frDuWiki: pagesCibles.get(v.cible)?.fr ?? null, pageExiste: pagesCibles.has(v.cible) ? !!pagesCibles.get(v.cible) : null }))
  .sort((a, b) => b.n - a.n);

const trace = path.join(ROOT, `data/audits/poche-db-aretes-plafond-${STAMP}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: 'chantier 4 — étape D : le plafond de `allegiance` est la CIBLE absente, pas l’extracteur',
  quand: new Date().toISOString(), mode: 'MESURE (lecture seule, réseau)',
  corpusDragonBallParType: memeUnivers.reduce((a, e) => ((a[e.type] = (a[e.type] ?? 0) + 1), a), {}),
  isolees: isolees.length, pagesLues: lues.size,
  gisement, valeursBrutes,
}, null, 1));
console.log('trace →', path.relative(ROOT, trace));
console.log('corpus Dragon Ball par type :', JSON.stringify(memeUnivers.reduce((a, e) => ((a[e.type] = (a[e.type] ?? 0) + 1), a), {})));
console.log('\nCIBLES LES PLUS DEMANDÉES (champ · cible · nb isolées · déjà en base · fr déclaré par le wiki)');
for (const g of gisement.filter((g) => g.n >= 2).slice(0, 30)) {
  console.log(`  ${g.champ.padEnd(11)} ${g.cible.padEnd(34)} ${String(g.n).padStart(2)}  ${g.dejaEnBase ? 'EN BASE' : '  —   '}  ${g.frDuWiki ?? ''}`);
}
