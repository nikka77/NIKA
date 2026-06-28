// lib/akasha/schema.ts — validation Zod du registre AKASHA.
// Un schéma `attributes` DISTINCT par type d'entité (la forme du jsonb dépend du type).
// Sert à valider le seed et toute future ingestion (API / Edge Function).
import { z } from 'zod';
import { AKASHA_RARITIES } from './types';

const slug = z.string().regex(/^[a-z0-9-]+$/, 'slug en minuscules-kebab, sans accent ni espace');
const nonEmpty = z.string().min(1);
const coordinates = z.object({ lat: z.number(), lng: z.number() });

// ─── Attributs par type (clés alignées sur ATTRIBUTE_FIELDS) ─────────
// `.catchall(unknown)` : on tolère des clés supplémentaires (jsonb flexible).
export const characterAttrs = z
  .object({
    role: z.string().optional(),
    race: z.string().optional(),
    affiliation: z.string().optional(),
    alignment: z.string().optional(),
  })
  .catchall(z.unknown());

export const placeAttrs = z
  .object({
    region: z.string().optional(),
    climate: z.string().optional(),
    coordinates: coordinates.optional(),
  })
  .catchall(z.unknown());

export const artifactAttrs = z
  .object({
    material: z.string().optional(),
    origin: z.string().optional(),
    power_level: z.string().optional(),
  })
  .catchall(z.unknown());

export const professionAttrs = z
  .object({
    sector: z.string().optional(),
    skills: z.array(z.string()).optional(),
  })
  .catchall(z.unknown());

export const statusAttrs = z
  .object({
    rank: z.string().optional(),
    scope: z.string().optional(),
  })
  .catchall(z.unknown());

export const powerAttrs = z
  .object({
    range: z.string().optional(),
    cost: z.string().optional(),
    element: z.string().optional(),
  })
  .catchall(z.unknown());

export const skillAttrs = z
  .object({
    discipline: z.string().optional(),
    level: z.string().optional(),
  })
  .catchall(z.unknown());

/** Schéma `attributes` accessible par type (exigé par la spec). */
export const attributesSchemaByType = {
  character: characterAttrs,
  place: placeAttrs,
  artifact: artifactAttrs,
  profession: professionAttrs,
  status: statusAttrs,
  power: powerAttrs,
  skill: skillAttrs,
} as const;

// ─── Entrée (union discriminée par type → attributes typé par type) ──
const base = {
  slug,
  name: nonEmpty,
  is_fiction: z.boolean().default(true),
  universe: z.string().nullish(),
  summary: z.string().nullish(),
  description: z.string().nullish(),
  image_url: z.string().nullish(), // chemin local OU URL distante
  rarity: z.enum(AKASHA_RARITIES).nullish(),
};

export const akashaEntrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('character'), attributes: characterAttrs.default({}), ...base }),
  z.object({ type: z.literal('place'), attributes: placeAttrs.default({}), ...base }),
  z.object({ type: z.literal('artifact'), attributes: artifactAttrs.default({}), ...base }),
  z.object({ type: z.literal('profession'), attributes: professionAttrs.default({}), ...base }),
  z.object({ type: z.literal('status'), attributes: statusAttrs.default({}), ...base }),
  z.object({ type: z.literal('power'), attributes: powerAttrs.default({}), ...base }),
  z.object({ type: z.literal('skill'), attributes: skillAttrs.default({}), ...base }),
]);
export type AkashaEntryInput = z.infer<typeof akashaEntrySchema>;

// ─── Relation (forme DB : ids résolus) ───────────────────────────────
export const akashaRelationSchema = z.object({
  from_entry: z.uuid(),
  to_entry: z.uuid(),
  relation: nonEmpty,
});
export type AkashaRelationInput = z.infer<typeof akashaRelationSchema>;

/** Relation exprimée par slugs (pratique pour le seed avant résolution des ids). */
export const akashaRelationSeedSchema = z.object({
  from: slug,
  to: slug,
  relation: nonEmpty,
});
export type AkashaRelationSeed = z.infer<typeof akashaRelationSeedSchema>;
