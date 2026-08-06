# scripts/archive — les scripts soldés quittent le premier rang

## La règle

Un script dont la mission est **terminée** — migration jouée, backfill versé, rattrapage
appliqué — s'archive ici au lieu de traîner dans `scripts/`. Le premier rang reste lisible :
ce qui s'y trouve est ce qui sert encore.

- **Git est l'historique, l'archive n'est qu'un rangement.** Le déplacement se fait par
  `git mv` ; `git log --follow` retrouve toute la vie du fichier. On n'archive pas pour
  préserver — git préserve déjà — on archive pour ranger.
- **Avant d'archiver, on vérifie par grep** qu'aucun script, service, plist launchd ou cron
  ne référence encore le fichier. S'il est référencé, il reste en place et on le note ici.
- **Les imports relatifs ne sont pas réécrits** (`../lib/…` devient faux depuis `archive/`).
  Un script archivé n'est pas censé être rejoué ; s'il faut le rejouer, le repasser dans
  `scripts/` ou ajuster ses imports.
- Les scripts de **dédup** ne s'archivent pas pour l'instant (l'agent Dragon Ball peut en
  avoir besoin).

## Scripts archivés

| Script | Ce qu'il a fait | Quand | Pourquoi c'est fini |
|---|---|---|---|
| `ops-migrer-sections.mjs` | Migré les sections du JSONB `attributes.sections` vers la table `akasha_sections` (mesurer → migrer → vérifier → purger), décision 4 du plan minimal. | 05/08/2026 | Migration jouée et vérifiée : 0 fiche ne porte plus le champ, ~19 545 sections vivent en table ; l'outil lit le JSONB par construction, on ne le réécrit pas (plan §5). Les commentaires de `supabase/migrations/akasha_sections.sql` le citent encore, mais en runbook rétrospectif — documentaire, laissé tel quel. |
| `ops-liberer-bloquees-ancrage.mjs` | Rejoué l'application des fiches à double verdict valide que le veto d'ancrage HHEM ≥ 0,50 avait bloquées à tort entre le 31/07 et le 01/08 (HHEM ne discrimine pas le vrai du faux sur les phrases d'attributs). | 04/08/2026 | Script à usage unique, rattrapage appliqué ; le veto fautif a été retiré, le cas ne peut plus se produire. |

## Candidat non archivé (noté, pas déplacé)

- `ops-verser-relations-jsonb.mjs` — mission terminée (7 955 relations dormantes versées de
  `attributes.relations` vers `akasha_relations`, champ purgé, 05/08/2026), **mais** la
  sentinelle vivante `scripts/ops-sonde-schema.mjs` (ligne « aucune arête ne dort dans
  akasha_entries.attributes.relations ») renvoie l'opérateur vers lui si le champ réapparaît.
  Tant que cette sentinelle le cite, il reste au premier rang.
