// app/tools/convertisseur/layout.tsx — métadonnées de la page (23/08/2026).
//
// page.tsx est un composant CLIENT ('use client') : il ne peut pas exporter `metadata`, et la
// page héritait donc du titre et de la description de app/layout.tsx — mesuré en prod : <title>
// « NIKA — Explore. Joue. Vis. » sur une page météo. Un layout serveur minimal porte le titre,
// la description et la canonique ; il ne rend rien d'autre que ses enfants.
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/site';

const chemin = '/tools/convertisseur';

export const metadata: Metadata = {
  title: 'Convertisseur — NIKA Outils',
  description: 'Devises, unités et mesures : le convertisseur rapide de NIKA pour la Côte d’Azur.',
  alternates: { canonical: `${SITE_URL}${chemin}` },
  openGraph: { title: 'Convertisseur — NIKA Outils', description: 'Devises, unités et mesures : le convertisseur rapide de NIKA pour la Côte d’Azur.', url: `${SITE_URL}${chemin}`, type: 'website', locale: 'fr_FR' },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
