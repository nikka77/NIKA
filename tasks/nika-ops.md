# NIKA OPS — interface de gestion + usine d'agents autonomes

> Validé dans ses grandes lignes par Dan le 23/07/2026 (page /ops ✓, abonnement Max en headless ✓,
> roster d'agents demandé ✓, canal WhatsApp demandé ✓). Statut : PLAN — L1 prêt à lancer.

## PROTOCOLE DE REPRISE
1. Lire ce fichier + `tasks/lessons.md` + `git log --oneline -5`.
2. Reprendre à la première case non cochée. Vérif = `npx tsc --noEmit` + 1 test réel du circuit concerné.

## Décisions d'architecture
- **Abonnement Max, pas de clé API** : tout passage programmatique par Claude = `claude -p` (headless,
  login abonnement, limites 5 h) — jamais de clé API Anthropic facturée. Pattern « en lot » :
  l'orchestrateur planifie N tâches en une session courte, le reviewer relit N résultats en une session.
- **File de travail** : **Supabase Queues (extension pgmq)** — pas de table statut artisanale.
  `pgmq.send/send_batch` pour produire, `read_with_poll` pour un claim atomique avec fenêtre de visibilité
  (exactly-once par consommateur), `archive` pour l'audit. Table compagne `agent_results` (msg_id, type,
  model, result jsonb, review_status) pour les résultats/reviews. `pg_cron` pour les routines planifiées
  (remplissage, déclenchement review du soir). Zéro infra nouvelle : tout est dans son Supabase.
- **Worker local** : `scripts/agent-worker.mjs`, boucle claim→execute→report, modèles via OmniRoute
  (clé `claude-code`, `http://localhost:20128/v1`) → `ollama/gemma4:12b` (rédactionnel, vision) /
  `ollama/qwen2.5-coder:7b` (JSON strict). 1 modèle chargé à la fois (16 Go RAM). Fenêtres de travail, pas de 24/7.
- **JSON garanti par la grammaire, pas par la prière** : chaque type de tâche définit un **JSON Schema**
  passé à Ollama via `format` (structured outputs, décodage contraint XGrammar, dispo ≥ v0.5) — la sortie
  est syntaxiquement garantie conforme. Le schéma inclut la variante refus `{"erreur": "donnees_insuffisantes"}`
  (la grammaire garantit la FORME, pas la vérité → garde anti-fabulation et reviewer restent obligatoires).
  Valider quand même côté worker (zod) : une génération coupée en plein milieu reste possible.
- **Page /ops** : dans NIKA, JAMAIS déployée — gate localhost + secret env, exclue du build Vercel.
  Elle exécute des prompts qui écrivent du code : fuite = catastrophe.
- **WhatsApp** : API officielle Cloud (Meta) → webhook Vercel → file Supabase → worker Mac répond.
  Conversations de service gratuites. PAS whatsapp-web.js sur le numéro principal (risque ban).
- **Secrets** : locaux Ollama = peuvent tout voir ; gratuits cloud = jamais de secrets/données clients.
- **Accès internet des agents** : les modèles locaux ne naviguent pas — LE WORKER fetch les sources
  (Fandom `action=parse&prop=wikitext` — `prop=extracts` NE MARCHE PAS sur Fandom ; Jikan ; dragonball-api ;
  api-onepiece), nettoie (templates/liens wiki), et passe le contenu au modèle. Cache disque des pages.
  Chunking : qwen 32K / gemma4 256K de contexte.
- **Garde anti-fabulation OBLIGATOIRE** (vérifié le 23/07 : extrait vide → qwen a INVENTÉ une technique) :
  (1) le worker n'appelle jamais le modèle si le payload est vide/trop court ; (2) chaque prompt contient
  « si les données sont insuffisantes, réponds {"erreur": "donnees insuffisantes"} » ; (3) le reviewer
  vérifie l'ancrage aux sources.

