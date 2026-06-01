import Link from 'next/link';

const DOMAIN_LINKS = [
  { href: '/food',  label: '🍽️ Alimentation' },
  { href: '/auto',  label: '🚗 Auto & VTC' },
  { href: '/stay',  label: '🏡 Logement insolite' },
  { href: '/azur',  label: '🛥️ Mer & Bateaux' },
  { href: '/rent',  label: '📦 Location matériel' },
  { href: '/serv',  label: '🔧 Services' },
  { href: '/learn', label: '📚 Compétences' },
  { href: '/sec',   label: '🔒 Sécurité' },
  { href: '/news',  label: '📡 News' },
];

const PLATFORM_LINKS = [
  { href: '/#carte',    label: 'Carte interactive' },
  { href: '/#token',    label: 'Token $NIKA' },
  { href: '/#onboarding', label: 'Comment ça marche' },
  { href: '/pro',       label: 'Devenir partenaire' },
  { href: '/pro/register', label: 'Référencer mon commerce' },
];

const ABOUT_LINKS = [
  { href: '/about',   label: 'Notre histoire' },
  { href: '/press',   label: 'Presse' },
  { href: '/contact', label: 'Contact' },
  { href: '/support', label: 'Support' },
];

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg)', borderTop: '1px solid var(--bd)', padding: '3.5rem 1.4rem 2rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ gap: '2.5rem', marginBottom: '2.5rem' }}
          className="g-footer max-md:grid-cols-2 max-sm:grid-cols-1">
          <div>
            <div style={{ fontFamily: 'var(--fn)', fontSize: 28, letterSpacing: '0.1em', color: 'var(--td2)', marginBottom: '0.7rem' }}>
              NIKA
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', lineHeight: 1.6, maxWidth: 220, marginBottom: '1rem' }}>
              Le companion app de la vraie vie. Nice d&apos;abord, le monde ensuite.
            </p>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
              Nice · Antibes · Cannes
            </div>
          </div>

          <FooterCol title="Domaines" links={DOMAIN_LINKS} />
          <FooterCol title="Plateforme" links={PLATFORM_LINKS} />
          <FooterCol title="À propos" links={ABOUT_LINKS} />
        </div>

        <div style={{
          borderTop: '1px solid var(--bd)', paddingTop: '1.4rem',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem',
        }}>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>
            © 2025 NIKA — Tous droits réservés. NIKA est une plateforme intermédiaire.
          </span>
          <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
            {[
              { href: '/mentions-legales', label: 'Mentions légales' },
              { href: '/cgu', label: 'CGU' },
              { href: '/confidentialite', label: 'Confidentialité' },
              { href: '/cookies', label: 'Cookies' },
              { href: '/affilies', label: 'Affiliés' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', transition: 'color 0.2s' }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.9rem' }}>
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {links.map(({ href, label }) => (
          <Link key={href} href={href} style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)', transition: 'color 0.2s' }}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
