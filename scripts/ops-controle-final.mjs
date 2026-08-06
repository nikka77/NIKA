// scripts/ops-controle-final.mjs — LE CONTRÔLE QUALITÉ FINAL (rôle Claude n°4, 02/08/2026).
//
// Quand un univers sort de l'usine, personne ne sait dire à Dan « tu peux faire confiance à
// N % ». Ce rôle relit un ÉCHANTILLON des fiches publiées de l'univers — sections et
// descriptions, contre leurs sources — et livre un taux chiffré : la part de l'échantillon
// notée ≥ 7/10, plus la moyenne et les pires cas. C'est le certificat de sortie d'usine,
// rendu AVANT l'œil de Dan.
//
// Usage : node --env-file=.env.local scripts/ops-controle-final.mjs --universe="Death Note"
//         [--echantillon=12] [--dry]
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { clientOps, clientSite } from '../lib/ops/db.mjs';
import { lireSections } from '../lib/akasha/sections.ts';
import { fetchFandomProse } from './lib/fandom.mjs';
import { envoyerAlerte } from './lib/alerte.mjs';

const execFile = promisify(execFileCb);
const supabase = clientOps();
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];
const N = Number(process.argv.find((a) => a.startsWith('--echantillon='))?.split('=')[1] ?? 12);
const DRY = process.argv.includes('--dry');
if (!UNIVERSE) { console.error('--universe obligatoire'); process.exit(1); }

async function battreEnClaude(role, detail) {
  try {
    await supabase.from('ops_workers').upsert({
      id: `claude:${role}`, hote: 'claude', role: 'claude', pid: process.pid,
      detail, derniere_activite: new Date().toISOString(),
    });
  } catch { /* console aveugle, jamais bloquant */ }
}

// Échantillon : fiches publiées, tirées au pas fixe sur la liste triée (rejouable, sans horloge).
const { data: entrees } = await clientSite().from('akasha_entries')
  .select('id, slug, name, attributes').eq('universe', UNIVERSE).order('slug');
// UNE SECTION = UNE LIGNE de akasha_sections (05/08) : repérer qui en a se fait par paquets
// d'ids — la table ne porte pas l'univers, et on ne tire ici que les entry_id, pas les textes.
const aDesSections = new Set();
const tous = entrees ?? [];
for (let d = 0; d < tous.length; d += 100) {
  const ids = tous.slice(d, d + 100).map((e) => e.id);
  for (let p = 0; ; p += 1000) {
    const { data } = await clientSite().from('akasha_sections')
      .select('id, entry_id').in('entry_id', ids).order('id').range(p, p + 999);
    for (const l of data ?? []) aDesSections.add(l.entry_id);
    if ((data?.length ?? 0) < 1000) break;
  }
}
const publiees = tous.filter((e) => e.attributes?.descFr || aDesSections.has(e.id));
const pas = Math.max(1, Math.floor(publiees.length / N));
const tirage = Array.from({ length: Math.min(N, publiees.length) }, (_, k) => publiees[k * pas]);
console.log(`${UNIVERSE} : ${publiees.length} fiche(s) publiée(s), échantillon de ${tirage.length}`);

const dossiers = [];
for (const e of tirage) {
  const page = await fetchFandomProse(UNIVERSE, e.name, { maxChars: 5000 }).catch(() => null);
  if (!page?.text) continue;
  const morceaux = [];
  if (e.attributes?.descFr) morceaux.push(`DESCRIPTION : ${e.attributes.descFr}`);
  // lireSections lit la table (triée par index) ; `attributes` ne sert que de filet de
  // restauration d'instantané antérieur au 05/08 — même garde que le site.
  const sections = await lireSections(clientSite(), e.id, e.attributes);
  for (const sec of sections.slice(0, 2))
    morceaux.push(`SECTION « ${sec.titre} » : ${String(sec.texte).slice(0, 1200)}`);
  if (morceaux.length) dossiers.push({ slug: e.slug, nom: e.name, contenu: morceaux.join('\n'), source: page.text.slice(0, 3500) });
}

