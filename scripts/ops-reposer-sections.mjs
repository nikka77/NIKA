// scripts/ops-reposer-sections.mjs — REPOSE les sections perdues en écriture concurrente (01/08).
//
// Les sections d'une même fiche s'appliquent en parallèle ; jusqu'au correctif du 01/08, chacune
// lisait le tableau, y ajoutait la sienne et réécrivait — la dernière écrasait les précédentes.
// Symptôme : deux sections marquées ⚡ appliquées, une seule en base (constaté sur Sharingan).
//
// Ce script compare, pour chaque fiche, les sections APPROUVÉES dans agent_results et celles
// réellement présentes dans akasha_entries, puis repose les manquantes — séquentiellement, donc
// sans la course qui les avait perdues. Idempotent : relançable sans risque.
//
// Usage : node --env-file=.env.local scripts/ops-reposer-sections.mjs [--dry] [--universe="Death Note"]
// ⛔ NEUTRALISÉ LE 05/08/2026 — ce script repose des sections dans akasha_entries.attributes.sections,
// un emplacement PURGÉ le 05/08 (les sections vivent dans la table akasha_sections, une ligne
// chacune, contrainte d'unicité). Le relancer repolluerait le JSONB avec ~19 000 sections que le
// site ne lit plus — et la migration qui a suivi devrait être refaite. Sa raison d'être (rejouer
// une pose perdue par la concurrence du lire-modifier-écrire) a disparu avec la table : la
// contrainte (entry_id, idx) rend la pose idempotente par construction.
console.error('⛔ ops-reposer-sections est neutralisé depuis le 05/08/2026 : les sections vivent dans');
console.error('   la table akasha_sections. Pour reposer une section : lib/akasha/sections.ts → poserSections.');
process.exit(1);

import { createClient } from '@supabase/supabase-js';
import { clientOps, clientSite } from '../lib/ops/db.mjs';

const supabase = clientOps();
const DRY = process.argv.includes('--dry');
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];

// Toutes les sections VALIDÉES (appliquées automatiquement ou approuvées par Dan).
const approuvees = [];
for (let d = 0; ; d += 1000) {
  let q = supabase.from('agent_results')
    .select('target_slug, payload, result, model')
    .eq('task_type', 'fiche_section').eq('review_status', 'approved')
    .order('id').range(d, d + 999);
  if (UNIVERSE) q = q.eq('payload->>universe', UNIVERSE);
  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }
  approuvees.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
console.log(`${approuvees.length} section(s) validée(s) en base de résultats`);

// Regroupement par fiche : on écrit UNE fois par fiche, avec toutes ses sections d'un coup.
const parFiche = new Map();
for (const r of approuvees) {
  const i = r.payload?.section_index;
  const texte = r.result?.texte;
  if (!i || !texte) continue;
  if (!parFiche.has(r.target_slug)) parFiche.set(r.target_slug, { modele: r.model, sections: new Map() });
  parFiche.get(r.target_slug).sections.set(String(i), { i: String(i), titre: r.result?.titre, texte });
}

let reparees = 0, ajoutees = 0;
for (const [slug, { modele, sections }] of parFiche) {
  const { data: e } = await clientSite().from('akasha_entries').select('attributes').eq('slug', slug).single();
  if (!e) continue;
  const presentes = Array.isArray(e.attributes?.sections) ? e.attributes.sections : [];
  const dejaLa = new Set(presentes.map((x) => String(x.i)));
  const manquantes = [...sections.values()].filter((s) => !dejaLa.has(String(s.i)));
  if (!manquantes.length) continue;

  reparees++; ajoutees += manquantes.length;
  console.log(`  · ${slug.padEnd(30)} ${presentes.length} en base + ${manquantes.length} à reposer`);
  if (DRY) continue;

  const attrs = { ...(e.attributes ?? {}) };
  attrs.sections = [...presentes, ...manquantes].sort((a, b) => Number(a.i) - Number(b.i));
  attrs.sectionsSource = modele;
  await clientSite().from('akasha_entries').update({ attributes: attrs }).eq('slug', slug);
}

console.log(`\n${DRY ? '(à blanc) ' : ''}${reparees} fiche(s) réparée(s) · ${ajoutees} section(s) reposée(s)`);
