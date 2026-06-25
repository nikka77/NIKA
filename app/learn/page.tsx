import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import Spin360 from '@/components/Spin360';
import DomainHero from '@/components/DomainHero';
import { visual } from '@/lib/visuals';

export const metadata: Metadata = {
  title: 'LEARN — Cours & Coaching Côte d\'Azur | NIKA',
  description: 'Formateurs locaux, cours de surf, langues, musique, sport et masterclass sur Nice, Antibes et Cannes. Apprenez avec les meilleurs de la Côte d\'Azur.',
  keywords: ['cours surf nice', 'coach sport côte d\'azur', 'cours langue nice', 'formateur antibes', 'masterclass cannes'],
};

const ACCENT = '#7B5CF0';

const LEARN_CATS = [
  { slug: 'sport', label: 'Sport & Fitness', icon: '💪' },
  { slug: 'langue', label: 'Langues', icon: '🌍' },
  { slug: 'musique', label: 'Musique', icon: '🎸' },
  { slug: 'cuisine', label: 'Cuisine', icon: '👨‍🍳' },
  { slug: 'code', label: 'Code & Tech', icon: '💻' },
  { slug: 'art', label: 'Arts & Design', icon: '🎨' },
  { slug: 'surf', label: 'Surf & Mer', icon: '🏄' },
  { slug: 'yoga', label: 'Yoga & Bien-être', icon: '🧘' },
  { slug: 'memoire', label: 'Mémoire', icon: '🧠' },
  { slug: 'psychologie', label: 'Psychologie', icon: '🛋️' },
  { slug: 'philosophie', label: 'Philosophie', icon: '🦉' },
  { slug: 'animaux', label: 'Animaux', icon: '🐾' },
  { slug: 'plantes', label: 'Plantes', icon: '🌱' },
  { slug: 'ecriture', label: 'Écriture', icon: '✍️' },
  { slug: 'photo', label: 'Photographie', icon: '📷' },
  { slug: 'danse', label: 'Danse', icon: '💃' },
  { slug: 'echecs', label: 'Échecs & jeux', icon: '♟️' },
  { slug: 'sciences', label: 'Sciences', icon: '🔬' },
  { slug: 'histoire', label: 'Histoire', icon: '🏛️' },
  { slug: 'finance', label: 'Finances perso', icon: '💰' },
  { slug: 'devperso', label: 'Dév. personnel', icon: '🌟' },
];