// Notation par lots de 4 fiches : assez petit pour rester attentif, assez grand pour amortir.
const notes = [];
for (let i = 0; i < dossiers.length; i += 4) {
  const lot = dossiers.slice(i, i + 4);
  const prompt = `Tu es le contrôle qualité FINAL de l'encyclopédie AKASHA (univers ${UNIVERSE}).
Note chaque fiche de 0 à 10 CONTRE SA SOURCE : fidélité d'abord (fait ajouté ou contredit =
grave ; condensation et traduction = normal), puis clarté du français. Sois exigeant mais
juste — c'est un certificat de sortie d'usine.
Réponds UNIQUEMENT en JSON : {"notes": [{"slug": "…", "note": <0-10>, "defaut": "<une phrase>"}]}

${lot.map((d) => `═══ FICHE ${d.slug} (${d.nom})\n${d.contenu}\n─── SOURCE\n${d.source}`).join('\n\n')}`;
  try {
    const { stdout } = await execFile('claude', ['-p', prompt, '--model', 'claude-haiku-4-5'],
      { timeout: 300_000, maxBuffer: 8 * 1024 * 1024, env: (({ ANTHROPIC_API_KEY: _cle, ...e }) => e)(process.env) });
    notes.push(...(JSON.parse((stdout.match(/\{[\s\S]*\}/) ?? ['{}'])[0]).notes ?? []));
  } catch (e) { console.error(`  ✗ lot ${i / 4 + 1} : ${String(e.message).slice(0, 90)}`); }
}

const valides = notes.filter((n) => Number.isFinite(Number(n.note)));
if (!valides.length) { console.error('aucune note rendue'); process.exit(1); }
const moyenne = valides.reduce((s, n) => s + Number(n.note), 0) / valides.length;
const taux = Math.round((valides.filter((n) => Number(n.note) >= 7).length / valides.length) * 100);
const pires = [...valides].sort((a, b) => a.note - b.note).slice(0, 3);

const date = new Date().toISOString().slice(0, 10);
const rapport = [`# Contrôle qualité final — ${UNIVERSE} — ${date}`, '',
  `**Taux de confiance : ${taux} %** (part de l'échantillon notée ≥ 7/10) · moyenne ${moyenne.toFixed(1)}/10 · ${valides.length} fiche(s) contrôlée(s) sur ${publiees.length} publiées.`, '',
  '| Fiche | Note | Pire défaut |', '|---|---|---|',
  ...valides.sort((a, b) => a.note - b.note).map((n) => `| ${n.slug} | ${n.note}/10 | ${String(n.defaut).replace(/\|/g, '·')} |`)].join('\n');

console.log(`\nTAUX DE CONFIANCE ${UNIVERSE} : ${taux} % · moyenne ${moyenne.toFixed(1)}/10`);
for (const p of pires) console.log(`  pire : ${p.slug} ${p.note}/10 — ${String(p.defaut).slice(0, 90)}`);
if (!DRY) {
  const DOSSIER = process.env.NIKA_AUDIT_DIR ?? 'tasks/audits';
  mkdirSync(DOSSIER, { recursive: true });
  writeFileSync(`${DOSSIER}/confiance-${UNIVERSE.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${date}.md`, rapport + '\n');
  await supabase.from('ops_notes').insert({ note: `✅ Contrôle final ${UNIVERSE} : confiance ${taux} % (moyenne ${moyenne.toFixed(1)}/10, ${valides.length} fiches)` });
  await envoyerAlerte(`✅ ${UNIVERSE} — taux de confiance ${taux} % (moyenne ${moyenne.toFixed(1)}/10)`).catch(() => {});
  await battreEnClaude('controle', `${UNIVERSE} : confiance ${taux} %`);
  console.log(`✓ rapport : tasks/audits/confiance-…-${date}.md`);
}
