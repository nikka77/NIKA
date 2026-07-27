# Dossier VPS — l'usine NIKA OPS en 24/7 (rédigé le 27/07/2026)

## 1. Objectif

Sortir l'usine du Mac : réponses WhatsApp instantanées jour et nuit, routine de nuit à
l'heure même capot fermé, escalades Claude en vacances. **Le Mac devient optionnel** —
il ne garde que ce qui a besoin de son GPU.

Principe directeur (règle posée par Dan dès le départ) : **aucun port public**. Le VPS
n'écoute RIEN sur Internet — tout passe par Tailscale. Le webhook WhatsApp reste chez
Vercel (déjà public, signé HMAC), la base reste chez Supabase : le VPS ne fait que
*consommer* les files, comme le Mac aujourd'hui.

## 2. Ce qui part, ce qui reste

| Composant | Aujourd'hui | Demain | Pourquoi |
|---|---|---|---|
| Webhook `/api/whatsapp` | Vercel | Vercel (inchangé) | déjà 24/7, public signé |
| Base + files pgmq | Supabase | Supabase (inchangé) | déjà 24/7 |
| Secrétaire (ops_chat, Groq/Gemini/claude -p) | launchd Mac | **systemd VPS** | temps réel 24/7 |
| Escalades Claude (branche + commit) | Mac (~/dev/NIKA) | **VPS** (clone GitHub) | nuit/vacances |
| Routine de nuit (fillers + Groq/Gemini) | launchd 2 h 30 | **systemd timer 2 h 30** | 100 % appels API, CPU-léger |
| Audit hebdo (claude -p, dimanche 9 h) | launchd Mac | **systemd timer VPS** | headless prouvé (token) |
| Alarmes / bilan / rejoueur / parc 24 h | Mac | **VPS** | suivent leurs démons |
| Juge local gemma4 (review_local, slot auto) | Ollama Mac (GPU) | **reste sur le Mac** (voir §3) | 12B = GPU, pas VPS à 4 € |
| HHEM (score d'ancrage) | Mac | reste sur le Mac | idem GPU |
| Site Next.js | Vercel | Vercel (inchangé) | — |

## 3. Le sort du juge local (décision à prendre)

Le double verdict = gemma4 (Mac, famille A) + Gemini (cloud, famille B). Trois options :

- **A. Mac = nœud GPU d'appoint (recommandé)** — le VPS fait tout SAUF `review_local`
  (slot auto) ; le Mac, quand il est allumé, draine la file des jugements locaux via la
  flotte actuelle. Effet : l'⚡ auto-application attend le prochain passage du Mac (délai,
  pas de perte). Zéro coût, zéro changement de qualité.
- **B. Double verdict 100 % cloud** — remplacer gemma4 par un juge Groq d'un AUTRE modèle
  que le producteur (ex. llama-3.3-70b juge vs gpt-oss-120b producteur). Même fournisseur
  = angles morts partagés possibles : à valider par un duel avant bascule.
- **C. Oracle Free ARM 24 Go** — assez de RAM pour un gemma quantisé, mais ~2-4 tok/s :
  jugement de nuit seulement, et fiabilité du free tier Oracle discutable. Curiosité, pas
  fondation.

## 4. Choix du fournisseur

| Fournisseur | Offre | Specs | €/mois | Verdict |
|---|---|---|---|---|
| **Hetzner** (DE/FI) | CAX11 (ARM) | 2 vCPU, 4 Go, 40 Go | ~4,5 (IPv4 incl.) | **Recommandé** — meilleur rapport, réseau sérieux |
| Hetzner | CX22 (x86) | 2 vCPU, 4 Go, 40 Go | ~5,5 | si un outil refuse l'ARM |
| OVH (FR) | VPS value | 2 vCPU, 4 Go | ~6-7 | données en France si c'est un critère |
| Scaleway (FR) | DEV1-S | 2 vCPU, 2 Go | ~7 | plus cher pour moins |
| Oracle Cloud | Free A1 | 4 ARM, 24 Go | **0** | tentant mais récupérable par Oracle sans préavis — acceptable pour ESSAYER, pas pour fonder |
| Contabo | — | — | ~5 | réputation moyenne, non |

**Recommandation : Hetzner CAX11.** Nos charges sont des appels d'API (Groq, Gemini,
Graph, Supabase) + `claude` CLI + `npx tsc` à l'occasion : 4 Go ARM suffisent largement.
Claude Code et Node existent en linux-arm64. Option zéro-euro : tenter Oracle Free
d'abord — la migration Hetzner reste triviale si Oracle déçoit (tout est scripts + .env).

## 5. Sécurité (non négociable)

1. **Tailscale dès la première minute** — SSH lié à l'interface tailnet uniquement :
   `ListenAddress <ip-tailscale>` (ou UFW : deny all incoming, allow in on tailscale0).
   Résultat : le VPS est INVISIBLE d'Internet (scan → rien).
