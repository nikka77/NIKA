// components/akasha/ArcadeMoves.tsx — panneau « ARCADE » rétro 2D des techniques (16-bit).
// Affiche les sprites animés (illustratif) avec une UI borne d'arcade : scanlines CRT,
// commandes type jeu de combat, barres de chakra. Données : data/akasha-arcade.json
// (même manifeste, avec sprite-sheets, prévu pour alimenter un futur mini-jeu jouable).
import arcade from '@/data/akasha-arcade.json';

type Move = {
  id: string; label: string; type: string; element: string;
  chakra: number; damage: number; command: string;
  anim: string; sheet: string; frames: number; fps: number;
};
type Roster = Record<string, { character: string; tile: number; moves: Move[] }>;

const TYPE_COLOR: Record<string, string> = {
  Ninjutsu: '#35E0F0', Bijū: '#F0C040', Taijutsu: '#3DF07A', Genjutsu: '#C77BF5',
};

const scanlines = 'repeating-linear-gradient(0deg, rgba(0,0,0,0.32) 0px, rgba(0,0,0,0.32) 1px, transparent 2px, transparent 3px)';
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';
// Les sprites sont régénérés sous le MÊME nom de fichier → on casse le cache navigateur/CDN
// à chaque itération (bump à incrémenter quand on régénère les anims).
const ASSET_V = 'v5';

function Cmd({ command }: { command: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {command.split(' ').map((k, i) => (
        <span key={i} style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 700, lineHeight: 1, color: '#cfe8ff',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 3, padding: '2px 4px', minWidth: 14, textAlign: 'center',
        }}>{k}</span>
      ))}
    </div>
  );
}

function MoveCard({ m, tile }: { m: Move; tile: number }) {
  const color = TYPE_COLOR[m.type] ?? '#7B5CF0';
  return (
    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#0A0716', border: `1px solid ${color}44`, boxShadow: `inset 0 0 22px rgba(0,0,0,0.7)` }}>
      {/* écran sprite */}
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'radial-gradient(120% 90% at 50% 25%, rgba(123,92,240,0.16), rgba(5,7,18,0.9))', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${m.anim}?${ASSET_V}`} alt={m.label} width={tile} height={tile}
          style={{ width: '88%', height: '88%', objectFit: 'contain', imageRendering: 'pixelated', filter: `drop-shadow(0 3px 6px ${color}66)` }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: scanlines, mixBlendMode: 'multiply', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', top: 5, left: 5, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color, background: 'rgba(5,7,18,0.7)', border: `1px solid ${color}66`, borderRadius: 3, padding: '1px 5px' }}>{m.type}</span>
      </div>
      {/* infos */}
      <div style={{ padding: '7px 9px 9px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#fff', textShadow: `0 0 8px ${color}aa` }}>{m.label}</span>
          <span style={{ fontFamily: MONO, fontSize: 8.5, color: 'var(--td3)' }}>{m.element}</span>
        </div>
        <Cmd command={m.command} />
        {/* barre de chakra */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 8, color: 'var(--td3)', letterSpacing: '0.08em', marginBottom: 2 }}>
            <span>CHAKRA</span><span style={{ color }}>PWR {m.damage}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ width: `${m.chakra}%`, height: '100%', background: `linear-gradient(90deg, #35E0F0, ${color})` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArcadeMoves({ slug }: { slug: string }) {
  const data = (arcade as unknown as Roster)[slug];
  if (!data?.moves?.length) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span aria-hidden style={{ fontSize: 16 }}>🎮</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--td3)' }}>Arcade — Techniques</span>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', color: '#F0C040', textShadow: '0 0 8px #F0C04088' }} className="ak-blink">★ INSERT COIN</span>
      </div>
      <div style={{ position: 'relative', borderRadius: 12, padding: 10, background: 'linear-gradient(180deg,#120C28,#0A0716)', border: '1px solid rgba(123,92,240,0.35)', boxShadow: '0 0 0 1px rgba(0,0,0,0.4), inset 0 0 30px rgba(123,92,240,0.12)' }}>
        <div className="g-2" style={{ gap: 9 }}>
          {data.moves.map((m) => <MoveCard key={m.id} m={m} tile={data.tile} />)}
        </div>
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 12, background: scanlines, opacity: 0.5, pointerEvents: 'none' }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 8.5, color: 'var(--td3)', textAlign: 'center', marginTop: 6, letterSpacing: '0.06em' }}>
        Sprites 16-bit · prêts pour un futur mini-jeu jouable
      </div>
    </div>
  );
}
