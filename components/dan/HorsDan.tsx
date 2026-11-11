'use client';
// components/dan/HorsDan.tsx — masque ses enfants sous /dan (la nav du site n'a pas sa place
// au-dessus d'une carte phygitale). Distinct de HorsOps : la nav, elle, reste affichée sur /ops.
import { usePathname } from 'next/navigation';

export default function HorsDan({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  if (pathname === '/dan' || pathname.startsWith('/dan/')) return null;
  return <>{children}</>;
}