2. SSH par **clé uniquement** (`PasswordAuthentication no`, `PermitRootLogin no`,
   utilisateur `nika` + sudo).
3. `unattended-upgrades` (correctifs auto) + `ufw` en défaut deny.
4. **Secrets** : `.env.local` copié à la main via le tailnet (`scp`), JAMAIS dans git —
   même règle qu'aujourd'hui. Tokens embarqués : WhatsApp permanent, Claude OAuth (1 an,
   régénération juillet 2027), Groq, Gemini, service_role Supabase.
5. Clé GitHub en **deploy key lecture seule** pour `git pull` (le push reste côté Mac/Dan
   — la règle « commit iCloud → push → pull » devient « push GitHub → pull VPS »).
6. Rien d'autre n'écoute : pas de dashboard, pas de /ops public (la console /ops se
   consulte en dev local sur le Mac, ou plus tard via Tailscale Serve, jamais en public).

## 6. Plan de migration (étapes, ~1 h de travail effectif)

**S0 — Dan (10 min, seul lui peut) :** créer le compte fournisseur, commander le VPS
(Ubuntu 24.04 LTS), coller la clé SSH publique fournie, installer Tailscale sur le VPS
(one-liner du fournisseur ou cloud-init ci-dessous), l'ajouter au tailnet (login).
À partir de là, **Claude pilote tout le reste par SSH via le tailnet.**

**S1 — Socle** : utilisateur `nika`, durcissement SSH, ufw deny-all + tailscale0,
unattended-upgrades, timezone Europe/Paris, swap 2 Go.

**S2 — Stack** : Node 22 (nodesource ou nvm), git, `npm i -g @anthropic-ai/claude-code`,
clone `github.com/nikka77/NIKA` dans `~/NIKA` (deploy key RO), `npm ci`,
`.env.local` copié via scp, `claude -p "SESSION OK"` avec le token (test headless).

**S3 — Services systemd** (traductions des plists launchd) :
- `nika-secretaire.service` (Restart=always) ← com.nika.ops.secretaire
- `nika-nuit.timer` OnCalendar=*-*-* 02:30 ← com.nika.ops.nuit
- `nika-audit.timer` OnCalendar=Sun 09:00 ← com.nika.ops.audit-hebdo
Adaptations code minimes : `taskpolicy -c background` → `nice -n 10` (détection par
plateforme dans les .sh), notification macOS d'alerte.mjs → no-op hors macOS (le parc
24 h couvre déjà la perte). DEPOT devient `~/NIKA` (variable d'env `NIKA_DEPOT`).

**S4 — Bascule en douceur** (les files pgmq rendent la cohabitation SAINE : un message
n'est traité qu'une fois, peu importe qui le réclame) :
1. démarrer le secrétaire VPS **en parallèle** du Mac 24 h (aucun risque de doublon) ;
2. observer, puis `launchctl bootout` du secrétaire Mac ;
3. armer les timers nuit + audit sur le VPS, désarmer les launchd correspondants ;
4. le Mac garde UNIQUEMENT la flotte de jugement local (option A du §3) — lancée à la
   main ou par un launchd « quand allumé ».

**S5 — Épreuves** : « Salut Claude » à 3 h du matin Mac éteint ; escalade complète
depuis le téléphone ; kill -9 du secrétaire (systemd le relance) ; reboot VPS (tout
revient seul) ; audit dimanche.

**S6 — Écrous** : documentation nika-ops.md, MAJ mémoire, runbook de régénération des
tokens, script `deploy.sh` sur le VPS (git pull + restart services) déclenchable par
escalade.

## 7. Coûts et charge

- Hetzner CAX11 : **~4,5 €/mois** (~54 €/an). Oracle Free : 0 €.
- Charge estimée : secrétaire au repos < 100 Mo RAM ; pics = `npx tsc` des escalades
  (~1-2 Go, ~1 min) et `claude` CLI (~300-500 Mo par run). 4 Go = confortable, swap en filet.
- Trafic : négligeable (JSON d'API).

## 8. Retour arrière

Tout reste réversible en < 10 min : les launchd du Mac ne sont PAS supprimés, seulement
désarmés (`launchctl bootout`), et le code est identique des deux côtés (GitHub). Re-armer
les plists = retour à la situation actuelle. Le VPS peut être détruit sans perte (aucune
donnée d'état locale : tout vit dans Supabase/GitHub).

## 9. Décisions à prendre (Dan)

- [ ] Fournisseur : **Hetzner CAX11 (~4,5 €)** ou essai Oracle Free d'abord ?
- [ ] Juge local : **option A** (Mac nœud GPU d'appoint, recommandé) ou B (duel cloud à organiser) ?
- [ ] Région : Falkenstein/Helsinki (Hetzner) — pas d'enjeu latence (tout est asynchrone).

Dès le S0 fait (compte + VPS + Tailscale + clé), me donner l'IP tailnet : je déroule
S1 → S6 et je rends compte à chaque étape.
