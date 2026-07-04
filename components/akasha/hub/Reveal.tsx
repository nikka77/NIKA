'use client';
// components/akasha/hub/Reveal.tsx — révèle son contenu en fondu-montant à l'entrée dans le viewport.
// Wrapper client léger : le CONTENU reste serveur (passé en children) → RSC préservé.
import { useEffect, useRef, type ReactNode } from 'react';

export default function Reveal({ children, delay = 0, as: Tag = 'section' }: { children: ReactNode; delay?: number; as?: 'section' | 'div' }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sans IntersectionObserver ou en reduced-motion, on montre directement.
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('is-in'); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { el.classList.add('is-in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as 'section';
  return (
    <Comp ref={ref as never} className="ak-reveal" style={{ animationDelay: delay ? `${delay}ms` : undefined }}>
      {children}
    </Comp>
  );
}
