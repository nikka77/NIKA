'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import FadeIn from './FadeIn';
import Spin360 from './Spin360';
import { visual } from '@/lib/visuals';

const DOMAINS = [
  { slug: 'food',  icon: '🍽️', num: '01 / Alimentation',    name: 'FOOD',  color: '#D4A017', affil: false,
    desc: 'Restaurants, brunchs, cafés, food trucks et boulangeries. Commande en ligne, stock en temps réel.',
    tags: ['Commerce fixe', 'Mobile', 'Livraison', 'Stock live'] },
  { slug: 'auto',  icon: '🚗', num: '02 / Automobile & VTC', name: 'AUTO',  color: '#0094D4', affil: false,
    desc: 'Dépannage Uber-like, carburant, lavage, mécanique mobile, location + VTC avec chauffeurs vérifiés NIKA.',
    tags: ['Dépannage', 'VTC', 'Location', 'API immat'] },
  { slug: 'stay',  icon: '🏡', num: '03 / Logement insolite', name: 'STAY', color: '#E07038', affil: true,
    desc: 'Les hébergements les plus insolites du monde entier. Maison flottante, avion reconverti, sous-marin, fusée.',
    tags: ['Mondial', 'Insolite', 'Thématique', 'Luxe'] },
  { slug: 'azur',  icon: '🛥️', num: '04 / Mer & Bateaux',    name: 'AZUR', color: '#0868A0', affil: false,
    desc: 'Location de bateaux avec ou sans skipper, jetski, parcours flottant, BBQ à bord, chicha, fruits.',
    tags: ['Location bateaux', 'Skipper', 'Jetski', 'Services'] },
  { slug: 'rent',  icon: '📦', num: '05 / Location matériel', name: 'RENT', color: '#5A88B0', affil: false,
    desc: 'Parasols, transats, batterie EcoFlow, scooter sous-marin + O₂, mini-bateau, plateforme flottante.',
    tags: ['Plage', 'Nautique', 'Outdoor', 'Pro'] },
  { slug: 'serv',  icon: '🔧', num: '06 / Services',          name: 'SERV', color: '#0EA878', affil: false,
    desc: 'Tous les prestataires locaux. Réservation, notation et suivi de mission.',
    tags: ['Réservation', 'Notation', 'Suivi'] },
  { slug: 'learn', icon: '📚', num: '07 / Compétences',       name: 'LEARN', color: '#7B5CF0', affil: false,
    desc: 'Formateurs et ateliers locaux. Cours pratiques, masterclass, compétences terrain.',
    tags: ['Formateurs', 'Ateliers', 'Cours'] },
  { slug: 'sec',   icon: '🔒', num: '08 / Sécurité',          name: 'SEC',  color: '#D44B24', affil: false,
    desc: 'Serruriers, alarmes, gardiennage. Les pros de la sécurité en intervention rapide, vérifiés NIKA.',
    tags: ['Urgence', 'Serrurerie', 'Alarme'] },
  { slug: 'news',  icon: '📡', num: '09 / Actualités',        name: 'NEWS', color: '#5A88B0', affil: false,
    desc: 'Infos locales indépendantes + publications communauté NIKA. Modération IA avant publication.',
    tags: ['Local', 'Indépendant', 'IA modération'] },
];

const CARD_W = 300;
const CARD_GAP = 18;

