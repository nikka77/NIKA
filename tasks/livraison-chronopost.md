# Module Livraison Chronopost — Rapport & plan pour le rendre fonctionnel

> Demandé par Dan le 20/07/2026. AKASHA en pause (reprise : `tasks/refonte-akasha-zones.md`, C3-2).
> Statut : RAPPORT — aucun lot lancé tant que Dan n'a pas validé.

## 1. État actuel — c'est une vitrine, rien n'est fonctionnel

`app/tools/livraison/page.tsx` (448 l., fichier unique, `'use client'`, framer-motion) :

| Onglet | Ce qu'il montre | Réalité |
|---|---|---|
| 🪪 Kit | 3 cartes : **« Plaque NFT livreur »** (l.77), Badge Vigik, Carte borne de charge — bouton « Activer/Copier » | `setTimeout(1700ms)` → « ✓ Programmé ». Pur théâtre, aucun NFC |
| 📋 Équipe | Notes partagées photo + assignation n° livreur (54/12/31/7/23 en dur) | `useState` + 3 notes seed. Rien de partagé, tout disparaît au refresh |
| 📦 Colis | Annonces de lots + enchères de livreurs | Seed local, enchérisseur figé « n°54 » |
| ⭐ Avis | Avis express étoiles+photo | Local uniquement, ne rejoint pas le système reviews NIKA |

Transversal : **zéro persistance** (pas de Supabase, pas même de localStorage), **zéro auth** (aucune notion de rôle), photos en `URL.createObjectURL` (perdues au refresh), **aucune caméra live** (juste `<input capture="environment">` = photo statique).

Briques NIKA réutilisables déjà en place : Claude API (`app/api/niko`, `lib/claude/review-analyzer.ts` — pattern vision prêt à copier), SMS (`app/api/sms`), Stripe (`app/api/stripe`), auth Supabase + `lib/store.ts`. Aucun usage de `storage.from` dans tout le projet → le bucket photos sera une première.

## 2. Architecture cible (demandes de Dan)

### 2a. Renommage + kit enrichi
- « Plaque NFT livreur » → **« Plaque d'identité livreur »** (proposition, à valider).
- Ajouter au Kit : **Acheter clés boîtes aux lettres** (achat), **Louer booster** (batterie), **Louer gonfleur** (locations). Table `livraison_equipements` (type achat|location, prix, dispo, demandes). Paiement : Stripe déjà branché OU simple demande validée par le boss (→ question 4).

### 2b. Trois accès : livreur / boss / interne
- Table `livraison_membres` : `user_id FK users.id, role ('livreur'|'boss'|'interne'), numero int, actif bool`.
- Page gated : non-membre → écran « accès réservé » ; le rôle pilote les onglets visibles et les vues (les n° de livreurs en dur l.25 viendront de cette table).
- RLS : lecture équipe pour tous les membres, écriture selon rôle.

### 2c. Alertes problèmes colis/client → notifiées aux internes
- Table `livraison_alertes` : `type` enum (`tel_client_manquant`, `interphone_sans_nom`, `bal_absente`, `lieu_inaccessible`, `adresse_introuvable`, `autre`), `colis_ref`, `adresse`, `photo_url`, `commentaire`, `auteur`, `statut` (ouverte|traitée), `created_at`.
- Notification internes : badge in-app temps réel (Supabase Realtime) + option SMS via `app/api/sms` (→ question 6).

### 2d. Distribution / Collecte — refus justifiés avec photos
- Table `livraison_incidents` : `flux` (`distribution`|`collecte`), `motif` enum (`volumineux`, `hors_format`, `inaccessible`, `absent`, `refus_client`, `autre`), `photos jsonb` (colis + chariot), `justification text`, `auteur`, `statut`, `created_at`.
- Photos : bucket Supabase Storage `livraison/` (upload compressé côté client ~1280px).
- Vues par rôle : le livreur déclare ; **boss + interne** voient tout (liste filtrable flux/motif/livreur, photos plein écran, marquer traité). Collectes non prises en charge = même table, `flux='collecte'`.

### 2e. Caméra live → scan étiquette → page avis Chronopost
Flux « simple rapide efficace » :
1. Bouton → `getUserMedia` caméra arrière plein écran, cadre-guide **rouge** + consignes (« Cadre l'étiquette », « Rapproche-toi »…).
2. Détection **couche 1 — instantanée, gratuite, offline** : `BarcodeDetector` natif (code 128 des étiquettes Chronopost, n° type `XX123456789FR`). Dispo Chrome/Android ; **pas sur Safari iOS**.
3. Couche 2 — **Claude vision** : capture d'une frame toutes les ~1,5 s → `POST /api/livraison/scan` → `claude-haiku-4-5` (rapide/pas cher, pattern copié de `review-analyzer.ts`) lit l'étiquette, valide le n° de colis.
4. N° validé → le cadre passe **vert**, vibration, puis **redirection immédiate vers la page avis Chronopost** (→ question 1 : URL exacte).
5. iOS sans BarcodeDetector : la couche 2 seule suffit (validation en ~1-2 s). Alternative lib `zxing-wasm` = nouvelle dépendance → interdit sans accord explicite de Dan.

### 2f. Même caméra, mode « étiquette incorrecte »
Même écran, second mode : Claude extrait **nom, prénom, adresse, téléphone** de l'étiquette, signale les champs manquants/incohérents (tél absent, adresse incomplète…) → pré-remplit une **alerte 2c** en un tap. Un seul composant caméra, deux modes.

## 3. Plan en lots (protocole économie — 1 lot ≈ 1 commit, exécution solo séquentielle)

### PROTOCOLE DE REPRISE
1. Lire ce fichier + `tasks/lessons.md` + `git log --oneline -5`.
2. Reprendre à la première case non cochée. Vérif = `npx tsc --noEmit` + 1 page navigateur (texte/console).

- [ ] **L1 — Fondations** : migration SQL (`livraison_membres`, `livraison_equipements`) + gate 3 rôles + renommage plaque + kit achats/locations (UI + demandes). Colis/Équipe/Avis inchangés.
- [ ] **L2 — Alertes & incidents** : migration (`livraison_alertes`, `livraison_incidents`) + bucket `livraison` + formulaires livreur (photos colis+chariot, motifs) + vues boss/interne (filtres, traiter) + badge Realtime.
- [ ] **L3 — Caméra scan avis** : composant caméra live (overlay rouge→vert, consignes) + BarcodeDetector + `/api/livraison/scan` (Claude vision) + redirection page avis Chronopost.
- [ ] **L4 — Mode étiquette incorrecte + notifs** : extraction champs par Claude → pré-remplissage alerte ; SMS/push internes si validé.

## 4. Questions ouvertes pour Dan (bloquantes par lot)

1. **(L3)** URL exacte de « la page avis Chronopost » : avis Google de l'agence ? Formulaire avis Chronopost officiel ? Un lien fixe ou dépendant du n° de colis ?
2. **(L1)** Les livreurs ont-ils des comptes NIKA (email/mdp Supabase) ou veux-tu un accès par code simple ? Qui nomme boss/interne (seed manuel en base au départ ?)
3. **(L1)** « Plaque d'identité livreur » comme nouveau nom, ou autre idée ?
4. **(L1)** Achats/locations : paiement réel Stripe ou simple demande validée par le boss ?
5. **(L1)** On garde les onglets Colis (enchères) et Équipe (notes) tels quels pour l'instant ?
6. **(L2/L4)** Notification des internes : badge in-app suffit, ou SMS (`app/api/sms` prêt) ?
