// scripts/agent-worker.mjs — worker local NIKA OPS (L1).
// Boucle : claim pgmq → garde → modèle local via OmniRoute (sortie contrainte) → agent_results → archive.
// Usage :  node --env-file=.env.local scripts/agent-worker.mjs           (vide la file puis s'arrête)
//          node --env-file=.env.local scripts/agent-worker.mjs --loop    (tourne en continu, pause 30 s à vide)
// Les résultats ne touchent JAMAIS les tables réelles : ils attendent la review dans agent_results.
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { fetchFandomProse } from './lib/fandom.mjs';
import { expertFor, axesSchema, AXES, checkPreuves } from './lib/akasha-axes.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const OMNI_URL = process.env.OMNIROUTE_URL ?? 'http://localhost:20128/v1';
const OMNI_KEY = process.env.OMNIROUTE_API_KEY;
const LOOP = process.argv.includes('--loop');
const VT = 180; // fenêtre de visibilité pgmq (s) — une tâche non archivée redevient visible après

/* ── Types de tâches ────────────────────────────────────────────── */
// Chaque type : modèle, schéma JSON (décodage contraint), garde d'entrée, prompt.
// Pas d'échappatoire « données insuffisantes » côté modèle : à température 0, sa seule présence
// dans le schéma fait tout refuser (constaté sur 16/20 fiches le 25/07). Le tri appartient à la
// garde du worker (amont) et au reviewer (aval), jamais au 12B.
const FlavorOut = z.object({ descFr: z.string().min(30) });

