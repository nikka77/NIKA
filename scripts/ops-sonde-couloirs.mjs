// scripts/ops-sonde-couloirs.mjs — SONDE DE VÉRITÉ des couloirs LLM (01/08/2026).
//
// Née d'une leçon coûteuse : la doc de Groq annonce 200 000 jetons/jour sur gpt-oss-120b, ses
// en-têtes x-ratelimit-* n'exposent aucun compteur quotidien… et le 429 avoue « TPD: Limit 2000 »,
// soit moins d'UNE fiche par jour. Ni la doc ni les en-têtes ne suffisent : seul un vrai appel dit
// la vérité. Cette sonde envoie une requête minimale par couloir et rapporte ce que le fournisseur
// répond vraiment — à relancer avant tout gros lot, et quand un couloir se met à refuser.
//
// Usage : node --env-file=.env.local scripts/ops-sonde-couloirs.mjs
const COULOIRS = [
  { nom: 'groq/openai/gpt-oss-120b',        url: 'https://api.groq.com/openai/v1/chat/completions', cle: 'GROQ_API_KEY',       modele: 'openai/gpt-oss-120b' },
  { nom: 'groq/openai/gpt-oss-20b',         url: 'https://api.groq.com/openai/v1/chat/completions', cle: 'GROQ_API_KEY',       modele: 'openai/gpt-oss-20b' },
  { nom: 'groq/llama-3.3-70b-versatile',    url: 'https://api.groq.com/openai/v1/chat/completions', cle: 'GROQ_API_KEY',       modele: 'llama-3.3-70b-versatile' },
  { nom: 'groq/llama-3.1-8b-instant',       url: 'https://api.groq.com/openai/v1/chat/completions', cle: 'GROQ_API_KEY',       modele: 'llama-3.1-8b-instant' },
  { nom: 'nvidia/nemotron-3-super-120b',    url: 'https://integrate.api.nvidia.com/v1/chat/completions', cle: 'NVIDIA_API_KEY', modele: 'nvidia/nemotron-3-super-120b-a12b' },
  { nom: 'mistral/mistral-large-latest',    url: 'https://api.mistral.ai/v1/chat/completions',      cle: 'MISTRAL_API_KEY',    modele: 'mistral-large-latest' },
  { nom: 'openrouter/nemotron-550b:free',   url: 'https://openrouter.ai/api/v1/chat/completions',   cle: 'OPENROUTER_API_KEY', modele: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
];

for (const c of COULOIRS) {
  const cle = process.env[c.cle];
  if (!cle) { console.log(`○ ${c.nom.padEnd(38)} clé ${c.cle} absente`); continue; }
  try {
    const res = await fetch(c.url, {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: c.modele, max_tokens: 1, messages: [{ role: 'user', content: '.' }] }),
    });
    const h = (n) => res.headers.get(n);
    const quotas = [
      h('x-ratelimit-remaining-requests') && `req ${h('x-ratelimit-remaining-requests')}/${h('x-ratelimit-limit-requests')}`,
      h('x-ratelimit-remaining-tokens') && `jetons ${h('x-ratelimit-remaining-tokens')}/${h('x-ratelimit-limit-tokens')}`,
      h('x-ratelimit-reset-requests') && `réarme ${h('x-ratelimit-reset-requests')}`,
    ].filter(Boolean).join(' · ');
    if (res.ok) { console.log(`✓ ${c.nom.padEnd(38)} OK   ${quotas || '(aucun en-tête de quota)'}`); continue; }
    const corps = await res.text();
    const motif = corps.match(/"message"\s*:\s*"([^"]{0,190})/)?.[1] ?? corps.slice(0, 190);
    console.log(`✗ ${c.nom.padEnd(38)} HTTP ${res.status} · ${motif}`);
  } catch (e) {
    console.log(`✗ ${c.nom.padEnd(38)} ${String(e.message ?? e).slice(0, 120)}`);
  }
}
