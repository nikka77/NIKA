import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dépannage auto Nice — Intervention rapide | NIKA AUTO',
  description: 'Dépanneurs certifiés NIKA à Nice et Côte d\'Azur. ETA garanti, prise en charge immédiate, géolocalisation temps réel.',
};

export default async function DepannagePage() {
  const supabase = await createClient();
  const { data: pros } = supabase
    ? await supabase.from('pros').select('*').eq('domain', 'auto').eq('active', true).eq('verified', true).order('rating', { ascending: false })
    : { data: null };

  const urgenceServices = [
    { icon: '🔋', title: 'Batterie déchargée', desc: 'Démarrage assisté ou remplacement batterie sur place', eta: '15 min', color: '#0094D4' },
    { icon: '🔑', title: 'Clés enfermées', desc: 'Ouverture de porte sans casse, toutes marques', eta: '20 min', color: '#D4A017' },
    { icon: '⛽', title: 'Panne sèche', desc: 'Livraison carburant directement à votre véhicule', eta: '25 min', color: '#E07038' },
    { icon: '🛞', title: 'Crevaison', desc: 'Changement de roue ou montage pneu de secours', eta: '20 min', color: '#0EA878' },
    { icon: '🔧', title: 'Panne moteur', desc: 'Diagnostic OBD2, dépannage ou remorquage', eta: '30 min', color: '#D44B24' },
    { icon: '🚛', title: 'Remorquage', desc: 'Transport vers garage de votre choix', eta: '40 min', color: '#7B5CF0' },
  ];

  return (
    <main>
      {/* SOS Hero */}
      <div style={{ background: 'linear-gradient(135deg, #050C17 0%, #0A1628 100%)', borderBottom: '1px solid var(--bd)', padding: '5rem 1.4rem 4rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #0094D4, #00C2FF)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
            <div>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0094D4', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0EA878', boxShadow: '0 0 6px #0EA878', display: 'inline-block', animation: 'ndp 2s ease-in-out infinite' }} />
                Disponible 24h/24 — 7j/7
              </p>
              <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(48px,8vw,96px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.9, marginBottom: '1rem' }}>
                Dépannage<br /><span style={{ color: '#0094D4' }}>SOS</span>
              </h1>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 16, color: 'var(--td2)', maxWidth: 480, lineHeight: 1.7 }}>
                Dépanneurs certifiés NIKA disponibles en temps réel. Intervention garantie sous 30 minutes sur Nice et la Côte d&apos;Azur.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
              <button style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '16px 36px', borderRadius: 6, background: '#D44B24', color: '#fff', boxShadow: '0 0 40px rgba(212,75,36,0.4)', animation: 'fping 2.5s ease-out infinite', cursor: 'pointer' }}>
                🆘 SOS Dépannage
              </button>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', textAlign: 'center' }}>ETA moyen : 25 minutes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Services urgence */}
      <div style={{ padding: '4rem 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem' }}>Types d&apos;intervention</p>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
          On gère tout
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }} className="max-md:grid-cols-2 max-sm:grid-cols-1">
          {urgenceServices.map(({ icon, title, desc, eta, color }) => (
            <div key={title} style={{ background: 'var(--bg2)', border: `1px solid ${color}25`, borderRadius: 10, padding: '1.5rem', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
              <div style={{ fontSize: 32, marginBottom: '0.8rem' }}>{icon}</div>
              <h3 style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.4rem' }}>{title}</h3>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5, marginBottom: '0.8rem' }}>{desc}</p>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 5 }}>
                ⏱ ETA {eta}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pros certifiés */}
      {pros && pros.length > 0 ? (
        <div style={{ padding: '0 1.4rem 4rem', maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '2rem' }}>
            Dépanneurs disponibles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }} className="max-sm:grid-cols-1">
            {pros.map((pro: { id: string; business_name: string; verified: boolean; rating: number; review_count: number; description?: string; phone?: string; address?: string }) => (
              <Link key={pro.id} href={`/pro/${pro.id}`} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.5rem', transition: 'border-color 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.7rem' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.3rem' }}>{pro.business_name}</div>
                    {pro.verified && <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(14,168,120,0.1)', color: 'var(--teal)', border: '1px solid rgba(14,168,120,0.2)' }}>✓ Certifié</span>}
                  </div>
                  {pro.rating > 0 && <span style={{ fontFamily: 'var(--fe)', fontSize: 16, fontStyle: 'italic', color: 'var(--gold2)' }}>⭐ {pro.rating.toFixed(1)}</span>}
                </div>
                {pro.description && <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.5, marginBottom: '0.8rem' }}>{pro.description}</p>}
                {pro.phone && <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: '#0094D4' }}>📞 {pro.phone}</div>}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '2rem 1.4rem 4rem', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '3rem' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>🔧</div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '1.5rem' }}>Aucun dépanneur certifié visible pour l&apos;instant (bêta).</p>
            <Link href="/pro/inscription?domain=auto" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '11px 24px', borderRadius: 3, background: '#0094D4', color: '#fff', display: 'inline-block' }}>
              Rejoindre en tant que dépanneur →
            </Link>
          </div>
        </div>
      )}

      {/* CTA devenir pro */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', padding: '4rem 1.4rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Tu es dépanneur ?
        </h2>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', maxWidth: 480, margin: '0 auto 1.5rem', lineHeight: 1.7 }}>
          Reçois des demandes géolocalisées, gère ta disponibilité par SMS, développe ton activité sur la Côte d&apos;Azur.
        </p>
        <Link href="/pro/inscription?domain=auto" style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 30px', borderRadius: 3, background: '#0094D4', color: '#fff', boxShadow: '0 0 28px rgba(0,148,212,0.3)', display: 'inline-block' }}>
          Rejoindre le réseau →
        </Link>
      </div>
    </main>
  );
}
