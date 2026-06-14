'use client';
// components/LiveActivity.tsx — bandeau d'activité « live » défilant (preuve sociale).
// Réutilise la mécanique .marquee / .marquee-track (globals.css). Contenu dupliqué
// pour une boucle translateX(-50%) sans couture. Pause au survol, respecte
// prefers-reduced-motion (géré par la règle .marquee-track).
const ACT = [
  { who: 'Marie', what: 'a commandé chez RAKOMORIA' },
  { who: 'Tom', what: 'a réservé un bateau à Cannes' },
  { who: 'NIKA', what: '+3 nouveaux POIs à Antibes' },
  { who: 'Léa', what: 'est montée au niveau Local' },
  { who: 'Yanis', what: 'a laissé un avis 5★ à Nice' },
  { who: 'Sofia', what: 'a trouvé un dépanneur en 6 min' },
  { who: 'AZUR', what: 'nouveau Flash Deal coucher de soleil' },
  { who: 'Karim', what: 'a réservé une bulle sous les étoiles' },
];

export default function LiveActivity() {
  return (
    <div className="marquee" style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)', padding: '11px 0' }}>
      <div className="marquee-track" aria-label="Activité en direct sur NIKA">
        {[...ACT, ...ACT].map((a, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 22px', borderRight: '1px solid var(--bd)', fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td3)', whiteSpace: 'nowrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22DD88', boxShadow: '0 0 6px #22DD88', flexShrink: 0, animation: 'pdot 1.8s ease-in-out infinite' }} />
            <strong style={{ color: 'var(--td2)', fontWeight: 700 }}>{a.who}</strong>&nbsp;{a.what}
          </span>
        ))}
      </div>
    </div>
  );
}
