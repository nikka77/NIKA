// components/akasha/FilterBar.tsx — barre d'ÉTAT des filtres actifs (Refonte L3) : chaque filtre
// devient une chip visible et supprimable individuellement (✕) — mort des « filtres fantômes »
// (attr/val était actif sans aucune UI pour le voir ni le retirer). RSC, liens purs.
import Link from 'next/link';
import { registryHref, type RegistryFilters } from '@/lib/akasha/href';
import { RARITY_META, TYPE_META, asAkashaType, universeMeta } from '@/lib/akasha/types';
import { axisLabel, axisValueLabel } from '@/lib/akasha/universe-taxonomy';

export default function FilterBar({ f }: { f: RegistryFilters }) {
  const chips: { key: string; label: string; color: string; without: RegistryFilters }[] = [];
  const t = asAkashaType(f.type);

  if (f.universe) chips.push({ key: 'universe', label: `${universeMeta(f.universe).emoji} ${f.universe}`, color: universeMeta(f.universe).color, without: { ...f, universe: undefined, page: undefined } });
  if (t) chips.push({ key: 'type', label: `${TYPE_META[t].icon} ${TYPE_META[t].plural}`, color: TYPE_META[t].color, without: { ...f, type: undefined, page: undefined } });
  if (f.cat) chips.push({ key: 'cat', label: `◈ ${f.cat}`, color: '#0EA878', without: { ...f, cat: undefined, fam: undefined, page: undefined } });
  if (f.cat && f.fam) chips.push({ key: 'fam', label: `↳ ${f.fam}`, color: '#0EA878', without: { ...f, fam: undefined, page: undefined } });
  if (f.attr && f.val) {
    const axisName = (f.universe && axisLabel(f.universe, f.attr)) || f.attr;
    const valName = f.universe ? axisValueLabel(f.universe, f.attr, f.val) : f.val;
    chips.push({ key: 'axis', label: `${axisName} : ${valName}`, color: '#0094D4', without: { ...f, attr: undefined, val: undefined, page: undefined } });
  }
  if (f.rarity && RARITY_META[f.rarity as keyof typeof RARITY_META]) {
    const rm = RARITY_META[f.rarity as keyof typeof RARITY_META];
    chips.push({ key: 'rarity', label: `◆ ${rm.label}`, color: rm.color, without: { ...f, rarity: undefined, page: undefined } });
  }
  if (f.search) chips.push({ key: 'search', label: `« ${f.search} »`, color: '#7B5CF0', without: { ...f, search: undefined, page: undefined } });

  if (chips.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 1rem' }}>
      <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)' }}>Filtres :</span>
      {chips.map((c) => (
        <Link
          key={c.key}
          href={registryHref(c.without)}
          title="Retirer ce filtre"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
            fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700,
            color: c.color, background: `${c.color}14`, border: `1px solid ${c.color}55`,
            borderRadius: 20, padding: '4px 10px',
          }}
        >
          {c.label}
          <span aria-hidden style={{ fontSize: 10, opacity: 0.8 }}>✕</span>
        </Link>
      ))}
      {chips.length > 1 && (
        <Link href="/learn/akasha" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: 'var(--td3)', textDecoration: 'none', padding: '4px 8px' }}>
          Tout effacer
        </Link>
      )}
    </div>
  );
}
