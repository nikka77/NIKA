// app/learn/akasha/u/[slug]/template.tsx — les templates Next re-montent à chaque navigation :
// on rejoue une courte entrée « porte du monde » (fade + léger scale) à chaque changement de hub.
import type { ReactNode } from 'react';

export default function UniverseHubTemplate({ children }: { children: ReactNode }) {
  return <div className="ak-world-enter">{children}</div>;
}
