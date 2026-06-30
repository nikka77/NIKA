'use client';
// components/akasha/Character3D.tsx — visionneuse 3D temps réel d'un personnage.
// Charge un GLB riggé + animé (généré via Higgsfield → Meshy image_to_3d) et le joue avec
// <model-viewer> (web component AUTO-HÉBERGÉ dans /public/vendor — AUCUNE dépendance npm).
// • orbit : on glisse pour tourner autour du modèle
// • les clips d'animation présents dans le GLB deviennent des boutons (switch instantané)
// • fallback propre si WebGL/scripts indisponibles (le poster reste visible)
import { useEffect, useRef, useState } from 'react';

type MV = HTMLElement & {
  availableAnimations?: string[];
  animationName?: string;
  loaded?: boolean;
  play?: () => void;
  pause?: () => void;
};

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';

// 'Armature|Charged_Spell_Cast|baselayer' → 'Charged Spell Cast'
const prettyClip = (raw: string) =>
  (raw.split('|').find((s) => s && !/^armature$/i.test(s) && !/^baselayer$/i.test(s)) ?? raw)
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function Character3D({
  src,
  poster,
  accent = '#7B5CF0',
  note,
}: {
  src: string;
  poster?: string;
  accent?: string;
  note?: string;
}) {
  const ref = useRef<MV | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [clips, setClips] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // 1) charger le web component une seule fois (script de module auto-hébergé)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (customElements.get('model-viewer')) {
      setScriptReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-model-viewer]');
    if (existing) {
      existing.addEventListener('load', () => setScriptReady(true));
      existing.addEventListener('error', () => setFailed(true));
      return;
    }
    const s = document.createElement('script');
    s.type = 'module';
    s.src = '/vendor/model-viewer.min.js';
    s.dataset.modelViewer = '1';
    s.onload = () => setScriptReady(true);
    s.onerror = () => setFailed(true);
    document.head.appendChild(s);
  }, []);

  // 2) configurer l'élément + lire les clips dès que le modèle est chargé
  useEffect(() => {
    const el = ref.current;
    if (!el || !scriptReady) return;

    // attributs posés impérativement (robuste vs custom-element + React).
    // Tout ceci est du RENDU pur (model-viewer) → s'affine sans rien régénérer.
    const attrs: Record<string, string> = {
      'camera-controls': '',
      autoplay: '',
      'auto-rotate': '',
      'auto-rotate-delay': '2200',
      'rotation-per-second': '12deg',
      'interaction-prompt': 'none',
      'touch-action': 'pan-y',
      'tone-mapping': 'neutral', // garde les couleurs anime vives (vs aces qui désature)
      'shadow-intensity': '1.15',
      'shadow-softness': '1',
      exposure: '1.18',
      'environment-image': 'neutral',
      'camera-orbit': '18deg 84deg 2.5m',
      'min-camera-orbit': 'auto auto 1.7m',
      'max-camera-orbit': 'auto auto 4m',
      'field-of-view': '24deg',
    };
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);

    const readClips = () => {
      const anims = el.availableAnimations ?? [];
      setClips(anims);
      setActive((prev) => prev ?? anims[0] ?? null);
    };
    el.addEventListener('load', readClips);
    if (el.loaded) readClips(); // déjà chargé avant l'attache du listener
    return () => el.removeEventListener('load', readClips);
  }, [scriptReady, src]);

  const choose = (clip: string) => {
    const el = ref.current;
    if (!el) return;
    el.animationName = clip;
    el.play?.();
    setActive(clip);
  };

  return (
    <div>
      <div
        style={{
          position: 'relative',
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${accent}55`,
          background: `radial-gradient(120% 90% at 50% 18%, ${accent}26, rgba(5,7,18,0.92))`,
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55)',
          aspectRatio: '3 / 4',
        }}
      >
        {scriptReady && !failed ? (
          <model-viewer
            ref={ref as unknown as React.Ref<HTMLElement>}
            src={src}
            poster={poster}
            alt="Modèle 3D du personnage"
            reveal="auto"
            style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
          />
        ) : poster ? (
          // fallback : poster + message si pas de WebGL/scripts
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt="Aperçu du personnage"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : null}

        {failed && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: 10,
              background: 'linear-gradient(180deg, transparent 60%, rgba(5,7,18,0.85))',
              fontFamily: MONO,
              fontSize: 10.5,
              color: '#fff',
              textAlign: 'center',
            }}
          >
            Visionneuse 3D indisponible ici — aperçu 2D affiché.
          </div>
        )}

        {!scriptReady && !failed && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: MONO,
              fontSize: 10.5,
              letterSpacing: '0.1em',
              color: 'var(--td3)',
            }}
          >
            Chargement 3D…
          </div>
        )}

        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: accent,
            background: 'rgba(5,7,18,0.72)',
            border: `1px solid ${accent}66`,
            borderRadius: 4,
            padding: '2px 6px',
          }}
        >
          ⬢ 3D temps réel
        </span>
      </div>

      {/* boutons de clips d'animation détectés dans le GLB */}
      {clips.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
          {clips.map((c) => {
            const on = c === active;
            return (
              <button
                key={c}
                type="button"
                onClick={() => choose(c)}
                style={{
                  fontFamily: 'var(--fo)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  padding: '5px 11px',
                  borderRadius: 20,
                  border: `1px solid ${on ? accent : 'var(--bd2)'}`,
                  background: on ? `${accent}22` : 'transparent',
                  color: on ? accent : 'var(--td2)',
                }}
              >
                {prettyClip(c)}
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          textAlign: 'center',
          marginTop: 8,
          fontFamily: 'var(--fo)',
          fontSize: 11,
          color: 'var(--td3)',
          fontStyle: 'italic',
        }}
      >
        Glisse pour tourner autour · {note ?? 'modèle riggé + animé via Higgsfield'}
      </div>
    </div>
  );
}