export default function DomainsCarousel() {
  const [active, setActive] = useState(0);

  const getTransform = useCallback((idx: number) => {
    const diff = idx - active;
    const absD = Math.abs(diff);
    if (absD > 2) return 'scale(0) translateX(0px)';
    const tx = diff * (CARD_W + CARD_GAP) * 0.75;
    const tz = -absD * 120;
    const ry = diff * -8;
    const scale = absD === 0 ? 1 : absD === 1 ? 0.86 : 0.72;
    const opacity = absD === 0 ? 1 : absD === 1 ? 0.7 : 0.4;
    return { tx, tz, ry, scale, opacity };
  }, [active]);

  return (
    <div id="domaines" style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)', padding: '5rem 0 4rem', overflow: 'hidden' }}>
      <FadeIn>
        <div style={{ padding: '0 1.4rem 2rem', maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ display: 'block', width: 14, height: 1, background: 'currentColor' }} />
              9 Modules
            </p>
            <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,6.5vw,62px)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.7rem' }}>
              Nos domaines
            </h2>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 480 }}>
              De l&apos;alimentation aux logements insolites dans le monde entier — un écosystème complet pour la vraie vie.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={() => setActive(a => Math.max(0, a - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--bd2)', color: 'var(--td2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, transition: 'all 0.2s' }}>←</button>
            <button onClick={() => setActive(a => Math.min(DOMAINS.length - 1, a + 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--bd2)', color: 'var(--td2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, transition: 'all 0.2s' }}>→</button>
          </div>
        </div>
      </FadeIn>

      {/* Carousel */}
      <div style={{ position: 'relative', height: 420, perspective: '1400px', perspectiveOrigin: '50% 40%', maskImage: 'linear-gradient(90deg,transparent 0%,black 7%,black 93%,transparent 100%)', WebkitMaskImage: 'linear-gradient(90deg,transparent 0%,black 7%,black 93%,transparent 100%)' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {DOMAINS.map((d, i) => {
            const t = getTransform(i);
            if (typeof t === 'string') return null;
            const isActive = i === active;
            return (
              <div
                key={d.slug}
                onClick={() => setActive(i)}
                style={{
                  position: 'absolute', left: '50%', top: 20,
                  width: CARD_W,
                  background: 'var(--bg3)', border: `1px solid ${isActive ? d.color : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 8, padding: '1.8rem 1.5rem',
                  cursor: 'pointer', overflow: 'hidden',
                  transform: `translateX(calc(-50% + ${t.tx}px)) translateZ(${t.tz}px) rotateY(${t.ry}deg) scale(${t.scale})`,
                  opacity: t.opacity,
                  transition: 'transform 0.52s cubic-bezier(0.35,0.01,0.25,1), opacity 0.52s ease, border-color 0.35s ease',
                  boxShadow: isActive ? `0 0 0 1px ${d.color}72, 0 20px 50px rgba(0,0,0,.5), 0 0 40px ${d.color}11` : 'none',
                  zIndex: isActive ? 10 : 5 - Math.abs(i - active),
                }}
              >
                {/* Top accent */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: d.color, opacity: 0.75 }} />
                {/* Glow bg */}
                <div style={{ position: 'absolute', bottom: -15, right: -15, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle,${d.color} 0%,transparent 70%)`, opacity: isActive ? 0.15 : 0.05, transition: 'opacity 0.4s' }} />

                {d.affil && (
                  <div style={{ position: 'absolute', top: 10, right: 10, fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: 'rgba(212,160,23,0.12)', color: 'var(--gold)', border: '1px solid rgba(212,160,23,0.2)' }}>
                    Affiliation
                  </div>
                )}

                <div style={{ marginBottom: '0.8rem' }}>
                  <Spin360 emoji={d.icon} alt={d.name} accent={d.color} size={58} {...visual('domains', d.slug)} />
                </div>
                <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: d.color, opacity: 0.55, marginBottom: '0.15rem' }}>
                  {d.num}
                </div>
                <div style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.03em', color: 'var(--td)', lineHeight: 1, marginBottom: isActive ? '0.6rem' : 0, transition: 'margin 0.3s' }}>
                  {d.name}
                </div>

                {isActive && (
                  <>
                    <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', lineHeight: 1.6, marginBottom: '1.2rem' }}>{d.desc}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: '1.3rem' }}>
                      {d.tags.map(t => (
                        <span key={t} style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, border: '1px solid var(--bd)', color: 'var(--td3)' }}>{t}</span>
                      ))}
                    </div>
                    <Link href={`/${d.slug}`} style={{ fontFamily: 'var(--fe)', fontSize: 12, fontWeight: 700, fontStyle: 'italic', letterSpacing: '0.08em', textTransform: 'uppercase', color: d.color, display: 'flex', alignItems: 'center', gap: 5 }}>
                      Explorer →
                    </Link>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: '1.6rem' }}>
        {DOMAINS.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ width: i === active ? 26 : 18, height: 3, borderRadius: 2, background: i === active ? 'var(--az)' : 'var(--bd2)', transition: 'all 0.3s', cursor: 'pointer' }} />
        ))}
      </div>
    </div>
  );
}
