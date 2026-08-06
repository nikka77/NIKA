// app/learn/akasha/api/search/route.ts — endpoint de l'OMNI-SEARCH (L8). Renvoie des résultats
// groupés par type, avec un extrait descFr autour du terme (pour surlignage côté client).
// Depuis le 06/08 : fouille AUSSI les 19 844 sections de dossier (akasha_sections) — groupe
// « Dans les dossiers » avec titre de section + extrait, lien vers la fiche mère.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { omniSearch } from '@/lib/akasha/queries';
import { TYPE_META } from '@/lib/akasha/types';

/** Extrait de ~120 car. centré sur la 1re occurrence du terme dans la bio VF. */
function snippet(descFr: string | null | undefined, q: string): string | null {
  if (!descFr) return null;
  const i = descFr.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return null;
  const start = Math.max(0, i - 45);
  const raw = (start > 0 ? '…' : '') + descFr.slice(start, i + q.length + 75).trim() + '…';
  return raw.replace(/\s+/g, ' ');
}

const SECTIONS_MAX = 6; // résultats de sections affichés (consigne : 5-8)

interface SectionRow { entry_id: string; idx: string; titre: string | null; texte: string }

/** Forme d'un résultat côté OmniSearch.tsx — sectionTitre ne vit que sur « Dans les dossiers ». */
interface OmniItem {
  slug: string; name: string; universe: string | null; image_url: string | null;
  rarity: string | null; snippet: string | null; sectionTitre?: string | null;
}
interface OmniGroup { type: string; label: string; icon: string; items: OmniItem[] }

/** Lignes de sections qui matchent le terme (texte OU titre).
 *  MÉTHODE : .ilike, pas .textSearch — mesuré le 06/08 sur les 19 844 lignes :
 *  ilike 84-224 ms (« genjutsu »/« Haki »/« Rasengan »), 470 ms au pire (terme sans hit, scan
 *  complet) ; textSearch(fts, config french) 127-508 ms et 4 162 ms au pire — sans index tsvector,
 *  chaque ligne repasse par to_tsvector. En bonus, ilike matche les sous-chaînes (« genju »),
 *  ce qui colle à une recherche instantanée. */
async function matchSections(s: string): Promise<SectionRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('akasha_sections')
    .select('entry_id, idx, titre, texte')
    .or(`texte.ilike.%${s}%,titre.ilike.%${s}%`)
    .limit(24); // marge : on déduplique par fiche et on filtre les fiches déjà matchées par nom
  return (data as SectionRow[] | null) ?? [];
}

/** Groupe « Dans les dossiers » : 1 section max par fiche, jamais une fiche déjà trouvée par son
 *  nom, entrée mère jointe en 2ᵉ requête (le cache PostgREST ne connaît pas la FK → pas d'embed). */
async function sectionGroup(s: string, rows: SectionRow[], entriesParNom: Set<string>): Promise<OmniGroup | null> {
  const vus = new Set<string>();
  const retenues = rows.filter((r) => {
    if (entriesParNom.has(r.entry_id) || vus.has(r.entry_id)) return false;
    vus.add(r.entry_id);
    return true;
  }).slice(0, SECTIONS_MAX);
  if (!retenues.length) return null;

  const supabase = await createClient();
  if (!supabase) return null;
  const { data: parents } = await supabase
    .from('akasha_entries')
    .select('id, slug, name, universe, image_url, rarity')
    .in('id', [...new Set(retenues.map((r) => r.entry_id))]);
  const parId = new Map((parents ?? []).map((p) => [p.id as string, p]));

  const items = retenues.flatMap((r) => {
    const e = parId.get(r.entry_id);
    if (!e) return [];
    // Terme dans le texte → extrait centré ; sinon (match sur le titre seul) → début du texte.
    const extrait = snippet(r.texte, s) ?? (r.texte.slice(0, 110).replace(/\s+/g, ' ').trim() + '…');
    return [{
      slug: e.slug as string, name: e.name as string, universe: (e.universe as string) ?? null,
      image_url: (e.image_url as string) ?? null, rarity: (e.rarity as string) ?? null,
      snippet: extrait, sectionTitre: r.titre,
    }];
  });
  return items.length ? { type: 'section', label: 'Dans les dossiers', icon: '📖', items } : null;
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ groups: [] });
  const s = q.replace(/[%,()]/g, ' ').trim(); // même hygiène PostgREST que omniSearch
  const [results, sectionRows] = await Promise.all([omniSearch(q, 30), s.length >= 2 ? matchSections(s) : []]);

  // Groupe par type, dans l'ordre TYPE_META.
  const byType = new Map<string, typeof results>();
  for (const r of results) {
    const arr = byType.get(r.type) ?? [];
    arr.push(r);
    byType.set(r.type, arr);
  }
  const groups: OmniGroup[] = [...byType.entries()].map(([type, items]) => ({
    type,
    label: TYPE_META[type as keyof typeof TYPE_META]?.plural ?? type,
    icon: TYPE_META[type as keyof typeof TYPE_META]?.icon ?? '✦',
    items: items.slice(0, 8).map((r) => ({
      slug: r.slug, name: r.name, universe: r.universe, image_url: r.image_url, rarity: r.rarity,
      snippet: snippet(r.descFr, q),
    })),
  }));

  // Pas de doublon : une fiche dont le NOM matche déjà n'a pas besoin de réapparaître en section.
  const entriesParNom = new Set(results.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())).map((r) => r.id));
  const dossiers = sectionRows.length ? await sectionGroup(s, sectionRows, entriesParNom) : null;
  if (dossiers) groups.push(dossiers);

  const total = results.length + (dossiers?.items.length ?? 0);
  return NextResponse.json({ groups, total });
}
