// scripts/ops-titres-sections-fr.mjs — les titres de sections passent au FRANÇAIS (02/08/2026).
//
// Le découpage vient du wiki anglais : l'agent traduit le CORPS de la section mais garde
// parfois le titre du wiki tel quel (« Plot », « Trivia », « TV Drama », « Image Gallery »).
// Sur une encyclopédie française, ça se voit au premier coup d'œil — c'est le seul mot que
// le lecteur lit avant de déplier. Rien à demander à un modèle : une table suffit, et elle
// harmonise au passage les variantes françaises (« Drame télévisuel » / « Drame télévisé »).
//
// Usage : node --env-file=.env.local scripts/ops-titres-sections-fr.mjs [--universe="Death Note"] [--appliquer]
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const APPLIQUER = process.argv.includes('--appliquer');
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];

// Clé = titre normalisé (minuscules, sans accents) → titre affiché en français.
const FR = {
  'plot': 'Intrigue',
  'story': 'Histoire',
  'history': 'Histoire',
  'character': 'Personnalité',
  'personality': 'Personnalité',
  'appearance': 'Apparence',
  'abilities': 'Capacités',
  'powers and abilities': 'Pouvoirs et capacités',
  'trivia': 'Anecdotes',
  'curiosites': 'Anecdotes',
  'quotes': 'Répliques',
  'gallery': 'Galerie',
  'image gallery': 'Galerie',
  'creation and conception': 'Conception',
  'design': 'Conception',
  'in other media': 'Dans d’autres médias',
  'drama': 'Drame télévisé',
  'tv drama': 'Drame télévisé',
  'drame televisuel': 'Drame télévisé',
  'television drama': 'Drame télévisé',
  'film series': 'Films',
  'films': 'Films',
  'live-action film series': 'Films en prises de vues réelles',
  'relight anime films': 'Films d’animation Relight',
  'musical': 'Comédie musicale',
  'novel': 'Roman',
  'information': 'Informations',
  'members': 'Membres',
  'notable members': 'Membres notables',
  'restrictions': 'Restrictions',
  'eye deal': 'Le marché des yeux',
  'credits': 'Crédits',
  'cast': 'Distribution',
  'lyrics': 'Paroles',
  'japanese lyrics': 'Paroles en japonais',
};

const clef = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Titre français d'une section, ou null si rien à changer. */
const versFr = (titre, dejaPris) => {
  let fr = FR[clef(titre)];
  // Les titres de chansons gardent leur nom propre : seul le mot « lyrics » se traduit.
  if (!fr && /\slyrics$/i.test(String(titre))) fr = `Paroles — ${String(titre).replace(/\s*lyrics$/i, '')}`;
  if (!fr || fr === titre) return null;
  // Deux sections d'une même fiche ne peuvent pas porter le même titre : « Film series » et
  // « Films » deviendraient jumelles et le lecteur ne saurait plus laquelle il déplie.
  return dejaPris.has(fr) ? null : fr;
};

const entrees = [];
for (let d = 0; ; d += 1000) {
  let q = supabase.from('akasha_entries').select('slug, name, universe, attributes')
    .not('attributes->sections', 'is', null).order('slug').range(d, d + 999);
  if (UNIVERSE) q = q.eq('universe', UNIVERSE);
  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }
  entrees.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

let fiches = 0, titres = 0;
const inconnus = new Map();
for (const e of entrees) {
  const sections = e.attributes?.sections ?? [];
  let touche = false;
  const dejaPris = new Set(sections.map((s) => s.titre));
  const neuves = sections.map((s) => {
    const fr = versFr(s.titre, dejaPris);
    if (fr) {
      touche = true; titres++; dejaPris.add(fr);
      console.log(`  ${e.slug.padEnd(24)} « ${s.titre} » → « ${fr} »`);
      return { ...s, titre: fr };
    }
    // Titre encore anglais mais absent de la table : on le signale plutôt que de le deviner.
    if (/^[\x00-\x7F]+$/.test(String(s.titre)) && /\b(the|of|and|in|for|series|film|note|deal|lyrics|drama|gallery)\b/i.test(String(s.titre)))
      inconnus.set(s.titre, (inconnus.get(s.titre) ?? 0) + 1);
    return s;
  });
  if (!touche) continue;
  fiches++;
  if (!APPLIQUER) continue;
  const attrs = { ...(e.attributes ?? {}), sections: neuves };
  const { error } = await supabase.from('akasha_entries').update({ attributes: attrs }).eq('slug', e.slug);
  if (error) console.error(`  ✗ ${e.slug} : ${error.message}`);
}

console.log(`\n${APPLIQUER ? '' : '(à blanc) '}${titres} titre(s) traduit(s) sur ${fiches} fiche(s)${UNIVERSE ? ` [${UNIVERSE}]` : ''}`);
if (inconnus.size) {
  console.log('\nTitres encore anglais, hors table (à ajouter à FR si récurrents) :');
  for (const [t, n] of [...inconnus].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${t}`);
}
