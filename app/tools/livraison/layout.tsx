// app/tools/livraison/layout.tsx — métadonnées de la page (23/08/2026).
//
// page.tsx est un composant CLIENT ('use client') : il ne peut pas exporter `metadata`, et la
// page héritait donc du titre et de la description de app/layout.tsx — mesuré en prod : <title>
// « NIKA — Explore. Joue. Vis. » sur une page météo. Un layout serveur minimal porte le titre,
// la description et la canonique ; il ne rend rien d'autre que ses enfants.
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/site';

const chemin = '/tools/livraison';

export const metadata: Metadata = {
  title: 'Estimer une livraison — NIKA Outils',
  description: 'Délai et prix estimés d’une course ou d’une livraison sur la Côte d’Azur, avant de commander.',
  alternates: { canonical: `${SITE_URL}${chemin}` },
  openGraph: { title: 'Estimer une livraison — NIKA Outils', description: 'Délai et prix estimés d’une course ou d’une livraison sur la Côte d’Azur, avant de commander.', url: `${SITE_URL}${chemin}`, type: 'website', locale: 'fr_FR' },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
