// lib/akasha/shape.test.ts — preuve que deriveShape (lib/akasha/shape.ts) tient ses garanties :
// une garde par module, les cas limites du LOT 2a (0 arête, stats hors Naruto, forms vide vs
// absent), et un test qui échoue si quelqu'un rebranche un aiguillage par `type`.
//
// Zéro dépendance ajoutée : `node:test` + `node:assert` (déjà dans Node ≥ 18) — pas de vitest/jest.
// Lancer avec `node_modules/.bin/tsx --test lib/akasha/shape.test.ts` (tsx est déjà en
// devDependency, cf. package.json — resout les imports sans extension comme le fait Next).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveShape,
  AKASHA_MODULES,
  ORBIT_MIN_MEMBERS,
  type ShapeEntry,
  type ShapeRelation,
} from './shape';
import type { AkashaEntryDetail, AkashaType } from './types';

// ─── Fabriques de fixtures minimales ───────────────────────────────────────

function entry(overrides: Partial<ShapeEntry> = {}): ShapeEntry {
  return {
    universe: null,
    attributes: {},
    relationsOut: [],
    relationsIn: [],
    ...overrides,
  };
}

function rel(relation: string, targetType: AkashaType = 'character'): ShapeRelation {
  return { relation, target: { type: targetType } };
}

// ─── identity : toujours, seule quand rien d'autre ne passe ───────────────

test('identity — seul module d’une entrée totalement vide (0 % de gardes qui passent)', () => {
  assert.deepEqual(deriveShape(entry()), ['identity']);
});

test('identity — universe présent mais sans aucune autre capacité reste seule', () => {
  assert.deepEqual(deriveShape(entry({ universe: 'Naruto' })), ['identity']);
});

// ─── axis ───────────────────────────────────────────────────────────────

test('axis — un axe canon peuplé (village Naruto) monte le module', () => {
  const shape = deriveShape(entry({ universe: 'Naruto', attributes: { village: 'Konohagakure' } }));
  assert.ok(shape.includes('axis'));
});

test('axis — un axe qui existe dans la taxonomie mais est vide/absent ne monte rien', () => {
  const vide = deriveShape(entry({ universe: 'Naruto', attributes: { village: '' } }));
  const absent = deriveShape(entry({ universe: 'Naruto', attributes: {} }));
  assert.ok(!vide.includes('axis'));
  assert.ok(!absent.includes('axis'));
});

test('axis — une clé d’attribut qui N’EST PAS un axe canon de l’univers ne compte pas', () => {
  // « element » existe sur des fiches Naruto (ATTRIBUTE_FIELDS) mais n’est PAS un axe de
  // UNIVERSE_TAXONOMY pour Naruto (village/clan/organization/rank/generation) — il ne doit pas
  // suffire à monter `axis`, sous peine de dériver de la taxonomie canon au premier attribut venu.
  const shape = deriveShape(entry({ universe: 'Naruto', attributes: { element: 'Feu' } }));
  assert.ok(!shape.includes('axis'));
});

test('axis — univers sans taxonomie (9ᵉ univers, ou aucun) refuse structurellement le module', () => {
  const inconnu = deriveShape(entry({ universe: 'Univers Inconnu', attributes: { village: 'X' } }));
  const nul = deriveShape(entry({ universe: null, attributes: { village: 'X' } }));
  assert.ok(!inconnu.includes('axis'));
  assert.ok(!nul.includes('axis'));
});

// ─── relations ─────────────────────────────────────────────────────────

test('relations — 0 arête (cas limite explicite du LOT 2a) ne monte rien', () => {
  assert.ok(!deriveShape(entry({ relationsOut: [], relationsIn: [] })).includes('relations'));
});

test('relations — 1 seule arête sortante suffit', () => {
  assert.ok(deriveShape(entry({ relationsOut: [rel('possede', 'artifact')] })).includes('relations'));
});

test('relations — 1 seule arête entrante suffit (le sens ne compte pas)', () => {
  assert.ok(deriveShape(entry({ relationsIn: [rel('maitrise', 'character')] })).includes('relations'));
});

