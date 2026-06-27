// app/api/niko/route.ts — Agent NIKO avec OUTILS réels (tool-use) + streaming SSE.
// NIKO interroge le vrai réseau NIKA (Supabase) : restaurants, prestataires par domaine, suivi de commande.
// Appel direct à l'API Anthropic via fetch (le helper SDK .stream() casse sous Turbopack :
// « getDefaultAgent is not a function »). Boucle d'outils jusqu'à la réponse finale, sans simulation.
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Tu es NIKO, l'assistant NIKA sur la Côte d'Azur.
NIKA connecte les habitants et visiteurs de Nice, Antibes et Cannes avec des chauffeurs VTC, livreurs, runners, restaurants et artisans partenaires.

TON RÔLE
Tu aides à trouver et réserver transport, livraison, courses et services. Tu t'appuies sur de VRAIS partenaires du réseau NIKA — jamais inventés.

OUTILS (utilise-les systématiquement avant de proposer quoi que ce soit)
- chercher_restaurants : pour toute demande de nourriture/livraison → propose de vrais restos NIKA.
- chercher_pros : pour VTC/dépannage/location auto (domaine "auto"), artisans (serv), bateaux & sorties mer (azur), location de matériel (rent), cours & coaching (learn), sécurité/serrurier (sec).
- suivre_ma_commande : pour "où en est ma commande / mon chauffeur" (utilisateur connecté).
N'invente JAMAIS un nom de partenaire, un prix, un ETA ou une confirmation. Si un outil ne renvoie rien, dis-le et propose une alternative.

RÉSERVER / COMMANDER
Tu rassembles les détails utiles (lieu, horaire, nombre de personnes…), tu présentes le bon partenaire trouvé via les outils, puis tu invites à finaliser dans l'app (donne le lien adapté : /food, /auto/vtc, /auto/depannage, /serv, /azur, /rent). Tu ne crées pas la commande toi-même et tu ne simules aucune confirmation.

PERSONNALITÉ
Direct, efficace, légèrement chaleureux, jamais robotique. Première personne. Tu ne dis jamais que tu es une IA — tu es NIKO.

LANGUE
Tu réponds dans la langue du message reçu.

ZONE
Nice, Antibes, Cannes et environs. Hors zone : dis-le et propose de créer un compte pour être prévenu.

FORMAT
Court (3-4 lignes max). Confirme l'action / la piste trouvée. Emojis avec parcimonie (📍 ✈️ 🕕 👥 💰 ✓). Termine par une action suivante simple.

