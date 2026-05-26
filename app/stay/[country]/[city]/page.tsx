import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ country: string; city: string }> };

const CITY_LABELS: Record<string, string> = {
  'nice': 'Nice',
  'cote-d-azur': "Côte d'Azur",
  'islande': 'Islande',
  'maldives': 'Maldives',
  'alpes': 'Alpes',
  'bali': 'Bali',
  'france': 'France',
  'monde': 'Monde',
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
  const { data: listings } = supabase
    ? await supabase.from('listings').select('*, pro:pros(business_name, lat, lng, verified)').eq('domain', 'stay').eq('available', true).limit(12)
    : { data: null };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Logements insolites ${cityLabel}`,
    description: `Sélection d'hébergements insolites à ${cityLabel}`,
    url: `https://nika.fr/stay/${country}/${city}`,
    numberOfItems: listings?.length ?? 0,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <main>
        <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', padding: '5rem 1.4rem 3rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
          {listings && listings.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}
              className="max-md:grid-cols-2 max-sm:grid-cols-1">
              {listings.map((listing) => (
                <div key={listing.id} style={{ background: 'var(--bg2)', border: '1px solid rgba(224,112,56,0.15)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                  <div style={{ height: 180, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                    🏡
                  </div>
                  <div style={{ padding: '1.2rem' }}>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.5rem' }}>
                      {listing.title}
                    </div>
                    {listing.description && (
                      <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.5, marginBottom: '0.8rem' }}>
                        {listing.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {listing.price && (
                        <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: '#E07038' }}>
                          {listing.price}€ / nuit
                        </span>
                      )}
                      {listing.affil_url && (
                        <a
                          href={listing.affil_url}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: '#fff', background: '#FF5A5F', padding: '6px 14px', borderRadius: 4 }}
                        >
                          Airbnb →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--fo)', color: 'var(--td3)', fontSize: 14 }}>
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>🏗️</div>
              <p>Les listings STAY pour <strong style={{ color: 'var(--td)' }}>{cityLabel}</strong> arrivent bientôt.</p>
              <p style={{ marginTop: '0.5rem' }}>Rejoins la liste d&apos;attente pour être le premier informé.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
