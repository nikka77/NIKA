// components/akasha/Crumbs.tsx — fil d'Ariane 4 niveaux du registre (Refonte L3) :
// Registre → Univers (hub) → Collection (registre filtré) → Fiche. + JSON-LD BreadcrumbList (SEO).
// RSC pur, liens partageables.
import Link from 'next/link';
import { SITE_URL } from '@/lib/site';
import { universeHubSlug } from '@/lib/akasha/universe-taxonomy';
import { registryHref } from '@/lib/akasha/href';

export default function Crumbs({ universe, category, name }: { universe?: string | null; category?: string | null; name: string }) {
  const hub = universe ? universeHubSlug(universe) : null;
  const items: { label: string; href?: string }[] = [{ label: 'Registre AKASHA', href: '/learn/akasha' }];
  if (universe) items.push({ label: universe, href: hub ? `/learn/akasha/u/${hub}` : registryHref({ universe }) });
  if (universe && category) items.push({ label: category, href: registryHref({ universe, cat: category }) });
  items.push({ label: name });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: `${SITE_URL}${it.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Fil d'Ariane" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span aria-hidden style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>›</span>}
          {it.href ? (
            <Link href={it.href} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 24, padding: '4px 2px', fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: i === 0 ? 'uppercase' : 'none', color: 'var(--td2)', textDecoration: 'none' }}>
              {i === 0 ? '← ' : ''}{it.label}
            </Link>
          ) : (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, color: 'var(--td2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
