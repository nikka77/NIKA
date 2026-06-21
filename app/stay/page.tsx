import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import TravelpayoutsSearch from '@/components/TravelpayoutsSearch';
import HeroSlideshow from './HeroSlideshow';
import WowFilter from './WowFilter';
import SmartSearch from '@/components/stay/SmartSearch';
import { visual } from '@/lib/visuals';
import wowData from '@/data/wow_listings.json';
import type { HeroSlide } from './HeroSlideshow';

// Use gallery-XX instead of cover.jpg when cover is wrong or gallery has better composition
const HERO_IMAGE_OVERRIDE: Record<string, string> = {
  'ovni-guadalupe-vallee-baja':              'gallery-01',  // cover=nuit étoilée, gallery-01=UFO crépuscule + vallée (MEILLEUR)
  'living-inn-dome-volcanique-hawaii':       'gallery-02',  // cover=intérieur bain, gallery-02=dômes volcaniques extérieur spectaculaire
  'maison-hobbit-saint-affrique-occitanie':  'gallery-01',  // cover=terrasse sans maison, gallery-01=façade hobbit+fenêtre ronde+bac
};

// Skip these from hero slideshow — cover est mauvaise et pas d'override disponible
const HERO_SKIP = new Set([
  'silo-missiles-bunker-atlas-f-roswell',    // cover = photo de soirée couple
  'sphere-rochers-joshua-tree-californie',   // cover = intérieur salon
  'earthship-taos-mesa-nouveau-mexique',     // cover = intérieur serre (meilleur en card qu'en hero plein écran)
]);

// Per-slug background-position for optimal subject framing
// NB : doublon de la map dans stay/[slug]/page.tsx — à extraire en constante partagée.
const HERO_OBJECT_POS: Record<string, string> = {
  'ovni-guadalupe-vallee-baja':                       '50% 72%', // aligné sur la page détail (corps vert + hublots + sol)
  'bubble-etoile-stargazing-agnes-victoria-australie':'50% 45%',
  'birdbox-fordefjord-view-forde-norvege':            '50% 50%',
  'grand-cheval-fjord-sunnfjord-norvege':             '50% 50%',
  'wee-nook-hobbit-hole-tennessee':                   '50% 55%',
  'cob-cottage-mayne-island-canada':                  '50% 50%',
  'sous-marin-jaune-nouvelle-zelande':                '50% 55%',
  'gawthornes-hut-top10-monde-mudgee-australie':      '50% 45%',
  'express-voiture-salon-14630-normandie':            '50% 55%',
  'naturhus-bio-hors-reseau-bralande-suede':          '50% 50%',
  'bloomhouse-austin-texas':                          '50% 40%',
  'maison-hobbit-saint-affrique-occitanie':           '50% 55%',
  'living-inn-dome-volcanique-hawaii':               '50% 45%',
  'grotte-nid2reve-savignac-perigord':               '50% 55%',
  'caboose-train-jacuzzi-eureka-springs':            '50% 40%',
  'birdbox-lotsbergskaara-lote-nordfjord-norvege':   '50% 48%',
  'peniche-arche-noe-somme-pont-remy':               '50% 45%',
};

// For WowFilter cards: use gallery image when cover is wrong
const CARD_IMAGE_OVERRIDE: Record<string, string | null> = {
  'silo-missiles-bunker-atlas-f-roswell':        'gallery-01',  // cover = photo de soirée couple
  'sphere-rochers-joshua-tree-californie':        'gallery-02',  // cover = intérieur salon → extérieur sphère
  'gite-du-sorcier-harry-potter-colmar-alsace':  'gallery-01',  // cover = citrouilles → chambre Slytherin
  'estiva-loft-hobbit-lapeyrugue-auvergne':      'gallery-05',  // cover = collage → façade hobbit de nuit illuminée
  'living-inn-dome-volcanique-hawaii':           'gallery-02',  // cover = intérieur bain → dômes volcaniques extérieur
  'maison-hobbit-saint-affrique-occitanie':      'gallery-01',  // cover = terrasse → façade hobbit avec fenêtre ronde
  'nid-dragon-toboggan-katana-villa-amed-bali':  'gallery-01',  // cover = coucher de soleil sombre → dragon statue + montagne Bali
};

function getCoverImage(slug: string): string | undefined {
  for (const ext of ['jpg', 'jpeg', 'png']) {
    const rel = path.join('public', 'images', 'wow', slug, `cover.${ext}`);
    if (fs.existsSync(path.join(process.cwd(), rel))) return `/images/wow/${slug}/cover.${ext}`;
  }
  return undefined;
}