// ─── sections ──────────────────────────────────────────────────────────

test('sections — tableau vide ne monte rien', () => {
  assert.ok(!deriveShape(entry({ attributes: { sections: [] } })).includes('sections'));
});

test('sections — champ absent ne monte rien (pas de crash sur attributes.sections undefined)', () => {
  assert.ok(!deriveShape(entry({ attributes: {} })).includes('sections'));
});

test('sections — une entrée avec titre ET texte monte le module', () => {
  const shape = deriveShape(entry({ attributes: { sections: [{ i: '1', titre: 'Origines', texte: 'Un texte.' }] } }));
  assert.ok(shape.includes('sections'));
});

test('sections — texte SANS titre ne compte pas (même filtre que DossierSections, jamais de titre suivi de rien)', () => {
  const shape = deriveShape(entry({ attributes: { sections: [{ i: '1', texte: 'Un texte orphelin.' }] } }));
  assert.ok(!shape.includes('sections'));
});

test('sections — titre SANS texte ne compte pas non plus', () => {
  const shape = deriveShape(entry({ attributes: { sections: [{ i: '1', titre: 'Un titre creux' }] } }));
  assert.ok(!shape.includes('sections'));
});

test('sections — une section illisible au milieu de sections valides n’empêche pas le module (une seule suffit)', () => {
  const shape = deriveShape(entry({
    attributes: { sections: [{ i: '1', texte: 'orpheline' }, { i: '2', titre: 'OK', texte: 'Un texte.' }] },
  }));
  assert.ok(shape.includes('sections'));
});

// ─── timeline ──────────────────────────────────────────────────────────

test('timeline — forms VIDE (tableau présent, 0 élément) ne monte rien', () => {
  assert.ok(!deriveShape(entry({ attributes: { forms: [] } })).includes('timeline'));
});

test('timeline — forms ABSENT (clé jamais posée) ne monte rien non plus — même résultat que forms vide', () => {
  const vide = deriveShape(entry({ attributes: { forms: [] } }));
  const absent = deriveShape(entry({ attributes: {} }));
  assert.equal(vide.includes('timeline'), absent.includes('timeline'));
  assert.ok(!absent.includes('timeline'));
});

test('timeline — un élément-objet dans forms suffit', () => {
  assert.ok(deriveShape(entry({ attributes: { forms: [{ label: 'Partie I' }] } })).includes('timeline'));
});

test('timeline — eras seul (sans forms) suffit — Death Note a des eras sans forms', () => {
  assert.ok(deriveShape(entry({ attributes: { eras: [{ label: 'Avant le cahier' }] } })).includes('timeline'));
});

test('timeline — un tableau de non-objets (ex. ["texte"]) ne compte pas', () => {
  assert.ok(!deriveShape(entry({ attributes: { forms: ['texte', null] } })).includes('timeline'));
});

test('timeline — une chronologie N’EXCLUT PAS les autres modules (le cas konohagakure)', () => {
  // La fusion d'EraZone en module `timeline` (10/08/2026, §8 q3) existe POUR ce cas. Avant elle,
  // `app/learn/akasha/[slug]/page.tsx` aiguillait sur `attributes.eras` AVANT d'appeler
  // deriveShape : une fiche à ères n'obtenait donc rien d'autre que son rouleau temporel. Mesuré en
  // base le 10/08, konohagakure porte 5 ères, un village canon, 5 sections et 449 arêtes de
  // membership entrantes de personnage — les cinq modules ci-dessous, `timeline` COMPRIS. Ce test
  // échoue si quelqu'un fait de `eras` une garde d'exclusion plutôt qu'une capacité de plus.
  const shape = deriveShape(entry({
    universe: 'Naruto',
    attributes: {
      village: 'Konohagakure',
      eras: [{ label: 'Fondation' }, { label: 'Ère moderne' }],
      sections: [{ i: '1', titre: 'Origines', texte: 'Un texte.' }],
    },
    relationsIn: membres(449, 'habite'),
  }));
  assert.deepEqual(shape, ['identity', 'axis', 'relations', 'sections', 'timeline', 'orbit']);
});

