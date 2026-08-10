// Chantier 4 — étape A2 : les 87 isolées sans page EN par titre direct sont nommées EN FRANÇAIS.
// Pont testé : wiki FR de Dragon Ball (dragonball.fandom.com/fr) interrogé par NOTRE nom, puis
// lien interlangue `en` déclaré par le wiki lui-même. Aucun rapprochement par similarité.
// Lecture seule.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
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

async function pagesDe(base, titres, lang) {
  const out = new Map();
  for (let i = 0; i < titres.length; i += 50) {
    const url = `${base}?${new URLSearchParams({
      action: 'query', prop: 'revisions|langlinks', rvprop: 'content', rvslots: 'main',
      lllang: lang, lllimit: 'max', redirects: '1', format: 'json', formatversion: '2',
      titles: titres.slice(i, i + 50).join('|'),
    })}`;
    const r = await fetch(url, { headers: UA });
    await new Promise((x) => setTimeout(x, 200));
    if (!r.ok) { console.error(`  ✗ ${base} lot ${i} HTTP ${r.status}`); continue; }
    const j = await r.json();
    const origine = new Map(), fragment = new Map();
    for (const n of j.query?.normalized ?? []) origine.set(n.to, n.from);
    for (const n of j.query?.redirects ?? []) {
      const dem = origine.get(n.from) ?? n.from;
      origine.set(n.to, dem);
      if (n.tofragment) fragment.set(dem, `${n.to}#${n.tofragment}`);
    }
    for (const p of j.query?.pages ?? []) {
      const dem = origine.get(p.title) ?? p.title;
      out.set(dem, p.missing ? null : {
        titre: p.title, texte: p.revisions?.[0]?.slots?.main?.content ?? '',
        fragment: fragment.get(dem) ?? null, autre: p.langlinks?.[0]?.title ?? null,
      });
    }
  }
  return out;
}

const entries = await page('akasha_entries', 'id, slug, name, type, universe, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const deg = new Set();
for (const r of rels) { deg.add(r.from_entry); deg.add(r.to_entry); }
const isolees = entries.filter((e) => !deg.has(e.id) && e.universe === 'Dragon Ball');

// témoin : le wiki FR répond-il, et déclare-t-il ses liens interlangue ?
const temoin = await pagesDe('https://dragonball.fandom.com/fr/api.php', ['Son Goku', 'Végéta'], 'en');
console.log('témoin FR :', [...temoin.entries()].map(([t, p]) => `${t} → ${p ? `${p.titre} (en: ${p.autre ?? '—'})` : 'ABSENT'}`).join(' · '));

const titres = isolees.map((e) => e.name);
const pagesFr = await pagesDe('https://dragonball.fandom.com/fr/api.php', titres, 'en');

const resultats = isolees.map((e) => {
  const p = pagesFr.get(e.name);
  return {
    slug: e.slug, name: e.name, type: e.type,
    pageFr: p ? p.titre : null,
    redirectionSection: p?.fragment ?? null,
    titreEn: p?.autre ?? null,
    octets: p ? p.texte.length : 0,
  };
});
const avecFr = resultats.filter((r) => r.pageFr && !r.redirectionSection);
const avecEn = resultats.filter((r) => r.titreEn);
console.log(`page FR trouvée : ${avecFr.length}/${isolees.length} · lien interlangue en : ${avecEn.length}`);

const trace = path.join(ROOT, `data/audits/poche-db-aretes-pontfr-${STAMP}.json`);
fs.writeFileSync(trace, JSON.stringify({
  chantier: 'chantier 4 — étape A2 : pont wiki FR → EN pour les isolées Dragon Ball nommées en français',
  quand: new Date().toISOString(), mode: 'MESURE (lecture seule, réseau)',
  temoin: [...temoin.entries()].map(([t, p]) => ({ demande: t, page: p?.titre ?? null, en: p?.autre ?? null })),
  isolees: isolees.length,
  pageFrTrouvee: avecFr.length, lienInterlangueEn: avecEn.length,
  resultats,
}, null, 1));
console.log('trace →', path.relative(ROOT, trace));
for (const r of avecEn.slice(0, 40)) console.log(`  ${r.name}  →  fr:${r.pageFr}  →  en:${r.titreEn}`);