function findImageFile(slug: string, base: string): string | undefined {
  for (const ext of ['jpg', 'jpeg', 'png']) {
    const rel = path.join('public', 'images', 'wow', slug, `${base}.${ext}`);
    if (fs.existsSync(path.join(process.cwd(), rel))) return `/images/wow/${slug}/${base}.${ext}`;
  }
  return undefined;
}

function getCardImage(slug: string): string | undefined {
  if (slug in CARD_IMAGE_OVERRIDE) {
    const override = CARD_IMAGE_OVERRIDE[slug];
    if (override === null) return undefined;
    return findImageFile(slug, override);
  }
  return getCoverImage(slug);
}

function getHeroImage(slug: string): string | undefined {
  const base = HERO_IMAGE_OVERRIDE[slug] ?? 'cover';
  return findImageFile(slug, base) ?? getCoverImage(slug);
}

export const metadata: Metadata = {
  title: 'Logement Insolite Monde entier — NIKA STAY',
  description: 'Bunkers, sous-marins, maisons hobbit, bulles transparentes, chambres sous-marines. 41 hébergements WOW sélectionnés par NIKA.',
  keywords: ['logement insolite', 'maison bulle location', 'chambre sous-marine', 'dormir dans un bunker', 'maison hobbit location', 'hébergement insolite monde'],
};

// WOW Exclusifs — 7 thèmes (grue-industrielle retirée : listing non importé)
const WOW_EXCLUSIFS = [
  { slug: 'silo-bunker',              icon: '☢️',  name: 'Bunker & Silo',        badge: '5/5', desc: 'Silos à missiles déclassifiés, bunkers WWII', from: 165, direct: true  },
  { slug: 'sous-marin',               icon: '🤿',  name: 'Sous-Marin',           badge: '5/5', desc: 'Le Sous-Marin Jaune des Beatles · Nouvelle-Zélande', from: 280, direct: true  },
  { slug: 'maison-hobbit',            icon: '🌿',  name: 'Maison Hobbit',        badge: '4/5', desc: 'Cob cottages sculptés · Earthships hors réseau', from: 120, direct: true  },
  { slug: 'tour-observation',         icon: '🦅',  name: 'Tour & Birdbox',       badge: '4/5', desc: "Birdbox fjords · Gawthorne's Hut Top 10 Monde", from: 155, direct: true  },
  { slug: 'bulle-transparente',       icon: '🫧',  name: 'Bulle & Dôme',        badge: '3/5', desc: 'Dômes transparents sous les étoiles',          from: 290, direct: true  },
  { slug: 'architecture-surrealiste', icon: '🌀',  name: 'Architecture insolite',badge: '4/5', desc: 'OVNI · Sphère dans les rochers · Bloomhouse',  from: 285, direct: true  },
  { slug: 'maison-terre',             icon: '🧱',  name: 'Maison en Terre',      badge: '4/5', desc: 'Grottes France · Earthship Taos · Naturhus',   from: 130, direct: true  },
];

// Coups de cœur NIKA — hero slideshow
// Seuil 22 pour inclure bubble/birdbox/hobbit. OVNI passe en premier (meilleure image).
// Listings avec mauvaises covers (photo de soirée, cartoon, intérieur) sont exclus.
const heroSlides: HeroSlide[] = wowData.listings
  .filter(l => l.wow_score >= 22 && !HERO_SKIP.has(l.slug))
  .sort((a, b) => {
    if (a.slug === 'ovni-guadalupe-vallee-baja') return -1;
    if (b.slug === 'ovni-guadalupe-vallee-baja') return 1;
    return b.wow_score - a.wow_score;
  })
  .map(l => ({
    slug: l.slug,
    name: l.name,
    city: l.city,
    country: l.country,
    type: l.type,
    wow_score: l.wow_score,
    rating: l.rating,
    booking_type: l.booking_type,
    tagline: ((l as unknown as { description_nika?: string }).description_nika ?? '').slice(0, 120) + '…',
    coverImage: getHeroImage(l.slug),
    objectPosition: HERO_OBJECT_POS[l.slug],
  }))
  .filter(s => !!s.coverImage);

// Full listing list for filter section — use getCardImage to handle bad covers
const listings = wowData.listings.map(l => ({
  slug: l.slug,
  name: l.name,
  city: l.city,
  country: l.country,
  type: l.type,
  wow_score: l.wow_score,
  rating: l.rating,
  booking_type: l.booking_type,
  price_per_night: (l as unknown as { price_per_night?: number }).price_per_night ?? 0,
  coverImage: getCardImage(l.slug),
}));

