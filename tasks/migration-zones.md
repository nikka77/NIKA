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
