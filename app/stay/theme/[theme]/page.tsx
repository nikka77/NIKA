import type { Metadata } from 'next';
import Link from 'next/link';
import wowData from '@/data/wow_listings.json';

type Props = { params: Promise<{ theme: string }> };

// Metadata par thème : label, icon, desc, types JSON à inclure
const THEME_META: Record<string, { label: string; icon: string; desc: string; types: string[] }> = {
  'silo-bunker': {
    label: 'Bunker & Silo', icon: '☢️',
    desc: 'Silos à missiles de la Guerre Froide déclassifiés, bunkers WWII reconvertis. Aucun équivalent sur Booking, Expedia ou Airbnb.',
    types: ['bunker-militaire', 'silo-reconverti'],
  },
  'maison-flottante': {
    label: 'Maison flottante & Péniche', icon: '🚤',
    desc: 'Dormez sur l\'eau : suites flottantes solaires, péniches historiques, arches de Noé. Certaines introuvables ailleurs.',
    types: ['suite-flottante', 'peniche'],
  },
  'avion': {
    label: 'Avion & Train reconverti', icon: '✈️',
    desc: 'Wagons de train centenaires, wagons Far West, Pullman prussiens transformés en logements. Pièces uniques au monde.',
    types: ['train-reconverti', 'transport-reconverti'],
  },
  'sous-marin': {
    label: 'Sous-marin', icon: '🤿',
    desc: 'Le Sous-Marin Jaune inspiré des Beatles — le logement WOW le plus iconique au monde. Réservation directe propriétaire.',
    types: ['sous-marin'],
  },
  'grotte': {
    label: 'Grotte & Cave', icon: '🪨',
    desc: 'Grottes aménagées et maisons troglodytes en France. Introuvables sur Booking — réservation directe propriétaire via NIKA.',
    types: ['grotte'],
  },
  'maison-terre': {
    label: 'Maison en Terre', icon: '🧱',
    desc: 'Earthships, grottes, maisons hobbit, dômes adobe, naturhus. 6 logements dont 4 en France — réservation directe.',
    types: ['maison-terre', 'earthship', 'dome-adobe', 'maison-architecturale'],
  },
  'maison-hobbit': {
    label: 'Maison Hobbit & Earthship', icon: '🌿',
    desc: 'Cob cottages sculptés à la main, earthships bio hors réseau. Aucun équivalent sur Booking — réservation directe NIKA.',
    types: ['maison-terre', 'earthship'],
  },
  'cabane-perchée': {
    label: 'Cabane perchée', icon: '🌲',
    desc: 'Treehouses architecturales dans les forêts du monde entier. 10 logements — France, USA, Chili, Norvège, Bali.',
    types: ['cabane-perchée'],
  },
  'cabane-arbres': {
    label: 'Cabane dans les arbres', icon: '🌲',
    desc: 'Cabanes architecturales perchées dans les forêts du monde. Certaines en réservation directe via NIKA.',
    types: ['cabane-perchée', 'cabane-architecturale', 'cabane-organique'],
  },
  'tiny-house': {
    label: 'Tiny House & Birdbox', icon: '🏡',
    desc: 'Birdboxes dans les fjords norvégiens, tiny houses minimalistes. Vues impossibles sur les paysages sauvages.',
    types: ['tiny-house', 'eco-cabin'],
  },
  'bambou': {
    label: 'Bambou & Jungle', icon: '🎋',
    desc: 'Maisons entièrement construites en bambou à Bali. Architecture durable, design somptueux — le bambou comme matériau de luxe.',
    types: ['bambou'],
  },
  'villa-bali': {
    label: 'Villa Bali', icon: '🌴',
    desc: 'Villas de rêve à Bali — Nid de Dragon avec toboggan, plage de Bingin, jungle d\'Ubud. Design balinais authentique.',
    types: ['villa-bali'],
  },
  'architecture-surréaliste': {
    label: 'Architecture insolite', icon: '🎭',
    desc: 'OVNI dans un vignoble, sphère dans les rochers, Bloomhouse organique. Des sculptures habitables hors du commun.',
    types: ['architecture-surréaliste'],
  },
  'train-reconverti': {
    label: 'Train reconverti', icon: '🚂',
    desc: 'Wagons de train historiques transformés en logements. La voiture prussienne de Normandie — pièce unique en France.',
    types: ['train-reconverti'],
  },
  'tour-observation': {
    label: 'Tour & Birdbox', icon: '🦅',
    desc: 'Birdboxes dans les fjords norvégiens, Gawthorne\'s Hut Top 10 mondial. Des vues impossibles depuis des structures perchées.',
    types: ['eco-cabin', 'tiny-house'],
  },
  'bulle-transparente': {
    label: 'Bulle & Dôme', icon: '🫧',
    desc: 'Dômes transparents sous les étoiles, bulles géodésiques. Dormir à l\'intérieur en voyant le ciel étoilé.',
    types: ['dôme'],
  },
  'thematique': {
    label: 'Thématique', icon: '🎭',
    desc: 'Logements à thème — Gîte du Sorcier Harry Potter, appartement insolite Paris. L\'immersion totale.',
    types: ['thématique'],
  },
  'france': {
    label: 'France insolite', icon: '🇫🇷',
    desc: 'Les logements WOW en France — grottes, péniches, trains, moulins, granges. Réservation directe propriétaire pour la plupart.',
    types: ['grotte', 'peniche', 'train-reconverti', 'maison-terre', 'thématique', 'moulin-reconverti', 'grange-reconvertie', 'cabane-perchée', 'suite-flottante'],
  },
  'moulin-reconverti': {
    label: 'Moulin reconverti', icon: '⚙️',
    desc: 'Moulins à huile et à eau transformés en gîtes d\'exception. Patrimoine vivant, caractère unique.',
    types: ['moulin-reconverti'],
  },
  'grange-reconvertie': {
    label: 'Grange & Ferme', icon: '🏚️',
    desc: 'Granges normandes luxueuses, fermes biologiques uniques. L\'authenticité agricole réinventée.',
    types: ['grange-reconvertie', 'eco-farm'],
  },
  'sous-eau': {
    label: 'Chambre Sous-Marine', icon: '🐠',
    desc: 'Suites entièrement immergées, chambres à -3m de profondeur. L\'expérience la plus rare au monde.',
    types: ['sous-marin'],
  },
  'capsule-spatiale': {
    label: 'Capsule & Espace', icon: '🚀',
    desc: 'Capsules futuristes, pods isolés. Dormir comme des astronautes dans des modules hors du commun.',
    types: ['dôme', 'maison-architecturale'],
  },
  'grue-industrielle': {
    label: 'Grue Industrielle', icon: '🏗️',
    desc: 'Grues portuaires transformées en suites perchées. Vue panoramique à 50 mètres de hauteur.',
    types: [],
  },
};

