// scripts/agent-worker.mjs — worker local NIKA OPS (L1).
// Boucle : claim pgmq → garde → modèle local via OmniRoute (sortie contrainte) → agent_results → archive.
// Usage :  node --env-file=.env.local scripts/agent-worker.mjs           (vide la file puis s'arrête)
//          node --env-file=.env.local scripts/agent-worker.mjs --loop    (tourne en continu, pause 30 s à vide)
// Confort machine : préfixer par `taskpolicy -c background` — macOS déclasse le worker en priorité
// CPU/IO de fond et l'interface reste fluide pendant les gros lots.
// Les résultats ne touchent JAMAIS les tables réelles : ils attendent la review dans agent_results.
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { fetchFandomProse } from './lib/fandom.mjs';
import { expertFor, axesSchema, AXES, checkPreuves, splitPreuves } from './lib/akasha-axes.mjs';
import { ROLES, angleFor } from './lib/akasha-roles.mjs';
import { viderParc } from './lib/whatsapp.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const OMNI_URL = process.env.OMNIROUTE_URL ?? 'http://localhost:20128/v1';
const OMNI_KEY = process.env.OMNIROUTE_API_KEY;
const LOOP = process.argv.includes('--loop');
const VT = 600; // fenêtre de visibilité pgmq (s) — assez large pour un lot en cours de traitement
// Un changement de modèle coûte ~147 s (mesuré le 26/07 sur 38 bascules) : on réclame donc
// plusieurs tâches d'un coup et on les REGROUPE PAR MODÈLE avant de les traiter.
const LOT = Number(process.argv.find((a) => a.startsWith('--lot='))?.split('=')[1] ?? 12);
// Tâches menées de front. Local : 2-3 (la mémoire du Mac borne le cache KV des slots).
// Endpoint cloud : 10-20 sans rien changer d'autre.
const CONC = Number(process.argv.find((a) => a.startsWith('--conc='))?.split('=')[1] ?? 3);
// --cloud=<modele> : route les tâches de PRODUCTION vers ce modèle via OmniRoute (Gemini, Groq…).
// La relecture (review_local) reste TOUJOURS sur l'expert local : un juge indépendant du producteur.
// Avec un endpoint cloud, monter --conc=10 à 20 — le serveur distant encaisse, contrairement au Mac.
const CLOUD = process.argv.find((a) => a.startsWith('--cloud='))?.split('=')[1] ?? null;
// --juge=<modele> : envoie la RELECTURE sur un modèle distinct du producteur. Le juge doit rester
// d'une autre famille que le producteur (angles morts complémentaires, duel du 25/07) — et au cloud
// il cesse d'être le goulot (15 h de GPU local mesurées pour juger le chantier complet).
const JUGE = process.argv.find((a) => a.startsWith('--juge='))?.split('=')[1] ?? null;
// --types=a,b : COULOIR — ce worker ne traite que ces types ; les messages étrangers retournent
// en file aussitôt pour le worker du couloir voisin (ex : production au cloud, jugement au local).
const TYPES = process.argv.find((a) => a.startsWith('--types='))?.split('=')[1]?.split(',').filter(Boolean) ?? null;
// --chat : lit la file DÉDIÉE du secrétaire (ops_chat) au lieu de la file des agents. Chacun chez
// soi : plus de ping-pong entre le démon du chat et les lots AKASHA (défaut des couloirs --types).
const CHAT = process.argv.includes('--chat');
const RPC = CHAT
  ? { read: 'ops_chat_read', archive: 'ops_chat_archive' }
  : { read: 'ops_queue_read', archive: 'ops_queue_archive' };

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
      // 2500 caractères suffisent : les attributs (village, clan, équipage…) sont dans
      // l'introduction et l'infobox. Diviser le contexte par deux réduit d'autant le
      // temps d'évaluation du prompt — le poste le plus cher de cette tâche.
      const page = await fetchFandomProse(p.universe, p.name);
      return page ? { ...p, fandom: page.text.slice(0, 2500), fandomTitle: page.title, fandomUrl: page.url, sameEntity: page.sameEntity } : p;
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
2. Recopie cette phrase dans "<attribut>_preuve" — 20 mots maximum, coupe si besoin.
3. Renseigne alors l'attribut.
Si aucune phrase de l'article ne l'établit POUR ${p.name} : réponds "inconnu" et mets "aucune" en preuve.

PIÈGE À ÉVITER : un terme peut revenir souvent dans l'article sans concerner ${p.name}
(l'entourage, les adversaires, l'univers en général). Seule une phrase parlant de ${p.name}
compte comme preuve. Ne déduis jamais rien de son nom.

ARTICLE DU WIKI (${p.fandomTitle}) :
${p.fandom}`,
  },

  // RELECTEUR LOCAL : juge une production d'agent avant la review humaine.
  // Deux précautions contre l'auto-confirmation : (1) le juge n'est PAS l'expert qui a produit
  // (persona « vérificateur » sur le modèle générique), (2) il doit citer la phrase de la source
  // qui fonde son verdict — un verdict sans citation vérifiable ne vaut rien.
  review_local: {
    model: 'ollama/gemma4:12b',
    schema: {
      type: 'object',
      properties: {
        verdict: { type: 'string', enum: ['valide', 'a_corriger', 'rejeter'] },
        motif: { type: 'string' },
        citation: { type: 'string' },
      },
      required: ['verdict', 'motif', 'citation'],
      additionalProperties: false,
    },
    zod: z.object({ verdict: z.enum(['valide', 'a_corriger', 'rejeter']), motif: z.string(), citation: z.string() }),
    guard: (p) => ((p.source ?? '').length >= 200 ? null : 'source de vérification absente'),
    prompt: (p) => `Tu es vérificateur pour l'encyclopédie AKASHA. Tu ne rédiges rien : tu CONTRÔLES.

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

