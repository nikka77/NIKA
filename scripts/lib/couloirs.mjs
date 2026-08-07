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
  'gemini/gemma-4-31b-it': { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', cle: 'GEMINI_API_KEY', modele: 'gemma-4-31b-it' },
  'gemini/gemini-flash-lite-latest': { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', cle: 'GEMINI_API_KEY', modele: 'gemini-flash-lite-latest' },
};

const cache = new Map();   // un couloir n'est sondé qu'une fois par exécution

/** Ce couloir répond-il à un appel minimal ? Clé absente, quota épuisé, facturation morte,
 *  réseau coupé → false. Ne lève jamais : un sondage qui casse le script qu'il devait protéger
 *  serait pire que le mal. */
export async function couloirDisponible(nom, { timeoutMs = 20_000 } = {}) {
  if (cache.has(nom)) return cache.get(nom);
  const c = COULOIRS[nom];
  const verdict = await (async () => {
    if (!c) return false;                                   // couloir inconnu : on ne devine pas
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
    if (await couloirDisponible(nom)) retenus.push(nom);
  }
  return retenus;
}
