import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

type Props = { params: Promise<{ country: string; city: string }> };

const CITY_LABELS: Record<string, string> = {
  'nice': 'Nice', 'cote-d-azur': "Côte d'Azur", 'islande': 'Islande',
  'maldives': 'Maldives', 'alpes': 'Alpes', 'bali': 'Bali', 'france': 'France', 'monde': 'Monde',
};

const CITY_LISTINGS: Record<string, { title: string; type: string; price: number; guests: number; url: string; icon: string }[]> = {
  nice: [
    { title: 'Villa Belle Époque vue mer', type: 'Maison entière · Promenade', price: 580, guests: 8, url: 'https://www.airbnb.fr', icon: '🏛️' },
    { title: 'Penthouse panoramique', type: 'Appartement · Colline de Cimiez', price: 320, guests: 4, url: 'https://www.airbnb.fr', icon: '🌆' },
    { title: 'Mas Niçois — Jardin secret', type: 'Maison insolite · Arrière-pays', price: 195, guests: 6, url: 'https://www.airbnb.fr', icon: '🌿' },
    { title: 'Suite Baroque — Vieux-Nice', type: 'Chambre d\'hôte · Centre historique', price: 145, guests: 2, url: 'https://www.booking.com', icon: '🎨' },
    { title: 'Cabane flottante — Port', type: 'Logement sur l\'eau · Port de Nice', price: 280, guests: 2, url: 'https://www.airbnb.fr', icon: '⛵' },
    { title: 'Appartement Art Déco', type: 'Appartement · Cours Saleya', price: 180, guests: 4, url: 'https://www.airbnb.fr', icon: '🏠' },
  ],
  'cote-d-azur': [
    { title: 'Yacht à quai — Cannes', type: 'Bateau · Vieux-Port de Cannes', price: 620, guests: 6, url: 'https://www.airbnb.fr', icon: '🛥️' },
    { title: 'Villa Riviera — Cap Ferrat', type: 'Villa · Cap Ferrat', price: 1200, guests: 10, url: 'https://www.airbnb.fr', icon: '🌊' },
    { title: 'Bastide Provençale — Antibes', type: 'Maison insolite · Antibes', price: 380, guests: 6, url: 'https://www.airbnb.fr', icon: '🌸' },
    { title: 'Studio cave — Éze Village', type: 'Grotte aménagée · Éze', price: 190, guests: 2, url: 'https://www.airbnb.fr', icon: '🏔️' },
    { title: 'Péniche Méditerranée', type: 'Bateau · Mandelieu', price: 290, guests: 4, url: 'https://www.booking.com', icon: '⚓' },
    { title: 'Mas des Oliviers — Vence', type: 'Domaine · Vence', price: 450, guests: 8, url: 'https://www.airbnb.fr', icon: '🫒' },
  ],
  islande: [
    { title: 'Glass Cabin — Aurores boréales', type: 'Cabane vitrine · Nord Islande', price: 540, guests: 2, url: 'https://www.airbnb.fr', icon: '🌌' },
    { title: 'Géodôme volcanique', type: 'Dôme panoramique · Reykjavik', price: 380, guests: 2, url: 'https://www.airbnb.fr', icon: '🌋' },
    { title: 'Tiny House — Péninsule de Snæfellsnes', type: 'Maison minimaliste', price: 220, guests: 2, url: 'https://www.airbnb.fr', icon: '🏔️' },
    { title: 'Igloo chauffé — Lac Mývatn', type: 'Igloo · Nord Islande', price: 490, guests: 2, url: 'https://www.booking.com', icon: '❄️' },
  ],
  maldives: [
    { title: 'Overwater Bungalow — Atoll Baa', type: 'Bungalow sur pilotis · Baa Atoll', price: 850, guests: 2, url: 'https://www.booking.com', icon: '🌴' },
    { title: 'Water Villa Privée — Faa\'fu', type: 'Villa sur l\'eau · Faafu Atoll', price: 1200, guests: 2, url: 'https://www.airbnb.fr', icon: '🌊' },
    { title: 'Suite sous-marine — Rangali', type: 'Chambre sous-marine · Conrad', price: 8500, guests: 2, url: 'https://www.booking.com', icon: '🐟' },
    { title: 'Cabane de pêcheur — Local', type: 'Expérience authentique · Malé', price: 95, guests: 2, url: 'https://www.airbnb.fr', icon: '⚓' },
  ],
  alpes: [
    { title: 'Chalet panoramique — Chamonix', type: 'Chalet · Mont-Blanc', price: 680, guests: 8, url: 'https://www.airbnb.fr', icon: '🏔️' },
    { title: 'Cabane perchée — Savoie', type: 'Cabane dans les arbres · Savoie', price: 245, guests: 2, url: 'https://www.airbnb.fr', icon: '🌲' },
    { title: 'Igloo de luxe — Megève', type: 'Igloo vitré · Megève', price: 520, guests: 2, url: 'https://www.booking.com', icon: '❄️' },
    { title: 'Chalet berger insolite', type: 'Bergerie aménagée · Haute-Savoie', price: 195, guests: 4, url: 'https://www.airbnb.fr', icon: '🐑' },
    { title: 'Suite Glacière — Les Arcs', type: 'Appartement panoramique · Les Arcs', price: 380, guests: 6, url: 'https://www.airbnb.fr', icon: '⛷️' },
  ],
  bali: [
    { title: 'Villa Jungle — Ubud', type: 'Villa avec piscine · Ubud', price: 185, guests: 4, url: 'https://www.airbnb.fr', icon: '🌿' },
    { title: 'Tree Pod — Bali', type: 'Logement perché · Ubud', price: 120, guests: 2, url: 'https://www.airbnb.fr', icon: '🌴' },
    { title: 'Villa Rizière — Tegallalang', type: 'Villa vue rizières · Tegallalang', price: 220, guests: 4, url: 'https://www.airbnb.fr', icon: '🍃' },
    { title: 'Glamping Volcan', type: 'Tente luxe · Mont Batur', price: 145, guests: 2, url: 'https://www.booking.com', icon: '🌋' },
    { title: 'Beach Villa — Seminyak', type: 'Villa sur la plage · Seminyak', price: 340, guests: 6, url: 'https://www.airbnb.fr', icon: '🌊' },
    { title: 'Cabane flottante · Sanur', type: 'Logement sur l\'eau · Sanur', price: 165, guests: 2, url: 'https://www.airbnb.fr', icon: '⛵' },
  ],
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cityLabel = CITY_LABELS[city] || city;
  return {
    title: `Logement insolite ${cityLabel} — NIKA STAY`,
    description: `Hébergements insolites à ${cityLabel} : maison flottante, avion, cabane, sous-marin. Curatés par NIKA, affiliés Airbnb & Booking.`,
    keywords: [`logement insolite ${cityLabel}`, `hébergement insolite ${cityLabel}`, 'airbnb insolite'],
  };
}