"motif" : une phrase précise (le problème exact, ou pourquoi c'est juste).
"citation" : recopie la phrase EXACTE de la source qui fonde ton verdict. Si tu n'en trouves aucune,
écris "aucune" — et dans ce cas le verdict ne peut pas être "valide".`,
  },
};

// L'HISTOIRE derrière les axes : qui a compté pour qui, et quand. Demandé par Dan le 26/07
// (cas Law : « capitaine du Heart » ne dit rien de son passé chez Don Quichotte ni de sa vengeance).
// La nature est contrainte par enum, chaque relation exige sa preuve — mêmes remèdes que les axes.
const NATURES = ['famille', 'mentor', 'élève', 'allié', 'ennemi', 'rival',
  'ancien équipage', 'équipage actuel', 'subordonné', 'supérieur', 'autre'];

TASK_TYPES.akasha_relations = {
  model: (p) => expertFor(p.universe),
  schema: {
    type: 'object',
    properties: {
      relations: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          properties: {
            avec: { type: 'string' },
            nature: { type: 'string', enum: NATURES },
            periode: { type: 'string', enum: ['passé', 'actuel', 'inconnu'] },
            resume: { type: 'string' },
            preuve: { type: 'string' },
          },
          required: ['avec', 'nature', 'periode', 'resume', 'preuve'],
          additionalProperties: false,
        },
      },
    },
    required: ['relations'],
    additionalProperties: false,
  },
  zod: z.object({
    relations: z.array(z.object({
      // min(1), pas min(2) : « L » (Death Note) est un nom légitime d'une seule lettre (constaté 26/07).
      avec: z.string().min(1), nature: z.string(), periode: z.string(),
      resume: z.string().min(15), preuve: z.string(),
    })).max(6),
  }),
  // L'histoire d'un personnage vit dans le corps de l'article : on prend plus large que les axes.
  fetch: async (p) => {
    const page = await fetchFandomProse(p.universe, p.name, { maxChars: 6000 });
    return page ? { ...p, fandom: page.text, fandomTitle: page.title, fandomUrl: page.url, sameEntity: page.sameEntity } : p;
  },
  guard: (p) => TASK_TYPES.fandom_descfr.guard(p),
  prompt: (p) => `À partir de l'article ci-dessous, dresse les relations MAJEURES de ${p.name} (${p.universe})
avec d'autres personnages nommés.

RÈGLES :
- 3 à 6 relations, les plus structurantes de son histoire (famille, mentor, ennemi juré, équipage…).
- "avec" : le NOM du personnage lié, tel qu'écrit dans l'article. Jamais ${p.name} lui-même.
- "nature" : la catégorie la plus juste. « ancien équipage » = il en a fait partie puis l'a quitté.
- "periode" : « passé » si la relation appartient à son histoire, « actuel » si elle tient toujours.
- "resume" : 1 à 2 phrases EN FRANÇAIS qui racontent la relation — faits de l'article uniquement,
  présent de narration, aucun anglicisme.
- "preuve" : recopie la phrase EXACTE de l'article (anglais) qui établit cette relation — 25 mots max.
- N'invente RIEN : une relation absente de l'article n'existe pas. Moins de relations mais sûres.

FICHE : ${p.name}
ARTICLE DU WIKI (${p.fandomTitle}) :
${p.fandom}`,
};

/** Cohérence relation ↔ preuve, en code : la preuve doit nommer le personnage lié. */
function checkRelations(out, p) {
  const norm = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const suspects = [];
  for (const r of out.relations ?? []) {
    const mots = norm(r.avec).split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
    if (norm(r.avec) === norm(p.name)) { suspects.push(`relation de ${r.avec} avec lui-même`); continue; }
    // « avec » doit être un NOM PROPRE : le 26/07, Jotaro s'est vu attribuer une relation avec
    // « his mother » — la preuve contenait bien « mother », donc le contrôle passait. Une périphrase
    // n'est pas une entité : elle ne peut ni se relier à une fiche, ni s'afficher dans un graphe.
    if (!/[A-ZÀ-Þ]/.test(r.avec.replace(/^(the|his|her|their|le|la|les|son|sa|ses)\s+/i, ''))) {
      suspects.push(`« ${r.avec} » n'est pas un nom propre`); continue;
    }
    if (!r.preuve || norm(r.preuve) === 'aucune') { suspects.push(`« ${r.avec} » sans preuve`); continue; }
    if (mots.length && !mots.some((w) => norm(r.preuve).includes(w)))
      suspects.push(`la preuve ne nomme pas « ${r.avec} »`);
  }
  return suspects;
}

