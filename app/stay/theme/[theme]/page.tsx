import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

type Props = { params: Promise<{ theme: string }> };

const THEME_DATA: Record<string, { label: string; icon: string; desc: string; listings: { title: string; loc: string; price: number; guests: number; url: string; icon: string }[] }> = {
  'maison-flottante': {
    label: 'Maison flottante', icon: '🚤',
    desc: 'Dormez sur l\'eau dans des maisons flottantes uniques, du lac de Côme aux fjords norvégiens.',
    listings: [
      { title: 'Péniche de charme — Paris', loc: 'Paris, France', price: 140, guests: 4, url: 'https://www.airbnb.fr', icon: '⛵' },
      { title: 'Floating House — Amsterdam', loc: 'Amsterdam, Pays-Bas', price: 195, guests: 2, url: 'https://www.airbnb.fr', icon: '🚢' },
      { title: 'Houseboat — Lac de Côme', loc: 'Lac de Côme, Italie', price: 220, guests: 6, url: 'https://www.airbnb.fr', icon: '🛥️' },
      { title: 'Villa flottante — Baie d\'Halong', loc: 'Ha Long, Vietnam', price: 85, guests: 2, url: 'https://www.booking.com', icon: '⛵' },
      { title: 'Ponton Polynésien', loc: 'Bora Bora, Polynésie', price: 480, guests: 2, url: 'https://www.airbnb.fr', icon: '🌊' },
      { title: 'Arche flottante — Fjords', loc: 'Bergen, Norvège', price: 260, guests: 4, url: 'https://www.airbnb.fr', icon: '🏔️' },
    ],
  },
  'avion': {
    label: 'Avion reconverti', icon: '✈️',
    desc: 'Des Boeing aux Concorde, dormez dans des avions transformés en hôtels insolites.',
    listings: [
      { title: 'Boeing 747 — Oregon', loc: 'Portland, USA', price: 310, guests: 2, url: 'https://www.airbnb.fr', icon: '✈️' },
      { title: 'Jumbo Stay — Aéroport Stockholm', loc: 'Stockholm, Suède', price: 95, guests: 2, url: 'https://www.booking.com', icon: '🛫' },
      { title: 'Vickers Viscount Suite', loc: 'Cotswolds, UK', price: 275, guests: 2, url: 'https://www.airbnb.fr', icon: '✈️' },
      { title: 'Air Normandy — Normandie', loc: 'Normandie, France', price: 180, guests: 4, url: 'https://www.airbnb.fr', icon: '🛩️' },
      { title: 'Mystère 20 Business Jet', loc: 'Dordogne, France', price: 390, guests: 2, url: 'https://www.airbnb.fr', icon: '🛸' },
      { title: 'Cessna Chalet', loc: 'Cape Town, Afrique du Sud', price: 145, guests: 2, url: 'https://www.airbnb.fr', icon: '✈️' },
    ],
  },
  'sous-marin': {
    label: 'Sous-marin', icon: '🤿',
    desc: 'Découvrez la vie sous-marine depuis votre chambre avec vue sur les fonds marins.',
    listings: [
      { title: 'Utter Inn — sous les eaux', loc: 'Lac Mälaren, Suède', price: 595, guests: 2, url: 'https://www.airbnb.fr', icon: '🌊' },
      { title: 'Muraka — Conrad Maldives', loc: 'Rangali, Maldives', price: 8500, guests: 2, url: 'https://www.booking.com', icon: '🐟' },
      { title: 'Underwater Room — Zanzibar', loc: 'Zanzibar, Tanzanie', price: 900, guests: 2, url: 'https://www.airbnb.fr', icon: '🦈' },
      { title: 'Sub Sea Studio — Norvège', loc: 'Ryfylke, Norvège', price: 1200, guests: 4, url: 'https://www.booking.com', icon: '🌊' },
    ],
  },
  'cabane-arbres': {
    label: 'Cabane dans les arbres', icon: '🌲',
    desc: 'Perchés dans les forêts du monde, vivez une expérience hors du temps.',
    listings: [
      { title: 'Cabane des Pins — Ardèche', loc: 'Ardèche, France', price: 195, guests: 2, url: 'https://www.airbnb.fr', icon: '🌲' },
      { title: 'TreeHouse Lodge — Costa Rica', loc: 'Limon, Costa Rica', price: 165, guests: 4, url: 'https://www.airbnb.fr', icon: '🌿' },
      { title: 'Cabane Spa — Vosges', loc: 'Vosges, France', price: 280, guests: 2, url: 'https://www.airbnb.fr', icon: '🌳' },
      { title: 'Perched Tent — Kenya', loc: 'Masaï Mara, Kenya', price: 450, guests: 2, url: 'https://www.booking.com', icon: '🦁' },
      { title: 'Tree Pod — Bali', loc: 'Ubud, Bali', price: 120, guests: 2, url: 'https://www.airbnb.fr', icon: '🌴' },
      { title: 'Nid d\'Aigle — Pyrénées', loc: 'Pyrénées-Atlantiques, France', price: 210, guests: 4, url: 'https://www.airbnb.fr', icon: '🦅' },
    ],
  },
  'grotte': {
    label: 'Grotte / Cave', icon: '🏔️',
    desc: 'Des grottes aménagées en suites luxueuses, de Cappadoce aux îles grecques.',
    listings: [
      { title: 'Suite Troglodyte — Cappadoce', loc: 'Göreme, Turquie', price: 220, guests: 2, url: 'https://www.airbnb.fr', icon: '🏔️' },
      { title: 'Cave House — Santorin', loc: 'Oia, Grèce', price: 380, guests: 2, url: 'https://www.booking.com', icon: '🏛️' },
      { title: 'Grotte Luberon', loc: 'Lubéron, France', price: 175, guests: 4, url: 'https://www.airbnb.fr', icon: '🌿' },
      { title: 'The Hobbit House', loc: 'Matamata, Nouvelle-Zélande', price: 290, guests: 2, url: 'https://www.airbnb.fr', icon: '🧙' },
    ],
  },
  'fusee': {
    label: 'Fusée / Espace', icon: '🚀',
    desc: 'L\'hébergement du futur. Capsules et simulateurs pour une nuit hors atmosphère.',
    listings: [
      { title: 'Space Suite — Autonomous Space Agency', loc: 'Nevada, USA', price: 650, guests: 2, url: 'https://www.airbnb.fr', icon: '🚀' },
      { title: 'Capsule Hotel — Tokyo 2049', loc: 'Tokyo, Japon', price: 110, guests: 1, url: 'https://www.booking.com', icon: '🛸' },
      { title: 'Rocket Pod — Space Village', loc: 'Kiruna, Suède', price: 520, guests: 2, url: 'https://www.airbnb.fr', icon: '🌌' },
    ],
  },
  'igloo': {
    label: 'Igloo', icon: '❄️',
    desc: 'Dormez sous les aurores boréales dans un igloo chauffé en Laponie ou en Islande.',
    listings: [
      { title: 'Arctic Igloo Village', loc: 'Saariselkä, Finlande', price: 490, guests: 2, url: 'https://www.booking.com', icon: '❄️' },
      { title: 'Glass Igloo — Northern Lights', loc: 'Rovaniemi, Finlande', price: 620, guests: 2, url: 'https://www.airbnb.fr', icon: '🌌' },
      { title: 'Ice Hotel Suite', loc: 'Jukkasjärvi, Suède', price: 550, guests: 2, url: 'https://www.booking.com', icon: '🧊' },
      { title: 'Bubble Igloo — Islande', loc: 'Reykjavik, Islande', price: 480, guests: 2, url: 'https://www.airbnb.fr', icon: '🔮' },
    ],
  },
  'chateau': {
    label: 'Château', icon: '🏰',
    desc: 'Châteaux médiévaux, manoirs et forteresses transformés en hôtels de caractère.',
    listings: [
      { title: 'Château de la Loire — Suite Royale', loc: 'Touraine, France', price: 420, guests: 2, url: 'https://www.airbnb.fr', icon: '🏰' },
      { title: 'Castle Stay — Écosse', loc: 'Highlands, Écosse', price: 680, guests: 6, url: 'https://www.airbnb.fr', icon: '⚔️' },
      { title: 'Parador Médiéval', loc: 'Tolède, Espagne', price: 195, guests: 2, url: 'https://www.booking.com', icon: '🏯' },
      { title: 'Manoir Provençal', loc: 'Lubéron, France', price: 380, guests: 8, url: 'https://www.airbnb.fr', icon: '🌸' },
      { title: 'Château Basque — Tour Privée', loc: 'Pays Basque, France', price: 290, guests: 4, url: 'https://www.airbnb.fr', icon: '🏰' },
      { title: 'Forteresse Corse', loc: 'Bonifacio, Corse', price: 340, guests: 4, url: 'https://www.airbnb.fr', icon: '⚓' },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { theme } = await params;
  const t = THEME_DATA[theme];
  const label = t?.label || theme;
  return {
    title: `${label} — Logement insolite NIKA STAY`,
    description: t?.desc || `Hébergements insolites thème ${label}. Sélection mondiale curatée par NIKA.`,
    keywords: [`${label} hébergement`, `${label} airbnb`, 'logement insolite'],
  };
}

export async function generateStaticParams() {
  return Object.keys(THEME_DATA).map(theme => ({ theme }));
}

export default async function StayThemePage({ params }: Props) {
  const { theme } = await params;
  const t = THEME_DATA[theme] || { label: theme, icon: '🏡', desc: '', listings: [] };
  const supabase = await createClient();
  const { data: dbListings } = supabase
    ? await supabase.from('listings').select('*').eq('domain', 'stay').contains('metadata', { theme }).eq('available', true).limit(12)
    : { data: null };

  const hasDB = dbListings && dbListings.length > 0;
  const curated = t.listings;

  return (
    <main>
      <div style={{ background: 'linear-gradient(180deg, #0E1F3A 0%, var(--bg) 100%)', borderBottom: '1px solid var(--bd)', padding: '5rem 1.4rem 3rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Link href="/stay" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--td3)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1.5rem', textDecoration: 'none' }}>
            ← NIKA STAY
          </Link>
          <div style={{ fontSize: 52, marginBottom: '0.5rem' }}>{t.icon}</div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '1rem' }}>
            {t.label}
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 520 }}>{t.desc}</p>
        </div>
      </div>

      <div style={{ padding: '3rem 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
        {hasDB ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }} className="max-md:grid-cols-2 max-sm:grid-cols-1">
            {dbListings.map((l) => (
              <div key={l.id} style={{ background: 'var(--bg2)', border: '1px solid rgba(224,112,56,0.15)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ height: 160, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{t.icon}</div>
                <div style={{ padding: '1.2rem' }}>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.5rem' }}>{l.title}</div>
                  {l.price && <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: '#E07038' }}>{l.price}€ / nuit</div>}
                  {l.affil_url && (
                    <a href={l.affil_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '0.8rem', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: '#fff', background: '#FF5A5F', padding: '6px 14px', borderRadius: 4 }}>
                      Voir sur Airbnb →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : curated.length > 0 ? (
          <>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '1.6rem' }}>
              Sélection curatée NIKA · {curated.length} hébergements
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.2rem' }} className="max-md:grid-cols-2 max-sm:grid-cols-1">
              {curated.map((l, i) => (
                <div key={i} className="stay-card" style={{ background: 'var(--bg2)', border: '1px solid rgba(224,112,56,0.12)', borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  <div style={{ height: 140, background: 'linear-gradient(135deg, #0E1F3A, #162840)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, borderBottom: '1px solid var(--bd)' }}>
                    {l.icon}
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.3rem', lineHeight: 1.2 }}>{l.title}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginBottom: '0.7rem' }}>📍 {l.loc} · {l.guests} pers. max</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: '#E07038' }}>{l.price}€<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--td3)', marginLeft: 3 }}>/nuit</span></span>
                      <a href={l.url} target="_blank" rel="noopener noreferrer sponsored" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color: '#fff', background: '#FF5A5F', padding: '5px 12px', borderRadius: 4, textDecoration: 'none' }}>
                        Réserver →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '2rem', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', textAlign: 'center' }}>
              Sélection affiliée Airbnb & Booking.com — commissions NIKA &lt; 5%
            </p>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--fo)', color: 'var(--td3)', fontSize: 14 }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>{t.icon}</div>
            <p>Les listings <strong style={{ color: 'var(--td)' }}>{t.label}</strong> arrivent bientôt.</p>
          </div>
        )}
      </div>
    </main>
  );
}
