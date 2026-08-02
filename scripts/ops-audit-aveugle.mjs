// scripts/ops-audit-aveugle.mjs — L'AUDIT À L'AVEUGLE hebdomadaire (rôle Claude n°1, 02/08/2026).
//
// Les couloirs s'embauchent aujourd'hui sur sonde technique (taille réelle + JSON strict), mais
// personne ne mesure la QUALITÉ de ce qu'ils écrivent une fois titularisés. Cet audit note un
// échantillon des productions APPROUVÉES de chaque modèle — à l'aveugle : le noteur ne sait
// jamais quel modèle a écrit quoi, il note contre la source et le barème, c'est tout.
// Embaucher/licencier sur mesure, pas sur réputation.
//
// Tourne le dimanche matin sur le Mac (launchd com.nika.ops.audit — le CLI Claude y vit).
// Rapport : tasks/audits/AAAA-MM-JJ.md + alerte WhatsApp avec le classement.
//
// Usage : node --env-file=.env.local scripts/ops-audit-aveugle.mjs [--par-couloir=6] [--jours=7] [--dry]
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { fetchFandomProse } from './lib/fandom.mjs';
import { splitPreuves } from './lib/akasha-axes.mjs';
import { envoyerAlerte } from './lib/alerte.mjs';

const execFile = promisify(execFileCb);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const N = Number(process.argv.find((a) => a.startsWith('--par-couloir='))?.split('=')[1] ?? 6);
const JOURS = Number(process.argv.find((a) => a.startsWith('--jours='))?.split('=')[1] ?? 7);
const DRY = process.argv.includes('--dry');

// Échantillon : productions approuvées de la semaine, groupées par modèle producteur.
const { data: rows } = await supabase.from('agent_results')
  .select('id, task_type, model, payload, result')
  .eq('review_status', 'approved').neq('task_type', 'review_local')
  .gte('created_at', new Date(Date.now() - JOURS * 86_400_000).toISOString())
  .order('id', { ascending: false }).limit(2000);

const parModele = new Map();
for (const r of rows ?? []) {
  if (!r.model || !r.result) continue;
  const cle = String(r.model).replace(/ \(.*\)$/, '');
  if (!parModele.has(cle)) parModele.set(cle, []);
  parModele.get(cle).push(r);
}

function productionDe(r) {
  if (r.task_type === 'akasha_attrs') {
    const { valeurs, preuves } = splitPreuves(r.result);
    return Object.entries(valeurs).filter(([, v]) => v && v !== 'inconnu')
      .map(([k, v]) => `${k} = ${v}  (preuve : « ${preuves[k] ?? 'aucune'} »)`).join('\n') || null;
  }
  if (r.task_type === 'akasha_relations')
    return (r.result?.relations ?? []).map((x) => `${x.avec} (${x.nature}) : ${x.resume}`).join('\n') || null;
  if (r.task_type === 'fiche_section') return r.result?.texte ?? null;
  return r.result?.descFr ?? r.result?.texte ?? null;
}
async function sourceDe(r) {
  const p = r.payload ?? {};
  if (r.task_type === 'fiche_section') return String(p.section_texte ?? '');
  if (r.task_type === 'toilettage_fr') return String(p.texte ?? '');
  const page = await fetchFandomProse(p.universe, p.name, { maxChars: 5000 }).catch(() => null);
  return page?.text ?? '';
}

const classement = [];
for (const [modele, productions] of parModele) {
  // Tirage SANS hasard d'horloge : un pas fixe sur la liste triée par id décroissant suffit à
  // varier les fiches d'une semaine à l'autre (les ids avancent), et reste rejouable.
  const pas = Math.max(1, Math.floor(productions.length / N));
  const tirage = Array.from({ length: Math.min(N, productions.length) }, (_, k) => productions[k * pas]);

  const dossiers = [];
  for (const r of tirage) {
    const production = productionDe(r);
    const source = await sourceDe(r);
    if (production && source) dossiers.push({ id: r.id, type: r.task_type, production, source: source.slice(0, 4000) });
  }
  if (!dossiers.length) continue;

  const prompt = `Tu es auditeur qualité de l'encyclopédie AKASHA. Note chaque production de 0 à 10
CONTRE SA SOURCE, selon le barème : fidélité (fait ajouté = grave, fait contredit = grave,
condensation/traduction = normal), français (clarté, correction), utilité encyclopédique.
Tu ne sais pas quel modèle a écrit quoi — note le texte, rien d'autre.
Réponds UNIQUEMENT en JSON : {"notes": [{"id": <id>, "note": <0-10>, "defaut": "<le pire défaut, une phrase>"}]}

${dossiers.map((d) => `--- PRODUCTION id=${d.id} (type ${d.type})\n${d.production}\n--- SOURCE id=${d.id}\n${d.source}`).join('\n\n')}`;

  try {
    const { stdout } = await execFile('claude', ['-p', prompt, '--model', 'claude-haiku-4-5'],
      { timeout: 300_000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env } });
    const notes = JSON.parse((stdout.match(/\{[\s\S]*\}/) ?? ['{}'])[0]).notes ?? [];
    const valides = notes.filter((n) => Number.isFinite(Number(n.note)));
    if (!valides.length) continue;
    const moyenne = valides.reduce((s, n) => s + Number(n.note), 0) / valides.length;
    const pire = valides.reduce((a, b) => (Number(a.note) <= Number(b.note) ? a : b));
    classement.push({ modele, moyenne: Math.round(moyenne * 10) / 10, n: valides.length, pire: `#${pire.id} (${pire.note}/10) ${pire.defaut}` });
    console.log(`  ${modele.padEnd(46)} ${moyenne.toFixed(1)}/10 sur ${valides.length}`);
  } catch (e) { console.error(`  ✗ audit ${modele} : ${String(e.message).slice(0, 90)}`); }
}

classement.sort((a, b) => b.moyenne - a.moyenne);
const date = new Date().toISOString().slice(0, 10);
const rapport = [`# Audit à l'aveugle — ${date}`, '',
  `Échantillon : ${N} production(s) approuvée(s) par couloir, ${JOURS} derniers jours. Noteur : claude-haiku-4-5, modèles masqués.`, '',
  '| Couloir | Note moyenne | Échantillon | Pire cas |', '|---|---|---|---|',
  ...classement.map((c) => `| ${c.modele} | **${c.moyenne}/10** | ${c.n} | ${c.pire.replace(/\|/g, '·')} |`),
  '', '— Un couloir sous 6/10 deux semaines de suite se licencie (retiré de usine.sh).'].join('\n');
if (!DRY) {
  mkdirSync('tasks/audits', { recursive: true });
  writeFileSync(`tasks/audits/${date}.md`, rapport + '\n');
  await envoyerAlerte(`⚖ Audit à l'aveugle ${date} :\n${classement.map((c) => `${c.moyenne}/10 ${c.modele.split('/').pop()}`).join('\n')}`).catch(() => {});
  console.log(`\n✓ rapport : tasks/audits/${date}.md`);
} else console.log('\n' + rapport);
