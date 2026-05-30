# NIKA Design System

## Palette CSS (globals.css :root)
```
--bg: #050C17       ← fond principal
--bg2: #09152A      ← cartes, panels
--bg3: #0E1F3A      ← inputs, overlays
--sand: #F0E8D4     ← fond clair (StatsBar)
--az: #0094D4       ← bleu azur principal
--az2: #00C2FF      ← bleu azur vif
--gold: #D4A017     ← or (FOOD, token)
--gold2: #F0C040    ← or clair
--coral: #D44B24    ← rouge erreur / alerte
--teal: #0EA878     ← vert succès / online
--purple: #7B5CF0   ← LEARN
--amber: #E07038    ← STAY / CTA chaud
--sea: #0868A0      ← AZUR foncé
--slate: #5A88B0    ← bleu gris
--td: #EBE5D6       ← texte principal
--td2: #7A90A8      ← texte secondaire
--td3: #3A5068      ← texte discret
--tl: #0E1F3A       ← texte sur fond clair
--tl2: #3A5870      ← texte secondaire sur fond clair
--bd: rgba(255,255,255,0.07)   ← border subtile
--bd2: rgba(255,255,255,0.14)  ← border visible
```

## Typographies
- `var(--fn)` = Bebas Neue → titres display, nav logo, stats (fontSize 28-96px)
- `var(--fe)` = Exo 2 Bold Italic → sous-titres, cards (fontStyle: italic, fontWeight: 900)
- `var(--fo)` = Outfit → corps de texte, labels, inputs (fontSize 10-16px)

## Conventions visuelles
- Titres page : `fontFamily: 'var(--fe)', fontStyle: 'italic', textTransform: 'uppercase', fontWeight: 900`
- Taille titre : `fontSize: 'clamp(40px, 7vw, 72px)'`
- Labels catégorie : `fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase'`
- Bouton principal : `background: 'var(--az)', color: '#fff', borderRadius: 3, fontFamily: 'var(--fe)', fontStyle: 'italic'`
- Bouton secondaire : `border: '1px solid var(--bd2)', color: 'var(--td2)', borderRadius: 3`
- Cartes : `background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8`
- Accent de couleur par domaine en haut de carte : `height: 3, background: colorDomaine`

## Couleurs par domaine
- FOOD → `var(--gold)` / `#D4A017`
- AUTO → `#0094D4` / `var(--az)`
- STAY → `#E07038` / `var(--amber)`
- AZUR → `#0868A0` / `var(--sea)`
- RENT → `#0EA878` / `var(--teal)`
- SERV → `#7B5CF0` / `var(--purple)`
- LEARN → `#7B5CF0` / `var(--purple)`
- SEC → `#D44B24` / `var(--coral)`
- NEWS → `var(--slate)`

## Grilles responsive (CSS classes globals.css)
- `.g-2` → 2 cols desktop, `.max-md:grid-cols-1` → 1 col tablet
- `.g-3` → 3 cols desktop, `.max-md:grid-cols-2 max-sm:grid-cols-1`
- `.g-4` → 4 cols desktop, `.max-md:grid-cols-2 max-sm:grid-cols-2`
- `.g-footer` → 1.5fr 1fr 1fr 1fr → `.max-md:grid-cols-2 max-sm:grid-cols-1`
- **JAMAIS** de `gridTemplateColumns` dans `style={}` — utiliser toujours les classes CSS

## Animations keyframes
- `ndp` → pulse dot (nav NIKA logo, statut online)
- `hin` → fade-in Y translateY(14px)
- `fping` → ping scale 1.9
- `tspin` → rotation 360deg
- `xpbr` → XP bar breathing

## Hover patterns
- Cartes : `className="stay-card"` → CSS `.stay-card:hover`
- Nav links : `className="nav-link"` → CSS `.nav-link:hover`
- News cards : `className="news-card"` → CSS `.news-card:hover`
- Jamais de `onMouseEnter`/`onMouseLeave` dans les Server Components
