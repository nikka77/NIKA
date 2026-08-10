// scripts/ops-lever-quarantaine.mjs — REMETTRE EN JEU LES ENTITÉS QU'UNE GARDE AVAIT REFUSÉES.
//
// POURQUOI (10/08/2026)
// Depuis ce jour, une entité refusée par une garde de contenu (« page Fandom absente », « mauvaise
// entité », « page d'œuvre ou de liste ») n'est plus recommandée par les remplisseurs : sans ce
// frein, l'usine redemandait 419 entités 78 fois par jour, 11 682 refus pour 1 434 productions.
//
// Mais un refus n'est définitif que tant que sa CAUSE l'est. Un alias curé, une fiche de pays
// créée, un wiki changé : la même entité redevient produisible. Ce script lève la quarantaine —
// il ne fait qu'une chose, clore les lignes de refus, ce qui les retire de la garde.
//
// IL NE RELANCE RIEN. Les remplisseurs reprendront ces entités d'eux-mêmes au tour suivant : c'est
// leur travail de choisir, pas le nôtre de le forcer.
//
// Usage :
//   node --env-file=.env.local scripts/ops-lever-quarantaine.mjs --motif="page Fandom absente"
//   node --env-file=.env.local scripts/ops-lever-quarantaine.mjs --type=fandom_descfr --write
//   node --env-file=.env.local scripts/ops-lever-quarantaine.mjs --slug=man-x --write
import { writeFile } from 'node:fs/promises';
import { clientOps } from '../lib/ops/db.mjs';

const WRITE = process.argv.includes('--write');
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const MOTIF = arg('motif');
const TYPE = arg('type');
const SLUG = arg('slug');
const o = clientOps();

const lignes = [];
for (let d = 0; ; d += 1000) {
  let q = o.from('agent_results').select('id, target_slug, task_type, error, created_at')
    .eq('status', 'refused')
    .order('id', { ascending: true }).range(d, d + 999);
  if (TYPE) q = q.eq('task_type', TYPE);
  if (SLUG) q = q.eq('target_slug', SLUG);
  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }
  lignes.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

// Les lignes déjà levées (motif préfixé « ↻ ») ne comptent plus : les relister ferait croire à
// une quarantaine qui n'existe plus.
const enVigueur = lignes.filter((l) => !String(l.error ?? '').startsWith('↻'));
const retenues = MOTIF ? enVigueur.filter((l) => String(l.error ?? '').includes(MOTIF)) : enVigueur;
const entites = new Set(retenues.map((l) => l.target_slug));

const parMotif = new Map();
for (const l of retenues) {
  const k = String(l.error ?? '—').slice(0, 64);
  parMotif.set(k, (parMotif.get(k) ?? 0) + 1);
}
console.log(`${enVigueur.length} ligne(s) de refus en quarantaine (sur ${lignes.length} refus au total) · ${retenues.length} retenue(s) par le filtre · ${entites.size} entité(s)\n`);
for (const [k, v] of [...parMotif.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`   ${String(v).padStart(5)}  ${k}`);

if (WRITE && retenues.length) {
  for (let i = 0; i < retenues.length; i += 200) {
    await o.from('agent_results')
      .update({ error: `↻ quarantaine levée le ${new Date().toISOString().slice(0, 10)} — ${String(retenues[i].error ?? '').slice(0, 120)}` })
      .in('id', retenues.slice(i, i + 200).map((l) => l.id));
  }
  console.log(`\n→ ${retenues.length} ligne(s) closes · ${entites.size} entité(s) redeviennent commandables`);
}

const nom = `quarantaine-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(new URL(`../data/audits/${nom}`, import.meta.url), JSON.stringify({
  chantier: 'levée de quarantaine', quand: new Date().toISOString(), write: WRITE,
  filtre: { motif: MOTIF ?? null, type: TYPE ?? null, slug: SLUG ?? null },
  lignes: retenues.length, entites: [...entites],
  parMotif: [...parMotif.entries()].map(([motif, n]) => ({ motif, n })),
}, null, 1));
console.log(`${WRITE ? '' : '\n(à blanc — ajouter --write pour lever) '}trace : data/audits/${nom}`);
