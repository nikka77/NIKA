// app/tools/numeros/page.tsx — Numéros utiles Côte d'Azur (statique, liens tel:).
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Numéros utiles Côte d\'Azur | NIKA Tools',
  description: 'Urgences et numéros essentiels à Nice, Antibes et Cannes : SAMU, pompiers, police, secours en mer, médecins de garde.',
};

const CY = '#12B8CC';
type N = { label: string; num: string; note?: string };
const GROUPS: { title: string; emoji: string; items: N[] }[] = [
  { title: 'Urgences', emoji: '🚨', items: [
    { label: 'Urgences européennes', num: '112', note: 'depuis tout téléphone' },
    { label: 'SAMU', num: '15' },
    { label: 'Police secours', num: '17' },
    { label: 'Pompiers', num: '18' },
    { label: 'Urgence par SMS (sourds/malentendants)', num: '114' },
    { label: 'Secours en mer (CROSS Med)', num: '196' },
  ] },
  { title: 'Santé', emoji: '⚕️', items: [
    { label: 'SOS Médecins', num: '3624' },
    { label: 'Pharmacie de garde', num: '3237' },
    { label: 'Centre antipoison (Marseille)', num: '0800 59 59 59' },
    { label: 'SOS Mains / urgences main', num: '15' },
  ] },
  { title: 'Pratique', emoji: '📌', items: [
    { label: 'Allô Mairie Nice', num: '3906' },
    { label: 'Dépannage électricité (Enedis)', num: '09 72 67 50 06' },
    { label: 'Urgence gaz (GRDF)', num: '0800 47 33 33' },
    { label: 'Objets trouvés (Nice)', num: '3906' },
  ] },
];

export default function NumerosPage() {
  return (
    <main style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#04181C,var(--bg) 40%)' }}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: 'clamp(1.4rem,4vw,2.4rem) 1.1rem 4rem' }}>
        <Link href="/tools" style={{ fontFamily: 'var(--fo)', fontSize: 12, color: CY, textDecoration: 'none' }}>← Outils</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '0.8rem 0 0.4rem' }}>
          <span style={{ fontSize: 30 }} aria-hidden>🆘</span>
          <h1 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>Numéros utiles</h1>
        </div>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', margin: '0 0 1.4rem' }}>Les essentiels sur la Côte d&apos;Azur. Touche un numéro pour appeler.</p>

        {GROUPS.map(g => (
          <section key={g.title} style={{ marginBottom: '1.6rem' }}>
            <h2 style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td2)', margin: '0 0 0.7rem' }}>{g.emoji} {g.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {g.items.map(it => (
                <a key={it.label + it.num} href={`tel:${it.num.replace(/\s/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--bd2)', background: 'rgba(255,255,255,0.04)', textDecoration: 'none' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 13.5, fontWeight: 600, color: 'var(--td)' }}>{it.label}</span>
                    {it.note && <span style={{ display: 'block', fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', marginTop: 1 }}>{it.note}</span>}
                  </span>
                  <span style={{ fontFamily: 'var(--fn)', fontSize: 20, color: CY, letterSpacing: '0.02em', flexShrink: 0 }}>{it.num}</span>
                  <span aria-hidden style={{ fontSize: 15, color: CY }}>📞</span>
                </a>
              ))}
            </div>
          </section>
        ))}
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', textAlign: 'center' }}>En cas de danger immédiat, composez le 112.</p>
      </div>
    </main>
  );
}
