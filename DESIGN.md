# Design System: NIKA — Super-App Côte d'Azur

## 1. Visual Theme & Atmosphere

NIKA is a **cockpit-dense, asymmetric, cinematic** interface. The atmosphere is that of a mission briefing room at sea level — deep navy surfaces, amber warning lights, teal confirmation signals. Density: 7 (information-rich without claustrophobia). Variance: 8 (asymmetric splits, offset grids, breaking-grid accents). Motion: 6 (fluid CSS transitions with spring-physics feel). Creativity: 9 (nothing generic, everything purposeful).

The aesthetic is **dark intelligence** — the kind of interface an elite travel concierge would use if they worked from a submarine.

## 2. Color Palette & Roles

| Descriptive Name | Hex | Functional Role |
|---|---|---|
| **Deep Space Navy** | `#050C17` | Primary page background — the ocean floor |
| **Midnight Panel** | `#09152A` | Cards, sidebars, modal surfaces |
| **Abyss Input** | `#0E1F3A` | Inputs, overlays, hover states |
| **Warm Sand** | `#F0E8D4` | Light-mode surfaces (StatsBar) |
| **Azur Blue** | `#0094D4` | Primary interactive accent — navigation, CTAs |
| **Electric Azur** | `#00C2FF` | Active states, highlights |
| **Antique Gold** | `#D4A017` | FOOD domain, reward tokens |
| **Pale Gold** | `#F0C040` | Star ratings, achievement glow |
| **Alarm Coral** | `#D44B24` | Errors, alerts, SEC domain |
| **Ocean Teal** | `#0EA878` | Direct booking confirmations, success states |
| **Celestial Amber** | `#E07038` | STAY domain accent, warm CTAs |
| **Deep Sea** | `#0868A0` | AZUR domain |
| **Slate Steel** | `#5A88B0` | Subtle informational accents |
| **Warm Ivory** | `#EBE5D6` | Primary text — warm white, never pure white |
| **Steel Blue Muted** | `#7A90A8` | Secondary text — metadata, labels |
| **Whisper Slate** | `#3A5068` | Tertiary text — ghost labels, captions |
| **Ghost Border** | `rgba(255,255,255,0.07)` | Structural card borders — barely visible |
| **Visible Border** | `rgba(255,255,255,0.14)` | Active borders, form elements |

**Accent constraint:** No accent exceeds 70% saturation. `#7B5CF0` (purple) is domain-only, never global. The "AI Purple Neon" aesthetic is banned. No gradient text on large headers.

## 3. Typography Rules

- **Display (var(--fn)) — Bebas Neue:** Ultra-compressed headlines, navigation logo. Track-tight, all-caps only. Sizes: 28–96px. The editorial voice of NIKA — bold, confident, zero decoration.
- **Sub-display (var(--fe)) — Exo 2 Bold Italic:** Card titles, section headers, CTA labels. Always `fontStyle: italic`, `fontWeight: 900`. Sizes: 11–72px. The operational layer.
- **Body (var(--fo)) — Outfit:** All prose, labels, inputs, badges, metadata. `fontWeight: 400–700`. Sizes: 9–16px. Clean and legible at high density.

**Banned:** `Inter`, `Roboto`, `Open Sans` for display contexts. Generic serifs (`Times New Roman`, `Georgia`) everywhere. Pure white text (`#FFFFFF`) — always use Warm Ivory (`#EBE5D6`).

**Scale hierarchy:** Headlines via `clamp()` only. Body minimum `10px`. Number-heavy displays use Exo 2 Italic for numeric weight.

## 4. Component Stylings

**Buttons — Primary:**
Flat rectangular with 3px border-radius. `background: var(--az)` or domain accent. Tactile `-1px translateY` on `active`. No neon outer glow. Font: Exo 2 Bold Italic uppercase. Padding: `14px 28px`. Letter-spacing `0.06em`.

**Buttons — Secondary:**
Ghost style: `border: 1px solid rgba(255,255,255,0.14)`. Color: `var(--td2)`. Same typography and radius as primary. No background fill.

**Cards:**
`background: var(--bg2)`, `border: 1px solid var(--bd)`, `borderRadius: 8–12px`. Domain-colored 3px accent line at top (`height: 3px`). Tinted background gradient per domain on hover. No floating shadows — depth via background differentiation only. Use CSS class `.stay-card` for hover state — never `onMouseEnter`.

**Badges/Pills:**
`borderRadius: 20px`, `padding: 3px 10px`. Font: Outfit 9–11px, `fontWeight: 700`. Low-opacity background matching accent (`rgba(accent, 0.1)`), matching border (`rgba(accent, 0.3)`). Never solid-fill badges.

