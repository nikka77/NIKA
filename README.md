# NIKA — Super-app Côte d'Azur

> **Explore. Joue. Vis.** L'écosystème complet de la vie sur la Côte d'Azur.

[![App live](https://img.shields.io/badge/App-live%20sur%20Vercel-000?logo=vercel)](https://nika-murex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe)](https://stripe.com)
[![Claude AI](https://img.shields.io/badge/Claude-Sonnet%204.x-D97706)](https://anthropic.com)

---

## 🌐 Aperçu

**🚀 App en production → [nika-murex.vercel.app](https://nika-murex.vercel.app)**
**🎛️ Vitrine du projet → [nikka77.github.io/NIKA](https://nikka77.github.io/NIKA)**

| Lien | Description |
|------|-------------|
| [App live](https://nika-murex.vercel.app) | L'app réelle (Next.js 16 + Supabase) déployée sur Vercel |
| [Vitrine GitHub Pages](https://nikka77.github.io/NIKA) | Aperçu du projet : stack, features, métriques |
| [20 Tokens NFC](https://nikka77.github.io/NIKA/nfc.html) | Catalogue des 20 tokens NFC phygitaux |
| [Landing bêta](https://nikka77.github.io/NIKA/landing.html) | Page de lancement bêta Nice |

> `prototype.html` redirige désormais vers l'app live (la maquette v5 d'origine reste dans l'historique git).

---

## ✨ Ce que fait NIKA

- **🪪 Membres numérotés** — chaque inscrit reçoit un **numéro séquentiel permanent** (`#0`, `#1`…, style examen *Hunter × Hunter*), un **badge SVG** généré dynamiquement, un **palier** (`founder` < 10, `pioneer` < 100, `initie` < 1000, `member`) et des **niveaux KYC** récompensés en `$NIKKA`.
- **🤖 Agent IA NIKO** — assistant Claude (streaming) pour VTC, livraison, courses & dépannage, multi-canal (chat, SMS).
- **🍽️ FOOD & Food de nuit** — restaurants, livraison, enseignes de nuit (Rakomoria, Afroweek) + annuaire filtrable.
- **⛵ AZUR / 🏝️ STAY** — locations de bateaux exclusives et logements insolites scorés « WOW ».
- **🗺️ Carte live** — hero « NIKA Stories » (globe MapLibre → scènes) + carte interactive des POIs.
- **🔧 Devis ARTISAN** — couche données de devis (dictée/photo → JSON via IA, validation pro, montant destiné à un escrow crypto).
- **📲 NFC phygital** — 20 tokens NFC physiques, chacun un portail vers un service ou un profil.
- **🎮 Gamification** — XP, niveaux, jeton `$NIKKA`.

---

## 🪪 Système membres (numéros + badges + KYC)

| Élément | Détail |
|---------|--------|
| **Numéro** | Séquence Postgres `nika_number_seq` (démarre à 10). `#0`–`#9` réservés fondateurs. Permanent, public. |
| **Badge** | SVG généré : `GET /api/badge/[number]?tier=&kyc=` — disque blanc, numéro Bebas Neue, pastille KYC. Composant `<NikaBadge />`. |
| **Palier** | `founder` / `pioneer` / `initie` / `member` posé par trigger selon le numéro. |
| **KYC** | Niveaux 0→3, récompenses `+50 / +100 / +200 $NIKKA` (`POST /api/kyc/complete`, autoritaire via service-role). |
| **Inscription** | `/inscription` → révélation animée du numéro. `/profil` → identité, KYC, devenir pro, solde. |

La ligne `users` est créée au signup par le trigger `handle_new_user` (robuste même sous confirmation email).
Migrations : `supabase/schema.sql` (socle) puis `supabase/migrations/nika_users.sql`.

---

## 🏗️ Architecture

```
NIKA/
├── app/
│   ├── page.tsx                    # Homepage (hero « NIKA Stories »)
│   ├── inscription / connexion     # Auth + révélation du numéro membre
│   ├── profil/                     # Profil membre (identité, KYC, pro, $NIKKA)
│   ├── food/                       # FOOD + Food de nuit (afroweek06, rakomoriafood)
│   ├── auto/ stay/ azur/ …         # Les 9 domaines
│   ├── nfc/[slug]/[id]/            # Portails NFC personnalisés
│   ├── pro/inscription/            # Onboarding professionnel
│   └── api/
│       ├── badge/[number]/         # Badge SVG dynamique (HxH)
│       ├── next-number/            # Prochain numéro (CTA « Rejoindre #N »)
│       ├── kyc/complete/           # Récompenses KYC ($NIKKA)
│       ├── profile/                # MAJ profil membre
│       ├── stripe/{credits,webhook}/  # Paiements
│       ├── news/moderate/  sms/  xp/  # Modération IA, SMS, XP
├── components/
│   ├── ui/NikaBadge.tsx            # Badge membre réutilisable
│   ├── home/  food/  azur/  stay/  # Composants par domaine
├── lib/
│   ├── constants.ts  types.ts  store.ts   # Domaines, types, Zustand
│   ├── food.ts  night-themes.ts           # Données FOOD / enseignes de nuit
│   ├── devis/                              # Couche devis ARTISAN (types + Zod + totaux)
│   └── supabase/{client,server,admin}.ts  # Clients Supabase
├── supabase/
│   ├── schema.sql                  # Socle : users, pros, listings, orders… + RLS
│   └── migrations/                 # nika_users.sql (membres), food, azur, stay…
└── docs/                           # GitHub Pages (vitrine + NFC + landing)
```

≈ **197 fichiers TS/TSX · 23 600+ lignes · 79 pages · 22 API routes · 14 migrations · 0 erreur build.**

---

## 🎯 Les 9 domaines

| # | Domaine | Description |
|---|---------|-------------|
| 01 | **FOOD** | Restaurants, food trucks, Food de nuit, commande en ligne, stock live |
| 02 | **AUTO** | Dépannage Uber-like, VTC certifiés, lavage, mécanique mobile |
| 03 | **STAY** | Hébergements insolites — scoring « WOW », affiliation Airbnb & Booking |
| 04 | **AZUR** | Bateaux, skipper, jetski, services nautiques |
| 05 | **RENT** | Parasols, scooter sous-marin, EcoFlow, plateforme flottante |
| 06 | **SERV** | Prestataires & artisans locaux — devis, réservation, notation |
| 07 | **LEARN** | Formateurs, ateliers, masterclass locaux |
| 08 | **SEC** | Serruriers, alarmes, gardiennage — intervention rapide |
| 09 | **NEWS** | Infos locales indépendantes — modération IA avant publication |

---

## 📲 NFC Phygital — 20 tokens

Chaque token NFC (NTAG213/215) encode l'URL `/nfc/[slug]/[id]`. Au scan → portail personnalisé avec CTA contextuels.

```
VTC · Dépanneur · Skipper · Kiosk Food · Kiosk Auto
Passe Membre · Fidélité · Coach Sportif · Wellness · Barista
Table Restaurant · Livraison · Mécanique · Plage · Nautique
Événement · Co-working · Pharmacie · Taxi · Urgence
```

---

## 🚀 Installation

```bash
git clone https://github.com/nikka77/NIKA.git && cd NIKA
npm install
cp .env.local.example .env.local      # → remplir les clés (voir ci-dessous)

# Base de données — Supabase SQL Editor, dans l'ordre :
#   1) supabase/schema.sql            (socle : users, pros, listings, orders…)
#   2) supabase/migrations/nika_users.sql   (numéros + badges + KYC)
#   3) les autres migrations selon les modules utilisés (food, azur, stay…)

npm run dev                           # http://localhost:3000
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

## 🗃️ Base de données (Supabase)

Socle (`schema.sql`) — RLS activé partout :

```
users  pros  listings  orders  flash_deals
news   pois  xp_transactions  credit_transactions  waitlist
```

La table **`users`** est étendue par `nika_users.sql` : `number` (unique), `badge_tier`, `kyc_level`,
`is_verified`, `pro_domains`, `city`, `bio` + triggers (`assign_badge_tier`, `handle_new_user`, `set_updated_at`)
et la fonction `get_next_number()`. Modules domaines : tables `food_*`, `azur_*`, `stay_*`.

---

## 🤖 Intégrations IA

- **Agent NIKO** — Claude (Sonnet 4.x) en streaming pour les intentions VTC / livraison / courses / dépannage.
- **Modération news** — `POST /api/news/moderate` : analyse, reformule, catégorise, approuve/rejette.
- **Gestion pro par SMS** — `POST /api/sms` (Twilio + Claude) : `"fermé ce soir"` → pause ; `"3 burgers restants"` → stock ; `"promo pizza 8€ 2h"` → Flash Deal.

---

## 🛠️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16.2.6 (App Router + Turbopack) |
| Langage | TypeScript strict |
| Base de données | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| Auth | Supabase SSR (`@supabase/ssr`) |
| Paiement | Stripe Checkout + Webhooks |
| IA | Anthropic Claude (Sonnet 4.x) |
| SMS | Twilio (webhook entrant) |
| Carte / Globe | MapLibre GL (globe + carte) · Leaflet (POIs) |
| Animations | Framer Motion 12 |
| Validation | Zod 4 |
| State | Zustand |
| Style | Tailwind CSS + CSS Variables |
| Fonts | Bebas Neue · Exo 2 · Outfit |
| NFC | NTAG213/215 — `/nfc/[slug]/[id]` |
| Déploiement | Vercel (prod) · GitHub Pages (vitrine) |

---

## 📦 Build & déploiement

```bash
npm run build      # 0 erreur TypeScript · 79 pages générées
npx vercel --prod  # déploiement production
```

L'app est **live sur Vercel** : [nika-murex.vercel.app](https://nika-murex.vercel.app).

---

*Nice, Côte d'Azur — 2026*