// Les RÔLES par univers (Archiviste des techniques, Conservateur des artefacts, Cartographe,
// Lexicographe) : une seule fabrique — le rôle change l'ANGLE du prompt, jamais le modèle
// (nouvel expert = bascule GPU de 147 s ; nouvel angle = gratuit). Voir scripts/lib/akasha-roles.mjs.
function ficheRole(roleKey) {
  return {
    model: (p) => expertFor(p.universe),
    zod: z.object({ descFr: z.string().min(60) }),
    schema: {
      type: 'object',
      properties: { descFr: { type: 'string' } },
      required: ['descFr'],
      additionalProperties: false,
    },
    fetch: async (p) => {
      const page = await fetchFandomProse(p.universe, p.name);
      return page ? { ...p, fandom: page.text, fandomTitle: page.title, fandomUrl: page.url, sameEntity: page.sameEntity } : p;
    },
    guard: (p) => TASK_TYPES.fandom_descfr.guard(p),
    prompt: (p) => `Tu rédiges les fiches françaises de l'encyclopédie AKASHA (univers d'animes/mangas).
Voici l'article du wiki canon (en anglais, brut). Rédige "descFr" : 2 à 4 phrases en français,
ton encyclopédique sobre, présent de narration.

Le sujet est ${angleFor(roleKey, p.universe)}.

RÈGLES :
- N'utilise QUE des faits présents dans l'article ci-dessous. Aucune invention, aucun anglicisme.
- Si l'article ne donne pas une information (rang, créateur…), n'en parle simplement pas.
- Ne liste pas tout : retiens ce qui distingue ce sujet dans son univers.

FICHE : ${p.name} — univers ${p.universe}
${p.summary ? `RÉSUMÉ DÉJÀ CONNU (à compléter, pas à répéter) : ${p.summary}` : ''}

ARTICLE DU WIKI (${p.fandomTitle}) :
${p.fandom}`,
  };
}
for (const roleKey of Object.keys(ROLES)) TASK_TYPES[roleKey] = ficheRole(roleKey);

// SECRÉTAIRE WHATSAPP (L5, agent n°16) : répond aux messages de Dan déposés par le webhook.
// Étage de garde = Groq (~1 s) ; ce qui touche au code/au site est mis en note d'escalade
// pour Claude — le secrétaire le DIT à Dan au lieu de promettre ce qu'il ne fera pas.
// Dan choisit son interlocuteur en préfixant : « claude: … », « gemini: … », « groq: … ».
// Sans préfixe → Groq. Chaque réponse est SIGNÉE par le modèle qui parle (demande Dan 27/07).
// NB : le démon secrétaire tourne sans --cloud, sinon le flag écraserait ce routage (modelOf).
const SIGNATURES_WHATSAPP = { claude: '🤖 Claude', gemini: '✨ Gemini', groq: '⚡ Groq' };
// Adressage EN DÉBUT de message, salutation tolérée (« Salut Claude, … ») — un nom cité au
// milieu (« vérifie la dispo de Claude ») ne route pas : c'est un message SUR lui, pas POUR lui.
// Le champ interlocuteur du schéma couvre les formulations libres (« demande à Claude de… »).
function cibleWhatsApp(texte) {
  const m = /^\s*(?:salut|hey|bonjour|coucou|yo)?[\s,]*(claude|gemini|groq)\b[\s:,!—?-]*/i.exec(texte ?? '');
  return m ? { cible: m[1].toLowerCase(), texte: (texte ?? '').slice(m[0].length) || (texte ?? '') } : { cible: 'groq', texte: texte ?? '' };
}
TASK_TYPES.whatsapp_reponse = {
  model: (p) => cibleWhatsApp(p.texte).cible === 'gemini' ? 'gemini/gemini-flash-lite-latest' : 'groq/openai/gpt-oss-120b',
  // Schéma PLAT : le mode strict (Groq/OpenAI) exige que chaque propriété soit requise —
  // les optionnels imbriqués sont refusés (HTTP 400 constaté le 27/07). « aucun »/0 = neutre.
  zod: z.object({
    reponse: z.string().min(1),
    interlocuteur: z.enum(['secretaire', 'claude', 'gemini']),
    escalade: z.boolean(),
    commande_action: z.enum(['rien', 'etat', 'lot']),
    commande_role: z.enum(['aucun', 'attrs', 'relations', 'bios', 'technique', 'artefact', 'lieu', 'lexique']),
    commande_quantite: z.number().int(),
  }),
  schema: {
    type: 'object',
    properties: {
      reponse: { type: 'string' },
      interlocuteur: { type: 'string', enum: ['secretaire', 'claude', 'gemini'] },
      escalade: { type: 'boolean' },
      commande_action: { type: 'string', enum: ['rien', 'etat', 'lot'] },
      commande_role: { type: 'string', enum: ['aucun', 'attrs', 'relations', 'bios', 'technique', 'artefact', 'lieu', 'lexique'] },
      commande_quantite: { type: 'integer' },
    },
    required: ['reponse', 'interlocuteur', 'escalade', 'commande_action', 'commande_role', 'commande_quantite'],
    additionalProperties: false,
  },
  guard: (p) => ((p.texte ?? '').trim() ? null : 'message vide'),
  prompt: (p) => `Tu es ${cibleWhatsApp(p.texte).cible === 'gemini' ? 'Gemini, un des modèles' : 'le secrétaire (modèle Groq)'} de NIKA OPS, l'usine d'agents du projet NIKA
(super-app Côte d'Azur de Dan). Tu réponds à Dan, ton seul interlocuteur.

RÈGLES :
- Réponds en français, style WhatsApp : bref, direct, utile. Pas de pavés.
- Si c'est une NOTE ou une idée à retenir : accuse réception en une phrase, elle est archivée.
- Si Dan demande une modification du code/du site/des agents : mets "escalade" à true et dis-lui
  que c'est transmis à Claude (qui traite en lot depuis la console) — ne promets JAMAIS de le
  faire toi-même.
- Pour une question générale : réponds directement, honnêtement, sans inventer.
- INTERLOCUTEUR — à QUI Dan s'adresse-t-il ? S'il nomme Claude en s'adressant à lui
  (« Salut Claude… », « Claude peux-tu… », « demande à Claude de… », « dis à Claude… »),
  mets interlocuteur = "claude" — un autre système transmettra à Claude, ne réponds pas à sa
  place. Idem "gemini" si Dan s'adresse à Gemini. Sinon "secretaire" (toi). Citer un nom en
  PARLANT DE lui (« Claude est-il dispo ? ») reste "secretaire" — mais réponds alors avec les
  faits : Claude et Gemini sont joignables ici même en les nommant en début de message.
- COMMANDES D'AGENTS — si Dan demande l'état de l'usine (« état ? », « où en est la file ? »),
  mets commande_action = "etat". S'il demande de lancer un lot (« lance 10 fiches techniques »,
  « traite 5 relations »), mets commande_action = "lot", commande_role parmi
  [attrs, relations, bios, technique, artefact, lieu, lexique] et commande_quantite (1 à 30).
  Sinon commande_action = "rien", commande_role = "aucun", commande_quantite = 0.
  Ne déclenche JAMAIS un lot si la demande est ambiguë ou adressée à Claude — dans le doute, "rien".
  Dans "reponse", confirme ce que tu déclenches, sobrement.

MESSAGE DE DAN :
${cibleWhatsApp(p.texte).texte}`,
};