export default function StayPage() {
  return (
    <main>
      {/* ── HERO DIAPORAMA — Coups de cœur NIKA ───────────────────────── */}
      <HeroSlideshow slides={heroSlides} />

      {/* ── STATS BAR ─────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: '1.6rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {[
              { val: '41', label: 'Logements WOW' },
              { val: '10', label: 'Pays' },
              { val: '32', label: 'Résa directes' },
              { val: '4.95', label: 'Note moyenne' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', color: '#E07038', lineHeight: 1 }}>{val}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Booking.com', 'Expedia', 'Airbnb'].map(p => (
              <span key={p} style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(224,112,56,0.08)', border: '1px solid rgba(224,112,56,0.2)', color: '#E07038' }}>{p}</span>
            ))}
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(14,168,120,0.08)', border: '1px solid rgba(14,168,120,0.25)', color: 'var(--teal)' }}>Réservation directe</span>
          </div>
        </div>
      </div>

      {/* ── SMART SEARCH ─────────────────────────────────────────────── */}
      <div style={{ padding: 'clamp(1.5rem,3vw,2rem) 1.4rem', background: 'var(--bg)', borderBottom: '1px solid var(--bd)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', margin: '0 0 4px' }}>
              Trouver mes dates
            </h2>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', margin: 0 }}>
              Recherche les logements ayant N nuits consécutives disponibles
            </p>
          </div>
          <SmartSearch />
        </div>
      </div>

      {/* ── WOW EXCLUSIFS ─────────────────────────────────────────────── */}
      <div style={{ padding: 'clamp(2rem,4vw,3rem) 1.4rem', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '1.4rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>
              WOW Exclusifs
            </h2>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E07038', background: 'rgba(224,112,56,0.1)', border: '1px solid rgba(224,112,56,0.3)', borderRadius: 20, padding: '3px 10px' }}>
              7 thèmes
            </span>
          </div>

          {/* Horizontal scroll row */}
          <div style={{
            display: 'flex', gap: '0.75rem',
            overflowX: 'auto', paddingBottom: 6,
            scrollbarWidth: 'none',
          }}>
            {WOW_EXCLUSIFS.map(({ slug, icon, name, desc, from, direct, badge }) => (
              <Link
                key={slug}
                href={`/stay/theme/${slug}`}
                className="wow-card"
                style={{
                  textDecoration: 'none', flexShrink: 0,
                  width: 200,
                  display: 'flex', flexDirection: 'column',
                  background: direct ? 'linear-gradient(160deg,#071A12,#0D1E14)' : 'var(--bg2)',
                  border: `1px solid ${direct ? 'rgba(14,168,120,0.18)' : 'var(--bd)'}`,
                  borderRadius: 10, overflow: 'hidden',
                }}
              >
                <div style={{ height: 2, background: direct ? 'linear-gradient(90deg,var(--teal),transparent)' : 'linear-gradient(90deg,#E07038,transparent)' }} />
                <div style={{ padding: '1rem 1rem 0.7rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {visual('stay/themes', slug).poster
                      ? <img src={visual('stay/themes', slug).poster} alt={name} width={48} height={48} style={{ width: 48, height: 48, objectFit: 'contain', marginTop: -4, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }} />
                      : <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      {direct && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', background: 'rgba(14,168,120,0.12)', border: '1px solid rgba(14,168,120,0.28)', borderRadius: 20, padding: '2px 6px' }}>
                          Via NIKA
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 8, color: 'var(--td3)' }}>Rareté {badge}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', lineHeight: 1.2 }}>{name}</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', lineHeight: 1.4, flex: 1 }}>{desc}</div>
                  <div style={{ paddingTop: 8, borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>
                      dès <strong style={{ fontFamily: 'var(--fe)', fontSize: 14, fontStyle: 'italic', color: '#E07038' }}>{from}€</strong>
                    </span>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: direct ? 'var(--teal)' : '#E07038' }}>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── FILTER + LES 57 WOW ──────────────────────────────────────── */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', padding: 'clamp(2rem,4vw,3.5rem) 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '1.6rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>
              Les 41 WOW
            </h2>
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, color: 'var(--td3)' }}>
              sélection complète · cliquez sur un filtre
            </span>
          </div>
          <WowFilter listings={listings} />
        </div>
      </div>

      {/* ── COMPARER LES HÔTELS ─────────────────────────────────────── */}
      <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--bd)', padding: 'clamp(2rem,4vw,3.5rem) 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,3vw,34px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.4rem' }}>
            Comparer tous les hôtels
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '2rem' }}>
            Booking.com, Expedia, Hotels.com — meilleur prix garanti via Travelpayouts.
          </p>
          <TravelpayoutsSearch />
        </div>
      </div>
    </main>
  );
}