## Roster des agents (cible)
| # | Agent | Modèle | Lot |
|---|---|---|---|
| 1 | Orchestrateur (planifie la file en lot) | claude -p (abonnement) | L4 |
| 2 | Reviewer (review groupée, commit) | claude -p | L4 |
| 3 | Dev console (Dan prompte → Claude code) | claude -p streaming | L3 |
| 4 | Flavor texts AKASHA manquants — PILOTE | gemma4:12b | L1 |
| 5 | Normalisation attributs/taxonomies | qwen2.5-coder:7b | L6 |
| 6 | Doublons & incohérences AKASHA | qwen2.5-coder:7b | L6 |
| 7 | Alt-texts + QC images (vision) | gemma4:12b | L6 |
| 8 | Bios/résumés FR manquants | gemma4:12b | L6 |
| 9 | Vérif seeds/DB (comptages, orphelins) | script + qwen | L6 |
| 10 | SEO meta descriptions/titres domaines | gemma4:12b | L6 |
| 11 | Synthèse d'avis (remplace review-analyzer API) | gemma4:12b | L6 |
| 12 | Veille NEWS Côte d'Azur | script + gemma4 | L6 |
| 13 | Cohérence FR (anglais résiduel) | gemma4:12b | L6 |
| 14 | Santé site (liens, 404, images) | script + local | L6 |
| 15 | Backlog groomer (tasks/*.md → priorités) | gemma4, validé Dan | L6 |
| 16 | Secrétaire WhatsApp (notes, questions, tâches) | local, escalade Claude | L5 |

## Lots

- [x] **L0 — ANNULÉ le 25/07 : compte retrouvé !** Le projet appartient au compte « 777dxt »
      (3e identité de Dan, org ulhcclltxlkcvpzsgnjf) — voir mémoire project_supabase_compte.md.
      Migration inutile. Historique de l'enquête ci-dessous pour mémoire :
      ~~L0 — MIGRATION SUPABASE : le projet `keffsfxlnxbqkelapklx`~~
      (base vivante) appartient à un compte INTROUVABLE (ni tulbured06/GitHub-nikka77, ni d4n7le —
      tous vérifiés : Gmail ×2, GitHub, Safari/trousseau, Opera). Sans dashboard = aucune migration DDL
      possible → on copie tout vers un projet NEUF sur le compte d4n7le (0 projet, gratuit suffit).
      Inventaire fait : 37 tables, 17 532 lignes (95 % AKASHA), 1 seul user test, 0 bucket storage.
      Schéma complet versionné dans `supabase/schema.sql` + `supabase/migrations/`.
  - [ ] Dan : connecter le compte d4n7le dans Chrome profil « dan » (Default) — seule action humaine
  - [ ] Claude : créer le projet (région Paris eu-west-3, mdp DB généré), appliquer schema.sql + migrations
  - [ ] Claude : script de copie API ancien→nouveau (pagination 1000, parents d'abord), vérif des comptes
  - [ ] Claude : swap .env.local (garder l'ancien en commentaire), vérifier l'app en local, reseed séquences
  - [ ] Puis exécuter nika_ops_l1.sql sur le NOUVEAU projet → suite du L1
  - [ ] Optionnel : ticket support Supabase pour récupérer l'orphelin (preuve = clé service) — non bloquant
- [ ] **L1 — Circuit pilote** — code livré le 23/07, EN ATTENTE : Dan exécute `supabase/nika_ops_l1.sql`
      dans le SQL Editor du dashboard.
  - [x] `supabase/nika_ops_l1.sql` : pgmq + file agent_tasks + wrappers RPC service_role-only
        (`ops_queue_send_batch/read/archive/metrics` dans public, pas de schéma à exposer) + `agent_results` + `ops_notes`
  - [x] `scripts/agent-worker.mjs` : claim pgmq (vt 180 s) → garde → gemma4 via OmniRoute avec
        `response_format json_schema` (statut ok|donnees_insuffisantes) → zod → agent_results → archive ;
        retry 1× ; modes drain (défaut) / `--loop`
  - [x] `scripts/ops-fill-flavor.mjs` : détection fiches character sans descFr + summary ≥ 40 car. ;
        `--dry` testé : 80 trouvées, 20 retenues ✓
  - [x] `.env.local` : OMNIROUTE_URL + OMNIROUTE_API_KEY ajoutés
  - [x] SQL exécuté le 25/07 (via extension Chrome, compte 777dxt) — vérifié par l'API :
        ops_queue_metrics OK, agent_results OK, ops_notes OK
  - [x] Fill lancé : 20 tâches flavor_akasha en file
  - [x] Worker drainé le 25/07 après 3 calibrages (v1 response_format/OmniRoute → v2 thinking →
        v3 sans échappatoire de refus) : **20/20 done, 0 refus, 0 échec** (~35-45 s/fiche)
  - [x] Review du 25/07 : les 20 descFr sont des PARAPHRASES du summary (déjà français) → REJETÉES.
        Enseignement : la valeur n'est pas dans la reformulation mais dans l'APPORT de faits nouveaux.
  - [x] **Pivot validé par Dan : agent `fandom_descfr`** (worker fetch la page canon → gemma4 rédige).
        12 fiches traitées : 9 enrichissements réels (Dragon = ancien Marine ; Gattai Zamasu : 37 car →
        fusion Potara ; Namida Suzumeno : « sans rôle canon » → équipe 15, genin, ondes sonores),
        3 erreurs d'entité corrigées par gardes (voir lessons.md).
  - [x] **Expert Naruto** (`scripts/experts/Modelfile.naruto` → `ollama/akasha-naruto`) : coût disque 0
        (poids partagés). A/B Nagato : vocabulaire canon respecté (« monde shinobi », « clan Uzumaki »).
        Remplissage d'attributs contraints par enum : retrouve exactement les valeurs curées en base.
  - [x] 9 descFr Fandom validés par Dan et écrits en base (25/07)
  - [x] **8 experts créés** (`scripts/experts/build-experts.mjs` → akasha-naruto, -one-piece, -dragon-ball,
        -bleach, -hunter-x-hunter, -jojo, -death-note, -initial-d). Coût disque 0. Worker : modèle et schéma
        peuvent être des FONCTIONS de l'univers (`expertFor`, `axesSchema` dans scripts/lib/akasha-axes.mjs).
  - [x] **Agent `akasha_attrs`** (le gisement) : axes contraints par enum + fetch Fandom + gardes d'identité.
        Pilote 8 fiches : 6 justes (refus pertinents inclus), 1 timeout, 1 erreur (L → camp Shinigami).
        → calibrage fait le 25/07 : champ `<attr>_preuve` exigé par le schéma + **contrôle de cohérence
        en code** (`checkPreuves`, table de traces FR↔EN) → statut `suspect`. Sur les 8 fiches : 1 suspect,
        et c'est exactement l'erreur (L). Le contrôle s'applique rétroactivement, sans appel modèle.
- [x] **L2 — Page /ops (kanban)** livrée le 25/07 : `app/ops/page.tsx` + `OpsBoard.tsx` + `app/api/ops/state`
      + verrou `lib/ops/guard.ts` (localhost obligatoire, OPS_SECRET hors dev, noindex).
      4 colonnes (à relire / écartées par les gardes / approuvées / rejetées), santé Ollama+OmniRoute,
      compteur de file, boutons Appliquer/Rejeter qui écrivent dans akasha_entries.attributes
      (« inconnu » n'écrase jamais une valeur existante). Vérifiée en navigateur.
      5 colonnes : à relire · **preuve douteuse** (suspects, applicables après vérif) · écartées par les
      gardes · approuvées · rejetées. Chaque attribut s'affiche avec sa citation source.
- [ ] **Ouverture des vannes** (après validation Dan des 27 en attente) : lots de 50-100 fiches,
      worker lancé hors session de dev (il sature le GPU d'un Mac 16 Go).
- [ ] **L2 — Page /ops (kanban)** : gate (localhost + `OPS_SECRET`) ; **vue kanban** (queued → running →
      done → reviewed, cartes = tâches, colonnes par statut pgmq/review) ; santé OmniRoute/Ollama/worker ;
      start/stop worker. Patterns volés à vibe-kanban (27k ⭐, Apache-2.0, en cours d'abandon — inspirer,
      ne PAS adopter) : git worktree par tâche de code Claude, diff review intégrée.
- [ ] **L2bis — /ops en serveur MCP** : exposer la file comme serveur MCP local (create_task, move_task,
      list_board) → Claude Code peut lire et alimenter le kanban nativement depuis n'importe quelle session ;
      WhatsApp et l'orchestrateur passent par la même API.
- [ ] **L3 — Console Claude** : API route → spawn `claude -p --output-format stream-json` (cwd repo) →
      streaming dans l'UI ; historique des sessions ; garde-fous (branche git, jamais de push auto).
- [ ] **L4 — Orchestrateur + Reviewer** : prompt orchestrateur (objectif → tâches typées dans la file) ;
      prompt reviewer (lot de résultats → validé/corrigé/rejeté + rapport) ; déclenchement manuel depuis /ops
      d'abord, routine du soir ensuite si validé.
- [ ] **L5 — WhatsApp** : app Meta dev + numéro test (action DAN) ; webhook `app/api/whatsapp/route.ts`
      (vérif token, écrit dans la file) ; worker : réponse notes/questions via API Cloud ; escalade → tâche orchestrateur.
- [ ] **L6 — Agents 5→15** : un agent = un type de tâche + un prompt + un script de remplissage + un
      critère de review. Ordre selon la valeur : à décider avec Dan après L4.

## Boîte à outils GitHub (moisson du 23/07, à intégrer par lots)
- **CCR — claude-code-router** (musistudio) : fait tourner LE HARNAIS Claude Code sur n'importe quel
  modèle (config → OmniRoute/Ollama). Usage 1 : « Claude Code de secours » quand les tokens Max sont
  épuisés (`ccr code` → gemma/qwen/gratuits) — répond à la demande d'origine de Dan. Usage 2 : workers
  « code » locaux pour tâches repo mécaniques. Légal : n'utilise PAS l'OAuth d'abonnement (endpoints à soi).
  Qualité : un 7-12B reste un 7-12B — tâches simples uniquement.
- **Crawl4AI** (~68k ⭐, local-first, sortie markdown LLM-ready, crawling adaptatif) : moteur de scraping
  des agents data pour les sources SANS API (actus Côte d'Azur pour NEWS, sites partenaires) — Fandom/Jikan
  gardent leurs APIs. Firecrawl écarté (hébergé/payant).
- **Evolution API** (self-hosted, Docker) : passerelle WhatsApp qui gère l'API OFFICIELLE Cloud ET Baileys,
  avec webhooks/queues/intégrations. Simplifie L5 : la plomberie WhatsApp devient une instance Docker,
  on garde l'API officielle pour le numéro principal. Alternative : WAHA.
- **Supabase MCP officiel** (github.com/supabase/mcp) : Claude pilote la base directement (tables, requêtes,
  config) → l'orchestrateur/reviewer inspecte la file et les données AKASHA nativement. Sécurité : token scopé,
  lecture surtout — cet outil est puissant.
- **Uptime Kuma** (~60k ⭐, self-hosted) + serveurs MCP communautaires : remplace l'agent 14 « santé site »
  custom — monitors uptime/certs/pages NIKA + OmniRoute + Ollama, notifications (webhook → WhatsApp possible),
  et Claude lit l'état via MCP.

## Questions ouvertes
1. (L5) Dan doit créer l'app Meta développeur + numéro de test — ou préfère-t-il un numéro dédié payant ?
2. (L4) Routine du soir automatique dès le début ou déclenchement manuel un temps ?
3. (L6) Ordre de priorité des agents 5→15 ?
