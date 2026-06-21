import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import DomainHero from '@/components/DomainHero';
import FoodModule from '@/components/home/FoodModule';
import NightProviderCard from '@/components/food/NightProviderCard';
import { getFoodPros, getFeaturedEstablishments, getDirectoryEstablishments } from '@/lib/food';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FOOD — Restaurants & Livraison Côte d\'Azur | NIKA',
  description: 'Restaurants, pizzerias, boulangeries, food trucks et sushis sur Nice, Antibes et Cannes. Commande, Flash Deals et livraison via NIKA.',
  keywords: ['restaurant nice', 'livraison nice', 'food truck côte d\'azur', 'pizzeria antibes', 'sushi cannes'],
};

const ACCENT = '#D4A017';

export default async function FoodPage() {
  const supabase = await createClient();

  const foodPros = await getFoodPros();
  // 2 chemins : widget « Commander » = enseignes mises en avant ; Établissements = annuaire complet.
  const [featuredPros, directoryPros] = await Promise.all([getFeaturedEstablishments(), getDirectoryEstablishments()]);

  // NIKKA Food — prestataires de nuit
  const { data: foodProviders } = supabase
    ? await supabase.from('food_providers').select('id, slug, name, description, city, opens_at, closes_at, instagram').eq('active', true)
    : { data: [] };

  const today = new Date().toISOString().split('T')[0];
  const providerIds = (foodProviders || []).map((p: { id: string }) => p.id);
  const { data: tonightSessions } = providerIds.length > 0 && supabase
    ? await supabase.from('food_sessions').select('provider_id, status').eq('date', today).in('provider_id', providerIds)
    : { data: [] };

  const sessionByProvider: Record<string, string> = {};
  for (const s of (tonightSessions || [])) {
    sessionByProvider[(s as { provider_id: string; status: string }).provider_id] = (s as { provider_id: string; status: string }).status;
  }

  const { data: deals } = supabase
    ? await supabase.from('flash_deals').select('*, pros(id, business_name)').eq('active', true).gt('expires_at', new Date().toISOString()).limit(6)
    : { data: [] };

  const openTonight = Object.values(sessionByProvider).filter(s => s === 'open').length;

  return (
    <main>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #170F02 0%, #221705 60%, var(--bg) 100%)',
        borderBottom: '1px solid var(--bd)',
        padding: 'clamp(3rem,7vw,5.5rem) 1.4rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <DomainHero slug="food" />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: ACCENT, marginBottom: '1rem',
          }}>
            🍽️ NIKA FOOD — Domaine 01
          </div>

          <h1 style={{
            fontFamily: 'var(--fe)',
            fontSize: 'clamp(44px,8vw,96px)',
            fontWeight: 900, fontStyle: 'italic',
            textTransform: 'uppercase', color: 'var(--td)',
            lineHeight: 0.88, marginBottom: '1.2rem',
          }}>
            La Côte se met<br />
            <span style={{ color: ACCENT }}>à table</span>
          </h1>

          <p style={{
            fontFamily: 'var(--fo)',
            fontSize: 'clamp(14px,1.5vw,16px)',
            color: 'var(--td2)', maxWidth: 480, lineHeight: 1.7,
            marginBottom: '1.8rem',
          }}>
            Restaurants, food de nuit, flash deals — de la socca niçoise
            aux saveurs des Comores, livré chez vous.
          </p>

          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <a href="#commander" style={{
              fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '12px 26px', borderRadius: 3,
              background: ACCENT, color: '#1a1200', textDecoration: 'none',
            }}>
              🌙 Commander ce soir →
            </a>
            <Link href="/pro/inscription?type=food" style={{
              fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700,
              padding: '12px 22px', borderRadius: 3,
              border: '1px solid var(--bd2)', color: 'var(--td2)', textDecoration: 'none',
            }}>
              Inscrire mon établissement
            </Link>
          </div>
        </div>
      </div>

      {/* ── MODULE COMMANDE (roulette mode + pros) ────────────── */}
      <div id="commander" style={{ borderBottom: '1px solid var(--bd)', padding: 'clamp(1.6rem,4vw,2.6rem) 1.4rem', background: 'linear-gradient(180deg, var(--bg) 0%, #140d02 100%)', scrollMarginTop: 64 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,3vw,32px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '0.2rem' }}>
            🌙 Food de nuit — commander
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1.3rem' }}>
            Choisis ton mode, puis ton enseigne. Livraison le soir — Nice et alentours.
          </p>
          <FoodModule pros={foodPros} nightPros={featuredPros} />
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--bd)', padding: '0.9rem 1.4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { v: '08', l: 'Catégories' },
            { v: openTonight > 0 ? `${openTonight} ouvert${openTonight > 1 ? 's' : ''}` : '🌙', l: 'Food de nuit ce soir' },
            { v: deals?.length ? `${deals.length} live` : '⚡', l: 'Flash deals' },
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
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(2rem,4vw,3rem) 1.4rem clamp(3rem,7vw,5rem)' }}>

        {/* Grille « Catégories » retirée : redondante avec le filtre Catégorie de l'annuaire Établissements. */}
        {/* Food de nuit : couvert par le module « Commander » plus haut (#commander). */}

        {/* Flash Deals */}
        {deals && deals.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1.2rem' }}>
              ⚡ Flash Deals
            </h2>
            <div style={{ gap: '1rem' }} className="g-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {deals.map((deal: { id: string; title: string; discount_type: string; discount_value: number; expires_at: string; pros: { id: string; business_name: string } | null }) => {
                const disc = deal.discount_type === 'percent' ? `-${deal.discount_value}%` : deal.discount_type === 'fixed' ? `-${deal.discount_value}€` : 'OFFERT';
                return (
                  <Link key={deal.id} href={deal.pros ? `/food/${deal.pros.id}` : '/food'} className="dom-card" style={{
                    background: 'var(--bg2)', border: '1px solid rgba(212,160,23,0.25)',
                    borderRadius: 10, padding: '1.2rem', textDecoration: 'none',
                    position: 'relative', overflow: 'hidden',
                    ['--dc' as string]: ACCENT,
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--gold)' }} />
                    <div style={{ fontFamily: 'var(--fn)', fontSize: 32, color: 'var(--gold2)', marginBottom: '0.3rem' }}>{disc}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)', marginBottom: '0.2rem' }}>{deal.title}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: ACCENT, fontWeight: 600 }}>{deal.pros?.business_name}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: '0.4rem' }}>
                      Expire {new Date(deal.expires_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Établissements — nos enseignes en cadres personnalisés (vrais pros) */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.3rem' }}>
            Établissements
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginBottom: '1.2rem' }}>
            Nos enseignes partenaires, livrées le soir à Nice.
          </p>
          {directoryPros.length > 0 ? (
            <div style={{ gap: '1rem' }} className="g-2 max-md:grid-cols-1">
              {directoryPros.map(e => (
                <NightProviderCard key={e.provider.id} provider={e.provider} status={e.status} />
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1px dashed rgba(212,160,23,0.3)', borderRadius: 12, padding: '3.5rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: '0.8rem' }}>🍽️</div>
              <p style={{ fontFamily: 'var(--fe)', fontSize: 18, fontStyle: 'italic', fontWeight: 700, color: 'var(--td)', marginBottom: '0.4rem' }}>Les établissements arrivent</p>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>Les premières enseignes sont en cours de certification.</p>
            </div>
          )}
        </div>

        {/* CTA pro */}
        <div style={{
          borderRadius: 16, padding: 'clamp(1.8rem,4vw,2.6rem)',
          background: 'linear-gradient(135deg, rgba(212,160,23,0.14), rgba(212,160,23,0.04))',
          border: '1px solid rgba(212,160,23,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1.2rem',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.3rem' }}>
              Vous régalez la Côte ?
            </div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', margin: 0 }}>
              Restaurant, food truck, cuisine de nuit — vendez sur NIKA, flash deals inclus.
            </p>
          </div>
          <Link href="/pro/inscription?type=food" style={{
            fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '13px 28px', borderRadius: 3, flexShrink: 0,
            background: ACCENT, color: '#1a1200', textDecoration: 'none',
          }}>
            Inscrire mon établissement →
          </Link>
        </div>
      </div>
    </main>
  );
}
