// scripts/ops-compare-juges.mjs — duel de juges sur des productions DÉJÀ jugées.
// Objectif : mesurer si un modèle d'une AUTRE FAMILLE voit des erreurs que le juge maison rate
// (angle mort partagé quand juge et producteur ont les mêmes poids).
// Usage : node --env-file=.env.local scripts/ops-compare-juges.mjs [--juge=qwen3:8b] [--limit=12]
import { createClient } from '@supabase/supabase-js';
import { splitPreuves } from './lib/akasha-axes.mjs';
import { fetchFandomProse } from './lib/fandom.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const JUGE = process.argv.find((a) => a.startsWith('--juge='))?.split('=')[1] ?? 'qwen3:8b';
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 12);

const SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['valide', 'a_corriger', 'rejeter'] },
    motif: { type: 'string' },
    citation: { type: 'string' },
  },
  required: ['verdict', 'motif', 'citation'],
  additionalProperties: false,
};

const prompt = (p) => `Tu es vérificateur pour l'encyclopédie AKASHA. Tu ne rédiges rien : tu CONTRÔLES.

FICHE : ${p.name} (${p.universe})
PRODUCTION DE L'AGENT À CONTRÔLER :
${p.production}

SOURCE DE RÉFÉRENCE (article du wiki canon) :
${p.source}

Contrôle, dans cet ordre :
1. La production parle-t-elle bien de ${p.name}, et non d'un homonyme ou d'un proche ?
2. Chaque fait avancé est-il présent dans la source ? (un fait absent = invention)
3. Le français est-il correct, sans anglicisme ni terme anglais résiduel ?

Puis :
- "valide" si tout est exact et ancré dans la source ;
- "a_corriger" si le fond est bon mais qu'un détail est faux, absent de la source ou mal écrit ;
- "rejeter" si la production décrit une autre entité ou invente l'essentiel.

"motif" : une phrase précise. "citation" : la phrase EXACTE de la source qui fonde ton verdict
(ou "aucune" — et alors le verdict ne peut pas être "valide").`;

const { data: rows } = await supabase
  .from('agent_results')
  .select('id, target_slug, task_type, payload, result, auto_verdict, auto_model')
  .not('auto_verdict', 'is', null)
  .order('id')
  .limit(LIMIT);

console.log(`Duel : ${rows?.[0]?.auto_model ?? 'juge maison'}  vs  ollama/${JUGE}\n`);
const tally = { accord: 0, desaccord: 0 };

for (const r of rows ?? []) {
  const p = r.payload ?? {};
  let production;
  if (r.task_type === 'akasha_attrs') {
    const { valeurs, preuves } = splitPreuves(r.result);
    const etablis = Object.entries(valeurs).filter(([, v]) => v && v !== 'inconnu');
    if (!etablis.length) continue;
    production = etablis.map(([k, v]) => `${k} = ${v}  (preuve avancée : « ${preuves[k] ?? 'aucune'} »)`).join('\n');
  } else production = r.result?.descFr;
  if (!production) continue;

  const page = await fetchFandomProse(p.universe, p.name).catch(() => null);
  if (!page?.text) continue;

  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    signal: AbortSignal.timeout(420_000),
    body: JSON.stringify({
      model: JUGE, stream: false, think: false, format: SCHEMA,
      options: { temperature: 0, num_predict: 700, num_ctx: 8192 },
      messages: [{ role: 'user', content: prompt({ ...p, production, source: page.text.slice(0, 4500) }) }],
    }),
  });
  const body = await res.json();
  if (!body?.message?.content) {   // Ollama renvoie {error:…} en cas de souci (mémoire, contexte…)
    console.log(`  ⚠ ${p.name ?? r.target_slug} — réponse inexploitable : ${JSON.stringify(body).slice(0, 200)}`);
    continue;
  }
  const out = JSON.parse(body.message.content);
  const accord = out.verdict === r.auto_verdict;
  tally[accord ? 'accord' : 'desaccord']++;
  console.log(`${accord ? '=' : '≠'} ${(p.name ?? r.target_slug).padEnd(24)} maison: ${String(r.auto_verdict).padEnd(11)} ${JUGE}: ${out.verdict}`);
  if (!accord) console.log(`   → ${out.motif.slice(0, 180)}`);
}

console.log(`\naccords : ${tally.accord} · désaccords : ${tally.desaccord}`);
