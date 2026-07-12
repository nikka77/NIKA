'use client';
// lib/akasha/collection-storage.ts — contrat unique de la collection AKASHA (localStorage
// nika:akasha:collection + event 'akasha:collection'), repris à l'identique dans 6 composants
// avant mutualisation (CardActions, CollectionStrip, ClaimDaily, AlbumClient, DailyBooster,
// hub/HubCollection). Ne couvre QUE la collection — les autres clés localStorage propres à
// certains composants (date du booster, éclats, streak par univers) restent où elles sont.
const KEY = 'nika:akasha:collection';
const EVENT = 'akasha:collection';

export type CollectItem = { slug: string; name: string; img?: string | null };

function readRaw(): CollectItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => x && typeof x.slug === 'string') : [];
  } catch {
    return [];
  }
}

function writeRaw(items: CollectItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* quota / navigation privée */
  }
}

export const readCollection = (): CollectItem[] => readRaw();
export const readCollectionSlugs = (): Set<string> => new Set(readRaw().map((x) => x.slug));
export const hasInCollection = (slug: string): boolean => readRaw().some((x) => x.slug === slug);

/** Ajoute ou retire un item ; retourne le nouvel état (true = maintenant possédé). */
export function toggleCollection(item: CollectItem): boolean {
  const cur = readRaw();
  const has = cur.some((x) => x.slug === item.slug);
  writeRaw(has ? cur.filter((x) => x.slug !== item.slug) : [item, ...cur]);
  return !has;
}

/** Ajoute plusieurs items (ex. ouverture de pack) ; ignore les slugs déjà possédés.
 *  Retourne l'ensemble des slugs qui étaient déjà en collection (doublons). */
export function addManyToCollection(items: CollectItem[]): Set<string> {
  const cur = readRaw();
  const already = new Set(cur.map((x) => x.slug));
  const duplicates = new Set<string>();
  for (const it of items) {
    if (already.has(it.slug)) duplicates.add(it.slug);
    else { cur.push(it); already.add(it.slug); }
  }
  writeRaw(cur);
  return duplicates;
}

/** S'abonne aux changements de collection (même onglet toujours ; cross-onglet si crossTab). */
export function onCollectionChange(cb: () => void, opts?: { crossTab?: boolean }): () => void {
  window.addEventListener(EVENT, cb);
  if (opts?.crossTab) window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    if (opts?.crossTab) window.removeEventListener('storage', cb);
  };
}