const ICON_BY_TYPE: Record<string, string> = {
  'sous-marin': '🤿', 'train-reconverti': '🚂', 'bunker-militaire': '☢️',
  'suite-flottante': '🚤', 'architecture-surréaliste': '🌀', 'transport-reconverti': '🪵',
  'peniche': '⚓', 'silo-reconverti': '🏗️', 'earthship': '🌱', 'maison-terre': '🧱',
  'grotte': '🪨', 'eco-cabin': '🌲', 'maison-architecturale': '🏛️', 'dome-adobe': '🌵',
  'cabane-perchée': '🌲', 'tiny-house': '🏡', 'bambou': '🎋', 'villa-bali': '🌴',
  'dôme': '🫧', 'yourte': '⛺', 'moulin-reconverti': '⚙️', 'eco-farm': '🌾',
  'grange-reconvertie': '🏚️', 'thématique': '🎭', 'cabane-architecturale': '🏗️',
  'cabane-organique': '🍄',
};

type WowListing = typeof wowData.listings[0];

function getListingsByTypes(types: string[]): WowListing[] {
  if (!types.length) return [];
  return wowData.listings.filter(l => types.includes(l.type));
}

function getListingsByCountry(country: string): WowListing[] {
  return wowData.listings.filter(l => l.country === country);
}