/** Envoi d'une réponse WhatsApp (API Cloud, texte libre — la fenêtre est ouverte par le message reçu). */
async function envoyerWhatsApp(texte, vers) {
  const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: vers, type: 'text', text: { body: texte } }),
  });
  if (!r.ok) throw new Error(`WhatsApp HTTP ${r.status}: ${(await r.text()).slice(0, 150)}`);
}

/** Commandes d'agents pilotables depuis WhatsApp — LISTE BLANCHE stricte : le modèle propose
 * une action typée, seul ce tableau décide de ce qui s'exécute, avec des arguments FIXES. */
const COMMANDES_LOT = {
  attrs: ['scripts/ops-fill-attrs.mjs'],
  relations: ['scripts/ops-fill-relations.mjs'],
  bios: ['scripts/ops-fill-fandom.mjs'],
  technique: ['scripts/ops-fill-fiches.mjs', '--role=fiche_technique'],
  artefact: ['scripts/ops-fill-fiches.mjs', '--role=fiche_artefact'],
  lieu: ['scripts/ops-fill-fiches.mjs', '--role=fiche_lieu'],
  lexique: ['scripts/ops-fill-fiches.mjs', '--role=fiche_lexique'],
};

async function executerCommande(cmd) {
  const { execFile } = await import('node:child_process');
  const run = (args) => new Promise((res) => execFile('node', ['--env-file=.env.local', ...args],
    { cwd: process.cwd(), timeout: 120_000 }, (e, out, err) => res((out + err).trim().split('\n').slice(-3).join('\n'))));

  if (cmd.action === 'etat') {
    const { data: m } = await supabase.rpc('ops_queue_metrics');
    const { data: r } = await supabase.from('agent_results').select('status, auto_applique, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString()).neq('task_type', 'review_local');
    const faits = r?.filter((x) => ['done', 'suspect'].includes(x.status)).length ?? 0;
    const autos = r?.filter((x) => x.auto_applique).length ?? 0;
    const attente = r?.filter((x) => x.status === 'done').length ?? 0;
    return `📊 File : ${m?.[0]?.queue_length ?? '?'} en attente · 24 h : ${faits} production(s), ⚡${autos} auto-appliquée(s), ${faits - autos} pour ta review (localhost:3000/ops)`;
  }
  if (cmd.action === 'lot') {
    const args = COMMANDES_LOT[cmd.role];
    if (!args) return `Rôle inconnu : ${cmd.role ?? '—'}. Rôles : ${Object.keys(COMMANDES_LOT).join(', ')}.`;
    const n = Math.max(1, Math.min(30, cmd.quantite ?? 10));
    const sortie = await run([...args, `--limit=${n}`]);
    // Drain immédiat, détaché : production Groq + juge Gemini, comme la nuit.
    const { spawn } = await import('node:child_process');
    spawn('node', ['--env-file=.env.local', 'scripts/agent-worker.mjs',
      '--cloud=groq/openai/gpt-oss-120b', '--juge=gemini/gemini-flash-lite-latest', '--conc=3'],
      { cwd: process.cwd(), detached: true, stdio: 'ignore' }).unref();
    return `🚀 Lot lancé (${cmd.role}, ${n} max) :\n${sortie}\nLe traitement tourne — les doubles-valides s'appliqueront seuls, le reste ira dans ta review.`;
  }
  return null;
}

/* ── Appel modèle (JSON contraint par schéma) ───────────────────── */
// Modèles locaux : Ollama NATIF (param `format` = décodage contraint fiable).
// OmniRoute fige indéfiniment sur `response_format` (constaté le 25/07) → réservé aux futurs modèles cloud.
// Budget de génération par type : inutile d'autoriser 1200 tokens à une tâche qui en produit 150.
const NUM_PREDICT = { akasha_attrs: 700, fandom_descfr: 500, flavor_akasha: 300, review_local: 400, akasha_relations: 900, fiche_technique: 400, fiche_artefact: 400, fiche_lieu: 400, fiche_lexique: 400, whatsapp_reponse: 500 };
const TIMEOUT_MS = 420_000;  // articles longs (Zoro) + preuves : 240 s ne suffisait pas

const modelOf = (type, p) => {
  if (type === 'review_local' && p?.juge_modele) return p.juge_modele;  // double verdict : juge porté par la tâche
  if (JUGE && type === 'review_local') return JUGE;     // repli : juge dédié (cloud ou local)
  if (CLOUD && type !== 'review_local') return CLOUD;   // production au cloud
  const t = TASK_TYPES[type];
  return typeof t.model === 'function' ? t.model(p) : t.model;
};
const schemaOf = (t, p) => (typeof t.schema === 'function' ? t.schema(p) : t.schema);

/** Appel OpenAI-compatible (Groq, Cerebras, OmniRoute…) — backoff 429 au délai annoncé. */
async function appelOpenAICompat({ url, cle, modele, messages, type, schema }) {
  for (let essai = 1; ; essai++) {
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // +900 de marge : les modèles « à raisonnement » (gpt-oss) brûlent des tokens AVANT le JSON.
        model: modele, stream: false, messages,
        max_tokens: (NUM_PREDICT[type] ?? 800) + 900,
        response_format: { type: 'json_schema', json_schema: { name: type, strict: true, schema } },
      }),
    });
    if (res.status === 429 && essai < 4) {
      const corps = await res.text();
      const attente = Number(corps.match(/try again in (\d+(?:\.\d+)?)s/i)?.[1] ?? res.headers.get('retry-after') ?? 20);
      console.log(`  ⏳ 429 (${new URL(url).host}) — pause ${Math.ceil(attente + 1)} s (essai ${essai})`);
      await new Promise((r) => setTimeout(r, (attente + 1) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} (${new URL(url).host}): ${(await res.text()).slice(0, 200)}`);
    return (await res.json()).choices?.[0]?.message?.content ?? '';
  }
}

async function callModel(type, payload) {
  const t = TASK_TYPES[type];
  const model = modelOf(type, payload);
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
        format: schema, options: { temperature: 0, num_predict: NUM_PREDICT[type] ?? 800, num_ctx: 8192 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    raw = (await res.json()).message?.content ?? '';
  } else if (model.startsWith('cerebras/')) {
    // Cerebras NATIF : absent du catalogue OmniRoute. Palier gratuit supprimé (26/07) — branche
    // dormante, réactivable si Dan crédite le compte.
    if (!process.env.CEREBRAS_API_KEY) throw new Error('CEREBRAS_API_KEY absent de .env.local');
    raw = await appelOpenAICompat({
      url: 'https://api.cerebras.ai/v1/chat/completions', cle: process.env.CEREBRAS_API_KEY,
      modele: model.slice(9), messages, type, schema,
    });
  } else if (model.startsWith('groq/') && process.env.GROQ_API_KEY) {
    // Groq NATIF dès que la clé est dans .env.local : OmniRoute sort du chemin de production
    // (bilan du 26/07 : gel sur response_format, serveur périmé aveugle aux clés, préfixes volés
    // par des alias — 3 pannes réelles pour un proxy d'un seul fournisseur).
    raw = await appelOpenAICompat({
      url: 'https://api.groq.com/openai/v1/chat/completions', cle: process.env.GROQ_API_KEY,
      modele: model.slice(5), messages, type, schema,
    });
  } else if (model.startsWith('gemini/')) {
    // Gemini NATIF (pas OmniRoute) : son adaptateur passe par l'endpoint compatible OpenAI qui
    // refuse les clés nouveau format « AQ.… » (constaté le 26/07). L'endpoint officiel les accepte
    // ET offre responseSchema — le décodage contraint natif, comme `format` chez Ollama.
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY absent de .env.local');
    const { additionalProperties, ...gSchema } = schema;   // champ inconnu de l'API Gemini
    // Palier gratuit très serré (5 req/min sur gemini-flash-latest, mesuré le 26/07) : sans backoff,
    // un lot de 9 perd 5 tâches d'un coup. Gemini annonce son délai dans error.details[].retryDelay.
    for (let essai = 1; ; essai++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.slice(7)}:generateContent`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: t.prompt(payload) }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: (NUM_PREDICT[type] ?? 800) + 900,
              responseMimeType: 'application/json',
              responseSchema: gSchema,
            },
          }),
        },
      );
      if (res.status === 429 && essai < 5) {
        const corps = await res.text();
        const attente = Number(corps.match(/"retryDelay":\s*"(\d+)s"/)?.[1] ?? 12);
        console.log(`  ⏳ 429 (gemini) — pause ${attente + 1} s (essai ${essai})`);
        await new Promise((r) => setTimeout(r, (attente + 1) * 1000));
        continue;
      }
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      raw = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      break;
    }
  } else {
    // Tout le reste passe par OmniRoute (proxy local) — chemin de repli, plus le chemin nominal.
    raw = await appelOpenAICompat({
      url: `${OMNI_URL}/chat/completions`, cle: OMNI_KEY, modele: model, messages, type, schema,
    });
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
      const suspects = type === 'akasha_attrs' ? checkPreuves(out)
        : type === 'akasha_relations' ? checkRelations(out, p) : [];
      return {
        ...base,
        status: suspects.length ? 'suspect' : 'done',
        model: modelOf(type, p),
        result: out,
        error: suspects.length ? suspects.join(' · ') : null,
      };
    } catch (e) {
      if (attempt >= 2) return { ...base, status: 'failed', model: modelOf(type, p), error: String(e).slice(0, 300) };
    }
  }
}