export async function generateStaticParams() {
  return [
    { country: 'france', city: 'nice' },
    { country: 'france', city: 'cote-d-azur' },
    { country: 'france', city: 'alpes' },
    { country: 'monde', city: 'islande' },
    { country: 'monde', city: 'maldives' },
    { country: 'monde', city: 'bali' },
  ];
}

export default async function StayCityPage({ params }: Props) {
  const { country, city } = await params;
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
    url: `https://nika.fr/stay/${country}/${city}`,
    numberOfItems: hasDB ? dbListings.length : curated.length,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <main>
        <div style={{ background: 'linear-gradient(180deg, #0E1F3A 0%, var(--bg) 100%)', borderBottom: '1px solid var(--bd)', padding: '5rem 1.4rem 3rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Link href="/stay" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1.5rem', textDecoration: 'none' }}>
              ← NIKA STAY
            </Link>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E07038', marginBottom: '0.6rem' }}>
              NIKA STAY · {country.toUpperCase()}
            </p>
            <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '1rem' }}>
              Logement insolite<br /><span style={{ color: '#E07038' }}>{cityLabel}</span>
            </h1>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 520 }}>
              Les hébergements les plus uniques à {cityLabel} : maison flottante, avion reconverti, cabane dans les arbres, sous-marin, grotte. Réservation via Airbnb & Booking.com.
            </p>
          </div>
        </div>

        <div style={{ padding: '3rem 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
          {hasDB ? (
            <div style={{ gap: '1.5rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {dbListings.map((listing) => (
                <div key={listing.id} style={{ background: 'var(--bg2)', border: '1px solid rgba(224,112,56,0.15)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ height: 180, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🏡</div>
                  <div style={{ padding: '1.2rem' }}>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.5rem' }}>{listing.title}</div>
                    {listing.price && <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: '#E07038' }}>{listing.price}€ / nuit</span>}
                    {listing.affil_url && <a href={listing.affil_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '0.8rem', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: '#fff', background: '#FF5A5F', padding: '6px 14px', borderRadius: 4 }}>Airbnb →</a>}
                  </div>
                </div>
              ))}
            </div>
          ) : curated.length > 0 ? (
            <>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '1.6rem' }}>
                Sélection curatée NIKA · {curated.length} hébergements
              </p>
              <div style={{ gap: '1.2rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
                {curated.map((l, i) => (
                  <div key={i} style={{ background: 'var(--bg2)', border: '1px solid rgba(224,112,56,0.12)', borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                    <div style={{ height: 140, background: 'linear-gradient(135deg, #0E1F3A, #162840)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, borderBottom: '1px solid var(--bd)' }}>
                      {l.icon}
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.3rem', lineHeight: 1.2 }}>{l.title}</div>
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginBottom: '0.7rem' }}>📍 {l.type} · {l.guests} pers.</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: '#E07038' }}>{l.price}€<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--td3)', marginLeft: 3 }}>/nuit</span></span>
                        <a href={l.url} target="_blank" rel="noopener noreferrer sponsored" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: '#fff', background: '#FF5A5F', padding: '5px 12px', borderRadius: 4, textDecoration: 'none' }}>Réserver →</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '2rem', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', textAlign: 'center' }}>Sélection affiliée Airbnb & Booking.com — commissions NIKA &lt; 5%</p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--fo)', color: 'var(--td3)', fontSize: 14 }}>
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>🏗️</div>
              <p>Les listings STAY pour <strong style={{ color: 'var(--td)' }}>{cityLabel}</strong> arrivent bientôt.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
