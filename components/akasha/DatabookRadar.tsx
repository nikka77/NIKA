// components/akasha/DatabookRadar.tsx — graphique « étoile » façon databook officiel Naruto.
// 8 axes /5 (Ninjutsu, Taijutsu, Genjutsu, Intelligence, Force, Vitesse, Endurance, Sceaux).
// SVG pur (pas de dépendance) ; évolue avec le mode sélectionné.
export type Stats = { nin: number; tai: number; gen: number; int: number; for: number; vit: number; end: number; sce: number };

const AXES: { key: keyof Stats; label: string }[] = [
  { key: 'nin', label: 'NIN' }, { key: 'tai', label: 'TAI' }, { key: 'gen', label: 'GEN' }, { key: 'int', label: 'INT' },
  { key: 'for', label: 'FOR' }, { key: 'vit', label: 'VIT' }, { key: 'end', label: 'END' }, { key: 'sce', label: 'SCE' },
];
const MAX = 5;

export default function DatabookRadar({ stats, color = '#7B5CF0', size = 188 }: { stats: Stats; color?: string; size?: number }) {
  const cx = size / 2, cy = size / 2, R = size * 0.33;
  const ang = (i: number) => -Math.PI / 2 + i * (Math.PI / 4);
  const pt = (i: number, r: number): [number, number] => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const poly = (r: (i: number) => number) => AXES.map((_, i) => pt(i, r(i)).map((n) => n.toFixed(1)).join(',')).join(' ');
  const data = poly((i) => (R * Math.max(0, Math.min(MAX, stats[AXES[i].key] ?? 0))) / MAX);
  const total = AXES.reduce((s, a) => s + (stats[a.key] ?? 0), 0);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" role="img" aria-label="Statistiques databook" style={{ display: 'block' }}>
      {/* anneaux 1..5 */}
      {[1, 2, 3, 4, 5].map((lvl) => (
        <polygon key={lvl} points={poly(() => (R * lvl) / MAX)} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
      ))}
      {/* rayons */}
      {AXES.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />; })}
      {/* polygone de stats */}
      <polygon points={data} fill={`${color}3a`} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {AXES.map((a, i) => { const [x, y] = pt(i, (R * Math.max(0, Math.min(MAX, stats[a.key] ?? 0))) / MAX); return <circle key={i} cx={x} cy={y} r={2.2} fill={color} />; })}
      {/* libellés + valeurs */}
      {AXES.map((a, i) => {
        const [lx, ly] = pt(i, R + 15);
        const v = stats[a.key] ?? 0;
        return (
          <text key={i} x={lx} y={ly} fontFamily="ui-monospace, monospace" fontSize={8.5} fontWeight={700}
            fill="var(--td3)" textAnchor="middle" dominantBaseline="middle">
            {a.label}<tspan fill={color} dx={2}>{v % 1 === 0 ? v : v.toFixed(1)}</tspan>
          </text>
        );
      })}
      {/* total au centre */}
      <text x={cx} y={cy - 4} fontFamily="var(--fe)" fontSize={20} fontWeight={900} fontStyle="italic" fill="#fff" textAnchor="middle">{total % 1 === 0 ? total : total.toFixed(1)}</text>
      <text x={cx} y={cy + 9} fontFamily="ui-monospace, monospace" fontSize={7} letterSpacing="0.12em" fill="var(--td3)" textAnchor="middle">/ 40</text>
    </svg>
  );
}
