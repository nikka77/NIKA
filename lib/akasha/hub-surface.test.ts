// lib/akasha/hub-surface.test.ts — LE TEST DU 9ᵉ UNIVERS (LOT 7).
//
// La promesse du lot 7 tient en une phrase : « ajouter une entrée dans UNIVERSE_TAXONOMY doit
// suffire, sans écrire un seul composant ». Ce fichier la vérifie de deux côtés :
//   · les HUIT univers actuels gardent EXACTEMENT la porte qu'ils avaient — le repli n'a le droit
//     de rien changer à l'existant (les cas réels sont lus dans HUB_VISUAL, pas recopiés) ;
//   · un univers neuf, déclaré sans carte ni signature, obtient quand même une porte.
//
// Lancer : node_modules/.bin/tsx --test lib/akasha/hub-surface.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveHubSurfaces,
  attrsConsommesParLaPorte,
  WORLD_GRID_MIN_VALEURS,
  WORLD_GRID_MIN_FICHES,
  type SurfaceAxis,
} from './hub-surface';
import { HUB_VISUAL, UNIVERSE_TAXONOMY } from './universe-taxonomy';

/** Un axe de `n` valeurs portant `fiches` fiches au total (réparties également, reste au premier). */
function axe(attr: string, n: number, fiches: number, label = attr): SurfaceAxis {
  const base = Math.floor(fiches / n);
  const chips = Array.from({ length: n }, (_, i) => ({ count: base + (i === 0 ? fiches - base * n : 0) }));
  return { attr, label, chips };
}

// ─── Priorité des portes ───────────────────────────────────────────────────

test('carte déclarée — elle monte, et le repli ne s’y ajoute jamais', () => {
  const s = deriveHubSurfaces({ map: 'op-world', axes: [axe('crew', 20, 300)] });
  assert.deepEqual(s, [{ kind: 'map', map: 'op-world' }]);
});

test('signature déclarée — elle monte seule si aucune carte', () => {
  const s = deriveHubSurfaces({ signature: 'nen', axes: [axe('nen', 6, 90)] });
  assert.deepEqual(s, [{ kind: 'signature', signature: 'nen' }]);
});

test('carte ET signature — les deux montent, dans cet ordre (cas One Piece)', () => {
  const s = deriveHubSurfaces({ map: 'op-world', signature: 'bounties', axes: [] });
  assert.deepEqual(s.map((x) => x.kind), ['map', 'signature']);
});

// ─── Le repli ──────────────────────────────────────────────────────────────

test('9ᵉ univers — ni carte ni signature : l’axe le mieux peuplé fait la porte', () => {
  const s = deriveHubSurfaces({ axes: [axe('equipe', 8, 120, 'Équipes'), axe('poste', 5, 40, 'Postes')] });
  assert.equal(s.length, 1);
  assert.deepEqual(s[0], { kind: 'world-grid', attr: 'equipe', label: 'Équipes', valeurs: 8, fiches: 120 });
});

test('repli — à égalité de fiches, l’axe qui offre le plus de cases gagne', () => {
  const s = deriveHubSurfaces({ axes: [axe('a', 4, 100), axe('b', 9, 100)] });
  assert.equal((s[0] as { attr: string }).attr, 'b');
});

test('repli — un axe trop étroit ne fait pas une grille', () => {
  const s = deriveHubSurfaces({ axes: [axe('camp', WORLD_GRID_MIN_VALEURS - 1, 500)] });
  assert.deepEqual(s, []);
});

test('repli — un axe assez large mais quasi vide ne fait pas une grille', () => {
  const s = deriveHubSurfaces({ axes: [axe('camp', 10, WORLD_GRID_MIN_FICHES - 1)] });
  assert.deepEqual(s, []);
});

test('univers sans aucun axe — aucune porte, et surtout aucune erreur', () => {
  assert.deepEqual(deriveHubSurfaces({ axes: [] }), []);
});

test('l’axe consommé par la grille est signalé pour ne pas être redit en rail', () => {
  const s = deriveHubSurfaces({ axes: [axe('equipe', 8, 120)] });
  assert.deepEqual(attrsConsommesParLaPorte(s), ['equipe']);
});

test('une porte bespoke ne consomme aucun axe par ce chemin (SIGNATURE_ATTRS s’en charge)', () => {
  assert.deepEqual(attrsConsommesParLaPorte(deriveHubSurfaces({ signature: 'gotei', axes: [] })), []);
});

// ─── Non-régression sur les huit univers réels ─────────────────────────────

test('les univers déjà déclarés gardent EXACTEMENT la porte de leur HUB_VISUAL', () => {
  const slugs = Object.keys(HUB_VISUAL);
  assert.ok(slugs.length >= 8, `HUB_VISUAL devrait couvrir au moins 8 univers, vu ${slugs.length}`);
  for (const slug of slugs) {
    const vis = HUB_VISUAL[slug];
    // Axes volontairement généreux : même avec de quoi remplir une grille, le repli doit se taire.
    const s = deriveHubSurfaces({ map: vis.map, signature: vis.signature, axes: [axe('x', 30, 900)] });
    const attendu = [
      ...(vis.map ? [{ kind: 'map', map: vis.map }] : []),
      ...(vis.signature ? [{ kind: 'signature', signature: vis.signature }] : []),
    ];
    assert.deepEqual(s, attendu, `${slug} : la porte a changé`);
  }
});

test('aucun univers déclaré ne se retrouve SANS porte (sinon le repli aurait dû jouer)', () => {
  for (const slug of Object.keys(HUB_VISUAL)) {
    const vis = HUB_VISUAL[slug];
    assert.ok(vis.map || vis.signature, `${slug} n'a ni carte ni signature — il dépend donc du repli`);
  }
});

test('9ᵉ univers — une entrée de taxonomie suffit : rien à écrire dans HUB_VISUAL', () => {
  // On simule l'arrivée exacte : une entrée de taxonomie avec ses axes, ZÉRO entrée HUB_VISUAL.
  const neuf = {
    name: 'Univers Neuf', slug: 'univers-neuf',
    axes: [
      { attr: 'faction', label: 'Factions', values: [{ v: 'A' }, { v: 'B' }, { v: 'C' }, { v: 'D' }, { v: 'E' }] },
    ],
  };
  assert.equal(HUB_VISUAL[neuf.slug], undefined, 'le 9ᵉ univers ne doit rien avoir dans HUB_VISUAL');
  const chips = neuf.axes[0].values.map(() => ({ count: 9 }));
  const s = deriveHubSurfaces({ axes: [{ attr: 'faction', label: 'Factions', chips }] });
  assert.equal(s.length, 1, 'un univers neuf doit obtenir une porte');
  assert.equal(s[0].kind, 'world-grid');
});

test('la taxonomie et HUB_VISUAL restent alignés — un univers déclaré, un hub servi', () => {
  // Garde-fou : si quelqu'un ajoute un univers à la taxonomie SANS visuel, ce test ne casse pas
  // (c'est précisément le cas que le lot 7 rend légitime) — il vérifie l'inverse, qu'aucun visuel
  // ne référence un univers qui n'existe plus dans la taxonomie.
  const slugsTaxo = new Set(UNIVERSE_TAXONOMY.map((u) => u.slug));
  for (const slug of Object.keys(HUB_VISUAL)) {
    assert.ok(slugsTaxo.has(slug), `HUB_VISUAL déclare « ${slug} », absent de UNIVERSE_TAXONOMY`);
  }
});
