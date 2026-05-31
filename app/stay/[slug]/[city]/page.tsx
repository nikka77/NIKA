import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { tpAffilLink } from '@/lib/travelpayouts';
import TravelpayoutsSearch from '@/components/TravelpayoutsSearch';

type Props = { params: Promise<{ slug: string; city: string }> };

const CITY_LABELS: Record<string, string> = {
  'nice': 'Nice', 'cote-d-azur': "Côte d'Azur", 'islande': 'Islande',
  'maldives': 'Maldives', 'alpes': 'Alpes', 'bali': 'Bali', 'france': 'France', 'monde': 'Monde',
};

const CITY_LISTINGS: Record<string, { title: string; type: string; price: number; guests: number; url: string; icon: string }[]> = {
  nice: [
    { title: 'Villa Belle Époque vue mer', type: 'Maison entière · Promenade', price: 580, guests: 8, url: 'https://www.booking.com', icon: '🏛️' },
    { title: 'Penthouse panoramique', type: 'Appartement · Colline de Cimiez', price: 320, guests: 4, url: 'https://www.booking.com', icon: '🌆' },
    { title: 'Mas Niçois — Jardin secret', type: 'Maison insolite · Arrière-pays', price: 195, guests: 6, url: 'https://www.booking.com', icon: '🌿' },
    { title: 'Suite Baroque — Vieux-Nice', type: 'Chambre d\'hôte · Centre historique', price: 145, guests: 2, url: 'https://www.booking.com', icon: '🎨' },
    { title: 'Cabane flottante — Port', type: 'Logement sur l\'eau · Port de Nice', price: 280, guests: 2, url: 'https://www.booking.com', icon: '⛵' },
    { title: 'Appartement Art Déco', type: 'Appartement · Cours Saleya', price: 180, guests: 4, url: 'https://www.booking.com', icon: '🏠' },
  ],
  'cote-d-azur': [
    { title: 'Yacht à quai — Cannes', type: 'Bateau · Vieux-Port de Cannes', price: 620, guests: 6, url: 'https://www.booking.com', icon: '🛥️' },
    { title: 'Villa Riviera — Cap Ferrat', type: 'Villa · Cap Ferrat', price: 1200, guests: 10, url: 'https://www.booking.com', icon: '🌊' },
    { title: 'Bastide Provençale — Antibes', type: 'Maison insolite · Antibes', price: 380, guests: 6, url: 'https://www.booking.com', icon: '🌸' },
    { title: 'Studio cave — Éze Village', type: 'Grotte aménagée · Éze', price: 190, guests: 2, url: 'https://www.booking.com', icon: '🏔️' },
    { title: 'Péniche Méditerranée', type: 'Bateau · Mandelieu', price: 290, guests: 4, url: 'https://www.booking.com', icon: '⚓' },
    { title: 'Mas des Oliviers — Vence', type: 'Domaine · Vence', price: 450, guests: 8, url: 'https://www.booking.com', icon: '🫒' },
  ],
  islande: [
    { title: 'Glass Cabin — Aurores boréales', type: 'Cabane vitrine · Nord Islande', price: 540, guests: 2, url: 'https://www.booking.com', icon: '🌌' },
    { title: 'Géodôme volcanique', type: 'Dôme panoramique · Reykjavik', price: 380, guests: 2, url: 'https://www.booking.com', icon: '🌋' },
    { title: 'Tiny House — Péninsule de Snæfellsnes', type: 'Maison minimaliste', price: 220, guests: 2, url: 'https://www.booking.com', icon: '🏔️' },
    { title: 'Igloo chauffé — Lac Mývatn', type: 'Igloo · Nord Islande', price: 490, guests: 2, url: 'https://www.booking.com', icon: '❄️' },
  ],
  maldives: [
    { title: 'Overwater Bungalow — Atoll Baa', type: 'Bungalow sur pilotis · Baa Atoll', price: 850, guests: 2, url: 'https://www.booking.com', icon: '🌴' },
    { title: 'Water Villa Privée — Faa\'fu', type: 'Villa sur l\'eau · Faafu Atoll', price: 1200, guests: 2, url: 'https://www.booking.com', icon: '🌊' },
    { title: 'Suite sous-marine — Rangali', type: 'Chambre sous-marine · Conrad', price: 8500, guests: 2, url: 'https://www.booking.com', icon: '🐟' },
    { title: 'Cabane de pêcheur — Local', type: 'Expérience authentique · Malé', price: 95, guests: 2, url: 'https://www.booking.com', icon: '⚓' },
  ],
  alpes: [
    { title: 'Chalet panoramique — Chamonix', type: 'Chalet · Mont-Blanc', price: 680, guests: 8, url: 'https://www.booking.com', icon: '🏔️' },
    { title: 'Cabane perchée — Savoie', type: 'Cabane dans les arbres · Savoie', price: 245, guests: 2, url: 'https://www.booking.com', icon: '🌲' },
    { title: 'Igloo de luxe — Megève', type: 'Igloo vitré · Megève', price: 520, guests: 2, url: 'https://www.booking.com', icon: '❄️' },
    { title: 'Chalet berger insolite', type: 'Bergerie aménagée · Haute-Savoie', price: 195, guests: 4, url: 'https://www.booking.com', icon: '🐑' },
    { title: 'Suite Glacière — Les Arcs', type: 'Appartement panoramique · Les Arcs', price: 380, guests: 6, url: 'https://www.booking.com', icon: '⛷️' },
  ],
  bali: [
    { title: 'Villa Jungle — Ubud', type: 'Villa avec piscine · Ubud', price: 185, guests: 4, url: 'https://www.booking.com', icon: '🌿' },
    { title: 'Tree Pod — Bali', type: 'Logement perché · Ubud', price: 120, guests: 2, url: 'https://www.booking.com', icon: '🌴' },
    { title: 'Villa Rizière — Tegallalang', type: 'Villa vue rizières · Tegallalang', price: 220, guests: 4, url: 'https://www.booking.com', icon: '🍃' },
    { title: 'Glamping Volcan', type: 'Tente luxe · Mont Batur', price: 145, guests: 2, url: 'https://www.booking.com', icon: '🌋' },
    { title: 'Beach Villa — Seminyak', type: 'Villa sur la plage · Seminyak', price: 340, guests: 6, url: 'https://www.booking.com', icon: '🌊' },
    { title: 'Cabane flottante · Sanur', type: 'Logement sur l\'eau · Sanur', price: 165, guests: 2, url: 'https://www.booking.com', icon: '⛵' },
  ],
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cityLabel = CITY_LABELS[city] || city;
  return {
    title: `Logement insolite ${cityLabel} — NIKA STAY`,
    description: `Hébergements insolites à ${cityLabel} : maison flottante, avion, cabane, sous-marin. Curatés par NIKA, via Booking.com & Expedia.`,
    keywords: [`logement insolite ${cityLabel}`, `hébergement insolite ${cityLabel}`, 'hébergement insolite booking'],
  };
}

