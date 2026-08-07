// scripts/lib/couloirs.mjs — « ce couloir répond-il, MAINTENANT ? », en un seul exemplaire.
//
// POURQUOI (07/08/2026)
// Deux fois déjà, un script a péri d'un couloir LLM épinglé en dur qui s'était refermé depuis :
// ops-rejoue-relectures rejouait chaque nuit 328 relectures sur DeepInfra, passé en 402 pour cause
// de facturation, et les remettait en échec — auto_verdict NUL sur 328/328, avec 664 productions
// empilées derrière en attente d'un jugement qui ne venait jamais. La leçon du 01/08 disait déjà
// que ni la doc ni les en-têtes ne disent la vérité sur un quota : seul un vrai appel la dit.
//
// Cette fonction est ce vrai appel, réduit au strict minimum (un jeton), partagé pour qu'un script
// neuf n'ait plus à recopier — donc à laisser vieillir — sa propre liste de couloirs.
//
// La table est le miroir de scripts/ops-sonde-couloirs.mjs : la sonde RAPPORTE à un humain,
// celle-ci DÉCIDE dans le code. Ajouter un couloir ici, c'est l'ajouter là-bas aussi.

/** Les couloirs connus : nom canonique → comment on l'appelle. */
export const COULOIRS = {
  'groq/openai/gpt-oss-120b': { url: 'https://api.groq.com/openai/v1/chat/completions', cle: 'GROQ_API_KEY', modele: 'openai/gpt-oss-120b' },
  'groq/openai/gpt-oss-20b': { url: 'https://api.groq.com/openai/v1/chat/completions', cle: 'GROQ_API_KEY', modele: 'openai/gpt-oss-20b' },
  'groq/llama-3.3-70b-versatile': { url: 'https://api.groq.com/openai/v1/chat/completions', cle: 'GROQ_API_KEY', modele: 'llama-3.3-70b-versatile' },
  'groq/llama-3.1-8b-instant': { url: 'https://api.groq.com/openai/v1/chat/completions', cle: 'GROQ_API_KEY', modele: 'llama-3.1-8b-instant' },
  'nvidia/nemotron-3-super-120b': { url: 'https://integrate.api.nvidia.com/v1/chat/completions', cle: 'NVIDIA_API_KEY', modele: 'nvidia/nemotron-3-super-120b-a12b' },
  'mistral/mistral-large-latest': { url: 'https://api.mistral.ai/v1/chat/completions', cle: 'MISTRAL_API_KEY', modele: 'mistral-large-latest' },
  'openrouter/nemotron-550b:free': { url: 'https://openrouter.ai/api/v1/chat/completions', cle: 'OPENROUTER_API_KEY', modele: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
  'nvidia/nvidia/nemotron-3-super-120b-a12b': { url: 'https://integrate.api.nvidia.com/v1/chat/completions', cle: 'NVIDIA_API_KEY', modele: 'nvidia/nemotron-3-super-120b-a12b' },
  'mistral/mistral-small-latest': { url: 'https://api.mistral.ai/v1/chat/completions', cle: 'MISTRAL_API_KEY', modele: 'mistral-small-latest' },
  'openrouter/google/gemma-4-26b-a4b-it:free': { url: 'https://openrouter.ai/api/v1/chat/completions', cle: 'OPENROUTER_API_KEY', modele: 'google/gemma-4-26b-a4b-it:free' },
  'openrouter/mistralai/mistral-small-24b-instruct-2501': { url: 'https://openrouter.ai/api/v1/chat/completions', cle: 'OPENROUTER_API_KEY', modele: 'mistralai/mistral-small-24b-instruct-2501' },
  'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free': { url: 'https://openrouter.ai/api/v1/chat/completions', cle: 'OPENROUTER_API_KEY', modele: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
  'deepinfra/Qwen/Qwen3-32B': { url: 'https://api.deepinfra.com/v1/openai/chat/completions', cle: 'DEEPINFRA_API_KEY', modele: 'Qwen/Qwen3-32B' },
  'deepinfra/meta-llama/Llama-3.3-70B-Instruct-Turbo': { url: 'https://api.deepinfra.com/v1/openai/chat/completions', cle: 'DEEPINFRA_API_KEY', modele: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  'gemini/gemma-4-31b-it': { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', cle: 'GEMINI_API_KEY', modele: 'gemma-4-31b-it' },
  'gemini/gemini-flash-lite-latest': { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', cle: 'GEMINI_API_KEY', modele: 'gemini-flash-lite-latest' },
};

const cache = new Map();   // un couloir n'est sondé qu'une fois par exécution

/** Le couloir figure-t-il dans la table, donc peut-on le sonder pour de vrai ? */
export const couloirConnu = (nom) => Boolean(COULOIRS[nom]);

/** Ce couloir répond-il à un appel minimal ? Clé absente, quota épuisé, facturation morte,
 *  réseau coupé → false. Ne lève jamais : un sondage qui casse le script qu'il devait protéger
 *  serait pire que le mal.
 *
 *  INCONNU ≠ FERMÉ (07/08/2026, corrigé dans l'heure). Première version : un couloir absent de la
 *  table renvoyait `false`. La sonde de démarrage a donc condamné SEPT couloirs d'un coup —
 *  mistral-small, nemotron, claude-haiku, deux openrouter — qui étaient parfaitement ouverts, mais
 *  que la table nommait autrement (`nvidia/nemotron-3-super-120b` ici,
 *  `nvidia/nvidia/nemotron-3-super-120b-a12b` chez le worker). Le remède était pire que le mal :
 *  l'étage s'est retrouvé sans aucun juge. Un couloir qu'on ne sait pas tester est PRÉSUMÉ OUVERT
 *  et se découvrira à l'usage — c'est le comportement d'avant la sonde, jamais moins bon. */
export async function couloirDisponible(nom, { timeoutMs = 20_000 } = {}) {
  if (cache.has(nom)) return cache.get(nom);
  const c = COULOIRS[nom];
  const verdict = await (async () => {
    if (!c) return true;                                    // inconnu : présumé ouvert, jamais condamné
    const cle = process.env[c.cle];
    if (!cle) return false;
    try {
      const res = await fetch(c.url, {
        method: 'POST',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: c.modele, max_tokens: 1, messages: [{ role: 'user', content: '.' }] }),
      });
      return res.ok;
    } catch { return false; }
  })();
  cache.set(nom, verdict);
  return verdict;
}

/** Les `combien` premiers couloirs ouverts de `liste`, au plus un par FAMILLE de modèle.
 *  La règle des familles vient du 28/07 : deux juges de la même maison partagent leurs angles
 *  morts, et un double verdict qui n'a qu'un avis n'est plus un double verdict. */
export async function couloirsOuverts(liste, combien = 2) {
  const famille = (m) => String(m).split('/')[1] ?? String(m).split('/')[0];
  const retenus = [];
  for (const nom of liste) {
    if (retenus.length >= combien) break;
    if (retenus.some((r) => famille(r) === famille(nom))) continue;
    // Ici on CHOISIT : on n'accepte qu'un couloir réellement testé, pas un présumé ouvert.
    if (couloirConnu(nom) && await couloirDisponible(nom)) retenus.push(nom);
  }
  return retenus;
}