// ─── orbit ─────────────────────────────────────────────────────────────

function membres(n: number, relation = 'habite', targetType: AkashaType = 'character'): ShapeRelation[] {
  return Array.from({ length: n }, () => rel(relation, targetType));
}

test(`orbit — exactement ${ORBIT_MIN_MEMBERS} membres (la limite du garde-fou 2b) ne suffit PAS encore`, () => {
  const shape = deriveShape(entry({ relationsIn: membres(ORBIT_MIN_MEMBERS) }));
  assert.ok(!shape.includes('orbit'), 'un garde-fou de pli à 12 doit rester une liste, pas un orbit');
});

test(`orbit — ${ORBIT_MIN_MEMBERS + 1} membres (un de plus que le garde-fou) monte le module`, () => {
  const shape = deriveShape(entry({ relationsIn: membres(ORBIT_MIN_MEMBERS + 1) }));
  assert.ok(shape.includes('orbit'));
});

test('orbit — beaucoup d’arêtes `maitrise` (usage, pas appartenance) ne montent jamais orbit', () => {
  // Le cas réel documenté : une tête d'affiche Naruto porte >100 arêtes `maitrise` entrantes
  // (des personnages qui maîtrisent SA technique) — ce n'est pas un collectif, orbit doit refuser.
  const shape = deriveShape(entry({ relationsIn: membres(150, 'maitrise') }));
  assert.ok(!shape.includes('orbit'));
  assert.ok(shape.includes('relations'));
});

test('orbit — des arêtes appartient/habite dont la CIBLE n’est pas un character ne comptent pas', () => {
  // L'arsenal d'une organisation (navires, reliques en `appartient`) n'est pas un membre.
  const shape = deriveShape(entry({ relationsIn: membres(20, 'appartient', 'artifact') }));
  assert.ok(!shape.includes('orbit'));
});

test('orbit — appartient ET habite se cumulent dans le même total de membres', () => {
  const shape = deriveShape(entry({
    relationsIn: [...membres(7, 'habite'), ...membres(7, 'appartient')],
  }));
  assert.ok(shape.includes('orbit')); // 14 > 12
});

// ─── stats — verrouillé aux databooks canon Naruto ────────────────────────

function formeAvecStats() {
  return { label: 'Partie I', stats: { nin: 2, tai: 1.5, gen: 1, int: 1.5, for: 2, vit: 2, end: 3.5, sce: 2 } };
}

test('stats — Naruto avec une forme à stats monte le module', () => {
  const shape = deriveShape(entry({ universe: 'Naruto', attributes: { forms: [formeAvecStats()] } }));
  assert.ok(shape.includes('stats'));
});

test('stats — cas limite explicite du LOT 2a : stats HORS Naruto, la fonction REFUSE même si elles existent', () => {
  // Cas réel mesuré (08/08/2026) : monkey-d-luffy et roronoa-zoro (One Piece) portent bien
  // `forms[i].stats` en base, marquées « estimées » ailleurs sur le site (CharacterZone) — mais
  // ce module-ci doit rester verrouillé au canon Naruto, sans exception.
  const shape = deriveShape(entry({ universe: 'One Piece', attributes: { forms: [formeAvecStats()] } }));
  assert.ok(!shape.includes('stats'));
});

test('stats — Naruto SANS stats sur aucune forme ne monte rien', () => {
  const shape = deriveShape(entry({ universe: 'Naruto', attributes: { forms: [{ label: 'Partie I' }] } }));
  assert.ok(!shape.includes('stats'));
});

test('stats — Naruto avec forms absent (donc aucune forme à examiner) ne monte rien', () => {
  const shape = deriveShape(entry({ universe: 'Naruto', attributes: {} }));
  assert.ok(!shape.includes('stats'));
});

// ─── Le test qui doit échouer si quelqu'un rebranche un aiguillage par `type` ──

