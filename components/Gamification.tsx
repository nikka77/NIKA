import FadeIn from './FadeIn';
import { levelBadge } from '@/lib/constants';
import { visual } from '@/lib/visuals';

const RANK_MEDAL: Record<number, string> = { 1: 'or', 2: 'argent', 3: 'bronze' };

const LEADERBOARD = [
  { rank: 1, initials: '?', name: 'Sois le premier',        level: 'Inscris-toi · Rejoins la compétition', xp: '— xp', bg: 'rgba(212,160,23,0.12)', color: 'var(--gold2)', rankClass: 'g' },
  { rank: 2, initials: '?', name: 'Gagne de l\'XP',         level: 'Avis · POIs · News · Commandes',       xp: '— xp', bg: 'rgba(0,148,212,0.1)',   color: 'var(--az2)',   rankClass: 's' },
  { rank: 3, initials: '?', name: 'Classement actif bientôt', level: 'Défis hebdomadaires en cours',       xp: '— xp', bg: 'rgba(14,168,120,0.1)', color: 'var(--teal)',  rankClass: 'b' },
];

const RANK_COLORS: Record<string, string> = { g: 'var(--gold2)', s: '#A0B8C8', b: '#C08050' };

const QUESTS = [
  { icon: '🍽️', name: 'Découvreur food',  reward: '+150 XP', desc: "Commande dans un restaurant où tu n'es jamais allé.",         progress: 0,   total: 1, done: false },
  { icon: '🗺️', name: 'Cartographe',       reward: '+200 XP', desc: 'Crée 2 nouveaux POIs validés sur la carte NIKA.',             progress: 50,  total: 2, done: false },
  { icon: '📡', name: 'Reporter local',     reward: '+120 XP', desc: 'Publie une news locale qui passe la modération IA.',          progress: 100, total: 1, done: true },
];

const XP_ACTIONS = [
  { xp: '+50', label: 'Avis' }, { xp: '+80', label: 'POI créé' },
  { xp: '+30', label: 'Commande' }, { xp: '+100', label: 'News validée' },
  { xp: '+20', label: 'Daily' }, { xp: '+150', label: 'Invitation' },
];

