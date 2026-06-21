import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import Spin360 from '@/components/Spin360';
import DomainHero from '@/components/DomainHero';
import { visual } from '@/lib/visuals';

export const metadata: Metadata = {
  title: 'RENT — Location de Matériel Côte d\'Azur | NIKA',
  description: 'Location de vélos, scooters, matériel de surf, camping et équipement photo sur la Côte d\'Azur. Disponible immédiatement sans agence.',
  keywords: ['location vélo nice', 'location scooter côte d\'azur', 'location matériel sport antibes'],
};

const ACCENT = '#5A88B0';

const RENT_CATS = [
  { slug: 'sport', label: 'Sport & Loisirs', icon: '⛷️', desc: 'Vélos, paddle, ski' },
  { slug: 'bricolage', label: 'Bricolage & Outils', icon: '🔧', desc: 'Perceuse, ponceuse' },
  { slug: 'photo', label: 'Photo & Vidéo', icon: '📸', desc: 'Boîtiers, drones' },
  { slug: 'camping', label: 'Camping', icon: '🏕️', desc: 'Tentes, glacières' },
  { slug: 'materiel', label: 'Matériel Event', icon: '🎪', desc: 'Sono, lumières' },
  { slug: 'vehicule', label: 'Véhicules', icon: '🚐', desc: 'Vans, remorques' },
];