/* ── Enchaînement production → relecture locale ──────────────────── */
// Mesuré le 25/07 : le juge local détecte 7/7 des erreurs factuelles sans faux positif.
// Il n'applique rien — il annote, pour que la file humaine arrive déjà triée.
async function chainReview(row, reviewedId) {
  const p = row.payload ?? {};
  let production;
  if (row.task_type === 'akasha_attrs') {
    const { valeurs, preuves } = splitPreuves(row.result);
    const etablis = Object.entries(valeurs).filter(([, v]) => v && v !== 'inconnu');
    if (!etablis.length) return;                     // abstention : rien à juger (le code tranche)
    production = etablis.map(([k, v]) => `${k} = ${v}  (preuve avancée : « ${preuves[k] ?? 'aucune'} »)`).join('\n');
  } else if (row.task_type === 'akasha_relations') {
    const rel = row.result?.relations ?? [];
    if (!rel.length) return;                         // abstention honnête : rien à juger
    production = rel.map((r) => `${r.avec} (${r.nature}, ${r.periode}) : ${r.resume}  (preuve avancée : « ${r.preuve} »)`).join('\n');
  } else if (row.result?.descFr) {
    production = row.result.descFr;
  } else return;

  const page = await fetchFandomProse(p.universe, p.name).catch(() => null);
  if (!page?.text) return;                           // pas de source vérifiable → pas de jugement

  // AUTONOMIE L12 (audit du 26/07 : un juge seul = 86 % de précision, insuffisant) :
  // chaque production part chez DEUX juges de familles différentes. L'accord des deux
  // autorise l'application automatique ; tout désaccord reste pour Dan.
  const juges = [
    { juge_modele: 'ollama/gemma4:12b', slot: 'auto' },
    ...(process.env.GEMINI_API_KEY ? [{ juge_modele: 'gemini/gemini-flash-lite-latest', slot: 'auto2' }] : []),
  ];
  await supabase.rpc('ops_queue_send_batch', {
    messages: juges.map((j) => ({
      type: 'review_local',
      payload: {
        reviewed_id: reviewedId, slug: row.target_slug, name: p.name, universe: p.universe,
        production, source: page.text.slice(0, 4500), ...j,
      },
    })),
  });
}