test('AUCUN aiguillage par type — deux entrées aux capacités identiques mais de `type` différent produisent EXACTEMENT le même shape', () => {
  // On construit ici des objets plus riches que ShapeEntry (comme le ferait vraiment
  // AkashaEntryDetail), avec un `type` DIFFÉRENT et TOUT LE RESTE identique. `ShapeEntry` ne
  // déclarant pas de champ `type`, deriveShape ne peut structurellement pas le lire — ce test
  // vérifie le COMPORTEMENT en plus de la garantie du compilateur : si quelqu'un ajoutait
  // `if (entry.type === 'character') …` en élargissant le contrat, ce test romprait.
  interface EntreeEnrichie extends ShapeEntry {
    type: string;
  }
  const capacitesPartagees = {
    universe: 'Naruto',
    attributes: { village: 'Konohagakure', sections: [{ i: '1', titre: 'T', texte: 'X' }] },
    relationsOut: [rel('exerce', 'profession')],
    relationsIn: membres(20, 'habite'),
  };
  const commePouvoir: EntreeEnrichie = { type: 'power', ...capacitesPartagees };
  const commePersonnage: EntreeEnrichie = { type: 'character', ...capacitesPartagees };

  assert.deepEqual(deriveShape(commePouvoir), deriveShape(commePersonnage));
});

// ─── Le retour de getEntryBySlug passe tel quel, sans adaptation ──────────

test('un AkashaEntryDetail complet (la vraie forme que renvoie getEntryBySlug) se passe sans adaptation', () => {
  // relationsIn au format RÉEL de ResolvedRelation (id + target résolue complète) — pas le
  // ShapeRelation allégé de membres() : c'est justement ce que ce test vérifie, que la forme
  // COMPLÈTE que produit getEntryBySlug passe sans adaptation.
  const relationsIn = Array.from({ length: 30 }, (_, i) => ({
    id: `edge-${i}`,
    relation: 'maitrise',
    target: { slug: `ninja-${i}`, name: `Ninja ${i}`, type: 'character' as const, image_url: null },
  }));
  const complet: AkashaEntryDetail = {
    id: 'uuid-1',
    slug: 'rasengan',
    type: 'power',
    name: 'Rasengan',
    is_fiction: true,
    universe: 'Naruto',
    summary: 'Une sphère de chakra tournoyant.',
    description: null,
    image_url: null,
    attributes: { village: 'Konohagakure' },
    rarity: 'epic',
    created_at: '2026-01-01T00:00:00Z',
    relationsOut: [],
    relationsIn,
  };
  const shape = deriveShape(complet);
  assert.deepEqual(shape, ['identity', 'axis', 'relations']);
});

// ─── Combinatoire — plusieurs gardes passent ensemble ─────────────────────

test('une fiche riche (tous les modules compatibles avec son univers) monte tout, dans l’ordre du contrat', () => {
  const shape = deriveShape(entry({
    universe: 'Naruto',
    attributes: {
      village: 'Konohagakure',
      sections: [{ i: '1', titre: 'Origines', texte: 'Un texte.' }],
      forms: [formeAvecStats()],
    },
    relationsOut: [rel('exerce', 'profession')],
    relationsIn: membres(ORBIT_MIN_MEMBERS + 5, 'habite'),
  }));
  assert.deepEqual(shape, ['identity', 'axis', 'relations', 'sections', 'timeline', 'orbit', 'stats']);
});

// ─── AKASHA_MODULES — l'inventaire lui-même ────────────────────────────────

test('AKASHA_MODULES énumère exactement les 7 modules du contrat, sans doublon', () => {
  assert.equal(AKASHA_MODULES.length, 7);
  assert.equal(new Set(AKASHA_MODULES).size, 7);
  assert.ok(AKASHA_MODULES.includes('identity'));
});

test('deriveShape ne retourne jamais un module hors de AKASHA_MODULES', () => {
  const shape = deriveShape(entry({
    universe: 'Naruto',
    attributes: { village: 'X', forms: [formeAvecStats()], sections: [{ titre: 'T', texte: 'X' }] },
    relationsOut: [rel('exerce')],
    relationsIn: membres(20, 'appartient'),
  }));
  for (const m of shape) assert.ok((AKASHA_MODULES as readonly string[]).includes(m));
});
