// scripts/agent-worker.mjs — worker local NIKA OPS (L1).
// Boucle : claim pgmq → garde → modèle local via OmniRoute (sortie contrainte) → agent_results → archive.
// Usage :  node --env-file=.env.local scripts/agent-worker.mjs           (vide la file puis s'arrête)
//          node --env-file=.env.local scripts/agent-worker.mjs --loop    (tourne en continu, pause 30 s à vide)
// Confort machine : préfixer par `taskpolicy -c background` — macOS déclasse le worker en priorité
// CPU/IO de fond et l'interface reste fluide pendant les gros lots.
// Les résultats ne touchent JAMAIS les tables réelles : ils attendent la review dans agent_results.
import { createClient } from '@supabase/supabase-js';
import { clientOps, clientSite } from '../lib/ops/db.mjs';
import { z } from 'zod';
import { fetchFandomProse, citeLeNom } from './lib/fandom.mjs';
import { expertFor, axesSchema, AXES, checkPreuves, splitPreuves } from './lib/akasha-axes.mjs';
import { ROLES, angleFor } from './lib/akasha-roles.mjs';
import { nomExpert, memoireExpert, expertNiche } from './lib/akasha-experts.mjs';
import { viderParc } from './lib/whatsapp.mjs';
import { scoreAncrageProduction } from './lib/ancrage.mjs';
import { poserAuGraphe } from '../lib/akasha/relations.ts';
import { hostname } from 'node:os';
import { readFileSync as lireFichierSync } from 'node:fs';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
const execFile = promisify(execFileCb);
import { LIMITES_FOURNISSEURS } from '../lib/ops/limites.mjs';

const supabase = clientOps();
const OMNI_URL = process.env.OMNIROUTE_URL ?? 'http://localhost:20128/v1';
const OMNI_KEY = process.env.OMNIROUTE_API_KEY;
const LOOP = process.argv.includes('--loop');
const VT = 600; // fenêtre de visibilité pgmq (s) — assez large pour un lot en cours de traitement
// Un changement de modèle coûte ~147 s (mesuré le 26/07 sur 38 bascules) : on réclame donc
// plusieurs tâches d'un coup et on les REGROUPE PAR MODÈLE avant de les traiter.
// 24 depuis le 02/08 : maintenant que les groupes de modèles tournent en parallèle, un lot ne
// sert plus seulement à amortir la lecture — c'est lui qui décide COMBIEN de couloirs travaillent
// en même temps. Un lot de 12 dans une file homogène ne réveillait qu'un seul couloir.
const LOT = Number(process.argv.find((a) => a.startsWith('--lot='))?.split('=')[1] ?? 24);
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
// La file du CHAT vit sur SUPABASE, pas sur la base de travail (03/08) : c'est le webhook
// WhatsApp — hébergé sur Vercel, public — qui y dépose les messages de Dan, et Vercel ne peut
// pas joindre le VPS (pare-feu tailnet uniquement). Après la migration, le worker lisait une
// file `ops_chat` inexistante côté VPS : tout message WhatsApp tombait dans le vide, sans
// erreur. Le volume est de quelques messages par jour — l'egress est négligeable.
const fileClient = () => (CHAT ? clientSite() : supabase);

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