export async function generateStaticParams() {
  return Object.keys(THEME_META).map(theme => ({ theme }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { theme } = await params;
  const decodedTheme = decodeURIComponent(theme);
  const t = THEME_META[decodedTheme];
  const label = t?.label || decodedTheme;
  return {
    title: `${label} — Logement insolite NIKA STAY`,
    description: t?.desc || `Hébergements insolites ${label}. Sélection mondiale curatée par NIKA.`,
    keywords: [`${label} hébergement`, `${label} insolite`, 'logement insolite'],
  };
}

export default async function StayThemePage({ params }: Props) {
  const { theme } = await params;
  const decodedTheme = decodeURIComponent(theme);
  const t = THEME_META[decodedTheme];

  if (!t) {
    return (
      <main style={{ padding: 'clamp(3rem,8vw,5rem) 1.4rem', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: '1rem' }}>🏡</div>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 16, color: 'var(--td3)', marginBottom: '2rem' }}>
          Thème introuvable.
        </p>
        <Link href="/stay" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--az)', textDecoration: 'none' }}>
          ← Retour à STAY
        </Link>
      </main>
    );
  }

  // France special case
  const listings: WowListing[] = decodedTheme === 'france'
    ? getListingsByCountry('France')
    : getListingsByTypes(t.types);

  const hasDirect = listings.some(l => l.booking_type === 'direct' || l.booking_type === 'direct_or_booking');

  return (
    <main>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg, #0E1F3A 0%, var(--bg) 100%)', borderBottom: '1px solid var(--bd)', padding: 'clamp(3rem,8vw,5rem) 1.4rem clamp(2rem,5vw,3rem)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Link href="/stay" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1.5rem', textDecoration: 'none' }}>
            ← NIKA STAY
          </Link>
          <div style={{ fontSize: 52, marginBottom: '0.5rem' }}>{t.icon}</div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '1rem' }}>
            {t.label}
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 520, marginBottom: '1rem' }}>{t.desc}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(224,112,56,0.1)', border: '1px solid rgba(224,112,56,0.3)', color: '#E07038' }}>
              {listings.length} logement{listings.length > 1 ? 's' : ''}
            </span>
            {hasDirect && (
              <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.3)', color: 'var(--teal)' }}>
                ✓ Réservation directe disponible
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Listings */}
      <div style={{ padding: 'clamp(2rem,5vw,3rem) 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
        {listings.length > 0 ? (
          <div style={{ gap: '1.2rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {listings.map((l) => {
              const isDirect = l.booking_type === 'direct' || l.booking_type === 'direct_or_booking';
              const isAffil = l.booking_type === 'booking_affil' || l.booking_type === 'homestay';
              const airbnbUrl = `https://www.airbnb.com/rooms/${l.airbnb_id}`;
              const icon = ICON_BY_TYPE[l.type] ?? '🏡';
              const isFr = l.country === 'France';

              return (
                <div key={l.slug} className="stay-card" style={{ background: isDirect ? 'rgba(14,168,120,0.03)' : 'var(--bg2)', border: `1px solid ${isDirect ? 'rgba(14,168,120,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Accent line */}
                  <div style={{ height: 3, background: isDirect ? 'linear-gradient(90deg, var(--teal), transparent)' : 'linear-gradient(90deg, #E07038, transparent)', flexShrink: 0 }} />

                  {/* Header */}
                  <div style={{ padding: '1rem 1.2rem 0.8rem', background: isDirect ? 'linear-gradient(135deg,#071A12,#0D2519)' : 'linear-gradient(135deg,#0A1628,#0E1F3A)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 32, lineHeight: 1, marginTop: 2 }}>{icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {isDirect && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', background: 'rgba(14,168,120,0.15)', border: '1px solid rgba(14,168,120,0.3)', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          Via NIKA
                        </span>
                      )}
                      {isFr && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--az)', background: 'rgba(0,148,212,0.1)', border: '1px solid rgba(0,148,212,0.25)', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          🇫🇷 France
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)' }}>WOW {l.wow_score}/25</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '1rem 1.2rem 1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Link href={`/stay/${l.slug}`} style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.25rem', lineHeight: 1.25, textDecoration: 'none', display: 'block' }}>
                      {l.name}
                    </Link>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginBottom: '0.4rem' }}>
                      📍 {l.city}{l.country !== l.city ? `, ${l.country}` : ''} · {l.capacity.guests} pers.
                    </div>
                    {l.rating > 0 && (
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--gold2)', marginBottom: '0.4rem' }}>
                        ⭐ {l.rating}/5 · {l.reviews_count.toLocaleString('fr-FR')} avis
                      </div>
                    )}
                    {l.badge && (
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold2)', marginBottom: '0.4rem' }}>
                        🏆 {l.badge}
                      </div>
                    )}
                    <div style={{ marginTop: 'auto', paddingTop: '0.8rem', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {l.price_ref ? (
                        <span style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: '#E07038' }}>
                          {l.price_ref}
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>Prix sur demande</span>
                      )}
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        <Link href={`/stay/${l.slug}`} style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: 'var(--td2)', background: 'var(--bg3)', border: '1px solid var(--bd2)', padding: '5px 10px', borderRadius: 5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          Fiche
                        </Link>
                        {isDirect ? (
                          <Link href={`/contact?logement=${encodeURIComponent(l.name)}&lieu=${encodeURIComponent(`${l.city}, ${l.country}`)}`} style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--teal)', padding: '5px 10px', borderRadius: 5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            Réserver →
                          </Link>
                        ) : isAffil ? (
                          <a href={airbnbUrl} target="_blank" rel="noopener noreferrer sponsored" style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: '#fff', background: '#FF5A5F', padding: '5px 10px', borderRadius: 5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            Airbnb →
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--fo)', color: 'var(--td3)', fontSize: 14 }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>{t.icon}</div>
            <p>Les listings <strong style={{ color: 'var(--td)' }}>{t.label}</strong> arrivent bientôt.</p>
            <Link href="/stay" style={{ display: 'inline-block', marginTop: '1rem', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--az)', textDecoration: 'none' }}>← Voir tous les logements</Link>
          </div>
        )}
      </div>

      {/* Retour */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.4rem 3rem', borderTop: '1px solid var(--bd)', paddingTop: '2rem' }}>
        <Link href="/stay" style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← Tous les logements insolites
        </Link>
      </div>
    </main>
  );
}
