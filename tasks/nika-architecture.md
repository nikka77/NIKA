# Architecture cible NIKA — scalable, meilleure qualité/prix (27/07/2026)

Complète `nika-vps.md` (le VPS y est la brique « compute agents » ; ici : la cible globale
— données, site, flotte d'agents — et ses paliers de croissance).

## 0. Le principe qui rend tout scalable

L'usine est déjà **centrée sur des files** (pgmq dans Postgres) : producteurs et
consommateurs ne se connaissent pas, un message n'est traité qu'une fois (visibility
timeout), et la parallélisation = **ajouter des workers**, sur la même machine ou sur dix.
C'est LA bonne fondation — on ne la change pas, on la généralise :

```
   téléphone/Web ──► Vercel (webhook, site)          Supabase (Postgres + pgmq + auth)
                                    │                      ▲        ▲
                                    └── enqueue ───────────┘        │ claim/archive
                                                                    │
                     ┌──────────── nœuds de calcul (1 → N) ─────────┴──┐
                     │ VPS-1 : secrétaire, escalades, nuit, audit      │
                     │ VPS-2..N : workers agents (mêmes scripts)       │
                     │ Mac (optionnel) : juge GPU local, HHEM          │
                     └─────────────── APIs LLM (Groq, Gemini, Claude) ─┘
                                        Cloudflare R2 : images/vidéos
```

Règles de croissance : **état = Postgres + R2 uniquement** (aucun nœud ne garde d'état →
tout nœud est jetable/clonable) ; **une file par domaine de travail** ; **le goulot réel
est le quota des APIs LLM**, pas le CPU — multiplier les nœuds sans multiplier les
clés/fournisseurs ne sert à rien.

## 1. Données

| Besoin | Choix | Pourquoi (qualité/prix) |
|---|---|---|
| Relationnel + auth + RLS + files | **Supabase (garder)** | gratuit aujourd'hui ; Pro 25 $/mois quand il faudra (8 Go, sauvegardes 7 j, pas de pause) ; le remplacer par un Postgres auto-hébergé ferait économiser ~15 €/mois contre DES JOURS d'ops (sauvegardes, upgrades, auth à réécrire) — mauvais échange tant que NIKA n'a pas d'équipe |
| Images / vidéos / gros fichiers | **Cloudflare R2** (10 Go gratuits, puis 0,015 $/Go/mois, **sortie GRATUITE**) | le poste qui tue les budgets médias, c'est l'egress ; R2 le supprime — Supabase Storage facture la sortie, S3 aussi. Les images AKASHA/STAY/annonces vont là, servies via CDN Cloudflare |
| Cache / compteurs chauds (plus tard) | Redis léger sur le VPS (ou Upstash free) | seulement si mesuré nécessaire |

Trajectoire : rester free tier → **premier euro dépensé = Supabase Pro (25 $/mois)** quand
la base dépasse 500 Mo ou que la pause hebdo gêne. R2 dès maintenant pour tout média neuf.

## 2. Le site (Next.js)

| Palier | Hébergement | Coût | Quand |
|---|---|---|---|
| Aujourd'hui | **Vercel Hobby (garder)** | 0 € | DX imbattable, CDN mondial, tant que < 100 Go/mois de bande passante et pas d'usage commercial contesté |
| Croissance | **Coolify sur Hetzner + Cloudflare devant** | ~13 €/mois (CAX31 8c/16Go) | quand Vercel Hobby coince (bande passante, maxDuration, commercial). Coolify = PaaS open-source auto-hébergé : git push → build → deploy, zéro lock-in, N apps sur la même machine. Cloudflare (gratuit) donne CDN + WAF + cache devant |
| Échelle | Hetzner dédié AX42 (~46 €) ou 2 nœuds + LB | 46-60 €/mois | des dizaines de milliers de visiteurs/jour — on n'y est pas |

Vercel Pro (20 $/utilisateur) est l'alternative « croissance » sans ops — à comparer LE
MOMENT VENU au réel : si la seule limite atteinte est la bande passante, Coolify+Cloudflare
gagne largement en qualité/prix ; si c'est le confort de déploiement qui prime, Vercel Pro.

## 3. La flotte d'agents (multiples, autonomes, parallèles)

Déjà acquis : files pgmq, claim concurrent sûr, worker bi-modèle, double verdict, ⚡ auto,
routage multi-fournisseurs (Groq natif, Gemini natif, Cerebras dormant, OmniRoute repli),
backoff 429 par fournisseur, escalades Claude, audit hebdo.

À généraliser pour passer de 1 à N nœuds :

1. **Unités systemd template** : `nika-worker@.service` → `nika-worker@1..N` (N par
   nœud = --conc interne × nœuds). Chaque worker est identique, sans état, tue-able.
2. **Une file par domaine** : `agent_tasks` (AKASHA), `ops_chat` (secrétaire), puis
   `news_tasks` (veille NEWS), `stay_tasks` (enrichissement STAY), etc. — un type de
   worker par file, dimensionné indépendamment. (Pattern déjà validé par ops_chat.)
3. **Budget par fournisseur, pas par nœud** : les quotas LLM sont GLOBAUX (TPM Groq,
   req/min Gemini). Ajouter une table `ops_quotas` (fournisseur, fenêtre, jetons) que les
   workers décrémentent — sinon 3 nœuds se partagent le même 429. C'est LE chantier code
   qui conditionne le vrai parallélisme multi-nœuds.
4. **Étage qualité inchangé** : double verdict + review humaine + audit hebdo — la
   scalabilité ne touche pas la porte d'autonomie (elle a ses métriques : kappa, taux ⚡).
5. **Escalades** : restent UN consommateur (verrou) — c'est du Claude abonnement, séquentiel
   par nature. Si un jour il en faut plus : Claude API facturée, autre débat.

Montée en charge LLM (qualité/prix, dans l'ordre) : free tiers actuels → **Gemini paid
tier 1** (flash-lite ~0,10 $/Mtok entrée : ~1 € les 10 000 fiches jugées) → Groq payant →
Claude API pour les tâches d'orfèvrerie. Le Mac GPU reste le « gratuit illimité lent »
pour les jugements de nuit.

## 4. Observabilité (obligatoire dès 2 nœuds)

- **Uptime Kuma** sur le VPS-1 (déjà dans la boîte à outils GitHub) : ping site, webhook,
  Supabase, démons (heartbeat push) → alerte WhatsApp via le canal existant.
- Heartbeat en base : chaque worker écrit `derniere_activite` (table `ops_workers`) ; le
  bilan de nuit signale un worker muet — remplace « regarder les logs de 3 machines ».
- Logs : journald local par nœud suffit ; centralisation (Loki) = plus tard, si vraiment.

## 5. Paliers de coût (récapitulatif)

| Palier | Infra | €/mois | Capacité |
|---|---|---|---|
| **P1 — maintenant** | VPS CAX11 + Vercel free + Supabase free + R2 free | **~4,5 €** | usine 24/7, site actuel, ~10⁴ tâches agents/jour (limite = quotas gratuits LLM) |
| **P2 — traction** | + Supabase Pro (23 €) + Gemini tier 1 (~5-10 €) + CAX21 workers (6,5 €) | **~40 €** | base sérieuse sauvegardée, ~10⁵ tâches/jour, site toujours Vercel |
| **P3 — croissance** | + CAX31 Coolify pour le site (13 €) + R2 payant (qq €) | **~60 €** | site auto-hébergé derrière Cloudflare, médias illimités sans egress |
| **P4 — échelle** | dédié AX42 ou nœuds multiples + LB | **~110 €+** | dizaines de milliers d'utilisateurs — problème de riche, on re-chiffrera |

Chaque palier est **réversible** et ne condamne rien : mêmes scripts, même base, mêmes
files — on ne fait qu'ajouter des nœuds et des tiers payants là où ça coince.

## 6. Ce qu'on ne fait PAS (et pourquoi)

- **Kubernetes** : 3 démons et des workers sans état — systemd + Coolify font le travail
  sans la taxe cognitive. On y repensera à 10+ services et une équipe.
- **Microservices** : le monolithe Next.js + scripts est la bonne taille ; les files
  découplent déjà ce qui doit l'être.
- **Auto-héberger Postgres/Supabase** : économie faible, risque de perte de données réel.
- **GPU cloud pour les juges** : les API gratuites/centimes font mieux ; le Mac reste le
  GPU gratuit d'appoint.
- **Multi-région** : la Côte d'Azur tient dans une région. Cloudflare donne déjà le CDN mondial.

## 7. Séquence concrète

1. **S0-S6 du dossier VPS** (nika-vps.md) — la brique 24/7. ← on y est
2. R2 : créer le bucket (Cloudflare free), y diriger les NOUVEAUX médias (AKASHA/STAY).
3. `ops_workers` heartbeat + Uptime Kuma sur le VPS.
4. Table `ops_quotas` (budget LLM global) — prérequis du multi-nœuds.
5. Deuxième nœud worker QUAND la file reste pleine avec les quotas dispo (mesure, pas envie).
6. Supabase Pro / Gemini tier 1 au premier signal réel (taille base / 429 récurrents).
7. Coolify+Cloudflare pour le site le jour où Vercel Hobby coince.

## 8. Décisions prises (Dan, 28/07)

- [x] Cible « P1 → P4 » et séquence §7 VALIDÉES.
- [x] R2 FAIT (28/07) : abonnement activé (0 €/mois sous 10 Go), bucket `nika-media`
  (juridiction UE, privé), jeton scopé Object R/W, helper `scripts/lib/r2.mjs` (aws4fetch),
  aller-retour écriture/lecture/suppression testé. Clés dans .env.local ×2
  (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT / R2_BUCKET).
- [x] Prérequis flotte FAITS (28/07, L16) : `ops_quotas` + RPC `quota_consommer`
  (budget LLM global atomique, testé 2 accordés / 3e refusé) et `ops_workers`
  (heartbeat 30 s, testé — le secrétaire s'annonce). SQL : supabase/nika_ops_l16.sql.
- [ ] Confirmer le choix VPS (nika-vps.md §9) pour lancer la brique 24/7. ← SEUL RESTANT
