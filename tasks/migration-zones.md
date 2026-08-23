# NIKA — migration en zones (décision de Dan, 12/08/2026)

> « Le site est trop lourd et trop complexe. On garde ce qu'on a fait, on recommence ailleurs
> petit à petit : plein de petits sites, modules, applications qu'on reliera plus tard. » — Dan.
> Mesuré le même jour : 96 routes, 108 composants (48 pour AKASHA seul), 333 scripts, 609 traces
> d'audit (103 Mo), 599 commits. Deux produits sans rapport partagent un seul corps.

## Les quatre décisions (validées « go tout ça »)

1. **Un produit = un dépôt GitHub = un déploiement Vercel.** Petit, rapide à builder, abandonnable
   sans rien casser ailleurs.
2. **Un seul domaine**, par *Multi-Zones* Next.js : le projet `nika` (cœur) réécrit `/jeux/*` et
   `/learn/akasha/*` vers les projets de zone. Les URL publiques ne changent PAS (499 pages
   indexées). Des sous-domaines disperseraient l'autorité SEO.
3. **Supabase reste la colonne vertébrale** : un seul compte utilisateur, une seule base (`keffsf…`,
   compte 777dxt). C'est ce qui rend le « relier plus tard » facile.
4. **Le liant, minuscule** : un fichier de tokens CSS (les variables `:root` de `globals.css`, les
   trois polices Bebas/Exo 2/Outfit) + un en-tête commun + la carte des zones. Rien de plus.

## Topologie cible

| Dépôt | Rôle | basePath | Projet Vercel |
|---|---|---|---|
| `nikka77/nika-liant` | tokens.css · polices · `NikaHeader` · `zones.ts` — consommé en dépendance git | — | — |
| `nikka77/nika-jeux` | les jeux (Iaijutsu, La drogue de Mayuri, ANAMNÈSE…) | `/jeux` | `nika-jeux` |
| `nikka77/nika-akasha` | l'encyclopédie : `app/learn/akasha`, `components/akasha`, `lib/akasha`, ses tests | `/learn/akasha` | `nika-akasha` |
| `nikka77/NIKA` (cœur) | portail, FOOD, AUTO, STAY… + les réécritures vers les zones | — | `nika` (prod : nika-murex.vercel.app) |
| *(plus tard)* `nika-ops` | l'usine : `scripts/`, `lib/ops`, démons VPS | — | VPS |

**Méthode : EXTRAIRE, jamais réécrire.** NIKA reste en ligne tel quel pendant toute la migration.
Un morceau sort quand sa zone est déployée et vérifiée ; le cœur maigrit par soustraction.

## Règles pour tout agent de migration

- **Jamais de `vercel --prod` sur le projet `nika`** : c'est Dan qui déploie le cœur. Les NOUVEAUX
  projets de zone peuvent être déployés (`--prod` compris) : ils vivent sur leur propre URL
  `*.vercel.app` et ne sont visibles du public qu'une fois les réécritures livrées par Dan.
- Même équipe Vercel que `nika` (`dan-2219cbfb`). Même compte GitHub (`nikka77`).
- Les clés passent par les fichiers (`vercel env add … < .env.local`), **jamais dans la conversation**.
- Travailler dans `/Users/macbookprom1pro/dev/` (jamais iCloud).
- Entre zones : liens DURS (`<a>`), pas `<Link>`. `basePath` + `assetPrefix` posés dès le départ.
- Chaque dépôt naît avec `CLAUDE.md` + `tasks/lessons.md` (protocole SELF-LEARNING) et un `README`
  qui dit en trois lignes ce que le produit est et n'est pas.
- Français partout. Les commentaires disent POURQUOI.

## Contrat de vérification d'une zone

1. `npm run build` passe, tsc 0 ;
2. l'URL Vercel de la zone répond 200 sur un échantillon de routes, y compris avec le basePath ;
3. PARITÉ (AKASHA) : 30 fiches tirées au sort rendent le même `<title>`, la même méta-description,
   le même nombre de sections de dossier que le cœur local ;
4. les réécritures du cœur sont éprouvées EN LOCAL (`next dev` du cœur → zone déployée) avant
   d'être proposées à Dan pour la prod.

## Vagues

