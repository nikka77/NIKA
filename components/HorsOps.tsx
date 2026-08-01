'use client';
// components/HorsOps.tsx — n'affiche ses enfants QUE hors de la console /ops.
// Né le 01/08 : le footer marketing (997 px de liens FOOD/AUTO/STAY) terminait la console de
// pilotage — « /ops n'est pas le site ». Footer reste un Server Component ; ce wrapper d'une
// condition est le seul morceau client nécessaire.
import { usePathname } from 'next/navigation';

export default function HorsOps({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  if (pathname.startsWith('/ops')) return null;
  return <>{children}</>;
}
