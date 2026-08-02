// scripts/ops-dispatcheur.mjs — LE DISPATCHEUR (rôle Claude n°6, activé par Dan le 02/08/2026).
//
// Jusqu'ici le routage tâche→couloir était STATIQUE (une liste ordonnée dans usine.sh), corrigé
// à la main à chaque incident : Nemotron pense → les sections déménagent ; Mistral bridé → tout
// ralentit. Le Dispatcheur observe toutes les 15 minutes l'état RÉEL — composition des piles,
// guichets restants, échecs récents par couloir — et demande à Claude UN plan de routage :
// quel type de tâche va d'abord sur quel couloir, et combien de front.
//
// Le plan s'écrit dans data/routage.json ; modelOf() le consulte AVANT la liste statique, qui
// reste le filet si le plan est absent, périmé (> 30 min) ou muet sur un type. Un SEUL appel
// Claude par passage — l'intelligence est périodique et stratégique, jamais par tâche.
//
// Usage : node --env-file=.env.local scripts/ops-dispatcheur.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';
import { LIMITES_FOURNISSEURS } from '../lib/ops/limites.mjs';

const execFile = promisify(execFileCb);
const supabase = clientOps();
const DRY = process.argv.includes('--dry');

// Les couloirs éligibles par étage — le Dispatcheur ORDONNE, il n'invente pas de couloir.
const COULOIRS = {
  // Mistral-Small DeepInfra RETIRÉ de la production le 03/08 : délire multilingue mesuré sur
  // les sections (6 productions corrompues attrapées par la vague 20h01). Il reste éligible au
  // jugement (verdicts courts, jamais pris en défaut). Réintégrable après audit à l'aveugle.
  production: ['nvidia/nvidia/nemotron-3-super-120b-a12b', 'mistral/mistral-large-latest',
    'groq/openai/gpt-oss-120b',
    'deepinfra/meta-llama/Llama-3.3-70B-Instruct-Turbo', 'openrouter/mistralai/mistral-small-24b-instruct-2501'],
  jugement: ['openrouter/google/gemma-4-26b-a4b-it:free', 'deepinfra/Qwen/Qwen3-32B',
    'mistral/mistral-small-latest', 'nvidia/nvidia/nemotron-3-super-120b-a12b', 'groq/llama-3.3-70b-versatile'],
};
const PENSEURS = ['nvidia/nvidia/nemotron-3-super-120b-a12b', 'groq/openai/gpt-oss-120b', 'deepinfra/Qwen/Qwen3-32B'];

// 1) L'état réel : piles, guichets consommés, échecs de l'heure par couloir.
const [{ data: parType }, { data: quotas }, { data: echecs }] = await Promise.all([
  supabase.rpc('ops_queue_by_type'),
  supabase.from('ops_quotas').select('fournisseur, requetes, fenetre_debut'),
  supabase.from('agent_results').select('model, status')
    .in('status', ['failed']).gte('created_at', new Date(Date.now() - 3600_000).toISOString()).limit(500),
]);
// Les types à modèle FIXE (arbitrage_claude) ne se routent pas : leur couloir est leur raison d'être.
const piles = Object.fromEntries((parType ?? []).filter((r) => r.task_type !== 'arbitrage_claude')
  .map((r) => [r.task_type, Number(r.en_attente)]));
const guichets = {};
for (const [cle, lim] of Object.entries(LIMITES_FOURNISSEURS)) {
  if (!cle.includes('/')) continue;
  const jour = (quotas ?? []).find((q) => q.fournisseur === `${cle}:jour`);
  const perime = !jour || Date.now() - new Date(jour.fenetre_debut).getTime() > 86_400_000;
  guichets[cle] = {
    parMinute: lim.requetes,
    restantJour: lim.parJour ? (perime ? lim.parJour : Math.max(0, lim.parJour - (jour?.requetes ?? 0))) : 'illimité',
    penseur: PENSEURS.includes(cle),
  };
}
const pannes = {};
for (const e of echecs ?? []) pannes[e.model] = (pannes[e.model] ?? 0) + 1;

// 2) UN appel Claude : le plan.
const prompt = `Tu es le DISPATCHEUR de l'usine AKASHA. Ta mission : maximiser le débit SIMULTANÉ
en répartissant les types de tâches sur les couloirs, sans jamais griller un guichet.

RÈGLES MÉTIER (apprises sur incidents réels) :
- Les couloirs PENSEURS (penseur:true) raisonnent en caché sur les longs prompts et se font
  couper : jamais en tête pour fiche_section ni toilettage_fr (prompts longs). Ils excellent
  sur les prompts courts (akasha_attrs, fandom_descfr).
- Étaler les types sur des couloirs DIFFÉRENTS quand les piles sont grosses : deux types sur le
  même couloir se font la queue ; le débit simultané vient de la diversité.
- Un guichet restantJour faible se garde pour les tâches rares (arbitrage), pas pour la masse.
- Les couloirs payants (deepinfra/, openrouter/mistralai) en fin de liste sauf si les gratuits
  sont morts (restantJour 0) ou en panne.
- review_local = jugement (liste jugement) ; le reste = production (liste production).

ÉTAT RÉEL :
piles en attente : ${JSON.stringify(piles)}
guichets : ${JSON.stringify(guichets)}
échecs dernière heure par modèle : ${JSON.stringify(pannes)}

COULOIRS ÉLIGIBLES (tu ORDONNES ces listes, tu n'inventes rien) :
${JSON.stringify(COULOIRS)}

Réponds UNIQUEMENT en JSON :
{"routage": {"<task_type>": ["couloir1", "couloir2", …], …}, "motif": "une phrase sur ton arbitrage"}
Ne mets une entrée QUE pour les types présents dans les piles.`;

const { stdout } = await execFile('claude', ['-p', prompt, '--model', 'claude-haiku-4-5'],
  { timeout: 240_000, maxBuffer: 4 * 1024 * 1024, env: (({ ANTHROPIC_API_KEY: _cle, ...e }) => e)(process.env) });
let plan;
try { plan = JSON.parse((stdout.match(/\{[\s\S]*\}/) ?? ['{}'])[0]); } catch { console.error('plan illisible'); process.exit(1); }

// 3) Garde-fou : ne garder que des couloirs RÉELLEMENT éligibles pour l'étage du type.
const eligibles = new Set([...COULOIRS.production, ...COULOIRS.jugement]);
const routage = {};
for (const [type, liste] of Object.entries(plan.routage ?? {})) {
  const propres = (Array.isArray(liste) ? liste : []).filter((c) => eligibles.has(c));
  if (propres.length) routage[type] = propres;
}
console.log(`plan : ${Object.keys(routage).length} type(s) routés — ${String(plan.motif ?? '').slice(0, 140)}`);
for (const [t, l] of Object.entries(routage)) console.log(`  ${t.padEnd(18)} → ${l.map((x) => x.split('/').pop()).join(' → ')}`);

if (!DRY && Object.keys(routage).length) {
  writeFileSync(process.env.NIKA_ROUTAGE ?? 'data/routage.json', JSON.stringify({ genere: new Date().toISOString(), motif: plan.motif, routage }, null, 1) + '\n');
  try {
    await supabase.from('ops_workers').upsert({
      id: 'claude:dispatcheur', hote: 'claude', role: 'claude', pid: process.pid,
      detail: String(plan.motif ?? `${Object.keys(routage).length} types routés`).slice(0, 120),
      derniere_activite: new Date().toISOString(),
    });
  } catch { /* console aveugle */ }
  console.log('✓ data/routage.json écrit — modelOf le consulte au prochain lot');
}
