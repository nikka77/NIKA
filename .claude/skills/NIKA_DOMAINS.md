# NIKA — Règles métier par domaine

## Les 9 domaines

### 🍽️ FOOD (`/food`)
- Couleur : `#D4A017` (gold)
- Sous-pages : `/food/[resto_id]` (fiche restaurant)
- Fonctionnalités : Flash Deals, notation, livraison via NIKO
- Monétisation : commission 8-15% sur commandes, listing pro mensuel
- Catégories : restaurant, fastfood, pizzeria, boulangerie, sushi, vegan, foodtruck, cave

### 🚗 AUTO (`/auto`)
- Couleur : `#0094D4` (az)
- Sous-pages : `/auto/vtc`, `/auto/depannage`, `/auto/location`
- Fonctionnalités : géolocalisation temps réel, dispatch VTC/dépannage
- Monétisation : commission 12% VTC, abonnement dépanneurs

### 🏡 STAY (`/stay`)
- Couleur : `#E07038` (amber)
- Modèle : curated listings + affiliation Airbnb/Booking (< 5% commission)
- Structure : `/stay` → `/stay/theme/[theme]` + `/stay/[country]/[city]`
- 8 thèmes : maison-flottante, avion, sous-marin, cabane-arbres, grotte, fusée, igloo, château
- 6 destinations : cote-d-azur, islande, maldives, alpes, bali, nice
- Liens affiliés : `rel="noopener noreferrer sponsored"` obligatoire
- Bouton Réserver : fond `#FF5A5F` (rouge Airbnb)

### 🛥️ AZUR (`/azur`)
- Couleur : `#0868A0` (sea)
- Services : bateaux, skippers, water taxi, plongée, beach clubs, jet ski
- Sous-pages : `/azur/bateau/[id]`, `/azur/services?type=xxx`

### 📦 RENT (`/rent`)
- Couleur : `#0EA878` (teal)
- Location matériel : vélos, scooters, camping, sport, photo, son

### 🔧 SERV (`/serv`)
- Couleur : `#7B5CF0` (purple)
- Services locaux : plomberie, électricité, peinture, jardinage, ménage

### 📚 LEARN (`/learn`)
- Couleur : `#7B5CF0` (purple)
- Cours et coaching : surf, langues, musique, sport, digital

### 🔒 SEC (`/sec`)
- Couleur : `#D44B24` (coral)
- Sécurité : gardiennage, alarmes, serrurerie, surveillance

### 📡 NEWS (`/news`)
- Couleur : `#5A88B0` (slate)
- Actualités locales : contributions utilisateurs, votes, gamification XP

## Modèle pro (partenariat)
- Inscription : `/pro/inscription` (4 étapes : domaine → infos → GMB → validation)
- Gestion : `/pro/dashboard`, `/pro/stats`, `/pro/listings`, `/pro/flash-deals`
- Commission NIKA : 5-15% selon domaine
- Gestion par SMS : "fermé ce soir" → pause profil, "promo pizza 8€ 2h" → Flash Deal

## Gamification utilisateurs
- XP gagné : commande (+50 XP), avis (+20 XP), POI ajouté (+30 XP)
- Niveaux (10 paliers) : Inconnu → Explorateur → Local → Azuréen → ... → Légende
- Crédits NIKA : 1 crédit = 1€ de valeur plateforme
- Leaderboard : classement hebdomadaire par XP

## Token $NIKA (phase 2)
- Utilité : réductions, accès premium, gouvernance
- Réseau : intégration web3 légère (pas de crypto-first)
- NFC phygital : tags physiques en commerce → claim XP ou offre

## Pages auth
- `/connexion` — login email + Google OAuth
- `/inscription` — 2 étapes : type utilisateur → création compte
- `/pro/inscription` — 4 étapes pro (redirect depuis `/pro/register`)