/* ── Application automatique (double verdict) ───────────────────── */
// MIROIR de applyResult (app/api/ops/state/route.ts) — si tu changes une règle là-bas,
// reporte-la ici. Les remplisseurs ne ciblent que des champs vides → l'annulation reste exacte.
async function autoAppliquer(rowId) {
  // Verrou optimiste : un seul gagnant si les deux relectures finissent en même temps.
  const { data: gagne } = await supabase
    .from('agent_results')
    .update({ review_status: 'approved', auto_applique: true, reviewed_at: new Date().toISOString() })
    .eq('id', rowId).eq('review_status', 'pending')
    .eq('auto_verdict', 'valide').eq('auto2_verdict', 'valide').eq('status', 'done')
    .select('*').single();
  if (!gagne) return false;

  const { data: entry } = await supabase.from('akasha_entries').select('attributes').eq('slug', gagne.target_slug).single();
  if (!entry) return false;
  const patch = { ...(entry.attributes ?? {}) };
  const DESCFR = ['fandom_descfr', 'flavor_akasha', 'fiche_technique', 'fiche_artefact', 'fiche_lieu', 'fiche_lexique'];
  if (DESCFR.includes(gagne.task_type)) {
    patch.descFr = gagne.result?.descFr;
    patch.descFrSource = gagne.model;
  } else if (gagne.task_type === 'akasha_attrs') {
    for (const [k, v] of Object.entries(gagne.result ?? {}))
      if (v && v !== 'inconnu' && !k.endsWith('_preuve')) patch[k] = v;
  } else if (gagne.task_type === 'akasha_relations') {
    const rel = gagne.result?.relations ?? [];
    if (!rel.length) return false;
    patch.relations = rel.map(({ avec, nature, periode, resume }) => ({ avec, nature, periode, resume }));
    patch.relationsSource = gagne.model;
  } else return false;
  await supabase.from('akasha_entries').update({ attributes: patch }).eq('slug', gagne.target_slug);
  console.log(`  ⚡ auto-appliquée (double valide) : ${gagne.target_slug}`);
  return true;
}

