// lib/ops/limites.mjs — LES PLAFONDS DES COULOIRS, source unique (02/08/2026).
//
// Ce tableau vivait dans scripts/agent-worker.mjs, et la console /ops en tenait une COPIE À LA
// MAIN. Les deux ont divergé le jour même : la console annonçait « nvidia — fermé, requêtes
// épuisées » sur un couloir que le worker venait de rouvrir, et j'ai cherché la panne du mauvais
// côté pendant une heure. Un tableau de bord qui ment coûte plus cher qu'un tableau de bord
// absent — il envoie chercher au mauvais endroit.
//
// Fichier .mjs volontairement (pas .ts) : il est importé par le worker Node ET par la route
// Next.js. Aucune logique, aucun effet de bord — que des données, pour qu'il reste importable
// des deux côtés sans rien entraîner avec lui.
//
// Ce qu'un plafond veut dire :
//   requetes / jetons / fenetre : le débit soutenable, sur une fenêtre glissante (secondes)
//   parJour / jetonsParJour     : le guichet du jour ; ABSENT = pas de guichet connu
//                                 (facturé au jeton, ou débit renouvelable — voir nvidia)

export const LIMITES_FOURNISSEURS = {
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
  // ⚠ 2 → 12 le 02/08, TROISIÈME correction du même chiffre. Les deux premières (01/08) n'ont
  // touché que l'entrée FOURNISSEUR `mistral:` plus bas — celle-ci, plus spécifique, gagne dans
  // la résolution et gardait la valeur fausse. Mistral a donc passé la journée bridé à
  // 2 requêtes/minute là où il en encaisse 13 : d'où le « budget mistral épuisé — attente de la
  // fenêtre » en boucle dans les journaux, que j'ai lu comme un quota du fournisseur alors que
  // c'était le nôtre. Corriger une valeur en double, c'est n'en corriger aucune.
  'mistral/mistral-large-latest':    { requetes: 12, jetons: 20_000, fenetre: 60 },
  // ── Google — plafonds non publiés depuis déc. 2025 : 80 % des dernières valeurs connues.
  // gemma-4 est le meilleur débit du parc (2 193 jetons/production → 5/min, des milliers/jour).
  'gemini/gemini-flash-lite-latest': { requetes: 12, jetons: 200_000, fenetre: 60, parJour: 200 },
  'gemini/gemma-4-31b-it':           { requetes: 24, jetons: 12_000, fenetre: 60, parJour: 11_500 },
  // ── OpenRouter : palier débloqué le 02/08 (achat unique de 10 $ → 1 000 req/jour À VIE au
  // lieu de 50). Le quota des modèles « :free » est COMPTÉ PAR COMPTE, pas par modèle : les
  // guichets ci-dessous se partagent donc le millier, d'où 450 chacun et non 900. Cadence
  // plafonnée à 18/min, sous les 20/min imposées par OpenRouter à tous les modèles gratuits.
  // Sondes de taille réelle du 02/08 (3 000 jetons de source + schéma JSON strict) :
  //   nemotron-ultra 550B  ✓ 4,7 s, JSON propre      → arbitre
  //   gemma-4-26b-a4b      ✓ 5,6 s, JSON propre      → juge de famille Google
  //   nemotron-super 120B  ✓ 5,3 s (à 900 jetons de sortie ; à 400 il tronquait son raisonnement)
  //   gemma-4-31b          ✗ 429 systématique — hôte saturé, écarté malgré le modèle identique
  //   gpt-oss-20b          ✗ 19 s et JSON invalide   → écarté
  // jetons/minute portés à 300 000 le 02/08 : OpenRouter limite les REQUÊTES (20/min), pas les
  // jetons. À 50 000 c'était NOTRE compteur qui fermait le guichet — une relecture réserve
  // ~7 000 jetons, donc sept appels suffisaient à saturer une minute et l'arbitre passait son
  // temps en « budget épuisé — attente de la fenêtre » alors que le fournisseur ne disait rien.
  'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free': { requetes: 18, jetons: 300_000, fenetre: 60, parJour: 450 },
  'openrouter/google/gemma-4-26b-a4b-it:free':         { requetes: 18, jetons: 300_000, fenetre: 60, parJour: 450 },
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
  // GUICHET JOUR SUPPRIMÉ le 02/08, après être allé voir le compte plutôt que la documentation.
  // Nous gardions NIM comme un STOCK fini de ~1 000 crédits — c'est ce qu'annoncent encore tous
  // les articles de 2026, et c'est ce qui justifiait un plafond de 150/jour. Le compte n'a plus
  // de page « crédits » du tout : le menu affiche « Your API Rate Limit — Up to 40 rpm ». NIM
  // est donc un DÉBIT RENOUVELABLE, pas une réserve, et notre plafond bridait un couloir gratuit
  // deux fois plus rapide que Mistral. Aucun en-tête de quota n'est exposé : s'il existe un
  // plafond caché, le 429 le révélera et fermera le couloir une heure — c'est déjà géré.
  nvidia:     { requetes: 32, jetons: 100_000, fenetre: 60 },
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
  // 40 → 450 le 02/08 : ce repli valait pour un compte n'ayant jamais acheté (50 req/jour).
  // Depuis le déblocage à vie, tout modèle « :free » non listé plus haut hérite du bon ordre de
  // grandeur au lieu de se fermer après 40 appels. Même raison que Mistral juste au-dessus :
  // une valeur laissée en double finit par être la seule que quelqu'un lit.
  openrouter: { requetes: 18, jetons: 50_000, fenetre: 60, parJour: 450 },
  // Entrée NOMMÉE pour le producteur titulaire (02/08). Elle reprend exactement le repli
  // `nvidia:` ci-dessus — donc elle ne change rien au worker — mais elle le rend VISIBLE dans la
  // console, qui n'affiche que les couloirs désignés par leur modèle. Sans elle, le couloir qui
  // porte aujourd'hui toute la production n'apparaissait nulle part à l'écran.
  // 32 → 28 : le compte annonce 40 rpm, mais notre fenêtre GLISSE sur 60 s quand la leur se
  // remet à zéro à la minute — deux rafales de part et d'autre d'une frontière franchissent leur
  // seuil sans franchir le nôtre. Mesuré en 429 dès la mise en production. Le repli gère (pause
  // de 21 s), mais quatre requêtes de marge coûtent moins cher que les reprises.
  'nvidia/nvidia/nemotron-3-super-120b-a12b': { requetes: 28, jetons: 100_000, fenetre: 60 },
};
