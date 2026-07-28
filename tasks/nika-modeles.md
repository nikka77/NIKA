# Étude modèles → agents NIKA (28/07/2026)

Quel modèle anime quel agent, et pourquoi. Fondée sur NOS mesures (audits, duels, épreuves
du 28/07) d'abord, les réputations de benchmarks ensuite — un chiffre mesuré chez nous vaut
dix classements publics. À réviser à chaque audit hebdo.

## 1. Profils mesurés

| Modèle | Forces (mesurées chez nous) | Faiblesses (mesurées) | Coût |
|---|---|---|---|
| **gpt-oss-120b** (Groq) | raisonnement + `json_schema` strict natif ; 55 fiches auditées → 42 exactes ; rapide (~1-2 s) | erreurs d'ATTRIBUTION (fait voisin attribué au mauvais sujet — 4 cas/55) ; 6 k TPM serrés | gratuit |
| **llama-3.3-70b** (Groq) | juge n°2 en famille croisée : converge avec gemma local sur cas réel (Amaterasu ✓) ; 12 k TPM | pas de schéma strict → mode `json_object` + zod ; 900 req/j | gratuit |
| **llama-3.1-8b** (Groq) | 14 400 req/j, très rapide | **ÉCARTÉ** : recopie le schéma au lieu de répondre (test 28/07) | gratuit |
| **gemma4:12b** (Ollama local) | juge d'ancrage fiable (slot auto) ; illimité, gratuit, hors quotas | 1 seul à la fois (GPU ×0,97) ; ~30-90 s/tâche ; nécessite Mac réveillé ; needs `think:false` | gratuit |
| **gemma-4-31b-it** (AI Studio) | `responseSchema` natif ✓ ; français propre (Amaterasu ✓) ; **14 400 req/j à 30/min** | boucle en répétition à temp 0 (1 échec/2 → corrigé temp 0.2, à surveiller à l'audit) | gratuit |
| **gemini-flash-lite** (AI Studio) | juge historique correct ; 250 k TPM | 500 req/j ; même famille que gemma (plus juge n°2 depuis le 28/07) | gratuit |
| **Claude** (abonnement Max) | code, audit sur sources (86 % → réservé aux tâches d'orfèvrerie), synthèse | fenêtres 5 h ; précieux — ne pas gaspiller en tâches mécaniques | abonnement |

## 2. Affectations (qui anime quoi)

| Agent NIKA | Modèle | Pourquoi |
|---|---|---|
| Production attrs/relations (enums, preuves) | gpt-oss-120b | schéma strict + raisonnement — le cœur exigeant |
| Production bios/descFr (prose française) | gpt-oss-120b la nuit ; **gemma-31b en appoint jour** (via `--cloud=gemini/gemma-4-31b-it`) | prose FR propre, quota énorme — à qualifier par l'audit avant d'en faire un défaut |
| **Juge n°1** (slot auto) | gemma4:12b local | gratuit illimité, ancré, famille Google |
| **Juge n°2** (slot auto2) | **llama-3.3-70b** (avant : flash-lite) | VRAIE famille croisée (Meta vs Google) — deux juges Google partageaient leurs angles morts |
| Secrétaire WhatsApp | gpt-oss-120b | classement fiable (escalade/commande) — un raté = commande fantôme, déjà vécu |
| Interlocuteur « gemini: » | flash-lite | libéré du rôle de juge, reste le canal Gemini |
| Escalades code + discussions « claude: » + audit hebdo | Claude | le seul qui code et audite à ce niveau |
| (à venir, clés Dan) NVIDIA NIM · Mistral | juge n°3 d'arbitrage · 4e famille | Mistral : données PUBLIQUES uniquement (consentement entraînement) |

## 3. Principes issus de l'étude

1. **La famille prime le rang de benchmark** pour les juges : deux juges moyens de familles
   différentes attrapent plus d'erreurs qu'un excellent juge dédoublé (les 8 fiches fausses
   de l'audit avaient toutes passé un juge — l'attribution est l'angle mort commun).
2. **Le schéma strict est un critère d'embauche** : un modèle qui ne le supporte pas passe
   en `json_object` + zod (llama-70b ✓) ; un modèle qui échoue au test de base est écarté
   sans appel (llama-8b), quel que soit son quota.
3. **Tester avant d'affecter** : 3 sondes réelles (schéma, français, cas piège) coûtent
   2 minutes et ont écarté un modèle sur trois. Les quotas s'apprennent de l'API, les
   comportements s'apprennent des épreuves.
4. **Claude est un scalpel, pas une pelleteuse** : tout ce qui est mécanique va aux couloirs
   gratuits ; Claude garde le code, l'audit et la conversation.

## 4. Chantiers (état 28/07 soir)

- [~] Clés NVIDIA NIM + Mistral + OpenRouter : **branches DORMANTES prêtes dans le worker**
  (préfixes nvidia/, mistral/, openrouter/ + budgets prudents) — il ne manque que les clés
  (action Dan, vérif téléphone pour NVIDIA et Mistral) ; sonde d'embauche à l'arrivée de chaque clé.
- [x] Qualification gemma-31b lancée sur 52 fiches réelles : à mi-course 18 done / 1 failed
  (~5 % d'échec post température 0.2, contre ~50 % avant) ; les 10 refused sont des gardes
  (sources absentes), pas des fautes du modèle. L'audit hebdo tranchera sur la QUALITÉ.
- [x] Cerebras re-sondé : /models répond (gpt-oss-120b, gemma-4-31b, zai-glm-4.7) mais
  l'inférence reste en 402 Payment required — la liste GitHub était optimiste. Dormant.
- [x] Cloudflare Workers AI : EN RÉSERVE, décision motivée — aucun rôle léger en attente
  (le candidat naturel, llama-8b, a été écarté à l'épreuve ; les rôles fiables exigent des
  modèles ≥ 70B que Workers AI ne sert qu'en petites quantités de neurons/jour).

## 5. Experts par univers avec mémoire (L18 — vision Dan)

Chaque agent est désormais un EXPERT NOMMÉ « spécialité × univers » (l'Archiviste des
techniques de Naruto ≠ celui de Bleach) et porte une **mémoire qui le fait progresser** :
à chaque fiche, son prompt reçoit (1) ses dernières fiches APPROUVÉES du même univers
(exemplaires de ton et de niveau) et (2) les motifs de ses erreurs jugées (leçons à ne pas
répéter) — `scripts/lib/akasha-experts.mjs`, requêtes sur agent_results.

La matrice : 4 rôles ROLES (techniques/jutsu, artefacts/armes-fruits, lieux, lexique/clans-orgs)
+ Biographe (fandom_descfr) + Taxonomiste (akasha_attrs) + Historien (akasha_relations),
× 8 univers = **~50 experts logiques**, tous assignés à leur univers, partageant les couloirs
physiques. Support d'apprentissage : la BASE (pas des .html) — structurée, requêtable,
c'est elle qui nourrit la mémoire ET les pages HTML publiques du site déjà rendues.
Rôles futurs (histoire/arcs) : dès que leurs données existeront en base (constat du 26/07).
