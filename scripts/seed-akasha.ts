// scripts/seed-akasha.ts — seed de démonstration du registre AKASHA.
// ~10 entrées couvrant les 7 types (réel + fiction) + relations.
// Run: PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/seed-akasha.ts
import { createClient } from '@supabase/supabase-js';
import {
  akashaEntrySchema,
  akashaRelationSeedSchema,
  type AkashaEntryInput,
  type AkashaRelationSeed,
} from '../lib/akasha/schema';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (--env-file=.env.local).');
  process.exit(1);
}
const sb = createClient(url, key);

// ─── Entrées ─────────────────────────────────────────────────────────
const ENTRIES: AkashaEntryInput[] = [
  // ── Cluster fiction (Bleach) ──
  {
    slug: 'ichigo-kurosaki',
    type: 'character',
    name: 'Ichigo Kurosaki',
    is_fiction: true,
    universe: 'Bleach',
    rarity: 'legendary',
    summary: 'Lycéen de Karakura devenu Shinigami remplaçant pour protéger les vivants comme les morts.',
    description:
      "**Ichigo Kurosaki** est un adolescent ordinaire dont la vie bascule lorsqu'il hérite des pouvoirs d'une Shinigami.\n\n" +
      "Capable de voir les esprits depuis l'enfance, il devient le **pont entre le monde des vivants et la Soul Society**. Sa force grandit au fil des combats, jusqu'à maîtriser le *Bankai* et un état hybride rare.\n\n" +
      "- Protège sa ville, Karakura\n- Manie le zanpakutō Zangetsu\n- Frappe avec le Getsuga Tenshō",
    attributes: { role: 'Shinigami remplaçant', race: 'Humain (hybride)', affiliation: 'Allié du Gotei 13', alignment: 'Loyal héroïque' },
  },
  {
    slug: 'zangetsu',
    type: 'artifact',
    name: 'Zangetsu',
    is_fiction: true,
    universe: 'Bleach',
    rarity: 'legendary',
    summary: "Le zanpakutō d'Ichigo, manifestation directe de son énergie spirituelle.",
    description:
      "**Zangetsu** n'est pas une simple lame : c'est l'incarnation de l'âme et du pouvoir de son porteur.\n\n" +
      "Sa forme évolue avec la puissance d'Ichigo, du grand sabre brut au tranchant affiné du *Bankai*.",
    attributes: { material: 'Acier spirituel', origin: 'Manifestation du reiatsu', power_level: 'Niveau capitaine+' },
  },
  {
    slug: 'getsuga-tensho',
    type: 'power',
    name: 'Getsuga Tenshō',
    is_fiction: true,
    universe: 'Bleach',
    rarity: 'epic',
    summary: 'Une onde tranchante d’énergie spirituelle projetée depuis la lame.',
    description:
      "Le **Getsuga Tenshō** condense le reiatsu sur le fil du zanpakutō puis le libère en une vague dévastatrice.\n\n" +
      "Sa portée et sa densité augmentent avec la maîtrise du porteur.",
    attributes: { range: 'Moyenne à longue', cost: 'Énergie spirituelle (reiatsu)', element: 'Énergie tranchante' },
  },
  {
    slug: 'bankai',
    type: 'skill',
    name: 'Bankai',
    is_fiction: true,
    universe: 'Bleach',
    rarity: 'legendary',
    summary: 'La libération ultime d’un zanpakutō, réservée aux Shinigami d’élite.',
    description:
      "Le **Bankai** est le second et dernier stade de libération d'un zanpakutō.\n\n" +
      "Il décuple la puissance du Shinigami mais exige des années de maîtrise — l'apanage des capitaines.",
    attributes: { discipline: 'Maîtrise du zanpakutō', level: 'Avancé (capitaine)' },
  },
  {
    slug: 'shinigami',
    type: 'profession',
    name: 'Shinigami',
    is_fiction: true,
    universe: 'Bleach',
    rarity: 'rare',
    summary: 'Gardiens de l’équilibre des âmes entre le monde des vivants et la Soul Society.',
    description:
      "Les **Shinigami** guident les âmes errantes (*Plus*) vers la Soul Society et combattent les *Hollows*.\n\n" +
      "Organisés au sein du Gotei 13, ils maîtrisent quatre arts : Zanjutsu, Hohō, Hakuda et Kidō.",
    attributes: { sector: 'Soul Society', skills: ['Zanjutsu', 'Kidō', 'Hohō', 'Hakuda'] },
  },
  {
    slug: 'karakura',
    type: 'place',
    name: 'Karakura',
    is_fiction: true,
    universe: 'Bleach',
    rarity: 'common',
    summary: 'Ville japonaise riche en énergie spirituelle, foyer d’Ichigo.',
    description:
      "**Karakura** est une ville paisible en apparence, mais sa forte concentration de reiatsu y attire les Hollows.\n\n" +
      "Elle devient l'un des théâtres centraux de la guerre contre les ennemis de la Soul Society.",
    attributes: { region: 'Japon (ville fictive)', climate: 'Tempéré', coordinates: { lat: 35.0, lng: 139.0 } },
  },
  {
    slug: 'vizard',
    type: 'status',
    name: 'Vizard',
    is_fiction: true,
    universe: 'Bleach',
    rarity: 'epic',
    summary: 'Shinigami ayant acquis les pouvoirs d’un Hollow — un statut hybride et rare.',
    description:
      "Les **Vizard** sont d'anciens Shinigami capables d'invoquer un masque de Hollow pour décupler leur puissance.\n\n" +
      "Ce statut, longtemps marginalisé, confère une force redoutable au prix d'un contrôle de soi exigeant.",
    attributes: { rank: 'Hybride Shinigami-Hollow', scope: 'Individuel' },
  },

  // ── Cluster réel (Histoire) ──
  {
    slug: 'leonard-de-vinci',
    type: 'character',
    name: 'Léonard de Vinci',
    is_fiction: false,
    universe: 'Histoire / réel',
    rarity: 'legendary',
    summary: 'Polymathe de la Renaissance : peintre, ingénieur, anatomiste, inventeur.',
    description:
      "**Léonard de Vinci** (1452–1519) incarne l'idéal de l'homme universel de la Renaissance.\n\n" +
      "Peintre de *La Joconde* et de *La Cène*, il fut aussi ingénieur, anatomiste et inventeur visionnaire, remplissant des milliers de pages de carnets.",
    attributes: { role: 'Polymathe de la Renaissance', affiliation: 'Florence, Milan, Amboise', alignment: 'Génie universel' },
  },
  {
    slug: 'peintre',
    type: 'profession',
    name: 'Peintre',
    is_fiction: false,
    universe: 'Histoire / réel',
    rarity: 'common',
    summary: 'Artiste qui compose des images par la couleur, la lumière et la matière.',
    description:
      "Le **peintre** donne forme au visible — et à l'invisible — par la maîtrise de la composition, de la lumière et de la couleur.\n\n" +
      "À la Renaissance, le métier se hisse au rang d'art libéral, porté par des techniques comme le *sfumato*.",
    attributes: { sector: 'Arts', skills: ['Dessin', 'Composition', 'Sfumato'] },
  },
  {
    slug: 'florence',
    type: 'place',
    name: 'Florence',
    is_fiction: false,
    universe: 'Histoire / réel',
    rarity: 'rare',
    summary: 'Berceau de la Renaissance, en Toscane.',
    description:
      "**Florence** (Firenze) est la ville où s'épanouit la Renaissance italienne, sous l'impulsion des Médicis.\n\n" +
      "Foyer d'artistes et de penseurs, elle façonna le parcours de Léonard de Vinci.",
    attributes: { region: 'Toscane, Italie', climate: 'Méditerranéen', coordinates: { lat: 43.7696, lng: 11.2558 } },
  },
];