const TASK_TYPES = {
  flavor_akasha: {
    model: 'ollama/gemma4:12b',
    zod: FlavorOut,
    schema: {
      type: 'object',
      properties: { descFr: { type: 'string' } },
      required: ['descFr'],
      additionalProperties: false,
    },
    // Garde anti-fabulation n°1 : jamais d'appel modèle sans matière première suffisante.
    guard: (p) => ((p.summary ?? '').length >= 40 ? null : 'summary absent ou trop court'),
    prompt: (p) => `Tu rédiges les bios françaises de l'encyclopédie AKASHA (univers d'animes/mangas).
À partir des SEULES données ci-dessous, écris "descFr" : 1 à 3 phrases en français, ton encyclopédique
sobre, présent de narration. Le résumé source (parfois en anglais) SUFFIT : reformule-le en français et
situe le personnage dans son univers. N'ajoute AUCUN fait absent des données, aucun anglicisme.

DONNÉES :
- Nom : ${p.name}
- Univers : ${p.universe ?? 'inconnu'}
- Type : ${p.type} ${p.category ? `(${p.category})` : ''}
- Résumé source (anglais) : ${p.summary}`,
  },

  // Enrichissement RÉEL : la page canon Fandom apporte des faits ABSENTS du résumé actuel.
  // (Le type flavor_akasha ci-dessus ne faisait que paraphraser un summary déjà français — review Dan 25/07.)
  fandom_descfr: {
    model: (p) => expertFor(p.universe),   // expert de l'univers (akasha-naruto, akasha-one-piece…)
    zod: z.object({ descFr: z.string().min(80) }),
    schema: {
      type: 'object',
      properties: { descFr: { type: 'string' } },
      required: ['descFr'],
      additionalProperties: false,
    },
    // Étape « yeux » : le worker va chercher la matière AVANT tout appel au modèle.
    fetch: async (p) => {
      const page = await fetchFandomProse(p.universe, p.name);
      return page ? { ...p, fandom: page.text, fandomTitle: page.title, fandomUrl: page.url, sameEntity: page.sameEntity } : p;
    },
    // Trois gardes, apprises des 3 erreurs d'identité du 25/07 :
    guard: (p) => {
      if ((p.fandom ?? '').length < 400) return 'page Fandom absente ou trop maigre';
      // 1) le titre trouvé désigne-t-il la même entité ? (Giorno's Mother → Giorno, Super 17 → Android 17)
      if (p.sameEntity === false) return `mauvaise entité : article « ${p.fandomTitle} » pour « ${p.name} »`;
      // 2) homonyme ? (Ain/Egghead vs Ain/Neo Marines) : aucun nom propre du résumé dans l'article
      const propres = [...new Set((p.summary ?? '').match(/(?<!^|[.!?]\s)\b[A-ZÀ-Þ][\wÀ-ÿ'-]{3,}/g) ?? [])];
      if (propres.length && !propres.some((n) => (p.fandom ?? '').toLowerCase().includes(n.toLowerCase().slice(0, 6))))
        return `homonyme probable : aucun repère du résumé (${propres.slice(0, 3).join(', ')}) dans « ${p.fandomTitle} »`;
      return null;
    },
    prompt: (p) => `Tu rédiges les fiches françaises de l'encyclopédie AKASHA (univers d'animes/mangas).
Voici l'article du wiki canon (en anglais, brut). Rédige "descFr" : 3 à 5 phrases en français,
ton encyclopédique sobre, présent de narration.

RÈGLES :
- N'utilise QUE des faits présents dans l'article ci-dessous. Aucune invention, aucun anglicisme.
- Priorité aux faits CONCRETS : rôle dans l'intrigue, affiliation, capacités, relations clés, arc d'apparition.
- N'écris PAS de généralités du type « personnage secondaire au rôle mineur ».
- Ne recopie pas la phrase de résumé déjà connue ci-dessous : APPORTE des éléments qu'elle ne contient pas.

FICHE : ${p.name} — univers ${p.universe}
RÉSUMÉ DÉJÀ CONNU (à compléter, pas à répéter) : ${p.summary}

ARTICLE DU WIKI (${p.fandomTitle}) :
${p.fandom}`,
  },

  // LE GISEMENT : remplir les axes de taxonomie (village, clan, équipage, division, partie…).
  // Les valeurs sont contraintes par enum → le modèle ne PEUT PAS inventer hors taxonomie.
  // Vérifié le 25/07 : sur des fiches déjà curées, l'expert retrouve exactement les valeurs en base.
  akasha_attrs: {
    model: (p) => expertFor(p.universe),
    schema: (p) => axesSchema(p.universe),
    zod: z.record(z.string()),
    fetch: async (p) => {
      const page = await fetchFandomProse(p.universe, p.name);
      return page ? { ...p, fandom: page.text, fandomTitle: page.title, fandomUrl: page.url, sameEntity: page.sameEntity } : p;
    },
    guard: (p) => {
      if (!AXES[p.universe]) return `univers sans taxonomie : ${p.universe}`;
      if ((p.fandom ?? '').length < 400) return 'page Fandom absente ou trop maigre';
      if (p.sameEntity === false) return `mauvaise entité : article « ${p.fandomTitle} » pour « ${p.name} »`;
      return null;
    },
    prompt: (p) => `À partir de l'article ci-dessous, renseigne les attributs de ${p.name} (${p.universe}).

MÉTHODE OBLIGATOIRE pour chaque attribut :
1. Cherche dans l'article une phrase qui parle de ${p.name} LUI-MÊME et qui établit cet attribut.
2. Recopie cette phrase à l'identique dans le champ "<attribut>_preuve".
3. Renseigne alors l'attribut.
Si aucune phrase de l'article ne l'établit POUR ${p.name} : réponds "inconnu" et mets "aucune" en preuve.

PIÈGE À ÉVITER : un terme peut revenir souvent dans l'article sans concerner ${p.name}
(l'entourage, les adversaires, l'univers en général). Seule une phrase parlant de ${p.name}
compte comme preuve. Ne déduis jamais rien de son nom.

ARTICLE DU WIKI (${p.fandomTitle}) :
${p.fandom}`,
  },
};

/* ── Appel modèle (JSON contraint par schéma) ───────────────────── */
// Modèles locaux : Ollama NATIF (param `format` = décodage contraint fiable).
// OmniRoute fige indéfiniment sur `response_format` (constaté le 25/07) → réservé aux futurs modèles cloud.
const TIMEOUT_MS = 420_000;  // articles longs (Zoro) + preuves : 240 s ne suffisait pas

const modelOf = (t, p) => (typeof t.model === 'function' ? t.model(p) : t.model);
const schemaOf = (t, p) => (typeof t.schema === 'function' ? t.schema(p) : t.schema);

async function callModel(type, payload) {
  const t = TASK_TYPES[type];
  const model = modelOf(t, payload);
  const schema = schemaOf(t, payload);
  const messages = [{ role: 'user', content: t.prompt(payload) }];
  let raw;
  if (model.startsWith('ollama/')) {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        // think:false — gemma4 est un modèle « thinking » : sans ça il brûle son budget en
        // raisonnement et rend un content vide (constaté le 25/07).
        // num_ctx 8192 : le défaut Ollama (4096) tronquerait l'article Fandom passé en prompt.
        model: model.slice(7), stream: false, messages, think: false,
        format: schema, options: { temperature: 0, num_predict: 1200, num_ctx: 8192 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    raw = (await res.json()).message?.content ?? '';
  } else {
    const res = await fetch(`${OMNI_URL}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Authorization: `Bearer ${OMNI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, stream: false, messages, max_tokens: 400,
        response_format: { type: 'json_schema', json_schema: { name: type, strict: true, schema } },
      }),
    });
    if (!res.ok) throw new Error(`OmniRoute HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    raw = (await res.json()).choices?.[0]?.message?.content ?? '';
  }
  return t.zod.parse(JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim()));
}

/* ── Une tâche ──────────────────────────────────────────────────── */
async function processMessage(msg) {
  const { type, payload } = msg.message;
  const t = TASK_TYPES[type];
  let base = { msg_id: msg.msg_id, task_type: type, target_slug: payload?.slug ?? null, payload };

  if (!t) return { ...base, status: 'failed', error: `type inconnu: ${type}` };

  // 1) « Yeux » : récupération des sources externes (le modèle ne navigue jamais lui-même).
  let p = payload;
  if (t.fetch) {
    try { p = await t.fetch(payload); } catch (e) { return { ...base, status: 'failed', error: 'fetch: ' + String(e).slice(0, 200) }; }
    // on garde la source dans le payload stocké → traçabilité pour le reviewer
    base = { ...base, payload: { ...p, fandom: p.fandom ? p.fandom.slice(0, 1200) + '…' : undefined } };
  }

  // 2) Garde anti-fabulation : pas de matière ⇒ pas d'appel modèle.
  const guardErr = t.guard(p);
  if (guardErr) return { ...base, status: 'refused', model: null, error: guardErr };

  for (let attempt = 1; ; attempt++) {
    try {
      const out = await callModel(type, p);
      // Contrôle de cohérence valeur↔preuve (code pur) : le modèle peut citer juste et conclure faux.
      const suspects = type === 'akasha_attrs' ? checkPreuves(out) : [];
      return {
        ...base,
        status: suspects.length ? 'suspect' : 'done',
        model: modelOf(t, p),
        result: out,
        error: suspects.length ? suspects.join(' · ') : null,
      };
    } catch (e) {
      if (attempt >= 2) return { ...base, status: 'failed', model: modelOf(t, p), error: String(e).slice(0, 300) };
    }
  }
}

/* ── Boucle principale ──────────────────────────────────────────── */
const counts = { done: 0, refused: 0, failed: 0 };
console.log(`⚙️  worker NIKA OPS — mode ${LOOP ? 'continu' : 'drain'}`);
for (;;) {
  const { data: msgs, error } = await supabase.rpc('ops_queue_read', { vt: VT, qty: 1 });
  if (error) { console.error('lecture file:', error.message); process.exit(1); }
  if (!msgs?.length) {
    if (!LOOP) break;
    await new Promise((r) => setTimeout(r, 30_000));
    continue;
  }
  const msg = msgs[0];
  const row = await processMessage(msg);
  counts[row.status]++;
  const { error: insErr } = await supabase.from('agent_results').insert(row);
  if (insErr) { console.error('agent_results:', insErr.message); process.exit(1); }
  await supabase.rpc('ops_queue_archive', { message_id: msg.msg_id });
  console.log(`  ${row.status === 'done' ? '✓' : row.status === 'refused' ? '◇' : '✗'} [${msg.msg_id}] ${row.target_slug ?? row.task_type} (${row.status})`);
}
console.log(`fini — done: ${counts.done} · refused: ${counts.refused} · failed: ${counts.failed}`);
