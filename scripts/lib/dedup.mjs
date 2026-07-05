// scripts/lib/dedup.mjs — fusion des doublons de personnages AKASHA. SÛR par conception :
//  1) Clé canonique EXACTE (multiset de tokens trié) : replie macrons/voyelles longues (ō→o, ū→u,
//     ou→o, voyelles doublées) MAIS garde chiffres/« jr »/romains/lettres → « Android 17 » ≠ « 18 »,
//     les Shadow Dragons restent distincts. Attrape les inversions (Mihawk Dracule / Dracule Mihawk)
//     et romanisations (Shūichi / Shuuichi, Hitsugaya Toshiro / Tōshirō Hitsugaya).
//  2) Alias CURÉS explicites [slugA, slugB] : pour les vrais doublons partiels/surnoms (Ulquiorra
//     Cifer / Ulquiorra, Yamamoto…) que la clé exacte ne voit pas. Le keeper = la fiche la plus riche.
// PAS de fusion automatique par sous-ensemble (fusionnerait à tort les homonymes mineurs).

const HONORIFICS = new Set(['the', 'of', 'no', 'sama', 'san', 'kun', 'chan', 'dono', 'mr', 'ms', 'mrs', 'dr']);

export function canonTokens(name) {
  let s = String(name).toLowerCase()
    .replace(/[ōôòó]/g, 'o').replace(/[ūûùú]/g, 'u').replace(/[âàá]/g, 'a').replace(/[îìí]/g, 'i').replace(/[êèé]/g, 'e');
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[^a-z0-9 ]/g, ' ');
  return s.split(/\s+/)
    .filter((t) => t && !HONORIFICS.has(t))
    // « ou »→« o » UNIQUEMENT sur les tokens à consonne : « toushirou »→« toshiro », « shihouin »→
    // « shihoin » (Hitsugaya, Yoruichi). On NE replie PAS les voyelles doublées « ii/uu » (casserait
    // shiin≠shin) : les paires uu/ū résiduelles (Shūichi/Shuuichi…) passent par les alias curés.
    .map((t) => (/[bcdfghjklmnpqrstvwxyz]/.test(t) ? t.replace(/ou/g, 'o') : t));
}

const keyOf = (name) => canonTokens(name).slice().sort().join(' '); // trié → inversions capturées
// Le slug CURÉ (config `u.chars`, stars, piliers) gagne TOUJOURS : il est référencé partout
// (relations, STAR_DETAILS, Most Wanted, URL SEO) → +100000. Sinon départage image/attributs.
const scoreOf = (e, curated) => (curated?.has(e.slug) ? 100000 : 0) + (e.image_url ? 100 : 0) + Object.keys(e.attributes || {}).length + (e.summary ? 1 : 0);

function mergeInto(keeper, dupe, merges, removed) {
  if (!keeper.image_url && dupe.image_url) keeper.image_url = dupe.image_url;
  for (const [k, v] of Object.entries(dupe.attributes || {})) {
    if (keeper.attributes[k] == null || keeper.attributes[k] === '') keeper.attributes[k] = v;
  }
  if ((!keeper.summary || keeper.summary.length < 20) && dupe.summary) keeper.summary = dupe.summary;
  merges.push({ from: dupe.slug, to: keeper.slug, universe: keeper.universe });
  removed.add(dupe.slug);
}

/** @param aliases paires [slugA, slugB] du même personnage. @param curatedSlugs Set des slugs curés
 *  (toujours gardés comme keeper). */
export function dedupeChars(entries, relations, aliases = [], curatedSlugs = new Set()) {
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  for (const e of entries) e.attributes = e.attributes || {};
  const merges = [];
  const removed = new Set();

  // 0) Alias curés (partiels/surnoms) — keeper = le plus « riche » (slug curé prioritaire).
  for (const [a, b] of aliases) {
    const ea = bySlug.get(a), eb = bySlug.get(b);
    if (!ea || !eb || ea === eb || removed.has(a) || removed.has(b)) continue;
    const keeper = scoreOf(ea, curatedSlugs) >= scoreOf(eb, curatedSlugs) ? ea : eb;
    mergeInto(keeper, keeper === ea ? eb : ea, merges, removed);
  }

  // 1) Clé canonique exacte (par univers) — keeper = slug curé sinon le plus riche.
  const groups = new Map();
  for (const e of entries) {
    if (e.type !== 'character' || removed.has(e.slug)) continue;
    const gk = `${e.universe}||${keyOf(e.name)}`;
    (groups.get(gk) || groups.set(gk, []).get(gk)).push(e);
  }
  for (const grp of groups.values()) {
    if (grp.length < 2) continue;
    grp.sort((a, b) => scoreOf(b, curatedSlugs) - scoreOf(a, curatedSlugs));
    for (const d of grp.slice(1)) if (!removed.has(d.slug)) mergeInto(grp[0], d, merges, removed);
  }

  // Remap relations → keepers, purge self/doublons.
  const canon = (slug) => { const m = merges.find((x) => x.from === slug); return m ? m.to : slug; };
  for (const r of relations) { r.from = canon(r.from); r.to = canon(r.to); }
  const seenR = new Set();
  const cleanRel = relations.filter((r) => {
    if (r.from === r.to) return false;
    const k = `${r.from}|${r.relation}|${r.to}`;
    if (seenR.has(k)) return false; seenR.add(k); return true;
  });

  return { entries: entries.filter((e) => !removed.has(e.slug)), relations: cleanRel, merges };
}
