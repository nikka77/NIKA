# NIKA — Lessons Learned

> Lire ce fichier en entier au début de chaque session. Appliquer chaque règle avant de toucher au code.
> Format : `| date | ce qui s'est mal passé | règle à suivre |`

| Date | Ce qui s'est mal passé | Règle à suivre |
|---|---|---|
| 2026-06-02 | Slug `living-inn-dôme-volcanique-hawaii` avec `ô` → 404 sur Next.js | Vérifier que les slugs ne contiennent aucun caractère accentué (ô, é, à…) avant de les écrire dans le JSON |
| 2026-06-02 | Script `nika_patch_4listings.sh` avait des URLs JS/CSS Airbnb au lieu de vraies images | Toujours inspecter le contenu d'un script externe avant de l'exécuter — vérifier que les URLs `a0.muscache.com` pointent vers `/im/pictures/` et non `/airbnb/static/` |
| 2026-06-02 | `cover.jpg` de Anthenea, Tiny House, Domeland étaient de mauvaises photos (cartoon, jacuzzi, chambre) mais le code ne cherchait que `.jpg` → les nouvelles images `.jpeg`/`.png` n'étaient pas trouvées | Toujours chercher plusieurs extensions (`.jpg`, `.jpeg`, `.png`) dans `getCoverImage` / `getSlugImages` — ne pas hardcoder `.jpg` |
| 2026-06-02 | Vercel ne se déployait pas automatiquement depuis GitHub malgré les pushs | Si Vercel ne se met pas à jour après un push, lancer manuellement `npx vercel --prod` depuis la racine du projet |
| 2026-06-03 | `rev.stars` inexistant sur certains avis enrichis qui utilisaient `rating` → build TypeScript error | Toujours gérer les deux champs : `rev.stars ?? rev.rating ?? 5` — les deux formats coexistent dans `wow_listings.json` |