export async function generateStaticParams() {
  return [
    { slug: 'france', city: 'nice' },
    { slug: 'france', city: 'cote-d-azur' },
    { slug: 'france', city: 'alpes' },
    { slug: 'monde', city: 'islande' },
    { slug: 'monde', city: 'maldives' },
    { slug: 'monde', city: 'bali' },
  ];
}

export default async function StayCityPage({ params }: Props) {
  const { slug, city } = await params;
  const cityLabel = CITY_LABELS[city] || city;
  const supabase = await createClient();
  const { data: dbListings } = supabase
    ? await supabase.from('listings').select('*, pro:pros(business_name, lat, lng, verified)').eq('domain', 'stay').eq('available', true).limit(12)
    : { data: null };

  const hasDB = dbListings && dbListings.length > 0;
  const curated = CITY_LISTINGS[city] || [];

  const structuredData = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: `Logements insolites ${cityLabel}`,
    description: `Sélection d'hébergements insolites à ${cityLabel}`,
    url: `https://nika.fr/stay/${slug}/${city}`,
    numberOfItems: hasDB ? dbListings.length : curated.length,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <main>
        <div style={{ background: 'linear-gradient(180deg, #0E1F3A 0%, var(--bg) 100%)', borderBottom: '1px solid var(--bd)', padding: 'clamp(3rem,8vw,5rem) 1.4rem clamp(2rem,5vw,3rem)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Link href="/stay" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1.5rem', textDecoration: 'none' }}>
              ← NIKA STAY
            </Link>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E07038', marginBottom: '0.6rem' }}>
              NIKA STAY · {slug.toUpperCase()}
            </p>
            <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '1rem' }}>
              Logement insolite<br /><span style={{ color: '#E07038' }}>{cityLabel}</span>
            </h1>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 520 }}>
              Les hébergements les plus uniques à {cityLabel} : maison flottante, avion reconverti, cabane dans les arbres, sous-marin, grotte. Via Booking.com, Expedia & Travelpayouts.
            </p>
          </div>
        </div>

        <div style={{ padding: 'clamp(2rem,5vw,3rem) 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
          {hasDB ? (
            <div style={{ gap: '1.5rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {dbListings.map((listing) => (
                <div key={listing.id} style={{ background: 'var(--bg2)', border: '1px solid rgba(224,112,56,0.15)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ height: 180, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🏡</div>
                  <div style={{ padding: '1.2rem' }}>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.5rem' }}>{listing.title}</div>
                    {listing.price && <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: '#E07038' }}>{listing.price}€ / nuit</span>}
                    {listing.affil_url && <a href={tpAffilLink(listing.affil_url)} target="_blank" rel="noopener noreferrer sponsored" style={{ display: 'inline-block', marginTop: '0.8rem', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: '#fff', background: '#E07038', padding: '6px 14px', borderRadius: 4 }}>Réserver →</a>}
                  </div>
                </div>
              ))}
            </div>
          ) : curated.length > 0 ? (
            <>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '2rem' }}>
                Sélection curatée NIKA · {curated.length} hébergements
              </p>
              <div style={{ gap: '1.2rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
                {curated.map((l, i) => (
                  <div key={i} style={{ background: 'var(--bg2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 3, background: 'linear-gradient(90deg, #E07038, transparent)', flexShrink: 0 }} />
                    <div style={{ padding: '1rem 1.2rem 0.8rem', background: 'linear-gradient(135deg, #0A1628 0%, #0E1F3A 100%)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 34, lineHeight: 1, marginTop: 2 }}>{l.icon}</span>
                    </div>
                    <div style={{ padding: '1rem 1.2rem 1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.25rem', lineHeight: 1.25 }}>{l.title}</div>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginBottom: '0.5rem' }}>📍 {l.type} · {l.guests} pers.</div>
                      <div style={{ marginTop: 'auto', paddingTop: '0.8rem', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: '#E07038', lineHeight: 1 }}>{l.price}€<span style={{ fontSize: 10, fontWeight: 400, fontStyle: 'normal', color: 'var(--td3)', marginLeft: 2 }}>/nuit</span></span>
                        <a href={tpAffilLink(l.url, cityLabel)} target="_blank" rel="noopener noreferrer sponsored" style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: '#fff', background: '#E07038', padding: '6px 12px', borderRadius: 5, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Réserver →</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E07038', display: 'inline-block' }} />
                  Via Travelpayouts · Booking.com · Expedia · Hotels.com
                </span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--fo)', color: 'var(--td3)', fontSize: 14 }}>
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>🏗️</div>
              <p>Les listings STAY pour <strong style={{ color: 'var(--td)' }}>{cityLabel}</strong> arrivent bientôt.</p>
            </div>
          )}

          {/* Travelpayouts hotel search */}
          <div style={{ marginTop: '3rem', paddingTop: '3rem', borderTop: '1px solid var(--bd)' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 24, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
              Comparer tous les hôtels à {cityLabel}
            </h2>
            <TravelpayoutsSearch />
          </div>
        </div>
      </main>
    </>
  );
}
