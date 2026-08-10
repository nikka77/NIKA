// app/learn/akasha/wanted/page.tsx — MOST WANTED : les primes One Piece en avis de recherche,
// triées par montant. La page la plus One Piece possible : parchemin, DEAD OR ALIVE, Berrys.
import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/site';
import { listBounties } from '@/lib/akasha/queries';

export const revalidate = 3600; // ISR 1 h

// La carte de partage était celle de la RACINE du site. Next fusionne les métadonnées champ par
// champ : cette page déclarait `title` et `description` mais pas `openGraph`, elle héritait donc
// EN ENTIER de l'`openGraph` d'app/layout.tsx. Mesuré en demandant la page le 10/08/2026 —
// og:title « NIKA — La super-app de la Côte d'Azur », og:description « VTC, food, logements
// insolites, bateaux… » (data/audits/chantier3-sonde-fixes-2026-08-10T18-51-36-383Z.json). Le
// suffixe de marque reste dans <title>, que Google lit, et sort de og:title, que lisent WhatsApp,
// Discord et X — même convention que /learn/akasha, /u/[slug] et /c/[slug].
const OG_TITRE = 'Most Wanted — les primes de One Piece';
const DESCRIPTION =
  'Le classement des primes One Piece : Empereurs, Supernovæ et pirates du Nouveau Monde triés par montant en Berrys — en avis de recherche.';

export const metadata: Metadata = {
  title: 'Most Wanted — les primes de One Piece | AKASHA · NIKA LEARN',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/learn/akasha/wanted` },
  openGraph: {
    title: OG_TITRE, description: DESCRIPTION, url: `${SITE_URL}/learn/akasha/wanted`,
    siteName: 'AKASHA — le registre', locale: 'fr_FR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: OG_TITRE, description: DESCRIPTION },
};

const ACCENT = '#D63C3C';

function fmtBerrys(v: number): string {
  return new Intl.NumberFormat('fr-FR').format(v);
}

export default async function WantedPage() {
  const wanted = await listBounties(60);

  return (
    <main>
      <div style={{ background: `linear-gradient(180deg, ${ACCENT}26 0%, ${ACCENT}0A 50%, var(--bg) 100%)`, borderBottom: '1px solid var(--bd)', padding: 'clamp(2.2rem,5vw,3.4rem) 1.4rem 1.6rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Link href="/learn/akasha/u/one-piece" style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)', textDecoration: 'none' }}>
            ← Univers One Piece
          </Link>
          <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, margin: '1rem 0 0.5rem' }}>
            🏴‍☠️ Avis de recherche · {wanted.length} têtes mises à prix
          </div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(40px,8vw,84px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.88, margin: 0 }}>
            Most Wanted
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 'clamp(13px,1.5vw,15.5px)', color: 'var(--td2)', maxWidth: 520, lineHeight: 1.65, margin: '0.9rem 0 0' }}>
            Le Gouvernement Mondial met à prix. La Grand Line fournit les têtes — classées du monstre au chanceux, en Berrys sonnants.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(1.4rem,3vw,2rem) 1.4rem clamp(3rem,7vw,5rem)' }}>
        <div className="g-4" style={{ display: 'grid', gap: 14 }}>
          {wanted.map((w, i) => (
            <Link
              key={w.slug}
              href={`/learn/akasha/${w.slug}`}
              className="dom-card"
              style={{
                textDecoration: 'none',
                background: 'linear-gradient(175deg, #E8DCC0 0%, #D9C9A3 100%)',
                border: '3px double #8B7355',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 26px -14px rgba(0,0,0,0.8)',
                position: 'relative',
              }}
            >
              {/* rang */}
              <span style={{ position: 'absolute', top: 6, left: 8, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15, color: i < 3 ? '#B4231F' : '#6B5638', zIndex: 2 }}>
                #{i + 1}
              </span>
              <div style={{ textAlign: 'center', paddingTop: 9, fontFamily: 'var(--fe)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.12em', fontSize: 17, color: '#3B2F1C' }}>
                WANTED
              </div>
              <div style={{ margin: '6px 10px 0', height: 118, border: '2px solid #8B7355', background: '#C9B688', position: 'relative', overflow: 'hidden' }}>
                {w.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.image_url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', filter: 'sepia(0.45) contrast(1.02)' }} />
                )}
              </div>
              <div style={{ textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.2em', color: '#6B5638', marginTop: 5 }}>
                DEAD OR ALIVE
              </div>
              <div style={{ textAlign: 'center', fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 15.5, color: '#2E2414', lineHeight: 1.05, padding: '2px 8px 0' }}>
                {w.name}
              </div>
              <div style={{ textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 12.5, fontWeight: 700, color: '#B4231F', padding: '3px 6px 10px' }}>
                ฿ {fmtBerrys(w.bountyValue)}
              </div>
            </Link>
          ))}
        </div>

        {wanted.length === 0 && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td3)', textAlign: 'center', padding: '3rem 0' }}>
            Aucune prime enregistrée — le Gouvernement Mondial fait une pause.
          </p>
        )}
      </div>
    </main>
  );
}