export default async function RentPage() {
  const supabase = await createClient();
  const { data: listings } = supabase
    ? await supabase.from('listings').select('*, pros(id, business_name, verified)').eq('available', true).in('pro_id',
        (await supabase.from('pros').select('id').eq('domain', 'rent').eq('active', true)).data?.map((p: { id: string }) => p.id) || []
      ).order('created_at', { ascending: false }).limit(20)
    : { data: [] };

  const { data: pros } = supabase
    ? await supabase.from('pros').select('id, business_name, description, rating, verified').eq('domain', 'rent').eq('active', true).order('rating', { ascending: false }).limit(10)
    : { data: [] };

  return (
    <main>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #07101E 0%, #0A1830 60%, var(--bg) 100%)',
        borderBottom: '1px solid var(--bd)',
        padding: 'clamp(3rem,7vw,5.5rem) 1.4rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <DomainHero slug="rent" />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: ACCENT, marginBottom: '1rem',
          }}>
            📦 NIKA RENT — Domaine 05
          </div>

          <h1 style={{
            fontFamily: 'var(--fe)',
            fontSize: 'clamp(44px,8vw,96px)',
            fontWeight: 900, fontStyle: 'italic',
            textTransform: 'uppercase', color: 'var(--td)',
            lineHeight: 0.88, marginBottom: '1.2rem',
          }}>
            Louez tout,<br />
            <span style={{ color: ACCENT }}>sans agence</span>
          </h1>

          <p style={{
            fontFamily: 'var(--fo)',
            fontSize: 'clamp(14px,1.5vw,16px)',
            color: 'var(--td2)', maxWidth: 480, lineHeight: 1.7,
            marginBottom: '1.8rem',
          }}>
            Vélo, paddle, perceuse, sono, drone — le matériel des locaux,
            à la journée, de Nice à Cannes.
          </p>

          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <a href="#catalogue" style={{
              fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '12px 26px', borderRadius: 3,
              background: ACCENT, color: '#fff', textDecoration: 'none',
            }}>
              Parcourir →
            </a>
            <Link href="/pro/inscription?type=rent" style={{
              fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
              padding: '12px 22px', borderRadius: 3,
              border: '1px solid var(--bd2)', color: 'var(--td2)', textDecoration: 'none',
            }}>
              Proposer mon matériel
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--bd)', padding: '0.9rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { v: '06', l: 'Catégories' },
            { v: '24h', l: 'Réservation rapide' },
            { v: '€/jour', l: 'Tarification claire' },
          ].map(stat => (
            <div key={stat.l}>
              <div style={{ fontFamily: 'var(--fn)', fontSize: 20, color: ACCENT, lineHeight: 1 }}>
                {stat.v}
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                {stat.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENU ───────────────────────────────────────────── */}
      <div id="catalogue" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(2rem,4vw,3rem) 1.4rem clamp(3rem,7vw,5rem)' }}>

        {/* Catégories */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.92, marginBottom: '0.4rem' }}>
            Catégories
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1.5rem' }}>
            Du week-end paddle au chantier du dimanche
          </p>
          <div style={{ gap: '0.7rem' }} className="g-3 max-sm:grid-cols-2">
            {/* TODO(filtre cat.) : vrai filtrage quand les listings porteront un champ `category`.
                En attendant, on scrolle honnêtement vers le catalogue (pas de lien mort ?cat=). */}
            {RENT_CATS.map(c => (
              <a key={c.slug} href="#catalogue" className="dom-card" style={{
                background: 'var(--bg2)', border: '1px solid rgba(90,136,176,0.15)',
                borderRadius: 10, padding: '1.2rem', textAlign: 'center', textDecoration: 'none',
                ['--dc' as string]: ACCENT,
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <Spin360 emoji={c.icon} alt={c.label} accent={ACCENT} size={52} {...visual('rent/cats', c.slug)} />
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)', marginBottom: '0.2rem' }}>{c.label}</div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>{c.desc}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Listings */}
        {listings && listings.length > 0 ? (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Articles disponibles</h2>
            <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {listings.map((item: { id: string; title: string; description?: string; price?: number; pros: { id: string; business_name: string; verified: boolean } | null }) => (
                <Link key={item.id} href={`/rent/${item.id}`} className="dom-card" style={{
                  background: 'var(--bg2)', border: '1px solid rgba(90,136,176,0.2)',
                  borderRadius: 10, padding: '1.3rem', textDecoration: 'none',
                  ['--dc' as string]: ACCENT,
                }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.3rem' }}>{item.title}</div>
                  {item.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)', marginBottom: '0.6rem' }}>{item.description.slice(0, 60)}…</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {item.price && <span style={{ fontFamily: 'var(--fn)', fontSize: 22, color: ACCENT }}>{item.price}€<span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>/j</span></span>}
                    {item.pros?.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px' }}>✓</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px dashed rgba(90,136,176,0.3)', borderRadius: 12, padding: '3.5rem 2rem', textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: 44, marginBottom: '0.8rem' }}>📦</div>
            <p style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', fontWeight: 700, color: 'var(--td)', marginBottom: '0.4rem' }}>Le catalogue arrive</p>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Les premiers loueurs préparent leurs annonces.</p>
          </div>
        )}

        {/* Loueurs */}
        {pros && pros.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Loueurs</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {pros.map((pro: { id: string; business_name: string; description?: string; rating: number; verified: boolean }) => (
                <Link key={pro.id} href={`/pro/${pro.id}`} className="dom-card" style={{
                  background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10,
                  padding: '1.2rem', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', textDecoration: 'none', gap: '1rem',
                  ['--dc' as string]: ACCENT,
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                      {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>✓</span>}
                    </div>
                    {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginTop: '0.2rem' }}>{pro.description.slice(0, 70)}…</div>}
                  </div>
                  {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic', color: 'var(--gold2)', flexShrink: 0 }}>⭐ {pro.rating.toFixed(1)}</div>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA pro */}
        <div style={{
          borderRadius: 16, padding: 'clamp(1.8rem,4vw,2.6rem)',
          background: 'linear-gradient(135deg, rgba(90,136,176,0.14), rgba(90,136,176,0.04))',
          border: '1px solid rgba(90,136,176,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1.2rem',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.3rem' }}>
              Du matériel qui dort ?
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', margin: 0 }}>
              Rentabilisez-le : publiez une annonce en 5 minutes, NIKA s&apos;occupe de la visibilité.
            </p>
          </div>
          <Link href="/pro/inscription?type=rent" style={{
            fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '13px 28px', borderRadius: 3, flexShrink: 0,
            background: ACCENT, color: '#fff', textDecoration: 'none',
          }}>
            Proposer mon matériel →
          </Link>
        </div>
      </div>
    </main>
  );
}
