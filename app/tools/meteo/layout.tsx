// app/tools/meteo/layout.tsx — métadonnées de la page (23/08/2026).
//
// page.tsx est un composant CLIENT ('use client') : il ne peut pas exporter `metadata`, et la
// page héritait donc du titre et de la description de app/layout.tsx — mesuré en prod : <title>
// « NIKA — Explore. Joue. Vis. » sur une page météo. Un layout serveur minimal porte le titre,
// la description et la canonique ; il ne rend rien d'autre que ses enfants.
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/site';

const chemin = '/tools/meteo';

export const metadata: Metadata = {
  title: 'Météo Côte d’Azur — NIKA Outils',
  description: 'Prévisions, vent et mer à Nice, Antibes, Cannes et Monaco : la météo utile pour sortir, rouler ou naviguer.',
  alternates: { canonical: `${SITE_URL}${chemin}` },
  openGraph: { title: 'Météo Côte d’Azur — NIKA Outils', description: 'Prévisions, vent et mer à Nice, Antibes, Cannes et Monaco : la météo utile pour sortir, rouler ou naviguer.', url: `${SITE_URL}${chemin}`, type: 'website', locale: 'fr_FR' },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
