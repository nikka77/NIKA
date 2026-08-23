// lib/akasha/miroir-zone.test.ts — GARDE-FOU ANTI-DÉRIVE : après la vague C (23/08/2026, migration
// en zones), le cœur garde 13 modules de lib/akasha EN DOUBLE avec le dépôt nika-akasha, parce que
// 12 scripts de l'usine + app/sitemap.ts + app/api/ops/state + app/api/ops/audit les importent
// encore localement (fermeture transitive établie par grep avant extraction — voir
// tasks/migration-zones.md, section « Vague C »). Deux dérives de miroir ont déjà coûté cher cette
// semaine (leçons du 08/08 et du 10/08, sur scripts/lib/akasha-axes.mjs) : ce test applique la
// même discipline à CETTE duplication-là, avant qu'elle ne coûte un troisième incident.
//
// Compare OCTET PAR OCTET chaque fichier dupliqué, lu depuis le dépôt frère
// /Users/macbookprom1pro/dev/nika-akasha en priorité (poste de travail de migration), sinon depuis
// GitHub (raw.githubusercontent.com/nikka77/nika-akasha, branche main). JAMAIS un faux vert : si
// aucune des deux sources n'est joignable, le test SAUTE avec un message qui le dit — un test
// sauté n'est pas un test qui passe, et un `npm test` vert qui contient un test sauté doit se lire
// comme « non vérifié aujourd'hui », pas comme « conforme ».
//
// EXCEPTION DOCUMENTÉE — la SEULE tolérée — : lib/akasha/universe-taxonomy.ts. Trois
// `extras[].href` pointent vers des pages du hub AKASHA (rangs, wanted, arbre Joestar). Le cœur
// n'a PAS de basePath : ses URL (consommées par app/sitemap.ts pour construire des liens absolus)
// doivent porter `/learn/akasha/...` en toutes lettres. La zone nika-akasha A un basePath
// `/learn/akasha` (next.config.ts) : ses hrefs internes sont écrits SANS ce préfixe — Next le
// rajoute tout seul, et l'écrire deux fois casserait la navigation de la zone. Ce n'est pas une
// dérive, c'est une nécessité structurelle des deux côtés de la coupure : normalisée ci-dessous
// (retire UNIQUEMENT le préfixe `/learn/akasha` des trois `href: '/learn/akasha...'` avant de
// comparer) — tout le RESTE du fichier doit rester octet pour octet identique malgré la normalisation.
//
// lib/akasha/miroir-axes.test.ts n'est PAS comparé ici : son import diffère structurellement par
// dépôt (`../../scripts/lib/akasha-axes.mjs` côté cœur, `./axes-miroir.mjs` côté zone) — ce n'est
// pas une duplication de CONTENU, c'est une localisation nécessaire. La vraie dérive potentielle
// est entre scripts/lib/akasha-axes.mjs (cœur) et lib/akasha/axes-miroir.mjs (zone), et son
// en-tête documente la décision encore EN ATTENTE de Dan (dépendance git du cœur vers nika-akasha,
// vs double maintenu à la main) — hors périmètre de ce test tant que cette décision n'est pas prise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SIBLING_REPO = '/Users/macbookprom1pro/dev/nika-akasha';
const RAW_BASE = 'https://raw.githubusercontent.com/nikka77/nika-akasha/main';

// Fichiers dupliqués tels quels — AUCUNE divergence tolérée.
const FICHIERS_IDENTIQUES = [
  'lib/akasha/collections.ts',
  'lib/akasha/db-forms.ts',
  'lib/akasha/flavor.ts',
  'lib/akasha/naruto-world.ts',
  'lib/akasha/og-visuel.ts',
  'lib/akasha/queries.ts',
  'lib/akasha/relation-labels.ts',
  'lib/akasha/relations.ts',
  'lib/akasha/schema.ts',
  'lib/akasha/sections.ts',
  'lib/akasha/shape.ts',
  'lib/akasha/types.ts',
  'lib/akasha/shape.test.ts',
];

// Seule divergence tolérée (voir l'en-tête) : le préfixe de basePath sur 3 `extras[].href`.
const FICHIER_NORMALISE = 'lib/akasha/universe-taxonomy.ts';
const retirerPrefixeBasePath = (src: string) => src.split("href: '/learn/akasha").join("href: '");

/** Lit un fichier depuis la zone : dépôt frère en local si présent, sinon GitHub. `null` si aucune
 *  des deux sources ne répond — jamais une chaîne vide qui ferait échouer la comparaison au lieu
 *  de sauter proprement le test. */
async function lireZone(chemin: string): Promise<string | null> {
  const local = join(SIBLING_REPO, chemin);
  if (existsSync(local)) return readFileSync(local, 'utf8');
  try {
    const res = await fetch(`${RAW_BASE}/${chemin}`);
    if (res.ok) return await res.text();
  } catch {
    // réseau injoignable — retombe sur null, géré par l'appelant
  }
  return null;
}

async function sourceJoignable(): Promise<boolean> {
  if (existsSync(SIBLING_REPO)) return true;
  try {
    const res = await fetch(`${RAW_BASE}/lib/akasha/types.ts`, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

test('miroir-zone : les modules lib/akasha dupliqués ne dérivent pas de nika-akasha', async (t) => {
  if (!(await sourceJoignable())) {
    t.skip(
      'ni le dépôt frère /Users/macbookprom1pro/dev/nika-akasha ni GitHub (raw.githubusercontent.com/nikka77/nika-akasha) ' +
      'ne sont joignables — comparaison SAUTÉE, à ne PAS lire comme un vert'
    );
    return;
  }

  for (const chemin of FICHIERS_IDENTIQUES) {
    await t.test(chemin, async () => {
      const coeur = readFileSync(join(REPO_ROOT, chemin), 'utf8');
      const zone = await lireZone(chemin);
      assert.notEqual(zone, null, `${chemin} : source zone injoignable après le contrôle initial (réseau intermittent ?)`);
      assert.equal(coeur, zone, `${chemin} a dérivé de sa copie dans nika-akasha — reporter le changement des deux côtés`);
    });
  }

  await t.test(FICHIER_NORMALISE, async () => {
    const coeur = readFileSync(join(REPO_ROOT, FICHIER_NORMALISE), 'utf8');
    const zone = await lireZone(FICHIER_NORMALISE);
    assert.notEqual(zone, null, `${FICHIER_NORMALISE} : source zone injoignable après le contrôle initial (réseau intermittent ?)`);
    assert.equal(
      retirerPrefixeBasePath(coeur),
      zone,
      `${FICHIER_NORMALISE} a dérivé au-delà de la seule exception documentée (préfixe basePath des 3 extras.href)`
    );
  });
});
