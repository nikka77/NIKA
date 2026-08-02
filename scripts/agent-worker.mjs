// scripts/agent-worker.mjs — worker local NIKA OPS (L1).
// Boucle : claim pgmq → garde → modèle local via OmniRoute (sortie contrainte) → agent_results → archive.
// Usage :  node --env-file=.env.local scripts/agent-worker.mjs           (vide la file puis s'arrête)
//          node --env-file=.env.local scripts/agent-worker.mjs --loop    (tourne en continu, pause 30 s à vide)
// Confort machine : préfixer par `taskpolicy -c background` — macOS déclasse le worker en priorité
// CPU/IO de fond et l'interface reste fluide pendant les gros lots.
// Les résultats ne touchent JAMAIS les tables réelles : ils attendent la review dans agent_results.
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { fetchFandomProse, citeLeNom } from './lib/fandom.mjs';
import { expertFor, axesSchema, AXES, checkPreuves, splitPreuves } from './lib/akasha-axes.mjs';
import { ROLES, angleFor } from './lib/akasha-roles.mjs';
import { nomExpert, memoireExpert, expertNiche } from './lib/akasha-experts.mjs';
import { viderParc } from './lib/whatsapp.mjs';
import { scoreAncrageProduction } from './lib/ancrage.mjs';
import { poserAuGraphe } from '../lib/akasha/relations.ts';
import { hostname } from 'node:os';

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
// --local : nœud GPU pur — il ne prend que les tâches confiées à un modèle local, et
// laisse le nuage au VPS. Sans cela un Mac juge dispute au VPS un budget partagé.
const LOCAL = process.argv.includes('--local');
// --force-jury=modeleA,modeleB : mode CAMPAGNE. Les relectures déjà en file portent le jury
// décidé à leur enrôlement ; quand on change de couloir en cours de route, elles restent
// collées à l'ancien. Ce drapeau les réattribue AU VOL, par emplacement — A pour le juge n°1,
// B pour le juge n°2. La correspondance par SLOT est ce qui rend la chose sûre : les deux
// juges d'une même fiche ne peuvent pas se retrouver sur le même modèle, donc pas de faux
// consensus. L'arbitre n'est jamais réattribué : il départage, il ne se substitue pas.
const FORCE_JURY = (process.argv.find((a) => a.startsWith('--force-jury='))?.split('=')[1] ?? '')
  .split(',').map((x) => x.trim()).filter(Boolean);
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
// VERROU 2 (audit du 01/08) : 104 fiches de la base finissent en plein mot — « …et sa réponse
// extérieure fut de » sur Naruto lui-même. Origine : un slice() brut dans les scripts de build,
// que la traduction recopiait fidèlement. Rien ne DÉTECTAIT une bio coupée avant écriture ; ce
// contrôle ferme la porte pour toute production future (plafond de tokens ou source mutilée).
const phraseComplete = (s) => /[.!?…»"”)\]]\s*$/.test(String(s).trim());
const DescFr = (min) => z.string().min(min)
  .refine(phraseComplete, 'descFr coupée en pleine phrase (plafond de tokens ou source tronquée)');
const FlavorOut = z.object({ descFr: DescFr(30) });

/** PREUVE D'IDENTITÉ PAR LES CHAMPS DE NOMMAGE (01/08) — déterministe, zéro appel de modèle.
 *
 *  Un wiki déclare les autres noms de son sujet dans son infobox : « True Name », « Alias »,
 *  « Also called », « Romanized Name ». Si un mot du nom cherché y figure ALORS QU'IL N'EST PAS
 *  dans le titre, c'est que l'article parle de la même entité sous un autre nom.
 *
 *  La condition « pas dans le titre » est ce qui rend la règle sûre. Sans elle, « Giorno's
 *  Mother » serait accepté sur l'article « Giorno Giovanna » (le mot « Giorno » y est partout)
 *  — or ce refus doit être maintenu, la mère n'est pas le fils. Avec elle il ne reste que
 *  « Mother », absent des champs de nommage : refus conservé.
 *
 *  Mesuré sur Death Note, où la moitié des refus venait de là :
 *    Halle Bullook / article « Halle Lidner »      → « Bullook » en alias      → même personne
 *    Mary Kenwood  / article « Wedy »              → « Kenwood » en True Name  → même personne
 *    Jealous       / article « Gelus »             → « Jealous » en Also called → même être
 *    Giorno's Mother / article « Giorno Giovanna » → rien hors titre           → REFUSÉ (juste)
 *
 *  La règle (citeLeNom) vit dans scripts/lib/fandom.mjs depuis le 02/08 : le tri des sections
 *  réhabilite EXACTEMENT ce que cette garde accepte — une seule définition de l'alias.
 */

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
    zod: z.object({ descFr: DescFr(80) }),
    schema: {
      type: 'object',
      properties: { descFr: { type: 'string' } },
      required: ['descFr'],
      additionalProperties: false,
    },
    // Étape « yeux » : le worker va chercher la matière AVANT tout appel au modèle.
    fetch: async (p) => {
      const page = await fetchFandomProse(p.universe, p.name);
      const niche = await expertNiche(supabase, p.universe, p.name);               // L19
      const memoire = await memoireExpert(supabase, 'fandom_descfr', p.universe, niche?.noms);   // L18
      return page ? { ...p, fandom: page.text, fandomTitle: page.title, fandomUrl: page.url, sameEntity: page.sameEntity, memoire, niche } : { ...p, memoire, niche };
    },
    // Trois gardes, apprises des 3 erreurs d'identité du 25/07 — RECALIBRÉES PAR TYPE le 01/08 :
    // elles avaient été taillées pour des personnages et refusaient à tort une entrée sur cinq
    // des autres types (audit des 4 verrous).
    guard: (p) => {
      // Seuil de matière : un article de jutsu fait 752 caractères de médiane contre 5 135 pour
      // un personnage. Refuser un article de 360 c privait l'expert d'une matière suffisante
      // pour 3 phrases — « Wind Release: Verdant Mountain Gale », « Exploding Sand Boulder »…
      const seuil = ['power', 'skill', 'artifact', 'profession'].includes(p.type) ? 250 : 400;
      if ((p.fandom ?? '').length < seuil) return 'page Fandom absente ou trop maigre';
      // 1) le titre trouvé désigne-t-il la même entité ? (Giorno's Mother → Giorno, Super 17 → Android 17)
      // ALIAS (01/08) : un article cite TOUJOURS les autres noms de son sujet. Si le texte
      // contient le nom cherché, c'est la même personne — même si les titres diffèrent. Mesuré
      // sur Death Note, dont la moitié des refus venait de là : le wiki titre au vrai nom
      // (Halle Lidner, Anthony Rester, Stephen Gevanni) quand notre registre porte le
      // pseudonyme SPK (Halle Bullook, Anthony Carter, Stephen Loud) — les trois articles
      // citent bien le pseudonyme. Et le contre-exemple tient : l'article « Giorno Giovanna »
      // ne contient PAS « Giorno's Mother », ce refus-là reste donc justifié.
      // Réservé aux noms d'au moins deux mots : un nom d'un seul mot ferait des rencontres
      // fortuites dans 5 000 caractères de prose.
      if (p.sameEntity === false && !citeLeNom(p.fandom, p.name, p.fandomTitle))
        return `mauvaise entité : article « ${p.fandomTitle} » pour « ${p.name} »`;
      // 2) homonyme ? (Ain/Egghead vs Ain/Neo Marines) : aucun nom propre du résumé dans l'article.
      // PERSONNAGES SEULEMENT : nos résumés sont en français et les articles en anglais, donc
      // « Troisième Hokage » ne rencontrera jamais « Third Hokage » ; et la page d'une technique
      // ne cite pas forcément ceux qui l'emploient. Sur les non-personnages, cette garde ne
      // détectait pas des homonymes : elle refusait 1 912 entrées Naruto au hasard de leur résumé.
      if (p.type === 'character') {
        const propres = [...new Set((p.summary ?? '').match(/(?<!^|[.!?]\s)\b[A-ZÀ-Þ][\wÀ-ÿ'-]{3,}/g) ?? [])];
        if (propres.length && !propres.some((n) => (p.fandom ?? '').toLowerCase().includes(n.toLowerCase().slice(0, 6))))
          return `homonyme probable : aucun repère du résumé (${propres.slice(0, 3).join(', ')}) dans « ${p.fandomTitle} »`;
      }
      return null;
    },
    prompt: (p) => `Tu es ${nomExpert('fandom_descfr', p.universe)}${p.niche ? `, et plus précisément « ${p.niche.nom} » (${p.niche.membres} entrées à ta charge)` : ''}, expert de l'encyclopédie AKASHA (univers d'animes/mangas).
Voici l'article du wiki canon (en anglais, brut). Rédige "descFr" : 3 à 5 phrases en français,
ton encyclopédique sobre, présent de narration.
${p.memoire ? `\n${p.memoire}\n` : ''}

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
  // ── FICHE PAR SECTION (L26, 01/08) — le remède mesuré au plafond de profondeur.
  // Une fiche de 800 caractères tirée d'une fenêtre de 6 000 ne pouvait pas rendre une page de
  // 246 738 (Naruto Uzumaki : l'agent voyait 2,4 % de la page, en produisait 0,3 %). On ne
  // rédige plus « la fiche » mais UNE SECTION à la fois, sur le découpage du wiki lui-même :
  // ~3 000 caractères, un sujet homogène, et une source que le juge peut lire EN ENTIER —
  // c'est la première fois qu'un verdict porte sur la totalité de ce que l'agent a lu.
  fiche_section: {
    modele: 'ollama/gemma4:12b',
    fetch: async (p) => {
      const niche = await expertNiche(supabase, p.universe, p.name);
      const memoire = await memoireExpert(supabase, 'fiche_section', p.universe, niche?.noms);
      return { ...p, memoire, niche };
    },
    // La section arrive DÉJÀ dans la charge utile (le remplisseur l'a découpée) : la garde ne
    // vérifie donc que la matière, pas l'identité — celle-ci a été tranchée à la découpe.
    guard: (p) => (String(p.section_texte ?? '').length < 350
      ? `section « ${p.section_titre} » trop maigre` : null),
    zod: z.object({ titre: z.string().min(3), texte: DescFr(200) }),
    schema: {
      type: 'object',
      properties: {
        titre: { type: 'string', description: 'Titre de la section en français' },
        texte: { type: 'string', description: 'La section rédigée en français' },
      },
      required: ['titre', 'texte'],
      additionalProperties: false,
    },
    prompt: (p) => `Tu es ${nomExpert('fiche_section', p.universe)}${p.niche ? `, et plus précisément « ${p.niche.nom} »` : ''}, expert de l'encyclopédie AKASHA.

Tu rédiges UNE SEULE SECTION de la fiche « ${p.name} » (${p.universe}) : la section « ${p.section_titre} ».
${p.sommaire ? `\nLa fiche complète comportera ces sections : ${p.sommaire}.\nNe traite QUE la tienne — une autre plume écrit les suivantes, toute redite serait du doublon.\n` : ''}
${p.memoire ? `\n${p.memoire}\n` : ''}
RÈGLES :
- N'utilise QUE des faits présents dans le texte source ci-dessous. Aucune invention.
- Français encyclopédique sobre, présent de narration. Aucun anglicisme : traduis les termes
  courants, garde en romaji les noms propres canon (Sharingan, Mangekyō, Kekkei Genkai).
- Développe : tu as la place. Vise 6 à 12 phrases si la source le permet — c'est une SECTION,
  pas un résumé. Reprends les mécanismes, les conditions, les exceptions que la source décrit.
- "titre" : le titre de la section en français (« Acquisition » → « L'éveil », « Abilities » →
  « Capacités », « Transformations » → « Évolutions »). Court, sans article inutile.

SOURCE — section « ${p.section_titre} » de l'article canon :
${p.section_texte}`,
  },
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
${p.alias_de ? `IDENTITÉ DÉJÀ ÉTABLIE — NE LA CONTESTE PAS : l'article source s'intitule « ${p.alias_de} ».
C'est le MÊME sujet que ${p.name} sous son autre nom, vérifié sur les champs de nommage de
l'article (le wiki titre au vrai nom, notre registre porte le pseudonyme de la VF/VA). La
production nomme donc légitimement « ${p.alias_de} ». Contrôle les FAITS, jamais l'identité.
` : ''}PRODUCTION DE L'AGENT À CONTRÔLER :
${p.production}

SOURCE DE RÉFÉRENCE (article du wiki canon) :
${p.source}

Contrôle, dans cet ordre :
1. ${p.alias_de ? `(identité acquise, voir ci-dessus — passe directement au point 2)` : `La production parle-t-elle bien de ${p.name}, et non d'un homonyme ou d'un proche ?`}
2. Chaque fait avancé est-il présent dans la source ? (un fait absent = invention)
${p.kind === 'prose'
  ? `3. Le français est-il correct, sans anglicisme ni terme anglais résiduel ?`
  : `3. NE JUGE PAS LA LANGUE. Cette production n'est pas un texte à lire mais des données :
   les valeurs sont des termes canon (« Logia », « Jōnin », « Marine ») et les preuves sont des
   citations VERBATIM de l'article anglais — le producteur a pour consigne stricte de les
   recopier sans les traduire. Un mot anglais n'est donc JAMAIS un défaut ici.`}
4. Un fait établi par la source à N'IMPORTE QUEL moment du récit est EXACT, même s'il n'est
   plus vrai à la fin : un Marine devenu pirate l'a bien été, un Genin devenu Hokage a bien
   été Genin. Ne conteste jamais une valeur au seul motif que la source la situe dans le
   passé (« former », « Partie I », « anciennement »).

Puis :
- "valide" si tout est exact et ancré dans la source ;
- "a_corriger" si le fond est bon mais qu'un détail est faux, absent de la source ou mal écrit ;
- "rejeter" si la production décrit une autre entité ou invente l'essentiel.

"motif" : UNE phrase précise (le problème exact, ou pourquoi c'est juste). Deux lignes maximum.
"citation" : recopie UNE phrase EXACTE de la source qui fonde ton verdict — une seule, la plus
courte qui suffise, jamais un paragraphe entier (elle est de toute façon tronquée au stockage).
Si tu n'en trouves aucune, écris "aucune" — et dans ce cas le verdict ne peut pas être "valide".`,
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
    zod: z.object({ descFr: DescFr(60) }),
    schema: {
      type: 'object',
      properties: { descFr: { type: 'string' } },
      required: ['descFr'],
      additionalProperties: false,
    },
    fetch: async (p) => {
      const page = await fetchFandomProse(p.universe, p.name);
      // Mémoire d'expert (L18) + niche (L19) : l'expert le plus POINTU couvrant l'entrée
      // (« Expert Kekkei genkai » avant « Expert Jutsu ») signe le prompt, et ses exemplaires
      // viennent d'abord de son propre groupe — c'est par là qu'il progresse fiche après fiche.
      const niche = await expertNiche(supabase, p.universe, p.name);
      const memoire = await memoireExpert(supabase, roleKey, p.universe, niche?.noms);
      return page ? { ...p, fandom: page.text, fandomTitle: page.title, fandomUrl: page.url, sameEntity: page.sameEntity, memoire, niche } : { ...p, memoire, niche };
    },
    guard: (p) => TASK_TYPES.fandom_descfr.guard(p),
    prompt: (p) => `Tu es ${nomExpert(roleKey, p.universe)}${p.niche ? `, et plus précisément « ${p.niche.nom} » (${p.niche.membres} entrées à ta charge)` : ''}, expert de l'encyclopédie AKASHA (univers d'animes/mangas).
Voici l'article du wiki canon (en anglais, brut). Rédige "descFr" : 2 à 4 phrases en français,
ton encyclopédique sobre, présent de narration.

Le sujet est ${angleFor(roleKey, p.universe)}.
${p.memoire ? `\n${p.memoire}\n` : ''}

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
// review_local 400 → 800 le 01/08 : conséquence directe de l'élargissement de la fenêtre du
// juge (4 500 → 6 000 c le matin même). Avec plus de source à citer, les verdicts dépassaient
// le plafond et sortaient en JSON tronqué — « Unterminated string at position 2611 ». C'est le
// détecteur finish_reason posé le matin qui l'a nommé au lieu de laisser un parsing illisible.
const NUM_PREDICT = { akasha_attrs: 700, fandom_descfr: 500, flavor_akasha: 300, review_local: 800, akasha_relations: 900, fiche_technique: 400, fiche_artefact: 400, fiche_lieu: 400, fiche_lexique: 400, whatsapp_reponse: 500 };
const TIMEOUT_MS = 420_000;  // articles longs (Zoro) + preuves : 240 s ne suffisait pas

/* ── Rotation de couloirs (L23, 01/08) ──────────────────────────────
 * --cloud et --juge acceptent une LISTE séparée par des virgules. Les plafonds des paliers
 * gratuits sont PAR MODÈLE et indépendants : Groq gpt-oss-120b, Groq llama-70b et Gemini
 * gemma-4 ont trois compteurs distincts. Quand un couloir ferme son guichet du jour, on
 * bascule sur le suivant au lieu d'attendre 24 h — c'est ce qui rend l'usine continue utile.
 * Le mur mesuré n'est d'ailleurs pas le débit/minute mais les JETONS PAR JOUR (Groq :
 * 200 000/j sur gpt-oss-120b ≈ 69 productions ; 100 000/j sur llama-70b ≈ 40 relectures).
 * Un couloir épuisé est mis de côté 1 h puis re-testé (le guichet glisse sur 24 h). */
const listeCouloirs = (s) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const CLOUDS = listeCouloirs(CLOUD);
const JUGES_CLI = listeCouloirs(JUGE);
const couloirsEpuises = new Map();   // modèle → horodatage du guichet fermé
const couloirDispo = (m) => !couloirsEpuises.has(m) || Date.now() - couloirsEpuises.get(m) > 3_600_000;
const premierDispo = (liste) => liste.find(couloirDispo) ?? null;

const modelOf = (type, p) => {
  if (type === 'review_local') {
    // Mode campagne : on réattribue par emplacement, sauf l'arbitre.
    if (FORCE_JURY.length && p?.slot !== 'arbitre') {
      const i = p?.slot === 'auto2' ? 1 : 0;
      if (FORCE_JURY[i]) return FORCE_JURY[i];
    }
    // Le juge est porté par la tâche (composition du jury décidée à l'enrôlement). S'il a
    // fermé son guichet, on lui substitue un confrère libre plutôt que de reporter 24 h.
    const porte = p?.juge_modele;
    if (porte && couloirDispo(porte)) return porte;
    // Interdits : lui-même et les modèles de ses confrères de jury (`evite`) — un remplaçant
    // identique à l'autre juge produirait un consensus factice.
    const interdits = new Set([porte, ...(p?.evite ?? [])]);
    const remplacant = premierDispo(JUGES_CLI.filter((m) => !interdits.has(m)));
    if (porte && remplacant) console.log(`  ⇄ juge ${porte} indisponible → ${remplacant}`);
    return remplacant ?? porte ?? JUGES_CLI[0] ?? JUGE;
  }
  if (CLOUDS.length) return premierDispo(CLOUDS) ?? CLOUDS[0];   // production au cloud
  const t = TASK_TYPES[type];
  return typeof t.model === 'function' ? t.model(p) : t.model;
};
const schemaOf = (t, p) => (typeof t.schema === 'function' ? t.schema(p) : t.schema);

/* ── Flotte multi-nœuds : budget LLM global + heartbeat (L16) ───── */
// Les quotas des fournisseurs sont PARTAGÉS par tous les nœuds : chaque appel cloud
// réserve d'abord sa part (RPC quota_consommer, table ops_quotas). Refus = attente puis
// nouvel essai — un 429 préventif, avant de gaspiller l'appel réseau. Marge ~20 % sous
// les plafonds gratuits constatés (Groq 30 req/6k TPM, gemini-flash-lite plus large).
// Clés par MODÈLE (les quotas Groq/Gemini sont PAR MODÈLE — moisson du 28/07) avec repli
// par fournisseur. `parJour` = second guichet sur 24 h quand le plafond quotidien mord
// avant le plafond minute (llama-70b : 1 000 req/j). Marges ~10-20 % sous les plafonds.
// RECALÉ SUR LES DOCS OFFICIELLES le 01/08/2026 (audit des 4 verrous). Trois enseignements :
//  · le frein n'était pas le débit/minute en REQUÊTES mais en JETONS — 5 000/min pour ~2 900
//    réservés par production = UNE production par minute, d'où 59 attentes pour 44 productions ;
//  · le vrai mur est ailleurs : les JETONS PAR JOUR (`jetonsParJour`), absents jusqu'ici —
//    Groq donne 200 000/j sur gpt-oss-120b (~69 productions) et 100 000/j sur llama-70b (~40
//    relectures). Sans ce guichet, on tapait dans le mur du fournisseur en aveugle ;
//  · Google et Mistral NE PUBLIENT PLUS leurs plafonds gratuits (coupe de déc. 2025, renvoi
//    vers un tableau de bord authentifié) → valeurs pessimistes, à recaler avant tout gros lot.
// Consommation mesurée par production : gpt-oss-120b 2 887 · nemotron-super 2 879 ·
// llama-70b 2 538 · gemma-4-31b 2 193 jetons.
const LIMITES_FOURNISSEURS = {
  // ── Groq — compteurs PAR MODÈLE, indépendants. Valeurs LUES DANS LES EN-TÊTES du compte le
  // 01/08 (x-ratelimit-*), pas seulement dans la doc : 8 000 jetons/MINUTE et 1 000 requêtes/JOUR,
  // et AUCUN compteur de jetons par jour n'est exposé. La doc mentionne un TPD de 200 000 : s'il
  // existe vraiment, on le rencontrera en 429 (géré par le backoff) plutôt que de se brider à
  // ~55 productions/jour pour une limite peut-être fictive. jetonsRestants() journalise la vérité.
  // ⚠ gpt-oss-120b : TPD MESURÉ À 2 000 JETONS/JOUR sur ce compte (message du 429 le 01/08),
  // soit ~8 fiches par jour — couloir MORT pour la production, malgré 1 000 req/jour affichées
  // et une doc annonçant 200 000. Le plafond ci-dessous évite d'essayer pour rien : le worker
  // bascule aussitôt sur le couloir suivant. Une sonde de taille RÉELLE (ops-sonde-couloirs)
  // est le seul moyen de connaître ces murs — une sonde à 1 jeton passe et ment.
  'groq/openai/gpt-oss-120b':        { requetes: 24, jetons: 6_400, fenetre: 60, parJour: 800, jetonsParJour: 2_000 },
  'groq/llama-3.3-70b-versatile':    { requetes: 24, jetons: 9_600, fenetre: 60, parJour: 800 },
  // Production depuis le 01/08 : Mistral (4e famille, embauché le 29/07 au piège canon) — il
  // encaisse une requête de taille réelle quand Groq refuse. ⚠ palier gratuit = données
  // d'entraînement : fiches PUBLIQUES d'AKASHA uniquement, jamais de donnée client.
  'mistral/mistral-large-latest':    { requetes: 2, jetons: 20_000, fenetre: 60 },
  // ── Google — plafonds non publiés depuis déc. 2025 : 80 % des dernières valeurs connues.
  // gemma-4 est le meilleur débit du parc (2 193 jetons/production → 5/min, des milliers/jour).
  'gemini/gemini-flash-lite-latest': { requetes: 12, jetons: 200_000, fenetre: 60, parJour: 200 },
  'gemini/gemma-4-31b-it':           { requetes: 24, jetons: 12_000, fenetre: 60, parJour: 11_500 },
  // Nemotron 550B gratuit via OpenRouter (sonde 29/07 : cas piège réussi, famille NVIDIA) —
  // 50 req/JOUR seulement : rôle d'ARBITRE ponctuel, pas de juge de masse (1 000/j si 10 $ un jour).
  'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free': { requetes: 16, jetons: 50_000, fenetre: 60, parJour: 40 },
  // ── DeepInfra — facturé au JETON, sans guichet quotidien. Pas de parJour : le seul frein
  // est le crédit du compte, et il est dérisoire (juger l'encyclopédie entière deux fois ≈ 5 $).
  // Plafond/minute prudent au départ, à relever une fois la cadence réelle mesurée.
  'deepinfra/Qwen/Qwen3-32B':                  { requetes: 60, jetons: 400_000, fenetre: 60 },
  'deepinfra/mistralai/Mistral-Small-24B-Instruct-2501': { requetes: 60, jetons: 400_000, fenetre: 60 },
  'deepinfra/meta-llama/Llama-3.3-70B-Instruct-Turbo': { requetes: 60, jetons: 400_000, fenetre: 60 },
  deepinfra: { requetes: 60, jetons: 400_000, fenetre: 60 },

  // ── Replis par FOURNISSEUR : plancher pour un modèle non listé, jamais une cible de production.
  groq:     { requetes: 24, jetons: 4_800, fenetre: 60, parJour: 800 },   // < 6 000, le plus bas TPM Groq
  gemini:   { requetes: 12, jetons: 100_000, fenetre: 60, parJour: 200 },
  cerebras: { requetes: 25, jetons: 50_000, fenetre: 60 },                // palier gratuit SUPPRIMÉ (402 le 26/07)
  // NIM gratuit n'est pas un débit renouvelable mais un STOCK de ~1 000 crédits qui s'épuise
  // DÉFINITIVEMENT : le guichet jour empêche une seule nuit de brûler la réserve entière.
  nvidia:     { requetes: 32, jetons: 100_000, fenetre: 60, parJour: 150 },
  // ⚠ CORRIGÉ DEUX FOIS le 01/08, et c'est instructif. (1) J'avais conclu « 2 req/minute »
  // d'une rafale de 8 qui n'en laissait passer que 2 — c'était une limite de PARALLÉLISME que
  // je lisais comme un volume. (2) La doc Mistral annonce 1 requête par SECONDE, soit 60/min ;
  // mesuré EN SÉRIE à 1,1 s d'intervalle sur ce compte : 4 passent, puis refus — cadence
  // soutenable réelle ≈ 13/minute. Ni ma première lecture ni la doc n'étaient bonnes.
  // Valeur retenue : 12/min, sous le mesuré. Soit ~700 relectures/heure, gratuitement, dans
  // une famille absente du jury (ni Google, ni Meta, ni Qwen) — de loin le meilleur couloir
  // gratuit du parc, que j'avais écarté sur un contresens.
  // Garde-fou : ce couloir se travaille EN SÉRIE (concurrence 1), la rafale le referme.
  // (Palier gratuit = données d'entraînement : fiches PUBLIQUES d'AKASHA uniquement.)
  mistral:    { requetes: 12, jetons: 200_000, fenetre: 60 },
  openrouter: { requetes: 16, jetons: 50_000, fenetre: 60, parJour: 40 },
};
// Guichet QUOTIDIEN fermé ≠ panne : la tâche n'a pas échoué, elle est trop tôt. En mode
// continu (24/7, L23) la marquer « failed » brûlerait toute la file dès le plafond atteint.
// Cette erreur distincte fait REPORTER la tâche : rien en base, message laissé en file
// (sa visibilité expire → il repart), et le worker fait la sieste jusqu'à la fenêtre suivante.
class PlafondJourError extends Error {
  constructor(cle, limite) { super(`guichet du jour fermé pour ${cle} (plafond ${limite})`); this.cle = cle; }
}
let quotaIndisponible = false;   // RPC absente (SQL pas encore appliqué) → on le dit UNE fois
async function quotaReserver(cle, jetonsEstimes) {
  const lim = LIMITES_FOURNISSEURS[cle] ?? LIMITES_FOURNISSEURS[String(cle).split('/')[0]];
  if (!lim || quotaIndisponible) return;
  // Guichet JOUR d'abord : attendre une fenêtre de 24 h n'a pas de sens — on échoue franchement
  // (la tâche repart en file demain via le rejoueur/les remplisseurs), on ne brûle pas la minute.
  if (lim.parJour || lim.jetonsParJour) {
    const { data: okJour, error: eJour } = await supabase.rpc('quota_consommer', {
      p_fournisseur: `${cle}:jour`,
      p_requetes: 1,
      p_jetons: lim.jetonsParJour ? Math.min(jetonsEstimes, lim.jetonsParJour) : 0,
      p_limite_requetes: lim.parJour ?? 1_000_000,
      // Pas de plafond de jetons/jour ⇒ limite « infinie », JAMAIS 1 : la colonne garde les
      // jetons accumulés d'un réglage précédent, et une limite à 1 refermerait le guichet
      // pour 24 h sur un compteur périmé (piège vécu le 01/08 : 19 218 jetons > 1).
      p_limite_jetons: lim.jetonsParJour ?? 1_000_000_000,
      p_fenetre_secondes: 86_400,
    });
    if (!eJour && okJour === false) {
      throw new PlafondJourError(cle, `${lim.parJour ?? '—'} req/j · ${lim.jetonsParJour ?? '—'} jetons/j`);
    }
  }
  for (let essai = 0; essai < 20; essai++) {
    const { data, error } = await supabase.rpc('quota_consommer', {
      p_fournisseur: cle, p_requetes: 1, p_jetons: Math.min(jetonsEstimes, lim.jetons),
      p_limite_requetes: lim.requetes, p_limite_jetons: lim.jetons, p_fenetre_secondes: lim.fenetre,
    });
    if (error) { quotaIndisponible = true; console.error('  ✗ budget LLM indisponible (production non bloquée) :', error.message.slice(0, 80)); return; }
    if (data) return;
    if (essai === 0) console.log(`  ⏳ budget ${cle} épuisé — attente de la fenêtre`);
    await new Promise((r) => setTimeout(r, (lim.fenetre / 4 + Math.random() * 5) * 1000));
  }
}
// Heartbeat : chaque nœud s'annonce (ops_workers) — le bilan de nuit saura qui est muet.
let dernierBattement = 0, battementEnEchec = false;
async function battreLeCoeur() {
  if (Date.now() - dernierBattement < 30_000) return;
  dernierBattement = Date.now();
  const role = CHAT ? 'chat' : 'agents';
  // Le battement annonce si ce nœud a un GPU local (Ollama). C'est ainsi que le VPS, qui n'en
  // a pas, sait qu'il peut confier une relecture au modèle local du Mac : gratuit, sans quota,
  // et d'une famille (Qwen) qui manque cruellement au parc nuage.
  const gpu = (await ollamaDisponible()) ? ' ollama' : '';
  const { error } = await supabase.from('ops_workers').upsert({
    id: `${hostname()}:${role}`, hote: hostname(), role, pid: process.pid,
    detail: `conc=${CONC}${CLOUD ? ` cloud=${CLOUD}` : ''}${JUGE ? ` juge=${JUGE}` : ''}${gpu}`,
    derniere_activite: new Date().toISOString(),
  });
  if (error && !battementEnEchec) { battementEnEchec = true; console.error('  ✗ heartbeat :', error.message.slice(0, 80)); }
}

/** Appel OpenAI-compatible (Groq, Cerebras, OmniRoute…) — backoff 429 au délai annoncé. */
// Modèles sans json_schema strict (Groq le refuse, testé 28/07) → mode json_object :
// schéma injecté dans le prompt, zod fait la police en aval. llama-3.1-8b ÉCARTÉ au même
// test (il recopie le schéma au lieu de répondre).
const MODES_JSON = {
  'llama-3.3-70b-versatile': 'json_object',
  'nvidia/nemotron-3-ultra-550b-a55b:free': 'json_object',
  'nvidia/nemotron-3-super-120b-a12b:free': 'json_object',
  'nvidia/nemotron-3-super-120b-a12b': 'json_object',
  'nvidia/nemotron-3-ultra-550b-a55b': 'json_object',
  // Llama chez DeepInfra ACCEPTE json_schema mais ne l'honore pas toujours : mesuré le 01/08,
  // 8 arbitrages perdus sur « Verdict : … » en prose au lieu du JSON. Le mode json_object
  // (schéma injecté dans le prompt, zod en police derrière) ne l'a jamais pris en défaut.
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': 'json_object',
};
// Les Nemotron « pensent » dans leur réponse sans cette directive (sonde NIM 29/07) —
// /no_think en système rend un JSON propre directement parsable.
// Serveur Ollama : la machine locale par défaut, mais OLLAMA_HOST permet de pointer un GPU
// LOUÉ (RunPod, Vast.ai…) le temps d'une campagne. Le reste du code ne change pas : un GPU
// distant est vu par la flotte exactement comme le Mac — même famille de modèles, même
// gratuité apparente côté quotas, simplement 20 à 40 fois plus rapide.
const OLLAMA = (process.env.OLLAMA_HOST ?? 'http://localhost:11434').replace(/\/+$/, '');
const enteteOllama = () => (process.env.OLLAMA_CLE ? { Authorization: `Bearer ${process.env.OLLAMA_CLE}` } : {});

// Modèles « à raisonnement » : sans /no_think ils brûlent leur budget en pensée avant le JSON.
// Mesuré sur Qwen3-32B le 01/08 : 331 jetons et 8,7 s sans la consigne, 66 jetons et 2,6 s avec.
const SANS_PENSEE = new Set(['nvidia/nemotron-3-super-120b-a12b', 'nvidia/nemotron-3-ultra-550b-a55b', 'Qwen/Qwen3-32B']);

// Les fournisseurs disent la vérité sur leurs plafonds dans les en-têtes x-ratelimit-* — bien
// mieux que la doc (Google et Mistral ne publient plus rien, et la table Groq annonce un TPD
// que le compte n'expose pas). On la journalise une fois par heure et par modèle : de quoi
// recaler LIMITES_FOURNISSEURS sur du mesuré au lieu du supposé, sans polluer le log.
const dernierReleve = new Map();
function journaliserQuotaReel(fournisseur, modele, headers) {
  const cle = `${fournisseur}/${modele}`;
  if (Date.now() - (dernierReleve.get(cle) ?? 0) < 3_600_000) return;
  const restantReq = headers.get('x-ratelimit-remaining-requests');
  const restantJet = headers.get('x-ratelimit-remaining-tokens');
  if (restantReq == null && restantJet == null) return;
  dernierReleve.set(cle, Date.now());
  console.log(`  📊 ${cle} — reste ${restantReq ?? '?'} req (sur ${headers.get('x-ratelimit-limit-requests') ?? '?'})`
    + ` · ${restantJet ?? '?'} jetons (sur ${headers.get('x-ratelimit-limit-tokens') ?? '?'})`
    + ` · réarmement req ${headers.get('x-ratelimit-reset-requests') ?? '?'}`);
}
async function appelOpenAICompat({ url, cle, modele, messages, type, schema }) {
  const fournisseur = url.includes('api.groq.com') ? 'groq' : url.includes('cerebras') ? 'cerebras'
    : url.includes('nvidia.com') ? 'nvidia' : url.includes('mistral.ai') ? 'mistral'
    : url.includes('openrouter.ai') ? 'openrouter' : null;
  await quotaReserver(fournisseur ? `${fournisseur}/${modele}` : null, Math.ceil((messages[0]?.content?.length ?? 0) / 4) + (NUM_PREDICT[type] ?? 800) + 900);
  const modeJson = MODES_JSON[modele] ?? 'json_schema';
  let msgs = modeJson === 'json_object'
    ? [{ ...messages[0], content: `${messages[0].content}\n\nRéponds UNIQUEMENT par un objet JSON conforme à ce schéma (mêmes clés, mêmes types, AUCUN texte hors JSON, ne recopie pas le schéma) :\n${JSON.stringify(schema)}` }]
    : messages;
  if (SANS_PENSEE.has(modele)) msgs = [{ role: 'system', content: '/no_think' }, ...msgs];
  for (let essai = 1; ; essai++) {
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // +900 de marge : les modèles « à raisonnement » (gpt-oss) brûlent des tokens AVANT le
        // JSON — et Nemotron pense PARFOIS malgré /no_think sur les longs prompts (+2400, 29/07).
        model: modele, stream: false, messages: msgs,
        max_tokens: (NUM_PREDICT[type] ?? 800) + (SANS_PENSEE.has(modele) ? 2_400 : 900),
        response_format: modeJson === 'json_schema'
          ? { type: 'json_schema', json_schema: { name: type, strict: true, schema } }
          : { type: 'json_object' },
      }),
    });
    if (res.status === 429) {
      const corps = await res.text();
      // Un 429 « par JOUR » (TPD/RPD) ne se rattrape pas en attendant : le couloir est mort
      // jusqu'au lendemain. Attendre 27 min pour re-tenter et re-échouer endormait l'usine —
      // constaté le 01/08, llama-70b épuisé faisait 1 tâche en 20 min. On le traite comme
      // notre propre guichet quotidien : le couloir est marqué, la rotation prend le relais.
      if (/per day|\bTPD\b|\bRPD\b|daily/i.test(corps)) {
        throw new PlafondJourError(fournisseur ? `${fournisseur}/${modele}` : modele, 'plafond QUOTIDIEN du fournisseur');
      }
      if (essai >= 4) throw new Error(`HTTP 429 (${new URL(url).host}) après 4 essais`);
      const attente = Number(corps.match(/try again in (\d+(?:\.\d+)?)s/i)?.[1] ?? res.headers.get('retry-after') ?? 20);
      // On journalise le MOTIF du 429 : sans lui, impossible de savoir si c'est le débit par
      // minute, le quota du jour ou les jetons — donc impossible de régler le bon plafond.
      const motif = corps.match(/"message"\s*:\s*"([^"]{0,160})/)?.[1] ?? corps.slice(0, 160);
      console.log(`  ⏳ 429 (${new URL(url).host}) — pause ${Math.ceil(attente + 1)} s (essai ${essai}) · ${motif}`);
      await new Promise((r) => setTimeout(r, (attente + 1) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} (${new URL(url).host}): ${(await res.text()).slice(0, 200)}`);
    journaliserQuotaReel(fournisseur, modele, res.headers);
    const rep = await res.json();
    // Sortie coupée au plafond de tokens : jusqu'ici SILENCIEUX (le JSON tronqué partait en
    // erreur de parsing, motif indéchiffrable). On le nomme — c'est le seul signal qui dit
    // qu'il faut relever NUM_PREDICT pour ce type de tâche.
    if (rep.choices?.[0]?.finish_reason === 'length')
      throw new Error(`sortie coupée au plafond de tokens (${type}, ${NUM_PREDICT[type] ?? 800}+marge) — relever NUM_PREDICT.${type}`);
    const contenu = rep.choices?.[0]?.message?.content ?? '';
    // Extraction tolérante, appliquée à TOUS les couloirs depuis le 01/08 : les modèles « à
    // raisonnement » laissent fuir leur pensée avant l'objet, même en json_schema strict —
    // Qwen3-32B rend « <think>\n\n</think>{...} » et le parsing échouait. Sans risque quand la
    // sortie est déjà propre : le premier « { » est alors en position 0 et la coupe ne fait rien.
    const debut = contenu.indexOf('{'), fin = contenu.lastIndexOf('}');
    return debut >= 0 && fin > debut ? contenu.slice(debut, fin + 1) : contenu;
  }
}

async function callModel(type, payload, modeleImpose) {
  const t = TASK_TYPES[type];
  const model = modeleImpose ?? modelOf(type, payload);
  const schema = schemaOf(t, payload);
  const messages = [{ role: 'user', content: t.prompt(payload) }];
  let raw;
  if (model.startsWith('ollama/')) {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      headers: { 'Content-Type': 'application/json', ...enteteOllama() },
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
  } else if (model.startsWith('nvidia/')) {
    // Branche DORMANTE (clé à créer, vérif téléphone) — 40 req/min gratuits, OpenAI-compatible.
    if (!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY absente de .env.local');
    raw = await appelOpenAICompat({
      url: 'https://integrate.api.nvidia.com/v1/chat/completions', cle: process.env.NVIDIA_API_KEY,
      modele: model.slice(7), messages, type, schema,
    });
  } else if (model.startsWith('deepinfra/')) {
    // Facturé au JETON, sans quota quotidien — la sortie de l'impasse des paliers gratuits
    // (veille du 01/08). Juger toute l'encyclopédie deux fois ≈ 5 $, soit moins d'un mois de
    // VPS. API strictement compatible OpenAI, json_schema strict pris en charge.
    if (!process.env.DEEPINFRA_API_KEY) throw new Error('DEEPINFRA_API_KEY absente de .env.local');
    raw = await appelOpenAICompat({
      url: 'https://api.deepinfra.com/v1/openai/chat/completions', cle: process.env.DEEPINFRA_API_KEY,
      modele: model.slice(10), messages, type, schema,   // « deepinfra/ » = 10 caractères
    });
  } else if (model.startsWith('mistral/')) {
    // Branche DORMANTE — ⚠ palier gratuit Mistral : les données servent à l'entraînement.
    // Fiches PUBLIQUES uniquement, jamais de données client (règle absolue).
    if (!process.env.MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY absente de .env.local');
    raw = await appelOpenAICompat({
      url: 'https://api.mistral.ai/v1/chat/completions', cle: process.env.MISTRAL_API_KEY,
      modele: model.slice(8), messages, type, schema,
    });
  } else if (model.startsWith('openrouter/')) {
    // Branche DORMANTE — modèles :free (20/min, 50/j — 1 000/j après un versement unique de 10 $).
    if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY absente de .env.local');
    raw = await appelOpenAICompat({
      url: 'https://openrouter.ai/api/v1/chat/completions', cle: process.env.OPENROUTER_API_KEY,
      modele: model.slice(10), messages, type, schema,   // « deepinfra/ » = 10 caractères
    });
  } else if (model.startsWith('gemini/')) {
    // Gemini NATIF (pas OmniRoute) : son adaptateur passe par l'endpoint compatible OpenAI qui
    // refuse les clés nouveau format « AQ.… » (constaté le 26/07). L'endpoint officiel les accepte
    // ET offre responseSchema — le décodage contraint natif, comme `format` chez Ollama.
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY absent de .env.local');
    const { additionalProperties, ...gSchema } = schema;   // champ inconnu de l'API Gemini
    // Palier gratuit très serré (5 req/min sur gemini-flash-latest, mesuré le 26/07) : sans backoff,
    // un lot de 9 perd 5 tâches d'un coup. Gemini annonce son délai dans error.details[].retryDelay.
    await quotaReserver(`gemini/${model.slice(7)}`, Math.ceil((messages[0]?.content?.length ?? 0) / 4) + (NUM_PREDICT[type] ?? 800) + 900);
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
              // Gemma boucle en répétition à température 0 (Kamehameha 28/07 : JSON tronqué
              // pile au plafond de tokens) — 0.2 casse la boucle, Gemini reste déterministe.
              temperature: model.includes('gemma') ? 0.2 : 0,
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

  let echecs = 0;
  for (;;) {
    const modele = modelOf(type, p);
    try {
      const out = await callModel(type, p, modele);
      // Contrôle de cohérence valeur↔preuve (code pur) : le modèle peut citer juste et conclure faux.
      const suspects = type === 'akasha_attrs' ? checkPreuves(out)
        : type === 'akasha_relations' ? checkRelations(out, p) : [];
      return {
        ...base,
        status: suspects.length ? 'suspect' : 'done',
        model: modele,
        result: out,
        error: suspects.length ? suspects.join(' · ') : null,
      };
    } catch (e) {
      // Guichet du jour fermé : on marque le couloir et on tente le suivant. Si aucun n'est
      // libre, la tâche est REPORTÉE (rien en base, message laissé en file) — jamais « failed » :
      // elle n'a pas échoué, elle est trop tôt.
      if (e instanceof PlafondJourError) {
        couloirsEpuises.set(e.cle, Date.now());
        const suivant = modelOf(type, p);
        if (suivant && suivant !== modele) { console.log(`  ⇄ ${e.cle} épuisé aujourd'hui → bascule sur ${suivant}`); continue; }
        return { ...base, status: 'reporte', error: e.message };
      }
      if (++echecs >= 2) return { ...base, status: 'failed', model: modele, error: String(e).slice(0, 300) };
    }
  }
}

/* ── Enchaînement production → relecture locale ──────────────────── */
// Mesuré le 25/07 : le juge local détecte 7/7 des erreurs factuelles sans faux positif.
// Il n'applique rien — il annote, pour que la file humaine arrive déjà triée.
async function chainReview(row, reviewedId, jugesOverride, evitePlus) {
  const p = row.payload ?? {};
  let production;
  if (row.task_type === 'akasha_attrs') {
    const { valeurs, preuves } = splitPreuves(row.result);
    const etablis = Object.entries(valeurs).filter(([, v]) => v && v !== 'inconnu');
    if (!etablis.length) return;                     // abstention : rien à juger (le code tranche)
    production = etablis.map(([k, v]) => `${k} = ${v}  (preuve avancée : « ${preuves[k] ?? 'aucune'} »)`).join('\n');
  } else if (row.task_type === 'fiche_section') {
    production = `Section « ${row.result?.titre} » :\n${row.result?.texte}`;
  } else if (row.task_type === 'akasha_relations') {
    const rel = row.result?.relations ?? [];
    if (!rel.length) return;                         // abstention honnête : rien à juger
    production = rel.map((r) => `${r.avec} (${r.nature}, ${r.periode}) : ${r.resume}  (preuve avancée : « ${r.preuve} »)`).join('\n');
  } else if (row.result?.descFr) {
    production = row.result.descFr;
  } else return;

  // maxChars explicite : sans lui, la fenêtre du juge dépendait de la tâche qui avait chauffé
  // le cache en premier (la clé de cache ignore maxChars). On demande la fenêtre MAXIMALE du
  // parc — celle du producteur de relations — pour que le juge ne soit jamais le moins informé.
  // Une SECTION porte sa propre source dans la charge utile : le juge lit EXACTEMENT ce que
  // l'agent a lu, en entier. C'est la première tâche du parc où la fenêtre du contrôleur
  // couvre 100 % de celle du contrôlé — plus de fait « inventé » qui était simplement hors champ.
  const page = row.task_type === 'fiche_section'
    ? { text: String(p.section_texte ?? ''), title: p.name }
    : await fetchFandomProse(p.universe, p.name, { maxChars: 6000 }).catch(() => null);
  if (!page?.text) return;                           // pas de source vérifiable → pas de jugement

  // AUTONOMIE L12 (audit du 26/07 : un juge seul = 86 % de précision, insuffisant) :
  // chaque production part chez DEUX juges de familles différentes. L'accord des deux
  // autorise l'application automatique ; désaccord → arbitre (L20), sinon pile Dan.
  const juges = jugesOverride ?? [
    // Juge n°1 : gemma local (gratuit illimité) SI Ollama existe (Mac) — sinon gemma-4-31b
    // en nuage : même famille Google (croisement avec llama-70b préservé) mais 11 500 relectures
    // par jour contre 200 à flash-lite, qui était le vrai plafond de la chaîne (audit 01/08).
    // Juge n°1 : Llama-3.3-70B chez DeepInfra dès que la clé existe — famille Meta, distincte
    // du producteur (Mistral), du juge n°2 (Qwen) et de l'arbitre (NVIDIA). Bascule du 01/08 :
    // gemma-4-31b était devenu LE goulot du jugement, non par son plafond quotidien (11 500,
    // confortable) mais par son débit — 12 000 jetons/minute PARTAGÉS entre tous les nœuds, soit
    // ~5 verdicts/minute pour la flotte entière. Repli : gemma local si le Mac est là, sinon
    // gemma en nuage — la chaîne reste vivante sans DeepInfra, simplement plus lente.
    { juge_modele: process.env.DEEPINFRA_API_KEY ? 'deepinfra/meta-llama/Llama-3.3-70B-Instruct-Turbo'
        : (await ollamaDisponible()) ? 'ollama/gemma4:12b' : 'gemini/gemma-4-31b-it', slot: 'auto' },
    // Juge n°2 : llama-70b (Meta) en priorité — gemma local + Gemini étaient de la MÊME
    // famille Google (angles morts partagés, corrigé par l'étude modèles du 28/07).
    // Le juge n°2 est choisi PARMI les couloirs encore ouverts de la liste --juge : les
    // plafonds quotidiens de Groq sont si serrés (llama-70b épuisé en une demi-journée le
    // 01/08) qu'enrôler un modèle mort condamnait la relecture pour la journée.
    // ORDRE INVERSÉ le 01/08, après l'arrivée de DeepInfra. Tant que le jugement était rare, le
    // GPU local passait devant : gratuit et sans plafond. Maintenant qu'un couloir facturé au
    // jeton existe, la comparaison est sans appel — 2,6 s et 0,000195 $ contre 80 s sur un Mac
    // qui pagine. Le nœud GPU reste le FILET : il prend la main quand aucun couloir nuage n'est
    // disponible (guichets fermés, ou Dan hors ligne), ce qui garde la chaîne vivante à coût nul.
    ...(premierDispo(JUGES_CLI) ? [{ juge_modele: premierDispo(JUGES_CLI), slot: 'auto2' }]
      : await nœudGpuVivant() ? [{ juge_modele: 'ollama/qwen3:8b', slot: 'auto2' }]
      : process.env.GROQ_API_KEY
      ? [{ juge_modele: 'groq/llama-3.3-70b-versatile', slot: 'auto2' }]
      : process.env.GEMINI_API_KEY
        ? [{ juge_modele: 'gemini/gemini-flash-lite-latest', slot: 'auto2' }]
        : []),
  ];
  // Chaque juge emporte la liste des modèles de ses confrères (`evite`) : si son guichet du
  // jour ferme et qu'on lui substitue un remplaçant (rotation L23), la substitution ne doit
  // JAMAIS retomber sur le modèle de l'autre juge — deux verdicts du même modèle feraient un
  // faux consensus, donc une écriture automatique sans véritable second regard.
  const modelesDuJury = [...new Set([...juges.map((j) => j.juge_modele), ...(evitePlus ?? [])])];
  await supabase.rpc('ops_queue_send_batch', {
    messages: juges.map((j) => ({
      type: 'review_local',
      payload: {
        reviewed_id: reviewedId, slug: row.target_slug, name: p.name, universe: p.universe,
        // L'identité a déjà été prouvée à la mise en file (champs de nommage de l'article) :
        // le juge n'a pas à la rejuger « à vue », il la refusait sur la seule différence de
        // nom entre notre registre et le titre du wiki.
        ...(p.alias_de ? { alias_de: p.alias_de } : {}),
        // Le juge doit voir AU MOINS ce que le producteur a lu. Cette ligne tranchait à
        // 4 500 c quand le producteur en lit 6 000 (relations) ou 5 000 (descFr) : mesuré le
        // 01/08, 56 preuves sur 793 (7,1 %) étaient littéralement dans la source mais AU-DELÀ
        // de 4 500 — le juge les condamnait comme « inventées » sans pouvoir les voir.
        // Gedatsu/Mantra à l'octet 4 788, Shira/Silent Fist à 4 714, Carrot/Katakuri à 4 706.
        // 65 % des pages en cache dépassent 4 500 c : le défaut touchait la majorité des fiches.
        production, source: page.text.slice(0, 6000), ...j,
        // La FORME de la production conditionne le contrôle de langue : sur des données
        // clé=valeur, les preuves sont des citations anglaises verbatim exigées par le prompt
        // producteur — les sanctionner comme « anglicismes » bloquait 17 fiches et provoquait
        // 6 des 9 convocations d'arbitre sur les attributs (mesuré le 01/08).
        kind: row.task_type === 'akasha_attrs' ? 'axes'
          : row.task_type === 'akasha_relations' ? 'relations' : 'prose',
        evite: modelesDuJury.filter((m) => m !== j.juge_modele),
      },
    })),
  });
}

// Un nœud GPU de la flotte est-il vivant ? (battement de moins de 3 min portant « ollama »)
// Sert au VPS, qui n'a pas de GPU, pour confier ses relectures au modèle local du Mac quand
// celui-ci travaille : gratuit, sans plafond quotidien, et d'une famille absente du nuage.
// Réponse mise en cache 60 s — on ne va pas interroger la base à chaque enrôlement de jury.
let _nœudGpu = { a: 0, v: false };
async function nœudGpuVivant() {
  if (Date.now() - _nœudGpu.a < 60_000) return _nœudGpu.v;
  const { data } = await supabase.from('ops_workers')
    .select('id, detail, derniere_activite')
    .gte('derniere_activite', new Date(Date.now() - 180_000).toISOString());
  _nœudGpu = { a: Date.now(), v: (data ?? []).some((w) => String(w.detail ?? '').includes('ollama')) };
  return _nœudGpu.v;
}

// Ollama n'existe que sur le Mac — sondé UNE fois par processus (cache), jamais bloquant.
let _ollamaDispo = null;
async function ollamaDisponible() {
  if (_ollamaDispo !== null) return _ollamaDispo;
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { headers: enteteOllama(), signal: AbortSignal.timeout(5_000) });
    _ollamaDispo = r.ok;
  } catch { _ollamaDispo = false; }
  return _ollamaDispo;
}

// L'ARBITRE (L20) : convoqué quand les deux juges se CONTREDISENT (valide contre
// a_corriger/rejete) — jamais quand ils s'accordent pour corriger. Famille encore
// différente (NVIDIA), une seule convocation par fiche (réservation optimiste).
const ARBITRE_MODELE = process.env.NVIDIA_API_KEY ? 'nvidia/nvidia/nemotron-3-super-120b-a12b'
  : process.env.OPENROUTER_API_KEY ? 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free' : null;
async function peutEtreArbitrer(reviewedId) {
  if (!ARBITRE_MODELE) return;
  const { data: r } = await supabase.from('agent_results')
    .select('id, task_type, target_slug, payload, result, review_status, auto_verdict, auto2_verdict, auto_model, auto2_model, arbitre_at')
    .eq('id', reviewedId).single();
  if (!r || r.review_status !== 'pending' || r.arbitre_at) return;
  const a = r.auto_verdict, b = r.auto2_verdict;
  if (!a || !b || a === b) return;
  if (a !== 'valide' && b !== 'valide') return;   // d'accord pour corriger : rien à arbitrer
  const { data: gagne } = await supabase.from('agent_results')
    .update({ arbitre_at: new Date().toISOString(), arbitre_model: `${ARBITRE_MODELE} (convoqué)` })
    .eq('id', reviewedId).is('arbitre_at', null).select('id');
  if (!gagne?.length) return;
  console.log(`  ⚖ arbitre convoqué (${a} / ${b}) sur #${reviewedId}`);
  // L'arbitre départage : s'il devait être remplacé (guichet fermé), son remplaçant ne peut
  // pas être l'un des deux juges qu'il arbitre — sinon il ne ferait que répéter un vote.
  await chainReview({ task_type: r.task_type, target_slug: r.target_slug, payload: r.payload, result: r.result },
    reviewedId, [{ juge_modele: ARBITRE_MODELE, slot: 'arbitre' }],
    [r.auto_model, r.auto2_model].filter(Boolean));
}

/* ── Application automatique (double verdict) ───────────────────── */
// MIROIR de applyResult (app/api/ops/state/route.ts) — si tu changes une règle là-bas,
// reporte-la ici. Les remplisseurs ne ciblent que des champs vides → l'annulation reste exacte.
async function autoAppliquer(rowId) {
  // Double verdict unanime : les DEUX juges disent « valide ».
  return verrouEtAppliquer(rowId, (q) => q.eq('auto_verdict', 'valide').eq('auto2_verdict', 'valide'));
}
// L'ARBITRE (L20) : sur désaccord des deux juges, le 3e avis (famille NVIDIA) départage —
// majorité 2/3 « valide » suffit alors à l'application, toujours marquée ⚡ auto.
async function autoAppliquerMajorite(rowId) {
  return verrouEtAppliquer(rowId, (q) =>
    q.eq('arbitre_verdict', 'valide').or('auto_verdict.eq.valide,auto2_verdict.eq.valide'));
}
/** Ajoute UNE section au tableau d'une fiche, en résistant aux écritures concurrentes.
 *  Lecture-modification-écriture optimiste : on relit juste avant d'écrire, puis on VÉRIFIE
 *  que la nôtre est bien arrivée. Si un voisin nous a doublés entre-temps, on recommence.
 *  Trois tentatives suffisent largement à 6 sections de front ; au-delà on renonce plutôt que
 *  de boucler, et la fiche repartira au prochain passage du remplisseur. */
async function ajouterSection(slug, neuve, modele) {
  for (let essai = 1; essai <= 3; essai++) {
    const { data: entry } = await supabase.from('akasha_entries').select('attributes').eq('slug', slug).single();
    if (!entry) return false;
    const attrs = { ...(entry.attributes ?? {}) };
    const dejaLa = Array.isArray(attrs.sections) ? attrs.sections : [];
    attrs.sections = [...dejaLa.filter((x) => String(x.i) !== String(neuve.i)), neuve]
      .sort((a, b) => Number(a.i) - Number(b.i));
    attrs.sectionsSource = modele;
    await supabase.from('akasha_entries').update({ attributes: attrs }).eq('slug', slug);

    const { data: apres } = await supabase.from('akasha_entries').select('attributes').eq('slug', slug).single();
    const posees = Array.isArray(apres?.attributes?.sections) ? apres.attributes.sections : [];
    if (posees.some((x) => String(x.i) === String(neuve.i))) return true;   // la nôtre a tenu
  }
  console.log(`  ⚠ section ${neuve.i} de ${slug} perdue en concurrence après 3 essais`);
  return false;
}

async function verrouEtAppliquer(rowId, filtres) {
  // ANCRAGE HHEM — SCORE INFORMATIF, PLUS DE VETO (mesuré le 01/08, veto retiré le jour même).
  //
  // Le veto sur akasha_attrs posé le 31/07 est tombé à l'épreuve des faits. Sur la source
  // réelle de Sakazuki, au gabarit de phrase exact qu'utilise le scoreur :
  //     « belongs to the Marine faction »  (VRAI)  → 0,93
  //     « belongs to the Pirate faction »  (FAUX)  → 0,74
  //     « ate a Devil Fruit of the Logia type » (VRAI) → 0,0099
  //     « ate a Devil Fruit of the Zoan type »  (FAUX) → 0,0104   ← le faux au-DESSUS du vrai
  // Vrais et faux se chevauchent : aucun seuil ne les sépare. Le veto ne protégeait donc de
  // rien — il bloquait des fiches justes et double-validées (Sakazuki, Kaidou, Asuma) et
  // gonflait la pile humaine. HHEM reste précieux sur de la PROSE (0,82 contre 0,02 à
  // l'épreuve du 31/07) : on garde le score, affiché en pastille dans /ops pour trier la
  // relecture, mais ce sont le double verdict et l'arbitre qui décident du fond.
  // Leçon : un garde-fou doit être ÉPROUVÉ sur des cas vrais ET faux avant d'être armé.
  const { data: avant } = await supabase.from('agent_results')
    .select('id, task_type, target_slug, payload, result')
    .eq('id', rowId).eq('review_status', 'pending').eq('status', 'done').single();
  if (!avant) return false;
  const ancrage = await scoreAncrageProduction(avant);
  if (ancrage) await supabase.from('agent_results').update({ auto_score: ancrage.min }).eq('id', rowId);

  // Verrou optimiste : un seul gagnant si plusieurs relectures finissent en même temps.
  const { data: gagne } = await filtres(
    supabase.from('agent_results')
      .update({ review_status: 'approved', auto_applique: true, reviewed_at: new Date().toISOString() })
      .eq('id', rowId).eq('review_status', 'pending').eq('status', 'done'),
  ).select('*').single();
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
  } else if (gagne.task_type === 'fiche_section') {
    // ⚠ ÉCRITURE CONCURRENTE — les sections d'une même fiche s'appliquent EN PARALLÈLE (5 ou 6
    // de front), et chacune ajoute la sienne à un tableau qu'elle vient de lire : la dernière
    // écriture écrasait les précédentes. Constaté sur Sharingan le 01/08 : deux sections
    // marquées ⚡ appliquées, UNE SEULE en base. Le patch commun ne convient donc pas ici —
    // on relit et on réécrit jusqu'à voir la nôtre arriver (voir ajouterSection).
    const neuve = { i: gagne.payload?.section_index, titre: gagne.result?.titre, texte: gagne.result?.texte };
    if (!neuve.i || !neuve.texte) return false;
    const pose = await ajouterSection(gagne.target_slug, neuve, gagne.model);
    if (!pose) return false;
    console.log(`  ⚡ section « ${neuve.titre} » appliquée : ${gagne.target_slug}`);
    return true;
  } else if (gagne.task_type === 'akasha_relations') {
    const rel = gagne.result?.relations ?? [];
    if (!rel.length) return false;
    patch.relations = rel.map(({ avec, nature, periode, resume }) => ({ avec, nature, periode, resume }));
    patch.relationsSource = gagne.model;
  } else return false;
  await supabase.from('akasha_entries').update({ attributes: patch }).eq('slug', gagne.target_slug);
  // MIROIR COMPLET de applyResult (audit du 01/08) : l'application manuelle versait les
  // relations au graphe, l'automatique non — 25 fiches ⚡ sur 46 n'avaient posé AUCUNE arête,
  // et sans journal l'annulation d'audit serait tombée en régime « recalcul » au risque
  // d'emporter une arête curée. Même try/catch non bloquant que la route : le graphe est un
  // bonus, un upsert cassé ne doit pas laisser la fiche à moitié appliquée.
  if (gagne.task_type === 'akasha_relations') {
    try {
      const bilan = await poserAuGraphe(supabase, { resultId: gagne.id, slug: gagne.target_slug, relations: gagne.result?.relations ?? [] });
      if (bilan.posees) console.log(`  ⚑ ${bilan.posees} arête(s) versée(s) au graphe : ${gagne.target_slug}`);
    } catch (e) { console.log('  ⚑ graphe non versé (rattrapable par backfill) :', String(e).slice(0, 100)); }
  }
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
  // Un nœud sans GPU ne doit JAMAIS consommer une tâche confiée à un modèle local : il la
  // ferait échouer (localhost:11434 injoignable) alors qu'un autre nœud de la flotte sait la
  // traiter. On la laisse en file — sa visibilité expire et le Mac la reprendra.
  const modelePrevu = String(modelOf(msg.message?.type, msg.message?.payload ?? {}) ?? '');
  if (modelePrevu.startsWith('ollama/') && !(await ollamaDisponible())) {
    console.log(`  ↷ [${msg.msg_id}] laissée à un nœud GPU (${modelePrevu})`);
    return;
  }
  // --local : ce nœud ne travaille QUE sur son GPU. Sans ce garde-fou, le Mac consommait le
  // budget nuage partagé (gemma) pour des relectures que le VPS traite bien mieux, et se
  // retrouvait à attendre une fenêtre de quota au lieu de faire tourner son modèle gratuit.
  if (LOCAL && !modelePrevu.startsWith('ollama/')) {
    console.log(`  ↷ [${msg.msg_id}] laissée au nuage (${modelePrevu})`);
    return;
  }
  const row = await processMessage(msg);
  if (row.status === 'reporte') {
    // Ni archivage ni écriture : le message reste en file (visibilité expirée → il repart
    // à la fenêtre suivante). On signale à la boucle qu'il faut lever le pied.
    siesteDepuis = Date.now();
    console.log(`  ⏸ [${msg.msg_id}] ${row.target_slug ?? row.task_type} reporté — ${row.error}`);
    return;
  }
  counts[row.status]++;

  if (row.task_type === 'review_local') {
    // Le verdict ne crée pas de résultat : il annote la production relue, dans le slot de SON juge.
    const slot = row.payload.slot === 'arbitre' ? 'arbitre' : row.payload.slot === 'auto2' ? 'auto2' : 'auto';
    await supabase
      .from('agent_results')
      .update({
        [slot + '_verdict']: row.status === 'done' ? row.result.verdict : null,
        [slot + '_motif']: row.status === 'done' ? `${row.result.motif} — « ${String(row.result.citation).slice(0, 220)} »` : row.error,
        [slot + '_model']: row.model,
        [slot + '_at']: new Date().toISOString(),
      })
      .eq('id', row.payload.reviewed_id);
    if (row.status === 'done') {
      if (slot === 'arbitre') {
        // Majorité 2/3 : l'arbitre rejoint un juge « valide » → application ; sinon pile Dan.
        if (row.result.verdict === 'valide') await autoAppliquerMajorite(row.payload.reviewed_id);
      } else {
        // Porte d'autonomie : les DEUX juges disent « valide » → application sans Dan, marquée auto.
        if (row.result.verdict === 'valide') await autoAppliquer(row.payload.reviewed_id);
        // Désaccord franc entre les deux ? → convoquer l'arbitre (une seule fois par fiche).
        await peutEtreArbitrer(row.payload.reviewed_id);
      }
    }
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
let siesteDepuis = 0;   // dernier report pour guichet quotidien fermé (voir PlafondJourError)
console.log(`⚙️  worker NIKA OPS — mode ${LOOP ? 'continu' : 'drain'} · ${CONC} tâche(s) de front`);
for (;;) {
  await battreLeCoeur();
  // Guichet quotidien fermé au tour précédent : en continu on dort jusqu'à ce que la fenêtre
  // de 24 h glisse ; en drain on s'arrête (nuit.sh enchaîne sur l'ancrage et le bilan).
  if (siesteDepuis && Date.now() - siesteDepuis < 120_000) {
    if (!LOOP) { console.log('  ⏸ guichet quotidien fermé — fin du drain'); break; }
    console.log('  ⏸ guichet quotidien fermé — sieste de 15 min');
    await new Promise((r) => setTimeout(r, 15 * 60_000));
    siesteDepuis = 0;
    continue;
  }
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
  const ps = await fetch(`${OLLAMA}/api/ps`, { headers: enteteOllama() }).then((r) => r.json());
  for (const m of ps.models ?? []) {
    await fetch(`${OLLAMA}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...enteteOllama() }, body: JSON.stringify({ model: m.name, keep_alive: 0 }) });
    console.log(`  ⏏ ${m.name} déchargé — RAM rendue`);
  }
} catch { /* Ollama éteint : rien à décharger */ }
console.log(`fini — done: ${counts.done} · suspect: ${counts.suspect} · refused: ${counts.refused} · failed: ${counts.failed}`);
