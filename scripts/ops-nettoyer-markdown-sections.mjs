// scripts/ops-nettoyer-markdown-sections.mjs — les astérisques markdown quittent le texte rendu
// (07/08/2026).
//
// LE DÉFAUT. Le front ne parse JAMAIS de markdown : `DossierSections` rend `s.texte` dans un
// <p> en `white-space: pre-line`. Tout astérisque écrit par l'usine s'affiche donc tel quel —
// `naruto-uzumaki` §2 rendait « ajoutant *« dattebayo »* ». Mesuré le 07/08, après le
// dédoublonnage : 379 sections, 1 452 fragments, dont l'écrasante majorité sont des TITRES
// D'ŒUVRES (« *Dragon Ball Super* », « *Initial D* », « *Arcade Stage* ») — l'italique
// typographique française, écrite en markdown par un modèle qui croyait produire du Markdown.
//
// LE GESTE. On retire les MARQUEURS, jamais le texte : `*x*` → `x`, `**x**` → `x`, et le
// balisage HTML égaré (`<i>…</i>`, `<sup>th</sup>`) qui relève du même travers. Aucune autre
// modification : le contrôle compare les deux textes une fois TOUS les marqueurs ôtés des deux
// côtés — s'ils diffèrent d'un seul caractère, la ligne est refusée et signalée.
//
// Ce qui n'est PAS fait ici, faute de pouvoir le faire sans toucher au rendu : restituer
// l'italique. Le composant rend du texte brut ; rendre `<em>` supposerait de parser côté front,
// ce qui est un autre chantier. On perd donc une nuance typographique pour supprimer un défaut
// visible — un titre d'œuvre en romain se lit, une paire d'astérisques non.
//
// Usage : node --env-file=.env.local scripts/ops-nettoyer-markdown-sections.mjs [--appliquer]
import fs from 'node:fs';
import path from 'node:path';
import { clientSite } from '../lib/ops/db.mjs';

const supabase = clientSite();
const APPLIQUER = process.argv.includes('--appliquer');
const TRACE = path.resolve(import.meta.dirname, '../data/audits/sections-curation-trace.json');

/** Retire les marqueurs d'emphase et le balisage HTML égaré, sans toucher au texte. */
export function nettoyer(t) {
  return String(t ?? '')
    .replace(/<sup>\s*(th|st|nd|rd|e|er|ème)\s*<\/sup>/gi, '$1')
    .replace(/<\/?(?:i|em|b|strong|u|sup|sub|br)\s*\/?>/gi, '')
    .replace(/\*\*\*([^*\n]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/[ \t]{2,}/g, ' ');
}

/** Témoin de contrôle : le texte débarrassé de TOUT marqueur, des deux côtés. On compare ça. */
const squelette = (t) => String(t ?? '').replace(/[*_`]/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const sections = [];
for (let p = 0; ; p += 1000) {
  const { data, error } = await supabase.from('akasha_sections')
    .select('id, entry_id, idx, titre, texte').order('id').range(p, p + 999);
  if (error) { console.error(error.message); process.exit(1); }
  sections.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const entrees = [];
for (let p = 0; ; p += 1000) {
  const { data } = await supabase.from('akasha_entries').select('id, slug').order('id').range(p, p + 999);
  entrees.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const slugDe = new Map(entrees.map((e) => [e.id, e.slug]));

const changements = [], refuses = [];
let candidates = 0;
for (const s of sections) {
  const texte = nettoyer(s.texte);
  const titre = nettoyer(s.titre);
  if (texte === s.texte && titre === (s.titre ?? '')) continue;
  candidates++;
  // Contrôle : rien d'autre que des marqueurs n'a bougé.
  if (squelette(texte) !== squelette(s.texte) || squelette(titre) !== squelette(s.titre)) {
    refuses.push({ slug: slugDe.get(s.entry_id), idx: String(s.idx), sectionId: s.id, motif: 'le texte change au-delà des marqueurs' });
    continue;
  }
  changements.push({
    slug: slugDe.get(s.entry_id), sectionId: s.id, idx: String(s.idx),
    titreAvant: s.titre, titreApres: titre !== (s.titre ?? '') ? titre : null,
    texteAvant: s.texte, texteApres: texte !== s.texte ? texte : null,
    marqueurs: (s.texte.match(/\*/g) ?? []).length + (String(s.titre ?? '').match(/\*/g) ?? []).length,
  });
}

console.log(`sections lues     : ${sections.length}`);
console.log(`à nettoyer        : ${candidates}`);
console.log(`retenues          : ${changements.length} · refusées par le contrôle : ${refuses.length}`);
console.log(`COMPTE CROISÉ     : ${changements.length} + ${refuses.length} = ${changements.length + refuses.length} / ${candidates} ${changements.length + refuses.length === candidates ? 'OK' : 'ÉCART'}`);
console.log('\nÉCHANTILLON :');
const pas = Math.max(1, Math.floor(changements.length / 8));
for (let i = 0; i < changements.length && i / pas < 8; i += pas) {
  const c = changements[i];
  const av = (c.texteAvant.match(/(?<!\*)\*(?!\*)[^*\n]{1,60}\*(?!\*)/g) ?? []).slice(0, 3).join(' · ');
  console.log(`  ${c.slug.padEnd(24)} §${c.idx.padEnd(3)} ${c.titreApres ? `titre « ${c.titreAvant} » → « ${c.titreApres} » ; ` : ''}${av}`);
}
for (const r of refuses) console.log(`  ✗ REFUSÉ ${r.slug} §${r.idx} : ${r.motif}`);

// ——— TRACE AVANT ÉCRITURE ———
const trace = fs.existsSync(TRACE) ? JSON.parse(fs.readFileSync(TRACE, 'utf8')) : {};
trace.passe2Markdown = {
  date: new Date().toISOString(), applique: APPLIQUER,
  sectionsLues: sections.length, candidates, retenues: changements.length,
  changements, refuses,
};
fs.writeFileSync(TRACE, JSON.stringify(trace, null, 1));
console.log(`\ntrace écrite : ${TRACE}`);

if (!APPLIQUER) { console.log('\n(à blanc — rien n’a été écrit.)'); process.exit(0); }

let ecrits = 0, echecs = 0;
for (const c of changements) {
  const patch = {};
  if (c.texteApres !== null) patch.texte = c.texteApres;
  if (c.titreApres !== null) patch.titre = c.titreApres;
  const { error } = await supabase.from('akasha_sections').update(patch).eq('id', c.sectionId);
  if (error) { echecs++; console.error(`  ✗ ${c.slug} §${c.idx} : ${error.message}`); } else ecrits++;
}
console.log(`\nlignes écrites : ${ecrits} · échecs : ${echecs}`);

// ——— COMPTE CROISÉ APRÈS, relu en base ———
let restent = 0;
for (let p = 0; ; p += 1000) {
  const { data } = await supabase.from('akasha_sections').select('texte, titre').order('id').range(p, p + 999);
  for (const l of data ?? []) if (/(?<!\*)\*(?!\*)[^*\n]+\*(?!\*)|\*\*[^*\n]+\*\*/.test(l.texte) || /[*]/.test(l.titre ?? '')) restent++;
  if ((data?.length ?? 0) < 1000) break;
}
console.log(`COMPTE CROISÉ (après) : ${restent} section(s) portent encore un couple d'astérisques ${restent === 0 ? 'OK' : '— à examiner'}`);