/* ── Boucle principale ──────────────────────────────────────────── */
// Concurrence : le goulot n'est pas le calcul mais l'ATTENTE (le worker restait inactif
// pendant que le modèle générait). On traite plusieurs tâches de front — mais uniquement
// AU SEIN D'UN MÊME MODÈLE : deux modèles chargés en même temps feraient exploser les
// 16 Go de la machine. En cloud (un endpoint qui encaisse 20 requêtes), monter CONC suffit.
async function traiterEnParallele(msgs, conc) {
  let i = 0;
  const suivant = async () => {
    while (i < msgs.length) {
      const msg = msgs[i++];
      await traiterUn(msg);
    }
  };
  await Promise.all(Array.from({ length: Math.min(conc, msgs.length) }, suivant));
}

async function traiterUn(msg) {
  const row = await processMessage(msg);
  counts[row.status]++;

  if (row.task_type === 'review_local') {
    // Le verdict ne crée pas de résultat : il annote la production relue, dans le slot de SON juge.
    const slot = row.payload.slot === 'auto2' ? 'auto2' : 'auto';
    await supabase
      .from('agent_results')
      .update({
        [slot + '_verdict']: row.status === 'done' ? row.result.verdict : null,
        [slot + '_motif']: row.status === 'done' ? `${row.result.motif} — « ${String(row.result.citation).slice(0, 220)} »` : row.error,
        [slot + '_model']: row.model,
        [slot + '_at']: new Date().toISOString(),
      })
      .eq('id', row.payload.reviewed_id);
    // Porte d'autonomie : les DEUX juges disent « valide » → application sans Dan, marquée auto.
    if (row.status === 'done' && row.result.verdict === 'valide') await autoAppliquer(row.payload.reviewed_id);
  } else {
    if (row.task_type === 'whatsapp_reponse') row.review_status = 'approved';   // conversationnel : rien à relire
    const { data: ins, error: insErr } = await supabase.from('agent_results').insert(row).select('id').single();
    if (insErr) { console.error('agent_results:', insErr.message); return; }
    if (row.task_type === 'whatsapp_reponse' && row.status === 'done') {
      // Le secrétaire répond à Dan, et garde trace : chaque échange va dans ops_notes
      // (source whatsapp) — c'est le carnet du L5, relu par l'orchestrateur plus tard.
      // Deux routes vers un interlocuteur : le préfixe (regex) ET le verdict sémantique de Groq
      // (« Salut Claude… », « demande à Claude de… » — vécu le 27/07 : Dan parle naturellement).
      const { cible: cibleRegex, texte: texteSans } = cibleWhatsApp(row.payload.texte);
      const cible = cibleRegex !== 'groq' ? cibleRegex
        : row.result.interlocuteur === 'claude' ? 'claude' : 'groq';
      let reponse = row.result.reponse;
      let signature = SIGNATURES_WHATSAPP[cible === 'claude' ? 'groq' : cible];
      if (cible === 'claude' && !row.result.escalade && row.result.commande_action === 'rien') {
        // Discussion directe avec Claude (abonnement, une réponse ponctuelle — le code passe
        // toujours par l'escalade). Groq reste l'étage de garde : c'est lui qui a classé.
        try {
          // spawn + stdin FERMÉ : claude -p attend l'EOF d'un tube resté ouvert (execFile ne
          // sait pas fermer stdin — « Warning: no stdin data received » puis échec sous launchd).
          const { spawn } = await import('node:child_process');
          reponse = await new Promise((res, rej) => {
            const ch = spawn('claude', [
              '-p', `Tu es Claude, l'ingénieur de l'usine NIKA OPS (projet NIKA, super-app Côte d'Azur de Dan).
Dan te parle sur WhatsApp. Réponds en français, bref et direct (style WhatsApp, pas de pavés).

MESSAGE DE DAN :
${texteSans}`,
              '--output-format', 'text',
            ], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], env: (() => {
              // Le CLI préfère ANTHROPIC_API_KEY (compte API, crédits à sec) au token d'abonnement
              // CLAUDE_CODE_OAUTH_TOKEN — on la retire de SON env (« Credit balance is too low », 27/07).
              const env = { ...process.env }; delete env.ANTHROPIC_API_KEY; return env;
            })() });
            let out = '', err = '';
            ch.stdout.on('data', (d) => { out += d; });
            ch.stderr.on('data', (d) => { err += d; });
            const t = setTimeout(() => { ch.kill(); rej(new Error('timeout 150 s')); }, 150_000);
            ch.on('close', (code) => { clearTimeout(t); code === 0 ? res(out.trim()) : rej(new Error(`exit ${code} ||stdout: ${out.slice(0, 200)} ||stderr: ${err.slice(0, 200)}`)); });
            ch.on('error', (e) => { clearTimeout(t); rej(e); });
          });
          signature = SIGNATURES_WHATSAPP.claude;
        } catch (e) {
          console.error('  ✗ claude -p (discussion) :', String(e).slice(0, 200));
          reponse = `${row.result.reponse}\n(Claude injoignable à l'instant — réponse du secrétaire.)`;
        }
      }
      try { await envoyerWhatsApp(`${signature} — ${reponse}`, row.payload.de); } catch (e) { console.error('  ✗ réponse WhatsApp :', String(e).slice(0, 120)); }
      // Dan vient d'écrire → la fenêtre de 24 h est rouverte : livrer ce qui attendait au parc.
      try { console.log(`  📬 parc livré : ${await viderParc()} message(s)`); }
      catch (e) { console.error('  ✗ viderParc :', String(e).slice(0, 200)); }
      await supabase.from('ops_notes').insert({
        source: 'whatsapp',
        content: JSON.stringify({ de_dan: row.payload.texte, reponse, par: signature, escalade: row.result.escalade, a: row.payload.recu_a }),
      });
      if (row.result.escalade) {
        console.log('  ⚑ escalade Claude notée :', row.payload.texte.slice(0, 60));
        const { spawn } = await import('node:child_process');
        // Journal obligatoire : un échec d'escalade sans trace est indiagnosticable (vécu le 27/07).
        const { openSync } = await import('node:fs');
        const fdEsc = openSync('/tmp/nika-escalades.log', 'a');
        spawn('node', ['--env-file=.env.local', 'scripts/ops-escalades.mjs'],
          { cwd: process.cwd(), detached: true, stdio: ['ignore', fdEsc, fdEsc] }).unref();
      }
      if (row.result.commande_action && row.result.commande_action !== 'rien') {
        try {
          const resultat = await executerCommande({
            action: row.result.commande_action,
            role: row.result.commande_role === 'aucun' ? undefined : row.result.commande_role,
            quantite: row.result.commande_quantite || undefined,
          });
          if (resultat) await envoyerWhatsApp(`🏭 Usine — ${resultat}`, row.payload.de);
        } catch (e) { console.error('  ✗ commande :', String(e).slice(0, 120)); }
      }
    }
    // Enchaînement : toute production jugeable part aussitôt en relecture locale.
    if (ins?.id && (row.status === 'done' || row.status === 'suspect') && row.task_type !== 'whatsapp_reponse') await chainReview(row, ins.id);
  }
  await supabase.rpc(RPC.archive, { message_id: msg.msg_id });
  console.log(`  ${row.status === 'done' ? '✓' : row.status === 'refused' ? '◇' : '✗'} [${msg.msg_id}] ${row.target_slug ?? row.task_type} (${row.status})`);
}