export default function Gamification() {
  return (
    <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', padding: '5rem 1.4rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--td3)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ display: 'block', width: 14, height: 1, background: 'currentColor' }} />
            Progression
          </p>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(32px,6.5vw,62px)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--td)', marginBottom: '0.7rem' }}>
            Gagne de l&apos;XP
          </h2>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 480 }}>
            Chaque action rapporte de l&apos;expérience. Monte en niveau, débloque des avantages, accède aux défis hebdomadaires.
          </p>
        </FadeIn>

        <div style={{ gap: '1.5rem', marginTop: '2rem' }}
          className="g-2 max-md:grid-cols-1">

          {/* XP Block */}
          <FadeIn delay={0.1}>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 6, padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.1rem' }}>
                <img src={levelBadge('Local')} alt="Niveau 3 — Local" width={56} height={56}
                  style={{ width: 56, height: 56, flexShrink: 0, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }} />
                <div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 21, fontWeight: 900, fontStyle: 'italic', color: 'var(--gold2)', lineHeight: 1 }}>Local</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 1 }}>Niveau 3 · 1 240 XP</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', marginTop: 2 }}>
                    Prochain : <strong style={{ color: 'var(--gold)' }}>Connecté</strong>
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--bd)', borderRadius: 3, height: 7, overflow: 'hidden', marginBottom: '0.35rem' }}>
                <div style={{ height: '100%', width: '62%', background: 'linear-gradient(90deg,var(--gold),var(--gold2))', borderRadius: 3, animation: 'xpbr 3s ease-in-out infinite' }} />
              </div>
              <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
                <span>Local · Niv.3</span><span>760 XP → Connecté</span>
              </div>
              <div style={{ padding: '0.65rem', borderRadius: 4, background: 'rgba(212,160,23,0.04)', border: '1px solid rgba(212,160,23,0.1)', display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: '1rem' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🔓</span>
                <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', lineHeight: 1.4 }}>
                  À Niv.4 <strong style={{ color: 'var(--gold)', fontWeight: 600 }}>Connecté</strong> : badge de confiance + offres pros exclusives + -10% sur les Flash Deals.
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {XP_ACTIONS.map(a => (
                  <div key={a.label} style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: 'rgba(212,160,23,0.04)', border: '1px solid rgba(212,160,23,0.11)', color: 'var(--td3)' }}>
                    <span style={{ color: 'var(--gold)', marginRight: 3 }}>{a.xp}</span>{a.label}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Leaderboard */}
          <FadeIn delay={0.2}>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 6, padding: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 800, fontStyle: 'italic', color: 'var(--td)', marginBottom: '1rem', letterSpacing: '0.04em' }}>
                Top joueurs du mois
              </div>
              {LEADERBOARD.map(({ rank, initials, name, level, xp, bg, color, rankClass }) => (
                <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0', borderBottom: '1px solid var(--bd)' }}>
                  {RANK_MEDAL[rank] ? (
                    <img src={visual('ranks', RANK_MEDAL[rank]).poster} alt={`${rank}e`} width={26} height={26} style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} />
                  ) : (
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: RANK_COLORS[rankClass], width: 18, textAlign: 'center' }}>{rank}</div>
                  )}
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fn)', fontSize: 12, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: 'var(--td)' }}>{name}</div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 1 }}>{level}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 13, fontWeight: 700, fontStyle: 'italic', color: 'var(--gold)' }}>{xp}</div>
                </div>
              ))}
              <div style={{ marginTop: '1rem', textAlign: 'center', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                <a href="/leaderboard" style={{ color: 'var(--az)', textDecoration: 'underline', textDecorationColor: 'rgba(0,148,212,0.3)' }}>Rejoindre le classement →</a>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: '1.2rem', flexWrap: 'wrap' }}>
                {[{ n: 14, l: 'POIs / semaine' }, { n: 89, l: 'News publiées' }, { n: 231, l: 'Avis laissés' }].map(({ n, l }) => (
                  <div key={l} style={{ flex: 1, minWidth: 90, background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 4, padding: '0.8rem', textAlign: 'center' }}>
                    <span style={{ fontFamily: 'var(--fe)', fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: 'var(--az2)', display: 'block' }}>{n}</span>
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 2 }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Quests — full width */}
          <FadeIn delay={0.3} className="col-span-full">
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 6, padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.2rem' }}>
                <span style={{ fontSize: 24 }}>⚔️</span>
                <div>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', letterSpacing: '0.04em' }}>
                    NIKA Challenges — Semaine #3
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: 2 }}>
                    Défis hebdomadaires · Bonus XP garantis
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', background: 'var(--bd)', padding: '4px 10px', borderRadius: 20 }}>
                  Reset dans 4j 12h
                </div>
              </div>
              <div style={{ gap: 10 }}
                className="g-3 max-sm:grid-cols-1">
                {QUESTS.map(({ icon, name, reward, desc, progress, done }) => (
                  <div key={name} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bd)', borderRadius: 5, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: 'var(--td)' }}>{name}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--fe)', fontSize: 12, fontWeight: 700, fontStyle: 'italic', color: 'var(--gold2)' }}>{reward}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', lineHeight: 1.4, marginBottom: '0.7rem' }}>{desc}</div>
                    <div style={{ background: 'var(--bd)', borderRadius: 2, height: 4, overflow: 'hidden', marginBottom: '0.4rem' }}>
                      <div style={{ height: '100%', width: `${progress}%`, borderRadius: 2, background: done ? 'var(--teal)' : progress > 0 ? 'var(--gold)' : 'var(--az)' }} />
                    </div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>
                      {done ? '✓ Complété' : progress > 0 ? 'En cours' : 'Non commencé'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
