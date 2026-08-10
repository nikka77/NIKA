// scripts/akasha-alias-cibles-sonde2.mjs — SONDE 2 : que contient VRAIMENT la base pour les
// familles de cibles restées orphelines (classifications de jutsu, natures élémentaires, clans) ?
//
// La sonde 1 a répondu « rien » sur 12 titres. « Rien » peut vouloir dire deux choses très
// différentes : la fiche n'existe pas, ou elle existe sous un nom que l'égalité ne voit pas.
// Cette sonde-ci LISTE le voisinage, elle ne conclut pas. N'ÉCRIT RIEN.
//
// Usage : node --env-file=.env.local scripts/akasha-alias-cibles-sonde2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { norm } from './audit-isolees-fandom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = (await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes'))
  .filter((e) => e.universe === 'Naruto');
console.log(`Naruto : ${entries.length} fiches`);

const prose = (e) => [e.summary, e.attributes?.descFr,
  ...(Array.isArray(e.attributes?.sections) ? e.attributes.sections.map((s) => `${s?.title ?? ''} ${s?.body ?? ''}`) : [])]
  .filter(Boolean).join('\n');

/* Familles à inspecter : on cherche par MOTIF sur le nom, le roman_name et le slug — c'est une
   exploration, pas une identification : rien de ce qui sort d'ici ne devient un alias sans témoin. */
const FAMILLES = {
  'natures élémentaires (Release)': /lib[ée]ration|release|ton\b|raiton|suiton|fūton|futon|katon|doton|inton|yōton|youton/i,
  'classifications de jutsu': /ninjutsu|genjutsu|taijutsu|fūinjutsu|fuinjutsu|juinjutsu|bukijutsu|shurikenjutsu|kenjutsu|kinjutsu|hiden|kekkei|chakra flow|flux de chakra|barri[èe]re/i,
  'invocations': /invoc|invoqu|summon|kuchiyose/i,
  'clan Kagetsu': /kagetsu/i,
  'Mashō / Gōshō': /mash[oō]|g[oō]sh[oō]/i,
  'daimyō': /daimy/i,
};

const journal = {};
for (const [nom, rx] of Object.entries(FAMILLES)) {
  const hits = entries.filter((e) => rx.test(e.name ?? '') || rx.test(e.attributes?.roman_name ?? '') || rx.test(e.slug ?? ''));
  journal[nom] = hits.map((e) => ({ name: e.name, slug: e.slug, type: e.type, roman_name: e.attributes?.roman_name ?? null }));
  console.log(`\n═══ ${nom} — ${hits.length} fiche(s)`);
  for (const e of hits.slice(0, 60)) console.log(`   ${e.name}  [${e.slug}] (${e.type})${e.attributes?.roman_name ? ` rōmaji=${e.attributes.roman_name}` : ''}`);
  if (hits.length > 60) console.log(`   … +${hits.length - 60}`);
}

/* Le champ `attributes` porte-t-il un pointeur vers la page source anglaise ? (leçon 10/08 :
   `attributes.descFrSource` est un pont ADMIS). Mesurons combien de fiches Naruto en ont un. */
const cles = new Map();
for (const e of entries) for (const k of Object.keys(e.attributes ?? {})) cles.set(k, (cles.get(k) ?? 0) + 1);
console.log('\n═══ clés d\'attributes en Naruto (top 40) :');
console.log([...cles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${k}=${v}`).join(' · '));

fs.writeFileSync(path.join(ROOT, `data/audits/alias-cibles-sonde2-${HORODATE}.json`),
  JSON.stringify({ quand: new Date().toISOString(), ecritEnBase: false, fichesNaruto: entries.length, journal, clesAttributes: Object.fromEntries([...cles.entries()].sort((a, b) => b[1] - a[1])) }, null, 1));
console.log(`\ntrace : data/audits/alias-cibles-sonde2-${HORODATE}.json`);
