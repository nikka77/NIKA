// lib/akasha/miroir-axes.test.ts — LE MIROIR DES AGENTS NE DOIT PAS DÉRIVER DE LA TAXONOMIE.
//
// POURQUOI (10/08/2026)
// `lib/akasha/universe-taxonomy.ts` est la source de vérité du site ; `scripts/lib/akasha-axes.mjs`
// en est la copie que lisent les agents de l'usine, qui ne peuvent produire QUE ces valeurs (elles
// deviennent l'énumération d'un schéma JSON). Les deux fichiers sont tenus à la main, et l'en-tête
// du miroir demande poliment de reporter — ce qui n'a jamais suffi :
//
//   · au 08/08, cinq valeurs d'`organization` manquaient au miroir depuis un moment ;
//   · au 10/08, un audit en a trouvé SIX autres d'un coup — `Takigakure` absent, `generation`,
//     `meito_grade` et `monde` carrément absents comme axes, `Akagi RedSuns` présent côté miroir et
//     nulle part côté site, `Konoha 11` déclaré à la fois en organisation et en équipe.
//
// La conséquence n'est pas cosmétique. Un axe absent du miroir, c'est une valeur que l'usine ne
// peut PAS écrire : la fiche reste vide et personne ne comprend pourquoi. Une valeur présente
// seulement dans le miroir, c'est une donnée que le site ne sait pas filtrer.
//
// Une convention qui ne tient que par la bonne volonté finit toujours par céder ; ce test la rend
// mécanique. Lancer : node_modules/.bin/tsx --test lib/akasha/miroir-axes.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { UNIVERSE_TAXONOMY } from './universe-taxonomy';
import { AXES, UNIVERSE_SLUG } from '../../scripts/lib/akasha-axes.mjs';

const miroir = AXES as Record<string, Record<string, string[]>>;

test('chaque univers de la taxonomie existe dans le miroir des agents', () => {
  for (const u of UNIVERSE_TAXONOMY) {
    assert.ok(miroir[u.name], `« ${u.name} » est déclaré côté site mais absent de scripts/lib/akasha-axes.mjs`);
  }
});

test('chaque AXE de la taxonomie existe dans le miroir — sinon l’usine ne peut pas l’écrire', () => {
  const manquants: string[] = [];
  for (const u of UNIVERSE_TAXONOMY) {
    for (const a of u.axes) if (!miroir[u.name]?.[a.attr]) manquants.push(`${u.name}.${a.attr}`);
  }
  assert.deepEqual(manquants, [], `axes absents du miroir : ${manquants.join(', ')}`);
});

test('les VALEURS coïncident exactement, dans les deux sens', () => {
  const ecarts: string[] = [];
  for (const u of UNIVERSE_TAXONOMY) {
    for (const a of u.axes) {
      const site = new Set(a.values.map((v) => v.v));
      const agents = new Set(miroir[u.name]?.[a.attr] ?? []);
      const absentesDuMiroir = [...site].filter((v) => !agents.has(v));
      const inconnuesDuSite = [...agents].filter((v) => !site.has(v));
      if (absentesDuMiroir.length) ecarts.push(`${u.name}.${a.attr} — absentes du miroir : ${absentesDuMiroir.join(', ')}`);
      if (inconnuesDuSite.length) ecarts.push(`${u.name}.${a.attr} — inconnues du site : ${inconnuesDuSite.join(', ')}`);
    }
  }
  assert.deepEqual(ecarts, [], `\n${ecarts.join('\n')}`);
});

test('le miroir ne déclare aucun axe que le site ignore', () => {
  const orphelins: string[] = [];
  for (const [nom, axes] of Object.entries(miroir)) {
    const taxo = UNIVERSE_TAXONOMY.find((u) => u.name === nom);
    if (!taxo) { orphelins.push(`univers « ${nom} »`); continue; }
    const connus = new Set(taxo.axes.map((a) => a.attr));
    for (const attr of Object.keys(axes)) if (!connus.has(attr)) orphelins.push(`${nom}.${attr}`);
  }
  assert.deepEqual(orphelins, [], `déclarés côté agents seulement : ${orphelins.join(', ')}`);
});

test('une valeur n’appartient qu’à UN axe par univers', () => {
  // « Konoha 11 » était déclarée à la fois en `organization` et en `equipe` après la scission du
  // 10/08 : deux chips pour la même chose, et deux pages d'axe qui se disputent le même contenu.
  // L'homonymie reste permise ENTRE univers (`division` existe chez Naruto et chez Bleach).
  const collisions: string[] = [];
  for (const u of UNIVERSE_TAXONOMY) {
    const vu = new Map<string, string>();
    for (const a of u.axes) {
      for (const { v } of a.values) {
        const deja = vu.get(v);
        if (deja) collisions.push(`${u.name} : « ${v} » dans ${deja} ET ${a.attr}`);
        else vu.set(v, a.attr);
      }
    }
  }
  assert.deepEqual(collisions, [], `\n${collisions.join('\n')}`);
});

test('le miroir connaît le slug de chaque univers (il en dérive le nom de l’expert)', () => {
  for (const u of UNIVERSE_TAXONOMY) {
    assert.equal((UNIVERSE_SLUG as Record<string, string>)[u.name], u.slug, `slug divergent pour ${u.name}`);
  }
});
