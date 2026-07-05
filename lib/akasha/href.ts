// lib/akasha/href.ts — builder d'URL UNIQUE du registre AKASHA (Refonte L3 « Fin des impasses »).
// Tous les composants de filtre passent par ici → plus AUCUN paramètre droppé silencieusement.
// Sémantique : on propage TOUT ; les incohérences éventuelles (cat d'un autre univers…) restent
// VISIBLES et supprimables via la FilterBar — explicite > silencieux.

export interface RegistryFilters {
  universe?: string;
  type?: string;
  cat?: string;
  fam?: string;
  attr?: string;
  val?: string;
  rarity?: string;
  search?: string;
  sort?: string;
  page?: number;
}

export function registryHref(f: RegistryFilters): string {
  const p = new URLSearchParams();
  if (f.universe) p.set('universe', f.universe);
  if (f.type) p.set('type', f.type);
  if (f.cat) p.set('cat', f.cat);
  if (f.cat && f.fam) p.set('fam', f.fam);
  if (f.attr && f.val) { p.set('attr', f.attr); p.set('val', f.val); }
  if (f.rarity) p.set('rarity', f.rarity);
  if (f.sort) p.set('sort', f.sort);
  if (f.search) p.set('search', f.search);
  if (f.page && f.page > 1) p.set('page', String(f.page));
  const qs = p.toString();
  return qs ? `/learn/akasha?${qs}` : '/learn/akasha';
}