HORS PÉRIMÈTRE (transport / livraison / courses / services / mer / location / cours / sécurité)
"Pour ça, rends-toi sur nika.fr — je me concentre sur le réseau NIKA. Besoin d'un VTC, d'une livraison ou d'un artisan ?"`;

const TOOLS = [
  {
    name: 'chercher_restaurants',
    description: 'Cherche des restaurants / food partenaires NIKA réels (Nice, Antibes, Cannes). À utiliser pour toute demande de nourriture ou de livraison de repas.',
    input_schema: { type: 'object', properties: { recherche: { type: 'string', description: 'mots-clés cuisine ou nom (ex: pizza, sushi, comorien)' } } },
  },
  {
    name: 'chercher_pros',
    description: "Cherche de vrais prestataires du réseau NIKA par domaine. domaine: auto (VTC, dépannage, location voiture), serv (plombier, électricien, artisans), azur (bateaux, sorties mer), rent (location de matériel), learn (cours, coaching), sec (sécurité, serrurier).",
    input_schema: { type: 'object', properties: { domaine: { type: 'string', enum: ['auto', 'serv', 'azur', 'rent', 'learn', 'sec'] }, recherche: { type: 'string', description: 'mots-clés optionnels' } }, required: ['domaine'] },
  },
  {
    name: 'suivre_ma_commande',
    description: "Renvoie le statut des dernières commandes de l'utilisateur connecté. À utiliser pour « où en est ma commande ».",
    input_schema: { type: 'object', properties: {} },
  },
];

const clean = (s: unknown) => String(s ?? '').replace(/[%,_()]/g, ' ').trim().slice(0, 40);

type SB = NonNullable<Awaited<ReturnType<typeof createClient>>>;
async function runTool(name: string, input: Record<string, unknown>, supabase: SB | null, userId: string | null): Promise<string> {
  if (!supabase) return JSON.stringify({ erreur: 'service_indisponible' });
  if (name === 'chercher_restaurants') {
    const base = () => supabase.from('food_providers').select('name, description, city').eq('active', true).limit(6);
    const r = clean(input.recherche);
    let data: unknown[] | null = null;
    if (r) { const res = await base().or(`name.ilike.%${r}%,description.ilike.%${r}%`); data = res.data; }
    if (!data || data.length === 0) { const res = await base(); data = res.data; } // repli : tout le domaine si le mot-clé ne matche pas
    return JSON.stringify(data ?? []);
  }
  if (name === 'chercher_pros') {
    const dom = clean(input.domaine);
    const base = () => supabase.from('pros').select('business_name, description, rating, phone, address').eq('domain', dom).eq('active', true).order('rating', { ascending: false }).limit(6);
    const r = clean(input.recherche);
    let data: unknown[] | null = null;
    if (r) { const res = await base().or(`business_name.ilike.%${r}%,description.ilike.%${r}%`); data = res.data; }
    if (!data || data.length === 0) { const res = await base(); data = res.data; } // repli : tout le domaine
    return JSON.stringify(data ?? []);
  }
  if (name === 'suivre_ma_commande') {
    if (!userId) return JSON.stringify({ erreur: 'non_connecte', message: 'Connecte-toi pour suivre tes commandes.' });
    const { data } = await supabase.from('orders').select('status, amount, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3);
    return JSON.stringify(data ?? []);
  }
  return JSON.stringify({ erreur: 'outil_inconnu' });
}

type Block = { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type Msg = { role: 'user' | 'assistant'; content: string | unknown[] };

// Un tour de conversation en streaming : POST à l'API, parse les events SSE, pousse le texte au client,
// reconstruit le contenu assistant + les appels d'outils. Retourne le stop_reason.
async function streamTurn(apiKey: string, messages: Msg[], onText: (t: string) => void): Promise<{ content: Block[]; toolUses: Extract<Block, { type: 'tool_use' }>[]; stopReason: string }> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: SYSTEM_PROMPT, tools: TOOLS, messages, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`anthropic ${res.status}: ${await res.text().catch(() => '')}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const blocks: Record<number, { type: string; text: string; id?: string; name?: string; json: string }> = {};
  let stopReason = '';
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let ev: { type?: string; index?: number; content_block?: { type: string; id?: string; name?: string }; delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string } };
      try { ev = JSON.parse(payload); } catch { continue; }
      if (ev.type === 'content_block_start' && typeof ev.index === 'number' && ev.content_block) {
        blocks[ev.index] = { type: ev.content_block.type, text: '', id: ev.content_block.id, name: ev.content_block.name, json: '' };
      } else if (ev.type === 'content_block_delta' && typeof ev.index === 'number' && ev.delta) {
        const b = blocks[ev.index]; if (!b) continue;
        if (ev.delta.type === 'text_delta' && ev.delta.text) { b.text += ev.delta.text; onText(ev.delta.text); }
        else if (ev.delta.type === 'input_json_delta' && ev.delta.partial_json) { b.json += ev.delta.partial_json; }
      } else if (ev.type === 'message_delta' && ev.delta?.stop_reason) {
        stopReason = ev.delta.stop_reason;
      }
    }
  }

  const content: Block[] = [];
  const toolUses: Extract<Block, { type: 'tool_use' }>[] = [];
  for (const idx of Object.keys(blocks).map(Number).sort((a, b) => a - b)) {
    const b = blocks[idx];
    if (b.type === 'text' && b.text) content.push({ type: 'text', text: b.text });
    else if (b.type === 'tool_use' && b.id && b.name) {
      let input: Record<string, unknown> = {};
      try { input = b.json ? JSON.parse(b.json) : {}; } catch { input = {}; }
      const tu = { type: 'tool_use' as const, id: b.id, name: b.name, input };
      content.push(tu); toolUses.push(tu);
    }
  }
  return { content, toolUses, stopReason };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'NIKO non configuré — ANTHROPIC_API_KEY manquant' }), { status: 503 });
  try {
    const { messages } = await req.json().catch(() => ({}));
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return new Response(JSON.stringify({ error: 'messages invalides' }), { status: 400 });
    }
    const safeMessages: Msg[] = messages
      .filter((m: { role?: unknown; content?: unknown }) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
      .map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 4000) }));
    if (safeMessages.length === 0) return new Response(JSON.stringify({ error: 'messages invalides' }), { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const userId = user?.id ?? null;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        try {
          const convo: Msg[] = [...safeMessages];
          for (let turn = 0; turn < 4; turn++) {
            const { content, toolUses, stopReason } = await streamTurn(apiKey, convo, (t) => send({ text: t }));
            if (stopReason !== 'tool_use' || toolUses.length === 0) break;
            const toolResults = [];
            for (const tu of toolUses) {
              const out = await runTool(tu.name, tu.input, supabase, userId).catch(() => JSON.stringify({ erreur: 'echec_outil' }));
              toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: out });
            }
            convo.push({ role: 'assistant', content });
            convo.push({ role: 'user', content: toolResults });
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[niko]', err);
          send({ error: 'Erreur NIKO, réessaie.' });
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