const counts = { done: 0, refused: 0, failed: 0, suspect: 0 };
console.log(`⚙️  worker NIKA OPS — mode ${LOOP ? 'continu' : 'drain'} · ${CONC} tâche(s) de front`);
for (;;) {
  const { data: lot, error } = await supabase.rpc(RPC.read, { vt: VT, qty: LOT });
  if (error) { console.error('lecture file:', error.message); process.exit(1); }
  if (!lot?.length) {
    if (!LOOP) break;
    await new Promise((r) => setTimeout(r, 30_000));
    continue;
  }

  // Tri de couloir : on rend les tâches des autres avant de travailler les nôtres.
  let miens = lot;
  if (TYPES) {
    const etrangers = lot.filter((m) => !TYPES.includes(m.message?.type));
    if (etrangers.length) {
      await supabase.rpc('ops_queue_send_batch', { messages: etrangers.map((m) => m.message) });
      for (const m of etrangers) await supabase.rpc('ops_queue_archive', { message_id: m.msg_id });
      console.log(`  ↷ ${etrangers.length} tâche(s) hors couloir remises en file`);
    }
    miens = lot.filter((m) => TYPES.includes(m.message?.type));
    if (!miens.length) {
      if (!LOOP) break;                                  // drain : plus rien pour ce couloir
      await new Promise((r) => setTimeout(r, 30_000));   // continu : on laisse le voisin les prendre
      continue;
    }
  }

  // Groupes par modèle : on épuise un modèle avant de passer au suivant (un changement
  // coûtait 147 s de médiane), et on parallélise à l'intérieur de chaque groupe.
  const groupes = new Map();
  for (const msg of miens) {
    const t = TASK_TYPES[msg.message?.type];
    const cle = t ? String(modelOf(msg.message.type, msg.message.payload ?? {})) : 'inconnu';
    (groupes.get(cle) ?? groupes.set(cle, []).get(cle)).push(msg);
  }
  for (const [modele, msgs] of groupes) {
    console.log(`  → ${msgs.length} tâche(s) sur ${modele}`);
    await traiterEnParallele(msgs, CONC);
  }
}
// Libère la RAM en partant : un modèle en keep_alive squatte 8 Go pendant que Dan compile et
// navigue — le swap plein (11/12 Go mesurés le 26/07) venait en partie de là.
try {
  const ps = await fetch('http://localhost:11434/api/ps').then((r) => r.json());
  for (const m of ps.models ?? []) {
    await fetch('http://localhost:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: m.name, keep_alive: 0 }) });
    console.log(`  ⏏ ${m.name} déchargé — RAM rendue`);
  }
} catch { /* Ollama éteint : rien à décharger */ }
console.log(`fini — done: ${counts.done} · suspect: ${counts.suspect} · refused: ${counts.refused} · failed: ${counts.failed}`);
