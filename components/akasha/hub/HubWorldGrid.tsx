// components/akasha/hub/HubWorldGrid.tsx — LA GRILLE DU MONDE : la porte d'entrée d'un univers qui
// n'a pas encore de géographie curée (LOT 7). 100 % serveur, aucune donnée neuve — elle rend l'axe
// que `deriveHubSurfaces` a désigné, avec les comptes que le hub calcule déjà.
//
// POURQUOI ELLE EXISTE
// Les huit univers ouvrent sur un geste bespoke : Grand Line, le cosmos, les villages, la roue du
// Nen… Le neuvième n'aura rien de tout ça le jour de son arrivée, et le hub commençait alors
// directement par sa barre de recherche — une entrée de bibliothèque, pas de monde. Cette grille
// donne la même invitation à cliquer, faite de ce que l'univers possède déjà.
//
// LANGAGE V2 « ZÉRO CARTE » : pas de boîte (aucune bordure sur quatre côtés, aucun fond plein,
// aucun coin arrondi) — un filet supérieur par case, la même grammaire que le canal des fiches et
// que `.ak-dossier`. Le poids de chaque case se dit par le CHIFFRE et par la longueur d'un filet
// proportionnel, jamais par une pastille posée dans un coin.
import Link from 'next/link';

export interface WorldCell { v: string; label: string; count: number; tint?: string; badge?: string }

export default function HubWorldGrid({
  label, attr, cells, universeSlug, color,
}: {
  /** Libellé de l'axe tel que la taxonomie le nomme (« Factions », « Équipes »…). */
  label: string;
  attr: string;
  cells: WorldCell[];
  universeSlug: string;
  color: string;
}) {
  if (cells.length < 2) return null;
  const tri = [...cells].sort((a, b) => b.count - a.count);
  const total = tri.reduce((n, c) => n + c.count, 0);
  const max = tri[0].count || 1;

  return (
    <section aria-label={`${label} — entrée du monde`}>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--td3)' }}>{tri.length} · {total} fiches</span>
      </div>

      {/* PAS DE MAILLAGE DE TABLEAU. Une première version peignait les filets en laissant
          transparaître un fond de grille dans un `gap: 1px` — élégant tant que les cases
          remplissent des rangées entières, et six cases sur quatre colonnes en laissent une vide :
          le fond s'y voyait en bloc gris, une case fantôme au coin de la grille. Le site dit ses
          structures en filets HORIZONTAUX (`.ak-list-row`, `.ak-dossier`) ; la grille du monde
          parle la même langue, et un trou n'y laisse aucune trace. */}
      <div className="g-4 ak-worldgrid" style={{ columnGap: 18, rowGap: 22 }}>
        {tri.map((c, i) => {
          const teinte = c.tint ?? color;
          const part = Math.round((c.count / max) * 100);
          return (
            <Link
              key={c.v}
              href={`/learn/akasha/u/${universeSlug}/${attr}/${encodeURIComponent(c.v)}`}
              className="ak-worldgrid-cell"
              style={{
                // La première case pèse deux colonnes : le monde a une capitale, la grille le dit.
                gridColumn: i === 0 ? 'span 2' : undefined,
                ['--wc' as string]: teinte,
                ['--wp' as string]: `${part}%`,
              }}
            >
              <span className="ak-worldgrid-n">{c.count}</span>
              <span className="ak-worldgrid-l">
                {c.badge && <span aria-hidden style={{ marginRight: 6 }}>{c.badge}</span>}
                {c.label}
              </span>
              <span aria-hidden className="ak-worldgrid-bar" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
