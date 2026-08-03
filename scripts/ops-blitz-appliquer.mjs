// scripts/ops-blitz-appliquer.mjs — pose les sections d'un BLITZ FENÊTRE sur les fiches.
//
// Mêmes règles que l'usine (objet {i, titre, texte}, tri par index, sectionsSource signé), plus
// deux garde-fous appris à la dure le 03/08 :
//  · JAMAIS par-dessus une section du même index déjà posée — l'usine publie en parallèle et sa
//    version est passée par le double jury ; le blitz n'écrase pas un travail déjà validé.
//  · lecture GROUPÉE puis une écriture par fiche : sous charge, trois allers-retours par fiche
//    faisaient ramper la pose (35 min pour 800 sections) et se faire couper en plein vol.
//
// Usage : node --env-file=.env.local scripts/ops-blitz-appliquer.mjs --universe="Naruto" \
//           --fichier=<chemin/naruto-validees.json> [--signature="…"]
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const UNIVERSE = arg('universe');
const FICHIER = arg('fichier');
const SIGNATURE = arg('signature', 'claude-haiku-4-5 (blitz fenêtre — traduit de la page Fandom, contre-vérifié)');
if (!UNIVERSE || !FICHIER) { console.error('--universe et --fichier obligatoires'); process.exit(1); }

const s = clientSite();
const validees = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
const parSlug = new Map();
for (const v of validees) {
  if (!parSlug.has(v.slug)) parSlug.set(v.slug, []);
  parSlug.get(v.slug).push(v);
}
const slugs = [...parSlug.keys()];
console.log(`${validees.length} section(s) sur ${slugs.length} fiche(s) [${UNIVERSE}]`);

const etat = new Map();
for (let i = 0; i < slugs.length; i += 40) {
  for (let essai = 0; essai < 3; essai++) {
    try {
      const { data, error } = await s.from('akasha_entries').select('id,slug,attributes')
        .eq('universe', UNIVERSE).in('slug', slugs.slice(i, i + 40));
      if (error) throw new Error(error.message);
      for (const e of data ?? []) etat.set(e.slug, e);
      break;
    } catch (e) {
      console.log(`  lecture ${i} : ${String(e.message ?? e).slice(0, 60)} — retry`);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

let posees = 0, gardees = 0, perdues = 0, faites = 0;
for (const [slug, sections] of parSlug) {
  faites++;
  const entry = etat.get(slug);
  if (!entry) { perdues += sections.length; continue; }
  const attrs = { ...(entry.attributes ?? {}) };
  const dejaLa = Array.isArray(attrs.sections) ? attrs.sections : [];
  const dejaIdx = new Set(dejaLa.map((x) => String(x.i)));
  const neuves = sections.filter((x) => !dejaIdx.has(String(x.i)));
  gardees += sections.length - neuves.length;
  if (!neuves.length) continue;
  attrs.sections = [...dejaLa, ...neuves.map((x) => ({ i: String(x.i), titre: x.titre, texte: x.texte }))]
    .sort((a, b) => Number(a.i) - Number(b.i));
  attrs.sectionsSource = SIGNATURE;
  let posee = false;
  for (let essai = 0; essai < 3 && !posee; essai++) {
    const { error } = await s.from('akasha_entries').update({ attributes: attrs }).eq('id', entry.id);
    if (!error) posee = true; else await new Promise((r) => setTimeout(r, 3000));
  }
  if (posee) posees += neuves.length; else perdues += neuves.length;
  if (faites % 40 === 0) console.log(`  … ${faites}/${parSlug.size} fiches (posées ${posees})`);
}
console.log(`FINAL — posées ${posees} · déjà en place ${gardees} · perdues ${perdues} · fiches ${parSlug.size}`);