/** Markdown retiré : nos textes s'affichent bruts, un astérisque resterait à l'écran. */
const sansBalisage = (s) => String(s ?? '')
  .replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1')
  .replace(/(?<![\w*])\*(?!\s)(.+?)(?<![\s*])\*(?![\w*])/g, '$1')
  .replace(/^#{1,6}\s+/gm, '').replace(/^\s*[-–]\s+/gm, '· ');

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
      // TITRE STRICTEMENT ÉGAL = même entité par construction (02/08) : sur le wiki DE l'univers,
      // une page dont le titre est exactement notre nom ne peut pas être un homonyme d'ailleurs.
      // La garde refusait Yasunaga, Kyoko, Daril Ghiroza — pages justes mais trop PETITES pour
      // contenir un repère du résumé français. Le doute anti-homonyme ne vaut que si les titres
      // diffèrent (résolution par recherche).
      const titresEgaux = String(p.fandomTitle ?? '').trim().toLowerCase() === String(p.name ?? '').trim().toLowerCase();
      if (p.type === 'character' && !titresEgaux) {
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
  // TOILETTAGE FR (02/08) — le seul agent du parc qui ne rapporte AUCUN fait.
  //
  // Mesuré sur les 172 sections Death Note : 20 (12 %) portaient des calques de l'anglais —
  // « Ayant tombé amoureux », « est montré », « est vu », « il est révélé que ». Le fond est
  // juste (les juges l'ont validé, c'est leur travail), la langue non : ils contrôlent
  // l'ancrage aux faits, pas l'élégance. Un texte faux se rejette ; un texte mal écrit se
  // corrige — deux métiers, deux agents.
  //
  // Sa source de vérité n'est PAS le wiki : c'est le texte lui-même. La consigne est donc
  // l'inverse de celle d'un rédacteur — ne rien apporter. Et le juge le contrôle avec la
  // MÊME exigence que les autres : « chaque fait est-il dans la source ? », la source étant
  // ici la version d'origine. Un correcteur qui invente se fait refuser comme un rédacteur.
  toilettage_fr: {
    // Le français est le SUJET de la tâche, pas la connaissance canon : on prend un modèle
    // à l'aise dans la langue plutôt que l'expert de l'univers (--cloud= le remplace).
    model: 'mistral/mistral-large-latest',
    // Le pilote du 02/08 a rendu « lég**e**reux » et « *Death Note* » : le correcteur balise
    // ce qu'il corrige. Nos sections s'affichent en texte BRUT (CharacterZone, white-space:
    // pre-line) — les astérisques se verraient à l'écran. On les retire en code plutôt que
    // d'espérer que la consigne suffise : une règle déterministe ne se fatigue pas.
    // Plancher bas (40) parce que la longueur utile est CELLE DE L'ENTRÉE : 446 descriptions
    // Naruto/One Piece font moins de 200 caractères et portent pourtant un vrai défaut
    // (« Amachi est un ninja médical qui FUT un complice d'Orochimaru », 77 c). C'est
    // checkToilettage qui surveille le rapport de longueur — lui a le texte d'origine.
    zod: z.object({ texte: DescFr(40), corrige: z.boolean() })
      .transform((r) => ({ ...r, texte: sansBalisage(r.texte) })),
    schema: {
      type: 'object',
      properties: {
        texte: { type: 'string', description: 'Le texte en français corrigé' },
        corrige: { type: 'boolean', description: 'true si quelque chose a été corrigé' },
      },
      required: ['texte', 'corrige'],
      additionalProperties: false,
    },
    // 80, pas 200 : la moitié du corpus Naruto/One Piece est plus courte que 200 caractères
    // et porte pourtant de vrais défauts (« Akahoshi PRIT la tête du village », 142 c).
    guard: (p) => (String(p.texte ?? '').length < 80 ? 'texte trop court pour un toilettage' : null),
    prompt: (p) => `Tu es correcteur de langue pour l'encyclopédie AKASHA. Tu ne rédiges rien, tu ne
documentes rien : tu corriges le FRANÇAIS d'un texte déjà validé sur le fond.

TEXTE À CORRIGER — fiche « ${p.name} » (${p.universe})${p.titre ? `, section « ${p.titre} »` : ', description'} :
${p.texte}

RÈGLES ABSOLUES :
- Ne change AUCUN fait : ni nom, ni date, ni chiffre, ni lien entre personnages. N'ajoute
  rien, ne retire rien, ne résume pas. Le texte corrigé dit EXACTEMENT la même chose.
- Corrige : les calques de l'anglais (« est montré », « est vu », « il est révélé que »,
  « au travers de »), les participes fautifs (« Ayant tombé amoureux » → « Tombé amoureux »),
  les temps incohérents, les passifs lourds, les mots anglais résiduels, la ponctuation.
- CHAMPS D'INFOBOX EN PROSE (« Taille : 172,2 cm. Statut : Décédé. Première apparition :
  épisode 133. ») : ne les supprime PAS, FONDS-LES dans une phrase — chaque valeur doit
  survivre (« Mesurant 172 cm, il apparaît pour la première fois à l'épisode 133. »).
- PRÉSENT DE NARRATION, toujours : le passé simple est proscrit (« prit la tête » → « prend
  la tête », « fut capturé » → « est capturé »).
- Si le texte commence sans sujet ou par une minuscule, nomme le sujet — « ${p.name} » — et
  rien d'autre : aucun nom propre que la source ne contient déjà.
- Garde tels quels les noms propres canon (Death Note, Shinigami, Sharingan, Kekkei Genkai)
  et le présent de narration.
- N'ajoute AUCUNE apposition explicative, même vraie (« Hideki Ryuuga, connu sous le nom de
  L, est… ») : le lecteur a déjà le nom de la fiche sous les yeux, et ce que tu ajoutes n'a
  pas été vérifié sur la source.
- TEXTE BRUT : aucun balisage, ni astérisque, ni gras, ni italique, ni titre markdown.
- Si le français est déjà correct, renvoie le texte À L'IDENTIQUE et mets "corrige" à false.`,
  },

  fiche_section: {
    model: 'ollama/gemma4:12b',
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
- TA MÉMOIRE DE L'ŒUVRE NE COMPTE PAS ICI. Si tu connais un fait vrai qui n'est pas dans la
  section ci-dessous, il est hors sujet : ne l'écris pas. Un relecteur compare ton texte à
  CETTE section et à rien d'autre — tout ce que tu ajoutes de mémoire, même exact, sera compté
  comme non vérifiable et la section entière repartira. Une section courte et fidèle passe ;
  une section étoffée de souvenirs ne passe pas.
- Français encyclopédique sobre, présent de narration. Aucun anglicisme : traduis les termes
  courants, garde en romaji les noms propres canon (Sharingan, Mangekyō, Kekkei Genkai).
- Longueur À LA MESURE DE LA SOURCE : environ ${Math.max(3, Math.min(12, Math.round(String(p.section_texte ?? '').length / 300)))} phrases.
  Reprends les mécanismes, les conditions et les exceptions que la source décrit — mais ne
  remplis pas la place restante. Rendre une source maigre en peu de phrases est un succès.
- "titre" : le titre de la section en français (« Acquisition » → « L'éveil », « Abilities » →
  « Capacités », « Transformations » → « Évolutions »). Court, sans article inutile.

SOURCE — section « ${p.section_titre} » de l'article canon :
${p.section_texte}`,
  },
  arbitrage_claude_lot: {
    // DIX LITIGES PAR APPEL (02/08, « la cadence est lente ») : un litige = un appel CLI
    // entier coûtait 1 314 appels pour la pile de Dan — trois jours au guichet de 400. En lot
    // de dix : ~130 appels, la pile se vide dans la soirée. Même barème, mêmes garanties.
    model: 'anthropic/claude-haiku-4-5',
    guard: (p) => (!Array.isArray(p.litiges) || !p.litiges.length ? 'lot vide' : null),
    zod: z.object({ verdicts: z.array(z.object({ id: z.number(), decision: z.enum(['approve', 'reject']), motif: z.string().min(8) })).min(1) }),
    schema: {
      type: 'object',
      properties: { verdicts: { type: 'array', items: { type: 'object',
        properties: { id: { type: 'number' }, decision: { type: 'string', enum: ['approve', 'reject'] }, motif: { type: 'string' } },
        required: ['id', 'decision', 'motif'], additionalProperties: false } } },
      required: ['verdicts'], additionalProperties: false,
    },
    prompt: (p) => `Tu es l'ARBITRE FINAL de l'encyclopédie AKASHA. Des juges automatiques (petits
modèles) se sont contredits ou ont refusé ces productions — tu lis chacune et tu TRANCHES.

BARÈME :
- Seuls comptent le fait AJOUTÉ (absent de la source) et le fait CONTREDIT par elle.
- Section/description = TRADUCTION CONDENSÉE : détail non repris, choix de traduction,
  reformulation ne sont JAMAIS des défauts. Données clé=valeur : preuves anglaises verbatim
  attendues, l'anglais n'y est jamais un défaut. Un fait vrai à n'importe quel moment du récit
  est exact.
- Les juges pinaillent : vérifie leur reproche DANS la source avant de le croire.
- Vraie déformation, texte corrompu, hors sujet : reject. Sinon : approve.

Réponds UNIQUEMENT en JSON : {"verdicts":[{"id":<id>,"decision":"approve"|"reject","motif":"une phrase"}]}
— un verdict PAR litige, id repris tel quel.
===LITIGE===
${p.litiges.map((l) => `═══ LITIGE id=${l.id} — ${l.name} (${l.universe}, type ${l.task_type_origine})
PRODUCTION :
${l.production}
SOURCE :
${String(l.source).slice(0, 2800)}
REPROCHES : ${l.motifs}`).join('\n\n')}`,
  },
  arbitrage_claude: {
    // L'ARBITRE SUPRÊME — troisième étage de la hiérarchie mesurée le 02/08 : petits modèles
    // jugent en masse (0,0002 $), Claude tranche les litiges (0,006 $), Dan ne voit que les cas
    // d'école. Le balayeur (ops-litiges-claude.mjs) embarque TOUT dans la charge utile
    // (production, source, reproches) : le worker n'a rien à re-résoudre.
    model: 'anthropic/claude-haiku-4-5',
    guard: (p) => (!p.reviewed_id || !p.production || !p.source ? 'litige incomplet' : null),
    zod: z.object({ decision: z.enum(['approve', 'reject']), motif: z.string().min(8) }),
    schema: {
      type: 'object',
      properties: { decision: { type: 'string', enum: ['approve', 'reject'] }, motif: { type: 'string' } },
      required: ['decision', 'motif'], additionalProperties: false,
    },
    prompt: (p) => `Tu es l'ARBITRE FINAL de l'encyclopédie AKASHA. Des juges automatiques (petits modèles)
se sont contredits ou ont refusé cette production — toi, tu lis et tu TRANCHES.

BARÈME :
- Seuls comptent le fait AJOUTÉ (absent de la source) et le fait CONTREDIT par elle.
- Une section/description est une TRADUCTION CONDENSÉE : détail non repris, choix de traduction,
  reformulation ne sont JAMAIS des défauts.
- Données clé=valeur : les preuves sont des citations anglaises verbatim — l'anglais n'y est
  jamais un défaut. Un fait vrai à N'IMPORTE QUEL moment du récit est exact.
- Les juges automatiques pinaillent : vérifie leur reproche DANS la source avant de le croire.
- Vraie déformation (date fausse, mauvais personnage, fait inventé), texte corrompu ou hors
  sujet : reject. Sinon : approve.

Réponds UNIQUEMENT en JSON : {"decision":"approve"|"reject","motif":"une phrase — le fait qui tranche"}
===LITIGE===
FICHE : ${p.name} (${p.universe}) — type ${p.task_type_origine}
PRODUCTION CONTESTÉE :
${p.production}

SOURCE :
${String(p.source).slice(0, 6000)}

REPROCHES DES JUGES :
${p.motifs}`,
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

SOURCE DE RÉFÉRENCE (${p.kind === 'toilettage' ? 'VERSION D’ORIGINE du même texte, avant correction de la langue' : 'article du wiki canon'}) :
${p.source}

Contrôle, dans cet ordre :
1. ${p.alias_de ? `(identité acquise, voir ci-dessus — passe directement au point 2)` : `La production parle-t-elle bien de ${p.name}, et non d'un homonyme ou d'un proche ?`}
2. Chaque fait avancé est-il présent dans la source ? (un fait absent = invention)
${p.kind === 'section'
  ? `   ⚠ ET RIEN D'AUTRE. La production est une TRADUCTION FRANÇAISE CONDENSÉE d'un passage
   anglais : elle DOIT être plus courte que la source et n'en garder que l'essentiel. Ne sont
   donc PAS des défauts, et ne doivent jamais être signalés —
     · un détail de la source que la production ne reprend pas (c'est la condensation demandée) ;
     · un choix de traduction (« chips » pour « potato chips », « équipe spéciale » pour
       « task force ») : traduire n'est pas déformer ;
     · une reformulation, un regroupement de deux phrases, un ordre différent.
   Un seul défaut compte ici : un fait AJOUTÉ, absent de la source — ou un fait CONTREDIT par
   elle. Si tu hésites entre « traduit autrement » et « inventé », c'est traduit autrement.
`
  : ''}${p.kind === 'toilettage'
  ? `3. TÂCHE DE CORRECTION DE LANGUE : la production est la version corrigée de la source. Elle
   doit dire EXACTEMENT la même chose, en meilleur français. Vérifie donc DEUX choses —
   (a) aucun fait ajouté, retiré ni déformé. Un FAIT, c'est un nom propre, un chiffre, une
   date, un lien entre personnages ou une action. Ce n'est PAS un mot : remplacer un
   anglicisme par son équivalent français (« l'Équipe de tâche » → « l'équipe spéciale »,
   « est montré » → « apparaît ») est EXACTEMENT le travail demandé, jamais une déformation.
   Ne signale un fait changé que si le texte corrigé raconte autre chose ;
   (b) le français est-il réellement meilleur, et correct ? Si la correction n'apporte rien ou
   appauvrit le texte, verdict "a_corriger".`
  : p.kind === 'prose' || p.kind === 'section'
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

/** CONTRÔLE DU TOILETTAGE — en code, parce que deux juges LLM n'y arrivent pas (02/08).
 *
 *  Mesuré sur le pilote : les deux juges ont classé « à corriger » des corrections JUSTES
 *  (« l'Équipe de tâche » → « l'équipe spéciale », « tuer une personne » → « tuer quiconque »).
 *  C'est structurel, pas un défaut de prompt : on leur demande « chaque fait est-il dans la
 *  source ? » alors que la tâche consiste PRÉCISÉMENT à changer les mots. Un juge honnête
 *  signale donc chaque différence — et bloque tout. Deux prompts successifs n'y ont rien fait.
 *
 *  Ce que l'on veut vraiment interdire est bien plus étroit, et se vérifie sans modèle :
 *    · un nom propre qui disparaît ou qui APPARAÎT (le pilote a inventé « Hideki Ryuuga,
 *      connu sous le nom de L » — vrai, mais non vérifié sur la source) ;
 *    · un chiffre qui change (dates, numéros de chapitre, âges) ;
 *    · une négation qui saute — le seul moyen d'inverser un sens sans toucher au vocabulaire.
 *  Le reste — syntaxe, synonymes, ordre des mots — est le travail demandé.
 *
 *  Le fond, lui, a DÉJÀ été jugé quand la section a été écrite : on ne rejuge pas des faits,
 *  on surveille une réécriture. Et l'original reste dans agent_results : tout est réversible.
 */
function checkToilettage(out, p) {
  const avant = String(p.texte ?? ''), apres = String(out.texte ?? '');
  const suspects = [];
  const norm = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // Noms propres = mots capitalisés hors début de phrase. Comparaison en minuscules : passer
  // « l'Équipe » à « l'équipe » est une correction de casse, pas la perte d'un nom.
  // Un nom propre se réduit à son premier morceau alphanumérique : « Wammy's » et
  // « One-Shot » sont coupés en deux par l'apostrophe et le trait d'union, et se comparaient
  // alors à rien — le pilote a signalé « wammy's perdu ET ajouté » dans la même phrase.
  const cle = (m) => norm(m).split(/[^a-z0-9]+/).filter(Boolean)[0] ?? '';
  const propres = (t) => new Set((t.match(/(?<![.!?«]\s|^)\b[A-ZÀ-Þ][\wÀ-ÿ'’-]{2,}/g) ?? []).map(cle).filter((m) => m.length >= 3));
  const motsDe = (t) => new Set(norm(t).split(/[^a-z0-9]+/).filter(Boolean));
  const [pa, pb, ma, mb] = [propres(avant), propres(apres), motsDe(avant), motsDe(apres)];
  const perdus = [...pa].filter((n) => !mb.has(n));
  // Le nom de la fiche a le droit d'apparaître : 79 descriptions One Piece commencent sans
  // sujet (« celui qui le mange peut se transformer… ») et la correction doit pouvoir écrire
  // « Le Fruit de l'Araignée permet… ». Tout AUTRE nom propre neuf reste suspect.
  const sien = new Set(String(p.name ?? '').split(/[^\p{L}\p{N}]+/u).map(cle).filter(Boolean));
  const ajoutes = [...pb].filter((n) => !ma.has(n) && !sien.has(n));
  if (perdus.length) suspects.push(`nom propre perdu : ${perdus.slice(0, 4).join(', ')}`);
  if (ajoutes.length) suspects.push(`nom propre ajouté : ${ajoutes.slice(0, 4).join(', ')}`);
  // Les chiffres du NOM de la fiche ne comptent pas : nommer le sujet (« Le 18th Fleet
  // Gallery Head Chef apparaît… ») introduisait un 18 qui n'était pas dans le texte source.
  const sansNom = (t) => (p.name ? t.split(p.name).join(' ') : t);
  const chiffres = (t) => (sansNom(t).match(/\d+/g) ?? []).sort().join(',');
  if (chiffres(avant) !== chiffres(apres)) suspects.push('les chiffres ne correspondent plus');
  // Négation : on ne compte QUE la moitié porteuse (pas, jamais, aucun, ni, sans). Le « ne »
  // s'élide, se déplace et disparaît en français correct (« ne … pas » → « sans ») — le
  // compter faisait crier au sens inversé sur une simple reformulation.
  const nie = (t) => (t.match(/\b(pas|jamais|aucun|aucune|nul|nulle|ni|sans|rien)\b/gi) ?? []).length;
  if (nie(apres) < nie(avant)) suspects.push(`négation perdue (${nie(avant)} → ${nie(apres)})`);
  // Longueur : un correcteur ne résume pas et ne délaye pas. Le seul garde-fou de taille,
  // puisque le plancher du schéma ne peut pas dépendre de l'entrée. Marge haute large :
  // fondre une infobox en prose (« Taille : 172 cm. » → « Il mesure 172 cm. ») allonge.
  const r = apres.length / Math.max(1, avant.length);
  if (r < 0.6) suspects.push(`texte amputé (${avant.length} → ${apres.length} caractères)`);
  if (r > 2.2) suspects.push(`texte délayé (${avant.length} → ${apres.length} caractères)`);
  return suspects;
}

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
  // SECRÉTAIRE PREMIUM (rôle Claude n°5, activé par Dan le 02/08) : Haiku répond quand
  // NIKA_CHAT_PREMIUM=1 dans le .env.local du VPS — à poser après avoir crédité l'API
  // (le secrétaire vit sur le VPS, sans CLI : seule l'API le sert). Sans le drapeau, le
  // routage historique reste en place — le chat ne casse jamais faute de crédit.
  // JAMAIS MUET (03/08) : le secrétaire partage le guichet Claude avec l'arbitre, qui brûle les
  // 400 lots du jour dès le matin. Résultat mesuré : un message de Dan « reporté — guichet fermé »,
  // donc sans réponse pendant des heures. Un secrétaire qui répond moins bien vaut infiniment
  // mieux qu'un secrétaire muet : si le couloir premium est fermé, on retombe sur les gratuits.
  // CHAÎNE DE REPLI COMPLÈTE (03/08, deuxième correctif du soir) : le premier repli tombait sur
  // Groq… lui aussi épuisé à cette heure (800 req/j). Un secrétaire ne doit jamais dépendre d'un
  // seul couloir gratuit : on descend la liste jusqu'au premier OUVERT, et le dernier maillon est
  // DeepInfra — facturé au jeton, donc jamais fermé. Quelques centimes par mois pour la garantie
  // qu'un message de Dan trouve toujours quelqu'un.
  model: (p) => {
    const gemini = cibleWhatsApp(p.texte).cible === 'gemini';
    const chaine = [
      ...(process.env.NIKA_CHAT_PREMIUM === '1' ? ['anthropic/claude-haiku-4-5'] : []),
      ...(gemini ? ['gemini/gemini-flash-lite-latest'] : []),
      'groq/openai/gpt-oss-120b',
      'gemini/gemini-flash-lite-latest',
      'mistral/mistral-small-latest',
      'deepinfra/meta-llama/Llama-3.3-70B-Instruct-Turbo',
    ];
    return premierDispo([...new Set(chaine)]) ?? 'deepinfra/meta-llama/Llama-3.3-70B-Instruct-Turbo';
  },
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
  prompt: (p) => `Tu es ${cibleWhatsApp(p.texte).cible === 'gemini' ? 'Gemini, un des modèles' : 'le secrétaire'} de NIKA OPS, l'usine d'agents du projet NIKA
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
// review_local 800 → 1 000 le 02/08 : sur le toilettage, la relecture compare DEUX textes
// longs et la sortie a été coupée au plafond (« sortie coupée », puis JSON invalide).
// toilettage_fr rend un texte ENTIER, pas un résumé : il lui faut le budget d'une section.
// akasha_relations 900 → 1 800 → 3 000 le 02/08. Ce plafond avait été taillé sur Mistral ; Nemotron,
// devenu producteur titulaire l'après-midi même, rédige des preuves plus longues et se faisait
// couper net — 7 fiches perdues en 15 minutes (paulie, magellan, oolong, welfin…). Un plafond de
// sortie n'est pas une propriété de la TÂCHE, c'est une propriété du couple tâche × modèle : il
// se recale à chaque changement de producteur. Le détecteur de troncature a fait son travail —
// c'est lui qui a nommé le remède dans le message d'erreur, sans lui les fiches partaient
// tronquées en relecture et les juges auraient condamné le contenu au lieu du réglage.
// 1 800 ne suffisait toujours pas (mesuré au deuxième tour) : Nemotron rédige une preuve
// citée pour CHAQUE relation, et une fiche bien reliée en compte huit ou dix.
// Le nom du modèle, sans son préfixe de couloir : « openrouter/nvidia/nemotron-3-ultra:free »
// → « nvidia/nemotron-3-ultra:free ». Remplace six `model.slice(N)` codés en dur, dont un faux —
// « openrouter/ » fait 11 caractères et le commentaire d'à côté disait 10, recopié de la branche
// DeepInfra. Le modèle partait donc avec un « / » de tête ; OpenRouter le tolérait, mais la clé
// de quota, elle, devenait « openrouter//nvidia/… » et ne retrouvait plus son plafond.
// C'est la DEUXIÈME fois aujourd'hui qu'une découpe de préfixe à un caractère près passe — un
// compte de caractères écrit à la main n'a aucune raison d'être là où le séparateur suffit.
const sansCouloir = (m) => String(m).slice(String(m).indexOf('/') + 1);
// GARDE ANTI-CORRUPTION (03/08) — le QC de flux a trouvé du charabia PUBLIÉ : hangul, mots
// espagnols/turcs insérés, jetons mixtes. Les juges 24-32B laissent passer ; le code, non.
// Détection : scripts non latins (hors japonais romanisé), mots-outils étrangers entourés
// d'espaces, jetons mêlant lettres+chiffres improbables. Une prise = failed (rejouable).
const MARQUES_CORRUPTION = [
  /[\u3130-\u318F\uAC00-\uD7AF\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF]/, // hangul/cyrillique/arabe/CJK
  / (desde|durante|hacia|также|entonces|также|birlikte|çünkü|però|además) /i,
  /[a-z][A-Z]{2,}[a-z]/,                                    // « ZdécoE », « VfrmutifL »
];
const sentLaCorruption = (texte) => MARQUES_CORRUPTION.some((m) => m.test(String(texte ?? '')));
const NUM_PREDICT = { akasha_attrs: 700, fandom_descfr: 500, flavor_akasha: 300, review_local: 1_000, akasha_relations: 3_000, fiche_section: 1_600, fiche_technique: 400, fiche_artefact: 400, fiche_lieu: 400, fiche_lexique: 400, whatsapp_reponse: 500, toilettage_fr: 2_400 };
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
// Plan du Dispatcheur : lu du disque au plus toutes les 60 s, ignoré s'il a plus de 30 min.
let _routage = { quand: 0, plan: {} };
function lireRoutage() {
  if (Date.now() - _routage.quand < 60_000) return _routage.plan;
  _routage.quand = Date.now();
  try {
    const j = JSON.parse(lireFichierSync(process.env.NIKA_ROUTAGE ?? new URL('../data/routage.json', import.meta.url), 'utf8'));
    _routage.plan = Date.now() - new Date(j.genere).getTime() < 30 * 60_000 ? (j.routage ?? {}) : {};
  } catch { _routage.plan = {}; }
  return _routage.plan;
}
const couloirsEpuises = new Map();   // modèle → date de RÉOUVERTURE (1 h si épuisé, 3 min si saturé)
const couloirDispo = (m) => !couloirsEpuises.has(m) || Date.now() > couloirsEpuises.get(m);
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
    const planJuges = lireRoutage().review_local;
    const viviers = planJuges?.length ? [...planJuges, ...JUGES_CLI] : JUGES_CLI;
    const remplacant = premierDispo([...new Set(viviers)].filter((m) => !interdits.has(m)));
    if (porte && remplacant) console.log(`  ⇄ juge ${porte} indisponible → ${remplacant}`);
    return remplacant ?? porte ?? JUGES_CLI[0] ?? JUGE;
  }
  // MODÈLE FIXE INVIOLABLE (02/08) : arbitrage_claude est un ÉTAGE, pas une tâche de masse —
  // --cloud l'écrasait et Nemotron a rendu des verdicts sous la signature de Claude (5 litiges,
  // découvert en lisant le premier plan du Dispatcheur). Ni la rotation ni le plan n'y touchent.
  if (type === 'arbitrage_claude' || type === 'arbitrage_claude_lot') return TASK_TYPES[type].model;
  if (CLOUDS.length) {
    // LE PLAN DU DISPATCHEUR d'abord (02/08, rôle Claude n°6) : data/routage.json, régénéré
    // toutes les 15 min depuis l'état réel des piles et des guichets. Périmé (> 30 min) ou
    // muet sur ce type → la liste statique reprend, comme avant. L'intelligence est périodique
    // et stratégique — jamais un appel LLM par tâche.
    const plan = lireRoutage()[type];
    if (plan?.length) {
      const duPlan = premierDispo(plan.filter((c) => CLOUDS.includes(c)));
      if (duPlan) return duPlan;
    }
    // Les PENSEURS (Nemotron, gpt-oss) brûlent leur budget de sortie en raisonnement caché sur
    // les LONGS prompts, malgré /no_think — 31 sections coupées le 02/08, même après avoir
    // doublé le plafond (4 000 jetons !). La course au plafond est perdue d'avance : une tâche
    // à prompt long va d'abord à un producteur SOBRE (Mistral réussissait les mêmes sections
    // à 1 700). Les penseurs restent en repli si les sobres ont fermé leurs guichets.
    if (type === 'fiche_section') {
      const sobre = premierDispo(CLOUDS.filter((m) => !SANS_PENSEE.has(sansCouloir(m))));
      if (sobre) return sobre;
    }
    return premierDispo(CLOUDS) ?? CLOUDS[0];                     // production au cloud
  }
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
// Guichet QUOTIDIEN fermé ≠ panne : la tâche n'a pas échoué, elle est trop tôt. En mode
// continu (24/7, L23) la marquer « failed » brûlerait toute la file dès le plafond atteint.
// Cette erreur distincte fait REPORTER la tâche : rien en base, message laissé en file
// (sa visibilité expire → il repart), et le worker fait la sieste jusqu'à la fenêtre suivante.
class PlafondJourError extends Error {
  constructor(cle, limite) { super(`guichet du jour fermé pour ${cle} (plafond ${limite})`); this.cle = cle; }
}
// « Model busy » ≠ guichet fermé : le modèle est saturé LÀ MAINTENANT, pas épuisé pour la
// journée. À 20 juges de front sur le même Qwen, chaque verdict payait 3×21 s de pauses
// (02/08 au soir, cadence divisée par trois). On écarte le modèle 3 min et la rotation sert
// le confrère suivant — mistral-small et nvidia attendaient, inutilisés.
class SaturationError extends Error {
  constructor(cle) { super(`${cle} saturé (model busy)`); this.cle = cle; }
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
  const role = CHAT ? 'chat'
    : (TYPES?.length === 1 && TYPES[0] === 'arbitrage_claude') ? 'arbitre-claude' : 'agents';
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
  // La remise flex n'est bonne que si DeepInfra a de la capacité flex : certains soirs il n'en a
  // AUCUNE et chaque verdict payait 3×21 s de pauses avant d'échouer (02/08, juges à l'arrêt).
  let sansFlex = false;
  for (let essai = 1; ; essai++) {
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // +900 de marge : les modèles « à raisonnement » (gpt-oss) brûlent des tokens AVANT le
        // JSON — et Nemotron pense PARFOIS malgré /no_think sur les longs prompts (+2400, 29/07).
        model: modele, stream: false, messages: msgs,
        // Température basse (03/08) : à la température par défaut du fournisseur, Mistral-Small
        // DeepInfra partait en délire multilingue sur les longues sections (« 그런 Shalnark »,
        // personnages inventés). Une encyclopédie ne crée pas — elle traduit : 0.2 partout.
        temperature: 0.2,
        // flex RESTREINT AU JUGEMENT (03/08) : sur la production, le tier dégradé est le suspect
        // n°1 du délire multilingue (5/12 sections encore atteintes après la température 0.2 —
        // « desde », troncatures, une hallucination). Les verdicts courts n'ont jamais été pris
        // en défaut : ils gardent la remise de 20 %.
        ...(url.includes('deepinfra.com') && type === 'review_local' && !sansFlex ? { service_tier: 'flex' } : {}),
        max_tokens: (NUM_PREDICT[type] ?? 800) + (SANS_PENSEE.has(modele) ? 2_400 : 900),
        response_format: modeJson === 'json_schema'
          ? { type: 'json_schema', json_schema: { name: type, strict: true, schema } }
          : { type: 'json_object' },
      }),
    });
    if (res.status === 429) {
      const corps = await res.text();
      // « No flex capacity available » : pas un débit à attendre — le tier N'EXISTE pas là
      // maintenant. On rebascule au tier standard sur-le-champ, sans pause.
      if (/no flex capacity/i.test(corps)) {
        sansFlex = true;
        console.log(`  ⇄ flex sans capacité (${new URL(url).host}) — repli immédiat au tier standard`);
        continue;
      }
      // « Model busy » / « Rate limit exceeded » : saturation de l'INSTANT, pas du compte.
      // Un essai rapide décalé, puis on rend la main à la rotation (SaturationError → 3 min
      // de côté). Les pauses de 21 s synchronisées entre 24 workers formaient un troupeau qui
      // re-tirait groupé et re-déclenchait le même 429 à l'infini (mistral-large 02/08 au
      // soir : usine tombée à 250/h sur une rafale par SECONDE que notre fenêtre par minute
      // ne voit pas).
      if (/model busy|rate limit exceeded/i.test(corps)) {
        if (essai >= 2) throw new SaturationError(fournisseur ? `${fournisseur}/${modele}` : `deepinfra/${modele}`);
        console.log(`  ⏳ ${modele} saturé — pause courte puis rotation`);
        await new Promise((r) => setTimeout(r, 4_000 + Math.floor(Math.random() * 4_000)));
        continue;
      }
      // Un 429 « par JOUR » (TPD/RPD) ne se rattrape pas en attendant : le couloir est mort
      // jusqu'au lendemain. Attendre 27 min pour re-tenter et re-échouer endormait l'usine —
      // constaté le 01/08, llama-70b épuisé faisait 1 tâche en 20 min. On le traite comme
      // notre propre guichet quotidien : le couloir est marqué, la rotation prend le relais.
      if (/per day|\bTPD\b|\bRPD\b|daily/i.test(corps)) {
        throw new PlafondJourError(fournisseur ? `${fournisseur}/${modele}` : modele, 'plafond QUOTIDIEN du fournisseur');
      }
      // 4 essais de 429 = le couloir n'encaisse pas MAINTENANT : 3 min de côté via la
      // rotation plutôt qu'un échec sec qui laisse la boucle re-choisir le même couloir.
      if (essai >= 4) throw new SaturationError(fournisseur ? `${fournisseur}/${modele}` : `${new URL(url).host}`);
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
      modele: sansCouloir(model), messages, type, schema,
    });
  } else if (model.startsWith('groq/') && process.env.GROQ_API_KEY) {
    // Groq NATIF dès que la clé est dans .env.local : OmniRoute sort du chemin de production
    // (bilan du 26/07 : gel sur response_format, serveur périmé aveugle aux clés, préfixes volés
    // par des alias — 3 pannes réelles pour un proxy d'un seul fournisseur).
    raw = await appelOpenAICompat({
      url: 'https://api.groq.com/openai/v1/chat/completions', cle: process.env.GROQ_API_KEY,
      modele: sansCouloir(model), messages, type, schema,
    });
  } else if (model.startsWith('nvidia/')) {
    // Branche DORMANTE (clé à créer, vérif téléphone) — 40 req/min gratuits, OpenAI-compatible.
    if (!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY absente de .env.local');
    raw = await appelOpenAICompat({
      url: 'https://integrate.api.nvidia.com/v1/chat/completions', cle: process.env.NVIDIA_API_KEY,
      modele: sansCouloir(model), messages, type, schema,
    });
  } else if (model.startsWith('deepinfra/')) {
    // Facturé au JETON, sans quota quotidien — la sortie de l'impasse des paliers gratuits
    // (veille du 01/08). Juger toute l'encyclopédie deux fois ≈ 5 $, soit moins d'un mois de
    // VPS. API strictement compatible OpenAI, json_schema strict pris en charge.
    if (!process.env.DEEPINFRA_API_KEY) throw new Error('DEEPINFRA_API_KEY absente de .env.local');
    raw = await appelOpenAICompat({
      url: 'https://api.deepinfra.com/v1/openai/chat/completions', cle: process.env.DEEPINFRA_API_KEY,
      modele: sansCouloir(model), messages, type, schema,
    });
  } else if (model.startsWith('mistral/')) {
    // Branche DORMANTE — ⚠ palier gratuit Mistral : les données servent à l'entraînement.
    // Fiches PUBLIQUES uniquement, jamais de données client (règle absolue).
    if (!process.env.MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY absente de .env.local');
    raw = await appelOpenAICompat({
      url: 'https://api.mistral.ai/v1/chat/completions', cle: process.env.MISTRAL_API_KEY,
      modele: sansCouloir(model), messages, type, schema,
    });
  } else if (model.startsWith('openrouter/')) {
    // Branche DORMANTE — modèles :free (20/min, 50/j — 1 000/j après un versement unique de 10 $).
    if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY absente de .env.local');
    raw = await appelOpenAICompat({
      url: 'https://openrouter.ai/api/v1/chat/completions', cle: process.env.OPENROUTER_API_KEY,
      modele: sansCouloir(model), messages, type, schema,
    });
  } else if (model.startsWith('anthropic/')) {
    // CLAUDE DANS LA FLOTTE (02/08) — l'étage d'arbitrage qui a vidé la pile de Dan (128 litiges,
    // 77 % de faux positifs des petits juges) devient permanent. API Messages native : le
    // format n'est pas OpenAI-compatible, et le préambule statique passe en system AVEC
    // cache_control — facturé à 10 % dès le deuxième litige de la fenêtre.
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY absente de .env.local');
    await quotaReserver(`anthropic/${sansCouloir(model)}`, Math.ceil((messages[0]?.content?.length ?? 0) / 4) + 700);
    const [systeme, ...reste] = String(messages[0].content).split('\n===LITIGE===\n');
    const rA = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: sansCouloir(model), max_tokens: 500,
        system: [{ type: 'text', text: systeme, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: reste.join('\n') || systeme }],
      }),
    });
    const corpsA = await rA.text();
    if (rA.status === 400 && /credit balance is too low/i.test(corpsA)) {
      // SOLDE API ÉPUISÉ → repli sur L'ABONNEMENT (02/08, question de Dan : « utilisable avec
      // abonnement claude ? » — oui). Claude Code en mode sans-tête (claude -p) est couvert par
      // le forfait Max, jeton OAuth déjà dans .env.local. Nuance assumée : ces arbitrages
      // puisent dans les limites d'usage de l'abonnement — celles des sessions interactives de
      // Dan. Le CLI n'existe que sur le Mac : ailleurs, guichet fermé proprement (la tâche
      // attend, le couloir re-teste dans l'heure — l'API reprend la main dès qu'elle est créditée).
      let cliOk = false;
      try { await execFile('claude', ['--version'], { timeout: 8_000 }); cliOk = true; } catch { /* pas de CLI ici */ }
      if (!cliOk) throw new PlafondJourError(`anthropic/${sansCouloir(model)}`, 'solde API épuisé, pas de CLI — console.anthropic.com');
      const { stdout } = await execFile('claude',
        ['-p', String(messages[0].content), '--model', sansCouloir(model)],
        { timeout: 180_000, maxBuffer: 4 * 1024 * 1024, env: (({ ANTHROPIC_API_KEY: _cle, ...e }) => e)(process.env) });
      raw = stdout;
    }
    else if (rA.status === 429) throw new PlafondJourError(`anthropic/${sansCouloir(model)}`, 'limite de débit Anthropic');
    else if (!rA.ok) throw new Error(`anthropic ${rA.status}: ${corpsA.slice(0, 160)}`);
    else {
      const jA = JSON.parse(corpsA);
      raw = jA?.content?.find((b) => b.type === 'text')?.text ?? '';
    }
    // Haiku commente volontiers APRÈS son JSON (« Voilà mon verdict… ») : on clampe à l'objet
    // le plus externe avant le parseur strict — même filet que pour les penseurs Qwen.
    raw = (String(raw).match(/\{[\s\S]*\}/) ?? [raw])[0];
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
        : type === 'akasha_relations' ? checkRelations(out, p)
        : type === 'toilettage_fr' ? checkToilettage(out, p) : [];
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
        couloirsEpuises.set(e.cle, Date.now() + 3_600_000);
        const suivant = modelOf(type, p);
        if (suivant && suivant !== modele) { console.log(`  ⇄ ${e.cle} épuisé aujourd'hui → bascule sur ${suivant}`); continue; }
        return { ...base, status: 'reporte', error: e.message };
      }
      // Saturation passagère : 3 min de côté, le confrère suivant prend la main sans pause.
      if (e instanceof SaturationError) {
        couloirsEpuises.set(e.cle, Date.now() + 180_000);
        const suivant = modelOf(type, p);
        if (suivant && suivant !== modele) { console.log(`  ⇄ ${e.cle} saturé — 3 min de côté → ${suivant}`); continue; }
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
  } else if (row.task_type === 'toilettage_fr') {
    // Rien à juger si le correcteur n'a rien touché : pas de relecture, pas d'écriture.
    if (!row.result?.corrige || String(row.result?.texte ?? '') === String(p.texte ?? '')) return;
    production = row.result.texte;
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
    // Toilettage : la source de vérité est la VERSION D'ORIGINE. Le juge compare donc les
    // deux français et voit immédiatement un fait ajouté, retiré ou déformé au passage.
    : row.task_type === 'toilettage_fr'
      ? { text: String(p.texte ?? ''), title: p.name }
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
  // TROIS ESSAIS (audit 02/08) : un échec silencieux ici fabrique une production ORPHELINE —
  // insérée en base, aucun juge en file, invisible partout (la classe de bug rattrapée par
  // ops-rejoue-relectures le 02/08 : 118 sections Death Note). On préfère crier que perdre.
  const envoyerJury = async (messages) => {
    for (let essai = 1; essai <= 3; essai++) {
      const { error } = await supabase.rpc('ops_queue_send_batch', { messages });
      if (!error) return true;
      console.error(`  ✗ mise en file du jury (essai ${essai}/3) : ${error.message.slice(0, 80)}`);
      await new Promise((r) => setTimeout(r, 1000 * essai));
    }
    console.error(`  ✗✗ jury JAMAIS mis en file pour #${reviewedId} — ops-rejoue-relectures le rattrapera`);
    return false;
  };
  await envoyerJury(
    juges.map((j) => ({
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
        // « section » à part depuis le 02/08 : une section n'est pas de la prose libre, c'est
        // une TRADUCTION CONDENSÉE d'un passage anglais, et le contrôle doit le savoir.
        kind: row.task_type === 'akasha_attrs' ? 'axes'
          : row.task_type === 'akasha_relations' ? 'relations'
          : row.task_type === 'toilettage_fr' ? 'toilettage'
          : row.task_type === 'fiche_section' ? 'section' : 'prose',
        evite: modelesDuJury.filter((m) => m !== j.juge_modele),
      },
    })));
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
// L'ARBITRE CHANGE DE FAMILLE le 02/08, conséquence directe du reclassement de NVIDIA. Tant que
// NIM passait pour une réserve finie, il ne servait qu'ici ; maintenant qu'on sait que c'est un
// débit renouvelable à 40 rpm, sa place est en PRODUCTION, où il double la cadence de Mistral.
// Mais un arbitre ne peut pas appartenir à la famille de celui qu'il arbitre — ni à celle des
// deux juges. Il reste donc exactement une famille libre : Qwen.
//   NVIDIA produit · Meta et Google jugent · Qwen départage. Quatre familles, aucune ne se juge.
// Liste ORDONNÉE et non modèle unique : le premier choix n'est valable que s'il n'est pas déjà
// l'un des deux juges de CETTE fiche. Le cas se produit dès que gemma épuise ses 450 requêtes du
// jour — le juge n°2 devient Qwen, et un arbitre Qwen ne ferait que répéter son propre vote.
// Le repli n'était vérifié que pour le REMPLAÇANT (liste `evite`), jamais pour le titulaire.
const ARBITRES = [
  process.env.DEEPINFRA_API_KEY && 'deepinfra/Qwen/Qwen3-32B',
  process.env.OPENROUTER_API_KEY && 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free',
  process.env.NVIDIA_API_KEY && 'nvidia/nvidia/nemotron-3-super-120b-a12b',
  process.env.MISTRAL_API_KEY && 'mistral/mistral-large-latest',
].filter(Boolean);
const arbitrePour = (juge1, juge2) => {
  const pris = new Set([juge1, juge2].filter(Boolean));
  return ARBITRES.find((m) => !pris.has(m)) ?? ARBITRES[0] ?? null;
};
async function peutEtreArbitrer(reviewedId) {
  if (!ARBITRES.length) return;
  const { data: r } = await supabase.from('agent_results')
    .select('id, task_type, target_slug, payload, result, review_status, auto_verdict, auto2_verdict, auto_model, auto2_model, arbitre_at')
    .eq('id', reviewedId).single();
  if (!r || r.review_status !== 'pending' || r.arbitre_at) return;
  const a = r.auto_verdict, b = r.auto2_verdict;
  if (!a || !b || a === b) return;
  if (a !== 'valide' && b !== 'valide') return;   // d'accord pour corriger : rien à arbitrer
  const arbitre = arbitrePour(r.auto_model, r.auto2_model);
  if (!arbitre) return;
  const { data: gagne } = await supabase.from('agent_results')
    .update({ arbitre_at: new Date().toISOString(), arbitre_model: `${arbitre} (convoqué)` })
    .eq('id', reviewedId).is('arbitre_at', null).select('id');
  if (!gagne?.length) return;
  console.log(`  ⚖ arbitre convoqué (${a} / ${b}) sur #${reviewedId} → ${arbitre.split('/').pop()}`);
  // L'arbitre départage : s'il devait être remplacé (guichet fermé), son remplaçant ne peut
  // pas être l'un des deux juges qu'il arbitre — sinon il ne ferait que répéter un vote.
  await chainReview({ task_type: r.task_type, target_slug: r.target_slug, payload: r.payload, result: r.result },
    reviewedId, [{ juge_modele: arbitre, slot: 'arbitre' }],
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
    const { data: entry } = await clientSite().from('akasha_entries').select('attributes').eq('slug', slug).single();
    if (!entry) return false;
    const attrs = { ...(entry.attributes ?? {}) };
    const dejaLa = Array.isArray(attrs.sections) ? attrs.sections : [];
    attrs.sections = [...dejaLa.filter((x) => String(x.i) !== String(neuve.i)), neuve]
      .sort((a, b) => Number(a.i) - Number(b.i));
    attrs.sectionsSource = modele;
    await clientSite().from('akasha_entries').update({ attributes: attrs }).eq('slug', slug);

    const { data: apres } = await clientSite().from('akasha_entries').select('attributes').eq('slug', slug).single();
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
    .eq('id', rowId).eq('review_status', 'pending').in('status', ['done', 'suspect']).single();
  if (!avant) return false;
  const ancrage = await scoreAncrageProduction(avant);
  if (ancrage) await supabase.from('agent_results').update({ auto_score: ancrage.min }).eq('id', rowId);

  // Verrou optimiste : un seul gagnant si plusieurs relectures finissent en même temps.
  const { data: gagne } = await filtres(
    supabase.from('agent_results')
      .update({ review_status: 'approved', auto_applique: true, reviewed_at: new Date().toISOString() })
      .eq('id', rowId).eq('review_status', 'pending').in('status', ['done', 'suspect']),
  ).select('*').single();
  if (!gagne) return false;

  const { data: entry } = await clientSite().from('akasha_entries').select('attributes').eq('slug', gagne.target_slug).single();
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
  } else if (gagne.task_type === 'toilettage_fr' && !gagne.payload?.section_index) {
    // Naruto et One Piece n'ont quasiment pas de sections (1 fiche sur 5 588) : leur prose,
    // c'est descFr. Le toilettage réécrit donc le champ qu'il a reçu, pas un type de champ.
    if (!gagne.result?.texte || !gagne.result?.corrige) return false;
    patch.descFr = gagne.result.texte;
    patch.descFrSource = `${gagne.model} (toilettage)`;
    await clientSite().from('akasha_entries').update({ attributes: patch }).eq('slug', gagne.target_slug);
    // Message distinct : ici la porte est le CONTRÔLE DE CODE, pas deux verdicts de juges —
    // afficher « double valide » raconterait une vérification qui n'a pas eu lieu.
    console.log(`  ⚡ français corrigé — description : ${gagne.target_slug}`);
    return true;
  } else if (gagne.task_type === 'toilettage_fr') {
    // Même chemin que ci-dessus (ajouterSection remplace la section de même indice) : le
    // toilettage ne crée jamais de section, il en réécrit une — et il hérite du verrou
    // anti-concurrence, car plusieurs sections d'une même fiche se corrigent en parallèle.
    const p = gagne.payload ?? {};
    const texte = gagne.result?.texte;
    if (!p.section_index || !texte || !gagne.result?.corrige) return false;
    const pose = await ajouterSection(gagne.target_slug, { i: p.section_index, titre: p.titre, texte }, gagne.model);
    if (!pose) return false;
    console.log(`  ⚡ français corrigé — « ${p.titre} » : ${gagne.target_slug}`);
    return true;
  } else if (gagne.task_type === 'akasha_relations') {
    const rel = gagne.result?.relations ?? [];
    if (!rel.length) return false;
    patch.relations = rel.map(({ avec, nature, periode, resume }) => ({ avec, nature, periode, resume }));
    patch.relationsSource = gagne.model;
  } else return false;
  await clientSite().from('akasha_entries').update({ attributes: patch }).eq('slug', gagne.target_slug);
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
  // Les tâches qu'un nœud ne sait pas exécuter (modèle local sans GPU ici, ou modèle nuage sur
  // un nœud --local) sont écartées EN AMONT, dans la boucle, et rendues à la flotte séance
  // tenante. Les écarter ici les aurait laissées invisibles pendant VT — voir le tri de modèle.
  const row = await processMessage(msg);
  if (row.status === 'done' && ['fiche_section', 'fandom_descfr', 'toilettage_fr', 'fiche_technique', 'fiche_artefact', 'fiche_lieu', 'fiche_lexique'].includes(row.task_type)) {
    const prose = row.result?.texte ?? row.result?.descFr ?? '';
    if (sentLaCorruption(prose)) {
      row.status = 'failed';
      row.error = 'corruption détectée par la garde de code (charabia/langue étrangère) — rejouable';
    }
  }
  if (row.status === 'reporte') {
    // Ni archivage ni écriture : le message reste en file (visibilité expirée → il repart
    // à la fenêtre suivante). On signale à la boucle qu'il faut lever le pied.
    siesteDepuis = Date.now();
    console.log(`  ⏸ [${msg.msg_id}] ${row.target_slug ?? row.task_type} reporté — ${row.error}`);
    return;
  }
  counts[row.status]++;

  if (row.task_type === 'arbitrage_claude_lot' && row.status === 'done') {
    const attendus = new Map((row.payload.litiges ?? []).map((l) => [Number(l.id), l]));
    let appliques = 0;
    for (const v of row.result?.verdicts ?? []) {
      const cible = Number(v.id);
      if (!attendus.has(cible)) continue;                      // id inventé : ignoré
      await supabase.from('agent_results').update({
        arbitre_verdict: v.decision === 'approve' ? 'valide' : 'rejeter',
        arbitre_motif: `⚖ Claude : ${String(v.motif ?? '').slice(0, 300)}`,
        arbitre_model: `${row.model} (arbitrage)`, arbitre_at: new Date().toISOString(),
      }).eq('id', cible).eq('review_status', 'pending');
      if (v.decision === 'approve') await verrouEtAppliquer(cible, (q) => q);
      else await supabase.from('agent_results').update({ review_status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', cible).eq('review_status', 'pending');
      appliques++;
    }
    await fileClient().rpc(RPC.archive, { message_id: msg.msg_id });
    console.log(`  ⚖⚡ [${msg.msg_id}] lot de ${attendus.size} litige(s) → ${appliques} verdict(s) (Claude)`);
    counts[row.status]++;
    return;
  }
  if (row.task_type === 'arbitrage_claude' && (row.status === 'done')) {
    // Le verdict de Claude s'écrit dans le slot ARBITRE de la production litigieuse, signé.
    // approve → application immédiate par le même verrou que le bouton de Dan ; reject →
    // rejet motivé. Dans les deux cas le litige SORT de la pile humaine.
    const cible = Number(row.payload.reviewed_id);
    const d = row.result?.decision;
    await supabase.from('agent_results').update({
      arbitre_verdict: d === 'approve' ? 'valide' : 'rejeter',
      arbitre_motif: `⚖ Claude : ${String(row.result?.motif ?? '').slice(0, 300)}`,
      arbitre_model: `${row.model} (arbitrage)`, arbitre_at: new Date().toISOString(),
    }).eq('id', cible).eq('review_status', 'pending');
    if (d === 'approve') await verrouEtAppliquer(cible, (q) => q);
    else await supabase.from('agent_results').update({ review_status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', cible).eq('review_status', 'pending');
    await fileClient().rpc(RPC.archive, { message_id: msg.msg_id });
    console.log(`  ⚖⚡ [${msg.msg_id}] litige #${cible} → ${d} (Claude)`);
    counts[row.status]++;
    return;
  }
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
      // « CLAUDE ICI » (04/08) — Dan s'adresse à la SESSION Claude Code ouverte sur son Mac, pas
      // au CLI du VPS : celle-là a le contexte de la journée, l'autre repart de zéro. Le worker
      // accuse réception et se tait ; l'écoute côté fenêtre (scripts/ops-ecoute-fenetre.mjs) prend
      // le relais. Sans ce garde-fou, les deux répondraient au même message.
      const pourLaFenetre = /^\s*claude\s+ici\b/i.test(row.payload.texte ?? '');
      if (pourLaFenetre) {
        try { await envoyerWhatsApp('📨 Reçu — transmis à la session Claude Code (elle a tout le contexte).', row.payload.de); }
        catch (e) { console.error('  ✗ accusé fenêtre :', String(e).slice(0, 120)); }
        await supabase.from('ops_notes').insert({ source: 'wa_fenetre', done: false,
          content: JSON.stringify({ de: row.payload.de, texte: row.payload.texte, a: row.payload.recu_a }) });
        console.log('  📨 message pour la fenêtre Claude Code — worker en retrait');
        await fileClient().rpc(RPC.archive, { message_id: msg.msg_id });
        return;
      }
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
    // TOILETTAGE : pas de jury LLM (voir checkToilettage — deux juges bloquent toute
    // réécriture par construction). Le contrôle de code EST la porte : propre → appliqué et
    // marqué ⚡ ; suspect → pile de Dan avec le motif exact. Rien n'est perdu : le texte
    // d'origine reste dans le payload, l'annulation le repose.
    if (ins?.id && row.task_type === 'toilettage_fr') {
      if (row.status === 'done' && row.result?.corrige) await verrouEtAppliquer(ins.id, (q) => q.eq('status', 'done'));
    // Enchaînement : toute production jugeable part aussitôt en relecture locale.
    } else if (ins?.id && (row.status === 'done' || row.status === 'suspect') && row.task_type !== 'whatsapp_reponse') await chainReview(row, ins.id);
  }
  await fileClient().rpc(RPC.archive, { message_id: msg.msg_id });
  console.log(`  ${row.status === 'done' ? '✓' : row.status === 'refused' ? '◇' : '✗'} [${msg.msg_id}] ${row.target_slug ?? row.task_type} (${row.status})`);
}

const counts = { done: 0, refused: 0, failed: 0, suspect: 0 };
let siesteDepuis = 0;   // dernier report pour guichet quotidien fermé (voir PlafondJourError)
console.log(`⚙️  worker NIKA OPS — mode ${LOOP ? 'continu' : 'drain'} · ${CONC} tâche(s) de front`);
// LE CŒUR BAT PENDANT LE TRAVAIL, PAS SEULEMENT ENTRE DEUX LOTS (02/08). Un tour de boucle
// dure le temps de son lot : douze tâches sur un couloir bridé à 12 req/min, ce sont des
// minutes sans un seul battement — et la console affichait « USINE ARRÊTÉE » pendant que
// l'usine produisait. Un signal de vie qui s'éteint quand le travail est le plus lourd
// désigne exactement l'inverse de ce qui se passe. Le battement vit donc sur son horloge.
if (LOOP) setInterval(() => { battreLeCoeur().catch(() => {}); }, 45_000).unref();
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
  // LECTURE PAR COULOIR (02/08) : un worker spécialisé ne lit QUE son couloir, le filtre est dans
  // la requête. Avant, il recevait la file entière et devait rendre ce qui n'était pas à lui —
  // réémission au fond, ordre de priorité détruit à chaque tour, deux workers se renvoyant la
  // file sans jamais la vider. C'est ce qui a gelé la flotte à 0,5 verdict/min ce matin.
  // Repli sur la lecture large si la fonction n'existe pas encore (base non migrée) : le tri de
  // couloir plus bas reste en place et fait le travail, en moins bien.
  const { data: lot, error } = TYPES && !CHAT
    ? await supabase.rpc('ops_queue_read_couloir', { p_vt: VT, p_qty: LOT, p_types: TYPES })
      .then((r) => (r.error?.message?.includes('ops_queue_read_couloir')
        ? fileClient().rpc(RPC.read, { vt: VT, qty: LOT }) : r))
    : await fileClient().rpc(RPC.read, { vt: VT, qty: LOT });
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
      // ARCHIVER SEULEMENT SI LA RÉÉMISSION A RÉUSSI (audit 02/08) : supabase-js ne lance pas
      // d'exception, il renvoie { error } — l'ignorer archivait des messages jamais réémis, une
      // perte définitive et muette. Sur échec on n'archive pas : la visibilité expirera et les
      // messages reviendront tout seuls, un doublon bénin plutôt qu'un trou.
      const { error: eEnvoi } = await supabase.rpc('ops_queue_send_batch', { messages: etrangers.map((m) => m.message) });
      if (eEnvoi) console.error(`  ✗ réémission hors couloir : ${eEnvoi.message.slice(0, 80)} — rien archivé`);
      else await supabase.rpc('ops_queue_archive_batch', { message_ids: etrangers.map((m) => m.msg_id) });
      console.log(`  ↷ ${etrangers.length} tâche(s) hors couloir remises en file`);
    }
    miens = lot.filter((m) => TYPES.includes(m.message?.type));
    if (!miens.length) {
      if (!LOOP) break;                                  // drain : plus rien pour ce couloir
      await new Promise((r) => setTimeout(r, 30_000));   // continu : on laisse le voisin les prendre
      continue;
    }
  }

  // Tri de MODÈLE — même geste que le tri de couloir, et pour la même raison. Un nœud qui ne
  // sait pas exécuter une tâche doit la RENDRE, pas se contenter de ne pas la faire : sa lecture
  // a posé une visibilité de VT (600 s) que personne ne lève. Mesuré le 02/08 : le Mac, armé en
  // juge local alors que tous les verdicts en file étaient attribués au nuage, lisait la file par
  // lots de 12 et la masquait entière au VPS — 427 relectures en attente, 0,5 verdict/min au lieu
  // de 35. Le nœud tournait « sans erreur », les compteurs étaient verts, et la file gelait.
  const gpuIci = await ollamaDisponible();
  const saitFaire = (m) => {
    const mod = String(modelOf(m.message?.type, m.message?.payload ?? {}) ?? '');
    return mod.startsWith('ollama/') ? gpuIci : !LOCAL;
  };
  const rendus = miens.filter((m) => !saitFaire(m));
  if (rendus.length) {
    const { error: eRendu } = await supabase.rpc('ops_queue_send_batch', { messages: rendus.map((m) => m.message) });
    if (eRendu) console.error(`  ✗ réémission à la flotte : ${eRendu.message.slice(0, 80)} — rien archivé`);
    else await supabase.rpc('ops_queue_archive_batch', { message_ids: rendus.map((m) => m.msg_id) });
    console.log(`  ↷ ${rendus.length} tâche(s) rendue(s) à la flotte (modèle non servi ici)`);
  }
  miens = miens.filter(saitFaire);
  if (!miens.length) {
    if (!LOOP) break;
    await new Promise((r) => setTimeout(r, 30_000));
    continue;
  }

  // Groupes par modèle : on épuise un modèle avant de passer au suivant (un changement
  // coûtait 147 s de médiane), et on parallélise à l'intérieur de chaque groupe.
  const groupes = new Map();
  for (const msg of miens) {
    const t = TASK_TYPES[msg.message?.type];
    const cle = t ? String(modelOf(msg.message.type, msg.message.payload ?? {})) : 'inconnu';
    (groupes.get(cle) ?? groupes.set(cle, []).get(cle)).push(msg);
  }
  // GROUPES EN PARALLÈLE SUR UN NŒUD SANS GPU (02/08). Les épuiser l'un après l'autre avait une
  // raison — recharger un modèle dans Ollama coûtait 147 s de médiane — mais cette raison ne vaut
  // que pour un GPU local, où un seul modèle tient en mémoire à la fois. Sur des API distantes il
  // n'y a rien à recharger, et la file d'attente les sépare déjà : chaque couloir a son propre
  // compteur par minute. En séquentiel, un lot de douze relectures monopolisait le nœud sur
  // gemma pendant que Nemotron, Mistral et DeepInfra attendaient sans rien faire — mesuré ce
  // midi : 169 verdicts et ZÉRO production en une demi-heure, alors que les couloirs de
  // production étaient tous ouverts. On répartit donc les places de front entre les groupes.
  if (gpuIci || groupes.size === 1) {
    for (const [modele, msgs] of groupes) {
      console.log(`  → ${msgs.length} tâche(s) sur ${modele}`);
      await traiterEnParallele(msgs, CONC);
    }
  } else {
    const part = Math.max(2, Math.floor(CONC / groupes.size));
    console.log(`  ⇉ ${groupes.size} couloirs en parallèle · ${part} place(s) chacun : `
      + [...groupes].map(([m, v]) => `${m.split('/').pop()}×${v.length}`).join(' · '));
    await Promise.all([...groupes].map(([, msgs]) => traiterEnParallele(msgs, part)));
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