**Inputs:**
`background: rgba(255,255,255,0.05)`, `border: 1px solid var(--bd2)`, `borderRadius: 6px`. Label above. No floating labels. Focus ring in domain accent. Padding: `11px 16px`.

**Empty States:**
Centered icon at 48px + explanatory paragraph + action link. Never just "No data found."

**Loading States:**
The NIKA radar animation (radar sweep, 3 colored dots, "NICE, CÔTE D'AZUR" caption). Never circular spinners.

## 5. Layout Principles

- **Max-width containment:** `1100px` for main content, `900px` for detail pages (slug/fiche).
- **Grid-first:** Use CSS classes `.g-2`, `.g-3`, `.g-4` — never `gridTemplateColumns` in inline styles.
- **Asymmetric heroes:** Never centered hero on domain pages. Left-aligned text, offset accent elements. Background icon at 0.04 opacity on the right.
- **Section padding:** `clamp(2rem, 5vw, 4rem)` vertical, `1.4rem` horizontal.
- **Spacing philosophy:** Generous internal padding (1.2–1.8rem) within cards. Tight external gaps (0.6–1rem) in grid lists.
- **Sticky sidebar:** Detail pages use `g-listing` (`1fr 300px`) with booking sidebar `position: sticky, top: 70px`.
- **No overlap:** Every element occupies its own spatial zone. No absolute-positioned content stacking over live text.

## 6. Motion & Interaction

**Keyframes defined in globals.css:**
- `ndp` — Pulse dot (nav logo, online status indicators). Infinite loop.
- `hin` — Hero fade-in with `translateY(14px)`. Page mount.
- `fping` — Ping scale to 1.9× for notification rings.
- `tspin` — 360° rotation for loading spinners (radar).
- `xpbr` — XP bar breathing pulse.

**Hover states:**
- All cards: CSS class-based hover (`.stay-card:hover`, `.nav-link:hover`). Never `onMouseEnter/Leave` in Server Components.
- Cards: `transform: translateY(-2px)` + slightly brighter border on hover.
- Buttons: `-1px translateY` on `active`.

**Performance:**
- Only `transform` and `opacity` animated — never `top`, `left`, `width`, `height`.
- Grain/noise filters on `::before` pseudo-elements only.
- Client Components isolated for CPU-heavy animations (radar loader).

## 7. Anti-Patterns (Banned)

- ❌ Emojis in UI text (except data-driven: listing type icons from JSON)
- ❌ `Inter`, `Roboto`, `Open Sans` for display
- ❌ Generic serif fonts (`Times New Roman`, `Georgia`)
- ❌ Pure white text (`#FFFFFF`) — use Warm Ivory
- ❌ Pure black (`#000000`) — use Deep Space Navy
- ❌ Neon outer glow shadows (`box-shadow: 0 0 30px` on interactive elements excepted for NIKA-branded teal glow on primary booking CTA)
- ❌ Oversaturated accents (saturation > 70%)
- ❌ Gradient text on large headers
- ❌ Custom mouse cursors
- ❌ 3 perfectly equal cards in a row as the primary layout pattern
- ❌ `onMouseEnter` / `onMouseLeave` in Server Components
- ❌ `gridTemplateColumns` in inline `style={}` — always use `.g-N` classes
- ❌ `h-screen` — always `min-h-[100dvh]` (iOS Safari jump fix)
- ❌ Fabricated statistics ("99.98% uptime", "18.5k deploys") — only real data
- ❌ AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen", "Game-changing"
- ❌ Filler CTA text: "Scroll to explore", scroll arrows, bouncing chevrons
- ❌ Centered hero sections on domain pages (variance > 4)
- ❌ Broken image URLs — use real assets or no `<img>` elements

## 8. Domain Color Map

| Domain | Accent | Usage |
|--------|--------|-------|
| FOOD | `#D4A017` (Antique Gold) | Nav icon, section borders, CTA |
| AUTO | `#0094D4` (Azur Blue) | Nav icon, cards |
| STAY | `#E07038` (Celestial Amber) | Nav icon, WOW badges, hero |
| AZUR | `#0868A0` (Deep Sea) | Nav icon, map elements |
| RENT | `#0EA878` (Ocean Teal) | Nav icon, success states |
| SERV | `#7B5CF0` (Stitch Purple) | Nav icon only |
| LEARN | `#7B5CF0` (Stitch Purple) | Nav icon, quiz elements |
| SEC | `#D44B24` (Alarm Coral) | Nav icon, alert states |
| NEWS | `#5A88B0` (Slate Steel) | Nav icon, editorial |