// ─── Relations (par slug → résolues en ids) ──────────────────────────
const RELATIONS: AkashaRelationSeed[] = [
  { from: 'ichigo-kurosaki', to: 'zangetsu', relation: 'possede' },
  { from: 'ichigo-kurosaki', to: 'getsuga-tensho', relation: 'maitrise' },
  { from: 'ichigo-kurosaki', to: 'bankai', relation: 'maitrise' },
  { from: 'ichigo-kurosaki', to: 'shinigami', relation: 'exerce' },
  { from: 'ichigo-kurosaki', to: 'karakura', relation: 'habite' },
  { from: 'ichigo-kurosaki', to: 'vizard', relation: 'appartient' },
  { from: 'leonard-de-vinci', to: 'peintre', relation: 'exerce' },
  { from: 'leonard-de-vinci', to: 'florence', relation: 'habite' },
];

async function main() {
  // 1) Valider + upsert les entrées (slug UNIQUE → upsert idempotent).
  const entries = ENTRIES.map((e) => akashaEntrySchema.parse(e));
  const { data: rows, error } = await sb
    .from('akasha_entries')
    .upsert(entries, { onConflict: 'slug' })
    .select('id, slug');
  if (error) {
    console.error('✗ entries:', error.message);
    process.exit(1);
  }
  const idBySlug = new Map((rows ?? []).map((r) => [r.slug as string, r.id as string]));
  console.log(`✓ ${rows?.length ?? 0} entrées upsertées`);

  // 2) Résoudre + upsert les relations (contrainte unique sur le triplet).
  const relRows = RELATIONS.map((r) => akashaRelationSeedSchema.parse(r))
    .map((r) => {
      const from_entry = idBySlug.get(r.from);
      const to_entry = idBySlug.get(r.to);
      if (!from_entry || !to_entry) {
        console.warn(`  ⚠ relation ignorée (slug introuvable): ${r.from} → ${r.to}`);
        return null;
      }
      return { from_entry, to_entry, relation: r.relation };
    })
    .filter((x): x is { from_entry: string; to_entry: string; relation: string } => x !== null);

  if (relRows.length) {
    const { data: relData, error: relErr } = await sb
      .from('akasha_relations')
      .upsert(relRows, { onConflict: 'from_entry,to_entry,relation' })
      .select('id');
    if (relErr) {
      console.error('✗ relations:', relErr.message);
      process.exit(1);
    }
    console.log(`✓ ${relData?.length ?? relRows.length} relations upsertées`);
  }

  console.log('✦ Seed AKASHA terminé.');
}

main().catch((e) => {
  console.error('✗ seed-akasha:', e);
  process.exit(1);
});
