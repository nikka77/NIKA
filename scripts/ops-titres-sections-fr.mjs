// scripts/ops-titres-sections-fr.mjs — les titres de sections passent au FRANÇAIS (02/08/2026).
//
// Le découpage vient du wiki anglais : l'agent traduit le CORPS de la section mais garde
// parfois le titre du wiki tel quel (« Plot », « Trivia », « TV Drama », « Image Gallery »).
// Sur une encyclopédie française, ça se voit au premier coup d'œil — c'est le seul mot que
// le lecteur lit avant de déplier. Rien à demander à un modèle : une table suffit, et elle
// harmonise au passage les variantes françaises (« Drame télévisuel » / « Drame télévisé »).
//
// Usage : node --env-file=.env.local scripts/ops-titres-sections-fr.mjs [--universe="Death Note"] [--appliquer]
import { clientSite } from '../lib/ops/db.mjs';
import { trier } from '../lib/akasha/sections.ts';

const supabase = clientSite();
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

// UNE SECTION = UNE LIGNE de akasha_sections (05/08) : attributes.sections est purgé.
// Les fiches d'abord (id → slug), puis leurs sections par paquets d'ids — la table ne
// porte pas l'univers, et tout tirer gaspillerait l'egress. On ne tire que les TITRES.
const entrees = [];
for (let d = 0; ; d += 1000) {
  let q = supabase.from('akasha_entries').select('id, slug').order('slug').range(d, d + 999);
  if (UNIVERSE) q = q.eq('universe', UNIVERSE);
  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }
  entrees.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

const parFiche = new Map(); // entry_id → lignes { id, idx, titre }
for (let d = 0; d < entrees.length; d += 100) {
  const ids = entrees.slice(d, d + 100).map((e) => e.id);
  for (let p = 0; ; p += 1000) {
    const { data, error } = await supabase.from('akasha_sections')
      .select('id, entry_id, idx, titre').in('entry_id', ids).order('id').range(p, p + 999);
    if (error) { console.error(error.message); process.exit(1); }
    for (const l of data ?? []) {
      if (!parFiche.has(l.entry_id)) parFiche.set(l.entry_id, []);
      parFiche.get(l.entry_id).push(l);
    }
    if ((data?.length ?? 0) < 1000) break;
  }
}

let fiches = 0, titres = 0;
const inconnus = new Map();
for (const e of entrees) {
  // trier ne lit que `.i` : les lignes gardent leur `id` pour l'UPDATE ciblé.
  const lignes = trier((parFiche.get(e.id) ?? []).map((l) => ({ ...l, i: l.idx })));
  if (!lignes.length) continue;
  let touche = false;
  const dejaPris = new Set(lignes.map((l) => l.titre));
  for (const l of lignes) {
    const fr = versFr(l.titre, dejaPris);
    if (fr) {
      touche = true; titres++; dejaPris.add(fr);
      console.log(`  ${e.slug.padEnd(24)} « ${l.titre} » → « ${fr} »`);
      if (APPLIQUER) {
        // UPDATE de LA ligne — plus jamais de réécriture du tableau entier.
        const { error } = await supabase.from('akasha_sections').update({ titre: fr }).eq('id', l.id);
        if (error) console.error(`  ✗ ${e.slug} §${l.idx} : ${error.message}`);
      }
      continue;
    }
    // Titre encore anglais mais absent de la table : on le signale plutôt que de le deviner.
    if (/^[\x00-\x7F]+$/.test(String(l.titre)) && /\b(the|of|and|in|for|series|film|note|deal|lyrics|drama|gallery)\b/i.test(String(l.titre)))
      inconnus.set(l.titre, (inconnus.get(l.titre) ?? 0) + 1);
  }
  if (touche) fiches++;
}

console.log(`\n${APPLIQUER ? '' : '(à blanc) '}${titres} titre(s) traduit(s) sur ${fiches} fiche(s)${UNIVERSE ? ` [${UNIVERSE}]` : ''}`);
if (inconnus.size) {
  console.log('\nTitres encore anglais, hors table (à ajouter à FR si récurrents) :');
  for (const [t, n] of [...inconnus].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${t}`);
}
