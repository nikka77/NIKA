// components/akasha/DossierSections.tsx — LE dossier long d'une fiche, en un seul exemplaire.
//
// Pourquoi (05/08/2026, chantier « 791 fiches muettes ») : le bloc dossier existait en DEUX
// copies quasi identiques — CharacterZone et le gabarit Attaque — et NULLE PART ailleurs.
// Résultat mesuré : 791 fiches non-personnages portaient un dossier complet en base
// (akasha_sections, payé, double-validé) que leur gabarit ne rendait jamais — 141 status
// (OrganizationZone), 14 fiches à ères (EraZone), et tout le gabarit générique (lieux,
// artefacts, techniques hors-attaque, professions). Du contenu invisible.
//
// Un composant, quatre points de montage : la prochaine surface qui naît l'importe au lieu
// de recopier le bloc — deux copies qui divergent, ce sont deux DA qui divergent.
//
// Pas de 'use client' : purement présentationnel, il suit le contexte de son parent (serveur
// dans les gabarits de page, client dans les zones).
//
// Les sections arrivent par `entry.attributes.sections` : getEntryBySlug les résout depuis la
// table akasha_sections et les réinjecte là (lib/akasha/queries.ts) — les composants n'ont pas
// à connaître la table.

export type SectionDossier = { i?: string; titre?: string; texte?: string };

export default function DossierSections({
  sections,
  accent = 'var(--az)',
  style,
}: {
  sections: unknown;
  /** Couleur des titres de section — l'accent de l'univers quand le gabarit en a un. */
  accent?: string;
  style?: React.CSSProperties;
}) {
  if (!Array.isArray(sections) || !sections.length) return null;
  const lisibles = (sections as SectionDossier[]).filter((s) => s?.titre && s?.texte);
  if (!lisibles.length) return null;

  return (
    <section className="ak-dossier" style={style}>
      {lisibles.map((s, i) => (
        <div key={s.i ?? i} style={{ marginBottom: 22 }}>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 9,
          }}>
            {s.titre}
          </div>
          <p style={{
            fontFamily: 'var(--fo)', fontSize: 14.5, color: 'var(--td2)',
            lineHeight: 1.75, margin: 0, whiteSpace: 'pre-line',
          }}>
            {s.texte}
          </p>
        </div>
      ))}
    </section>
  );
}