export default async function LearnPage() {
  const supabase = await createClient();
  const { data: pros } = supabase
    ? await supabase.from('pros').select('id, business_name, description, address, rating, verified').eq('domain', 'learn').eq('active', true).order('rating', { ascending: false }).limit(20)
    : { data: [] };

  const { data: listings } = supabase
    ? await supabase.from('listings').select('id, title, description, price, pros(id, business_name)').eq('available', true).in('pro_id',
        pros?.map((p: { id: string }) => p.id) || []
      ).limit(12)
    : { data: [] };

  return (
    <main>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #0D0820 0%, #150F35 60%, var(--bg) 100%)',
        borderBottom: '1px solid var(--bd)',
        padding: 'clamp(3rem,7vw,5.5rem) 1.4rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <DomainHero slug="learn" />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: ACCENT, marginBottom: '1rem',
          }}>
            📚 NIKA LEARN — Domaine 07
          </div>

          <h1 style={{
            fontFamily: 'var(--fe)',
            fontSize: 'clamp(44px,8vw,96px)',
            fontWeight: 900, fontStyle: 'italic',
            textTransform: 'uppercase', color: 'var(--td)',
            lineHeight: 0.88, marginBottom: '1.2rem',
          }}>
            Apprends<br />
            <span style={{ color: ACCENT }}>d&apos;un local</span>
          </h1>

          <p style={{
            fontFamily: 'var(--fo)',
            fontSize: 'clamp(14px,1.5vw,16px)',
            color: 'var(--td2)', maxWidth: 480, lineHeight: 1.7,
            marginBottom: '1.8rem',
          }}>
            Surf, cuisine niçoise, guitare, code — des cours et coachings
            par ceux qui vivent ici et savent vraiment.
          </p>

          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <a href="#cours" style={{
              fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '12px 26px', borderRadius: 3,
              background: ACCENT, color: '#fff', textDecoration: 'none',
            }}>
              Voir les cours →
            </a>
            <Link href="/pro/inscription?type=learn" style={{
              fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
              padding: '12px 22px', borderRadius: 3,
              border: '1px solid var(--bd2)', color: 'var(--td2)', textDecoration: 'none',
            }}>
              Devenir formateur
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--bd)', padding: '0.9rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { v: '08', l: 'Disciplines' },
            { v: '1:1', l: 'Cours particuliers' },
            { v: 'Local', l: 'Profs d\'ici' },
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
      <div id="cours" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(2rem,4vw,3rem) 1.4rem clamp(3rem,7vw,5rem)' }}>

        {/* Disciplines */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.92, marginBottom: '0.4rem' }}>
            Disciplines
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1.5rem' }}>
            Du line-up au clavier, il y a un prof pour ça
          </p>
          <div style={{ gap: '0.7rem' }} className="g-4 max-sm:grid-cols-2">
            {LEARN_CATS.map(c => (
              <a key={c.slug} href="#cours" className="dom-card" style={{
                background: 'var(--bg2)', border: '1px solid rgba(123,92,240,0.15)',
                borderRadius: 10, padding: '1.1rem', textAlign: 'center', textDecoration: 'none',
                ['--dc' as string]: ACCENT,
              }}>
                <div style={{ marginBottom: '0.4rem' }}>
                  <Spin360 emoji={c.icon} alt={c.label} accent={ACCENT} size={52} {...visual('learn/cats', c.slug)} />
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 600, color: 'var(--td2)' }}>{c.label}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Cours */}
        {listings && listings.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Cours disponibles</h2>
            <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {(listings as { id: string; title: string; description?: string; price?: number; pros: { id: string; business_name: string } | null }[]).map((item) => (
                <Link key={item.id} href={item.pros ? `/pro/${item.pros.id}` : '/learn'} className="dom-card" style={{
                  background: 'var(--bg2)', border: '1px solid rgba(123,92,240,0.15)',
                  borderRadius: 10, padding: '1.3rem', textDecoration: 'none',
                  ['--dc' as string]: ACCENT,
                }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700, color: 'var(--td)', marginBottom: '0.3rem' }}>{item.title}</div>
                  {item.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td2)', marginBottom: '0.6rem' }}>{item.description.slice(0, 60)}…</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {item.price && <span style={{ fontFamily: 'var(--fn)', fontSize: 22, color: ACCENT }}>{item.price}€</span>}
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{item.pros?.business_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Professeurs */}
        {pros && pros.length > 0 ? (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>Professeurs & Coaches</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {pros.map((pro: { id: string; business_name: string; description?: string; address?: string; rating: number; verified: boolean }) => (
                <Link key={pro.id} href={`/pro/${pro.id}`} className="dom-card" style={{
                  background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10,
                  padding: '1.4rem', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: '1rem', textDecoration: 'none', flexWrap: 'wrap',
                  ['--dc' as string]: ACCENT,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.3rem' }}>
                      <span style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', color: 'var(--td)', fontWeight: 700 }}>{pro.business_name}</span>
                      {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, color: 'var(--teal)', background: 'rgba(14,168,120,0.1)', border: '1px solid rgba(14,168,120,0.2)', borderRadius: 10, padding: '2px 7px' }}>✓</span>}
                    </div>
                    {pro.description && <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>{pro.description.slice(0, 90)}…</div>}
                    {pro.address && <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: '0.2rem' }}>📍 {pro.address}</div>}
                  </div>
                  {pro.rating > 0 && <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontStyle: 'italic', color: 'var(--gold2)', flexShrink: 0 }}>⭐ {pro.rating.toFixed(1)}</div>}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px dashed rgba(123,92,240,0.3)', borderRadius: 12, padding: '3.5rem 2rem', textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: 44, marginBottom: '0.8rem' }}>📚</div>
            <p style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', fontWeight: 700, color: 'var(--td)', marginBottom: '0.4rem' }}>Les formateurs arrivent</p>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Les premiers profils sont en cours de vérification.</p>
          </div>
        )}

        {/* CTA pro */}
        <div style={{
          borderRadius: 16, padding: 'clamp(1.8rem,4vw,2.6rem)',
          background: 'linear-gradient(135deg, rgba(123,92,240,0.14), rgba(123,92,240,0.04))',
          border: '1px solid rgba(123,92,240,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1.2rem',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.3rem' }}>
              Vous maîtrisez un savoir-faire ?
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', margin: 0 }}>
              Partagez-le : fixez vos tarifs, vos horaires, NIKA amène les élèves.
            </p>
          </div>
          <Link href="/pro/inscription?type=learn" style={{
            fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '13px 28px', borderRadius: 3, flexShrink: 0,
            background: ACCENT, color: '#fff', textDecoration: 'none',
          }}>
            Proposer mes cours →
          </Link>
        </div>
      </div>
    </main>
  );
}
