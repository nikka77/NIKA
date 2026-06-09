// app/carte/layout.tsx — metadata pour la page carte (client component)
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Carte interactive — NIKA Côte d\'Azur',
  description: 'Explorez la Côte d\'Azur sur la carte NIKA : restaurants, dépanneurs, logements insolites, sorties en mer et bons plans géolocalisés de Nice à Cannes.',
  keywords: ['carte côte d\'azur', 'POI Nice', 'bons plans Cannes', 'carte interactive NIKA'],
}

export default function CarteLayout({ children }: { children: React.ReactNode }) {
  return children
}
