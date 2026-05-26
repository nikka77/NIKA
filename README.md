# NIKA — Super-app Côte d'Azur

> **Explore. Joue. Vis.** L'écosystème complet de la vie sur la Côte d'Azur.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe)](https://stripe.com)
[![Claude AI](https://img.shields.io/badge/Claude-claude--sonnet--4--5-D97706)](https://anthropic.com)
[![GitHub Pages](https://img.shields.io/badge/Prototype-GitHub%20Pages-0094D4)](https://nikka77.github.io/NIKA)

---

## 🌐 Aperçu

**[→ Voir les prototypes sur GitHub Pages](https://nikka77.github.io/NIKA)**

| Prototype | Description |
|-----------|-------------|
| [NIKA v5 — UI complète](https://nikka77.github.io/NIKA/prototype.html) | Design system, carousel 3D, carte Leaflet, gamification XP |
| [20 Tokens NFC](https://nikka77.github.io/NIKA/nfc.html) | Catalogue des 20 tokens NFC phygitaux |
| [Landing page](https://nikka77.github.io/NIKA/landing.html) | Page de lancement bêta Nice |

---

## 🏗️ Architecture

```
NIKA/
├── app/
│   ├── page.tsx                    # Homepage — 12 sections
│   ├── auto/                       # Module AUTO (VTC, dépannage)
│   ├── stay/[country]/[city]/      # STAY SEO (6 destinations)
│   ├── stay/theme/[theme]/         # STAY thématique (8 thèmes)
│   ├── news/                       # News locales + publication IA
│   ├── nfc/[slug]/[id]/            # Portails NFC personnalisés
│   ├── pro/register/               # Inscription professionnel
│   └── api/
│       ├── stripe/credits/         # Achat crédits NIKA
│       ├── stripe/webhook/         # Webhook paiement
│       ├── news/moderate/          # Modération Claude AI
│       ├── sms/                    # Webhook Twilio SMS
│       ├── xp/                     # Système XP
│       └── gmb/                    # Import Google My Business
├── components/                     # 17 composants React
├── lib/
│   ├── constants.ts                # Domaines, niveaux XP, NFC items
│   ├── types.ts                    # Interfaces TypeScript
│   ├── store.ts                    # Zustand (map + auth)
│   └── supabase/                   # Client browser + server
├── supabase/schema.sql             # 10 tables + RLS + triggers
└── docs/                           # GitHub Pages — prototypes HTML
```

---

## 🎯 Les 9 domaines

| # | Domaine | Description |
|---|---------|-------------|
| 01 | **FOOD** | Restaurants, food trucks, commande en ligne, stock live |
| 02 | **AUTO** | Dépannage Uber-like, VTC certifiés, lavage, mécanique mobile |
| 03 | **STAY** | Hébergements insolites mondiaux — affiliation Airbnb & Booking |
| 04 | **AZUR** | Bateaux, skipper, jetski, services nautiques |
| 05 | **RENT** | Parasols, scooter sous-marin, EcoFlow, plateforme flottante |
| 06 | **SERV** | Prestataires locaux — réservation, notation, suivi |
| 07 | **LEARN** | Formateurs, ateliers, masterclass locaux |
| 08 | **SEC** | Serruriers, alarmes, gardiennage — intervention rapide |
| 09 | **NEWS** | Infos locales indépendantes — modération IA avant publication |

---

## 📲 NFC Phygital — 20 tokens

Chaque token NFC (NTAG213/215) encode l'URL `nika.fr/nfc/[slug]/[id]`.
Au scan → portail personnalisé avec CTA contextuels.

```
Tokens disponibles :
VTC · Dépanneur · Skipper · Kiosk Food · Kiosk Auto
Passe Membre · Fidélité · Coach Sportif · Wellness · Barista
Table Restaurant · Livraison · Mécanique · Plage · Nautique
Événement · Co-working · Pharmacie · Taxi · Urgence
```

---

## ⚡ Gamification XP

| Action | XP |
|--------|----|
| Laisser un avis | +50 |
| Créer un POI validé | +80 |
| Passer une commande | +30 |
| Publier une news validée | +100 |
| Connexion quotidienne | +20 |
| Inviter un ami | +150 |

**10 niveaux** : Inconnu → Curieux → Local → Connecté → Initié → Insider → Expert → Connaisseur → Ambassadeur → Légende

---

## 🚀 Installation

```bash
# 1. Cloner
git clone https://github.com/nikka77/NIKA.git && cd NIKA

# 2. Dépendances
npm install

# 3. Variables d'environnement
cp .env.local.example .env.local
# → Remplir avec tes clés Supabase, Stripe, Claude, Twilio

# 4. Base de données
# Ouvrir Supabase Dashboard → SQL Editor → coller supabase/schema.sql

# 5. Dev
npm run dev
```

### Variables requises

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🗃️ Base de données Supabase

**10 tables** avec RLS activé sur toutes :

```sql
users          -- Profils + XP + crédits NIKA
pros           -- Professionnels vérifiés (9 domaines)
listings       -- Hébergements STAY + stock FOOD
orders         -- Commandes (déclenche XP via trigger)
flash_deals    -- Offres flash avec expiration
news           -- Articles modérés par IA
pois           -- Points d'intérêt carte (déclenche XP)
xp_transactions-- Historique XP
credit_transactions -- Achats crédits Stripe
waitlist       -- Liste d'accès bêta
```

---

## 🤖 Intégrations IA

### Modération news (Claude claude-sonnet-4-5)
`POST /api/news/moderate` — Analyse contenu, reformule si nécessaire, catégorise, approuve/rejette.

### Gestion pro par SMS (Twilio + Claude)
`POST /api/sms` — Un pro envoie un SMS :
- `"fermé ce soir"` → profil mis en pause
- `"3 burgers restants"` → stock mis à jour
- `"promo pizza 8€ 2h"` → Flash Deal créé automatiquement

---

## 🛠️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16.2.6 (App Router, webpack) |
| Language | TypeScript strict |
| Base de données | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Auth | Supabase SSR (`@supabase/ssr`) |
| Paiement | Stripe Checkout + Webhooks |
| IA | Anthropic Claude claude-sonnet-4-5 |
| SMS | Twilio (webhook entrant) |
| Carte | Leaflet.js (dark mode CSS invert) |
| State | Zustand |
| Style | Tailwind CSS + CSS Variables |
| Fonts | Bebas Neue · Exo 2 · Outfit |
| NFC | NTAG213/215 — URL `nika.fr/nfc/[slug]/[id]` |

---

## 📁 Build

```
Route (app)                           Size
┌ ○ /                                 —    Homepage (12 sections)
├ ○ /auto                             —    Module AUTO
├ ○ /news                             —    News locales
├ ● /nfc/[slug]           (×20)       —    Portails NFC génériques
├ ƒ /nfc/[slug]/[id]                  —    Portails NFC personnalisés
├ ● /stay/[country]/[city] (×6)       —    SEO destinations
└ ● /stay/theme/[theme]    (×8)       —    SEO thèmes insolites

48 pages générées · 0 erreur TypeScript
```

---

*Nice, Côte d'Azur — 2026*
