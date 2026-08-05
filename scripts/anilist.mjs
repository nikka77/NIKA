// scripts/lib/anilist.mjs — connecteur AniList (GraphQL public, sans clé) pour enrichir AKASHA.
// Récupère les personnages d'une série (par idMal) triés par popularité, avec favoris + bio FR-nettoyable.
// Rate limit AniList ≈ 90 req/min → on temporise entre les pages.

const ENDPOINT = 'https://graphql.anilist.co';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUERY = `query($m:Int,$p:Int){Media(idMal:$m,type:ANIME){characters(sort:FAVOURITES_DESC,perPage:50,page:$p){pageInfo{hasNextPage} nodes{name{full native alternative} favourites description(asHtml:false)}}}}`;

async function gql(malId, page, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: QUERY, variables: { m: malId, p: page } }),
      });
      if (res.status === 429) { await sleep(2500 * (i + 1)); continue; }
      const j = await res.json();
      return j?.data?.Media?.characters ?? null;
    } catch { await sleep(800 * (i + 1)); }
  }
  return null;
}

/** Nettoie la description AniList en texte brut lisible (retire balises maison ~!!~, markdown, HTML)
 *  SANS traduire — conservée telle quelle (anglais) pour traduction FR ultérieure. */
function rawText(desc) {
  if (!desc) return null;
  const s = String(desc)
    .replace(/~!|!~/g, '')
    .replace(/__|\*\*|\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > 20 ? s.slice(0, 1200) : null;
}

/** Récupère jusqu'à `maxPages` × 50 personnages d'une série → [{names:[...], favourites, descRaw}].
 *  descRaw = description AniList BRUTE (anglais) pour enrichissement + traduction future. */
export async function fetchAniListChars(malId, maxPages = 10) {
  const out = [];
  for (let p = 1; p <= maxPages; p++) {
    const chars = await gql(malId, p);
    if (!chars?.nodes?.length) break;
    for (const c of chars.nodes) {
      const names = [c.name?.full, c.name?.native, ...(c.name?.alternative || [])].filter(Boolean);
      out.push({ names, favourites: c.favourites || 0, descRaw: rawText(c.description) });
    }
    if (!chars.pageInfo?.hasNextPage) break;
    await sleep(2_100);
  }
  return out;
}

/** Index nom→{fav,bio} par tokens significatifs (≥3 lettres) pour un matching robuste
 *  (« Luffy Monkey » ↔ « Monkey D. Luffy »). Retourne une fonction de lookup. */
export function anilistIndex(chars) {
  const toks = (s) => new Set(String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((t) => t.length >= 3));
  const idx = chars.map((c) => ({ toks: toks(c.names.join(' ')), fav: c.favourites, descRaw: c.descRaw }));
  return (name) => {
    const want = toks(name);
    if (!want.size) return null;
    let best = null, bestHit = 0;
    for (const cand of idx) {
      let hit = 0; for (const t of want) if (cand.toks.has(t)) hit++;
      if (hit > bestHit && hit >= Math.min(2, want.size)) { bestHit = hit; best = cand; }
    }
    return best;
  };
}
