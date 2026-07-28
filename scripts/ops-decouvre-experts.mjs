// scripts/ops-decouvre-experts.mjs — DÉCOUVREUR d'experts de niche (L19, demande Dan 28/07).
// « Un agent pour chaque élément d'univers qui a assez de matière » : on ne décrète pas les
// experts, on les DÉCOUVRE — tout couple attribut=valeur porté par ≥ seuil entrées devient
// un expert (« Expert du clan Uchiha », « Expert de l'Akatsuki », « Expert des Shinigami »…).
// Le scan lit la réalité de la base, pas les enums prévus : ce que les données contiennent
// décide. Usage :
//   node --env-file=.env.local scripts/ops-decouvre-experts.mjs            (roster lisible)
//   node --env-file=.env.local scripts/ops-decouvre-experts.mjs --seuil=12 --json
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SEUIL = Number(process.argv.find((a) => a.startsWith('--seuil='))?.split('=')[1] ?? 8);
const JSON_OUT = process.argv.includes('--json');

// Clés de texte libre (bios, résumés…) : jamais des niches — chaque valeur y est unique.
// bio/history… = texte libre ; descLang/source = plomberie du pipeline ; role = étiquette
// éditoriale (« Personnage secondaire ») — aucun n'est une niche CANON.
const CLES_EXCLUES = new Set(['bio', 'history', 'summary', 'description', 'nindo', 'image', 'image_url', 'url', 'quote', 'era', 'descLang', 'source', 'role', 'about_hash',
  // état civil et plomberie : jamais des niches canon (« Expert 28 ans » n'existe pas)
  'sex', 'age', 'height', 'weight', 'birthday', 'birthdate', 'blood_type', 'status', 'villageSlug', 'rosterLabel']);
const valeurNiche = (v) => typeof v === 'string' && v.length >= 2 && v.length <= 60 && !/[.!?]\s/.test(v);

const clusters = new Map();   // "universe␟clé␟valeur" → { n, exemples[] }
let total = 0;
for (let de = 0; ; de += 1000) {
  const { data, error } = await supabase.from('akasha_entries')
    .select('name, universe, attributes').not('attributes', 'is', null)
    .order('id').range(de, de + 999);
  if (error) { console.error('lecture:', error.message); process.exit(1); }
  for (const e of data ?? []) {
    total++;
    for (const [k, v] of Object.entries(e.attributes ?? {})) {
      if (CLES_EXCLUES.has(k) || !valeurNiche(v)) continue;
      const id = `${e.universe}␟${k}␟${v}`;
      const c = clusters.get(id) ?? { n: 0, exemples: [] };
      c.n++;
      if (c.exemples.length < 5) c.exemples.push(e.name);
      clusters.set(id, c);
    }
  }
  if (!data || data.length < 1000) break;
}

// Une clé dont presque chaque valeur est unique (ratio niches/valeurs ≈ 0) est du texte
// libre déguisé — on l'écarte pour ne garder que les vraies taxonomies.
const parCle = new Map();
for (const [id, c] of clusters) {
  const [u, k] = id.split('␟');
  const s = parCle.get(`${u}␟${k}`) ?? { valeurs: 0, niches: 0 };
  s.valeurs++; if (c.n >= SEUIL) s.niches++;
  parCle.set(`${u}␟${k}`, s);
}

const bruts = [...clusters.entries()]
  .filter(([id, c]) => {
    if (c.n < SEUIL) return false;
    const [u, k] = id.split('␟');
    const s = parCle.get(`${u}␟${k}`);
    return s.niches >= 1 && s.valeurs <= 200;   // taxonomie plausible, pas du texte libre
  })
  .map(([id, c]) => {
    const [universe, axe, valeur] = id.split('␟');
    return { universe, axe, valeur, membres: c.n, nom: `Expert ${valeur} (${universe})`, exemples: c.exemples };
  });
// Dédoublonnage : la même valeur portée par plusieurs axes (« Organisation » en scope ET
// category) ne fait qu'UN expert — on garde l'axe le plus peuplé.
const parNom = new Map();
for (const e of bruts) {
  const cle = `${e.universe}␟${e.valeur}`;
  if (!parNom.has(cle) || parNom.get(cle).membres < e.membres) parNom.set(cle, e);
}
const experts = [...parNom.values()]
  .sort((a, b) => a.universe.localeCompare(b.universe) || b.membres - a.membres);

if (JSON_OUT) { console.log(JSON.stringify(experts, null, 1)); process.exit(0); }

console.log(`⛩  ${experts.length} experts de niche découverts (seuil ${SEUIL} entrées, ${total} entrées scannées)\n`);
let dernier = '';
for (const e of experts) {
  if (e.universe !== dernier) { console.log(`── ${e.universe} ──`); dernier = e.universe; }
  console.log(`  ${e.nom.padEnd(52)} ${String(e.membres).padStart(4)} entrées  [${e.axe}]  ex: ${e.exemples.slice(0, 3).join(', ')}`);
}