- **A** — liant + jeux (terrain vierge : valide la mécanique d'extraction sans risque).
- **B** — AKASHA en zone autonome (la moitié du poids du site).
- **C** — réécritures dans le cœur + amaigrissement (suppression des morceaux extraits).
- **D** — l'usine dans `nika-ops` (VPS) — différée : elle marche, on ne la touche qu'en dernier.

## Vague C — état (23/08/2026)

**Fait**, sur la branche `zones` du worktree `/Users/macbookprom1pro/dev/NIKA-zones`, commit
`e60c9361` :

- `next.config.js` : `rewrites()` (afterFiles) pour `/jeux`, `/learn/akasha`, `/images/akasha` vers
  `nika-jeux.vercel.app` et `nika-akasha.vercel.app`. Les 48 redirections de slugs restent AVANT
  (phase séparée, toujours antérieure aux rewrites) — vérifié par `curl -I` en local :
  `/learn/akasha/skypiea` rend un 308 avec `Location: /learn/akasha/skypiea-lieu`, SANS host de
  zone.
- `app/learn/page.tsx` : le lien vers `/learn/akasha` est un `<a>` dur (plus de `<Link>`).
- `app/globals.css` : bloc CSS AKASHA retiré (858-1202, ~330 lignes) + `.ak-svg-focusable` — sauf
  `.akasha-card` (+ hover, + reduced-motion), seule classe du bloc encore consommée hors AKASHA
  (la carte de portail de `app/learn/page.tsx`).
- Supprimés (`git rm`) : `app/learn/akasha/` (15 fichiers), `components/akasha/` (48 fichiers),
  `public/images/akasha/` (24 Mo). `public/jeux-proto` n'existait pas dans ce worktree (untracked
  uniquement dans l'autre working tree de `main` — rien à supprimer ici).
- `lib/akasha/` : réduit de 24 à 15 fichiers (13 modules + `shape.test.ts` + `miroir-axes.test.ts`).
  Fermeture transitive établie par grep sur `scripts/*`, `app/sitemap.ts`, `app/api/ops/*` (pas
  seulement les 3 fichiers du cœur trouvés par la reconnaissance B0 — 51 scripts de l'usine
  importent aussi `lib/akasha`, jamais mesuré avant ce chantier). Gardés : `collections.ts`,
  `db-forms.ts`, `flavor.ts`, `naruto-world.ts`, `og-visuel.ts`, `queries.ts`,
  `relation-labels.ts`, `relations.ts`, `schema.ts`, `sections.ts`, `shape.ts`, `types.ts`,
  `universe-taxonomy.ts`. Supprimés : `db-cosmos.ts`, `db-roster.ts`, `forms.ts`, `href.ts`,
  `hub-surface.ts` (+ son test), `op-world-map.ts`, `useFullscreenToggle.ts`,
  `useMapZoomPanSvg.ts` — plus utilisés que par `app/learn/akasha`/`components/akasha`.
  `data/akasha/op-world-map.json` (240 Ko) **reste** : lu directement par 3 scripts de l'usine
  (`scripts/build-op-map-data.mjs`, `scripts/akasha-apply-rewrites.mjs`,
  `scripts/akasha-op-places.mjs`) via `fs`, indépendamment du wrapper `lib/akasha/op-world-map.ts`
  (supprimé, lui, car plus rien ne l'importe). `scripts/lib/akasha-axes.mjs` inchangé, comme demandé.
- **Découverte en cours de route** : le dépôt `nika-akasha` a DÉJÀ décidé, dans son propre
  historique (commit du 23/08, en-tête de `lib/akasha/miroir-axes.test.ts` et de
  `lib/akasha/axes-miroir.mjs`), que la zone devient la source de vérité de la taxonomie et de son
  miroir JS pour l'usine — et que « le cœur devra consommer `nika-akasha` en dépendance git pour
  son usine (vague C) », **à trancher par Dan**. Cette vague C n'a PAS pris cette décision : elle
  garde `scripts/lib/akasha-axes.mjs` et `lib/akasha/universe-taxonomy.ts` dans le cœur, comme
  demandé explicitement dans la consigne de ce chantier, et couvre le risque de dérive qui en
  découle avec `lib/akasha/miroir-zone.test.ts` (ci-dessous). **Reste un point pour Dan** : les deux
  fichiers axes (`scripts/lib/akasha-axes.mjs` du cœur vs `lib/akasha/axes-miroir.mjs` de la zone)
  ont désormais des EN-TÊTES différents (la zone documente la migration, pas le cœur) — fonctionnellement
  identiques (mêmes `AXES`/`UNIVERSE_SLUG`), mais plus au même chemin ni mot pour mot. Pas de test
  automatique dessus tant que la dépendance git n'est pas tranchée.
- `lib/akasha/miroir-zone.test.ts` (nouveau) : compare OCTET PAR OCTET les 13 modules dupliqués
  (+ `shape.test.ts`) contre leur original dans `/Users/macbookprom1pro/dev/nika-akasha` (dépôt
  frère, present sur cette machine) ou GitHub en repli — jamais un faux vert si les deux sont
  injoignables (`t.skip` explicite). Une seule divergence tolérée et documentée en tête de fichier :
  les 3 `extras[].href` d'`universe-taxonomy.ts` portent `/learn/akasha/...` dans le cœur (pas de
  basePath, consommé par `app/sitemap.ts`) contre un chemin relatif dans la zone (qui a un basePath
  `/learn/akasha` et se le fait préfixer par Next). Vert aujourd'hui : les deux dépôts n'ont PAS
  encore dérivé, sauf sur cette exception déjà documentée.
- `app/sitemap.ts` : vidé — il ne listait QUE des URL AKASHA (confirmé : aucune autre page du cœur
  n'y était). `app/robots.ts` : déclare les deux sitemaps (`/sitemap.xml` + `/learn/akasha/sitemap.xml`,
  tous deux sous le domaine du cœur), garde ses `disallow` AKASHA.
- `package.json` : ajout du script `"test"` (`tsx --test lib/akasha/*.test.ts`) — absent du dépôt
  avant ce chantier, les 3 tests existants ne se lançaient qu'à la main.

**Mesuré** :

| Mesure | Avant | Après |
|---|---|---|
| Pages générées au build | 499 (sur `main`) | **176** |
| Fichiers suivis (`git ls-files`) | 2612 | **2052** (+1 non ajouté au commit : voir note) |
| Poids de `public/` | 210 Mo | **185 Mo** |
| Fichiers `lib/akasha/` | 24 | **15** |
| `.next/` après build | non mesuré sur `main` (serveur partagé, jamais buildé à neuf pour ce chantier) | **78 Mo** |

`npx tsc --noEmit` : 0 erreur. `npm run build` : 0 erreur, 176 pages. `npm test` : **56/56 vert**
(3 fichiers de test : `shape.test.ts`, `miroir-axes.test.ts`, `miroir-zone.test.ts` — celui-ci a
tourné en comparant contre le dépôt frère, pas sauté).

**Vérifié en local** (`next dev -p 3001`, rewrites vers les zones déployées, par `curl` ET dans le
navigateur Claude) : `/learn/akasha` (200, HTML avec `/learn/akasha/_next/`), `/learn/akasha/naruto-uzumaki`
(200, fiche complète), `/learn/akasha/u/naruto` (200, carte cliquable, capturée), `/learn/akasha/skypiea`
(308 → `/learn/akasha/skypiea-lieu`, sans host de zone), `/images/akasha/glyphes/sarutobi-symbole.webp`
(200, `image/webp` vérifié par `file`), `/jeux` (200), `/jeux/iaijutsu` (200, jouable, capturé),
`/learn/akasha/api/search?q=naruto` (200 JSON). Cœur intact : `/`, `/food`, `/stay`, `/learn` (200,
carte AKASHA capturée avec son accent violet, lien `<a>` suivi jusqu'à la zone), `/sitemap.xml`
(vide, sans AKASHA), `/robots.txt` (deux sitemaps).

**URL de prévisualisation** (Vercel, déploiement automatique du push sur `zones`) :
**https://nika-324cxuhrt-dan-2219cbfb.vercel.app**

Protégée par l'authentification Vercel (SSO) — normal pour une preview de l'équipe
`dan-2219cbfb`, PAS contourné : accédée via le lien de partage temporaire généré par le compte
Vercel déjà authentifié (`get_access_to_vercel_url`, expire le 24/08 à 12h20), pas par une tentative
de contournement de l'auth. **Rejoué dessus** (mêmes vérifications qu'en local, capturées) :
`/learn/akasha` (rendu identique, 7697 entrées/8 univers), `/learn/akasha/skypiea` (redirige bien
vers `.../skypiea-lieu` sur le MÊME domaine de preview), `/jeux/iaijutsu` (jouable, capturé),
`/images/akasha/glyphes/sarutobi-symbole.webp` (image 512×512 chargée), `/food` (rendu intact,
capturé), `/sitemap.xml` (vide), `/robots.txt` (deux sitemaps déclarés — mais avec
`http://localhost:3000` en préfixe : `NEXT_PUBLIC_APP_URL` n'est apparemment configurée que pour
Production sur ce projet Vercel, PAS pour Preview — comportement PRÉEXISTANT de `lib/site.ts`, pas
introduit par ce chantier, à vérifier par Dan si ça doit changer).

**Ce que Dan doit faire pour livrer** : fusionner `zones` dans `main` (ou ouvrir la PR déjà proposée
par GitHub à https://github.com/nikka77/NIKA/pull/new/zones) — c'est le seul geste qui déclenche un
déploiement de PRODUCTION sur `nika-murex.vercel.app`, et il n'a pas été fait ici (règle absolue du
chantier). Point ouvert à trancher avant ou après la fusion : la dépendance git du cœur vers
`nika-akasha` pour l'usine (voir « Découverte en cours de route » ci-dessus) — actuellement le cœur
garde sa propre copie de la taxonomie et de son miroir JS, gardée honnête par
`lib/akasha/miroir-zone.test.ts`, mais ce n'est pas la solution long terme que le dépôt `nika-akasha`
lui-même appelle de ses vœux.

**Non prouvé / hors périmètre** : pas de build de référence relancé sur `main` pour mesurer son
poids `.next/` (le serveur `next dev` de `main` tourne pour d'autres agents, consigne de ne pas y
toucher) — seul le nombre de pages (499) était déjà connu. Le lien de partage Vercel expire le
24/08 à 12h20 ; au-delà, la préview reste joignable pour qui a un accès `dan-2219cbfb` normal.
