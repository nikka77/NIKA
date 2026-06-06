// app/riviera/prestataires/[slug]/page.tsx — Server Component
// Fetch du prestataire côté serveur, rendu dans ProviderDetail (Client)
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import ProviderDetail, { type Provider } from './ProviderDetail'

// ─── Fallback statique (table Supabase pas encore créée) ──────────────────────

const RENTBOAT_FALLBACK: Provider = {
  slug:             'rentboat-06',
  name:             'Rentboat 06',
  category:         'nautique',
  tagline:          'Vivez la mer autrement',
  location:         'Cannes Marina',
  rating:           4.9,
  review_count:     127,
  verified:         true,
  contact_whatsapp: '+33XXXXXXXXX',
  contact_instagram:'@rentboat06',
  boat_model:       'Cap Camarat 9WA — 2×250 CV',
  capacity_max:     10,
  photos:           [],
  inclus_default:   ['Skipper', 'Essence', 'Sono', 'Frigo', 'Masques'],
  promo_social:     'Barbecue offert si vous partagez votre sortie en story Instagram en nous notifiant',
  packs: [
    { name: 'Pack Journée',    price: 990, original_price: 1140, hours: '10h00–18h00', destination: 'Îles de Lérins ou Baie de Théoule',  inclus: ['Skipper','Essence','Sono','Frigo','Paddle','Masques'] },
    { name: 'Afterwork',       price: 590, original_price:  790, hours: '19h00–22h00', destination: 'Baie de Théoule-sur-Mer',           inclus: ['Skipper','Essence','Sono','Hookah','Frigo'] },
    { name: "Feu d'Artifices", price: 790, original_price:  950, hours: '19h00–23h00', destination: 'Baie de Cannes',                    inclus: ['Skipper','Essence','Sono','Frigo'] },
  ],
  options: [
    { key: 'bbq',        label: 'Barbecue',                   description: 'Mise à disposition — viande à prévoir',   price: 150 },
    { key: 'seabob',     label: 'Seabob',                     description: 'Scooter sous-marin électrique',           price: 200 },
    { key: 'jetski',     label: 'Jetski à l\'heure',          description: 'Permis bateau obligatoire',               price: 150 },
    { key: 'plateforme', label: 'Plateforme flottante géante',description: 'Bain de soleil à côté du bateau',         price: 300 },
    { key: 'piscine',    label: 'Piscine anti-méduses',       description: '3,5 × 5 mètres',                          price: 300 },
    { key: 'fruits',     label: 'Plateau de fruits',          description: 'Sur demande',                              price: null },
  ],
}

const FALLBACKS: Record<string, Provider> = {
  'rentboat-06': RENTBOAT_FALLBACK,
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ slug: string }> }

export default async function ProviderPage({ params }: Props) {
  const { slug } = await params

  const supabase = createAdminClient()
  let provider: Provider | null = null

  if (supabase) {
    const { data } = await supabase
      .from('riviera_providers')
      .select('*')
      .eq('slug', slug)
      .single()

    if (data) provider = data as Provider
  }

  // Fallback si DB non disponible ou slug inconnu en DB
  if (!provider) provider = FALLBACKS[slug] ?? null
  if (!provider) notFound()

  return <ProviderDetail provider={provider} />
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()

  let name    = FALLBACKS[slug]?.name    ?? 'Prestataire'
  let tagline = FALLBACKS[slug]?.tagline ?? ''

  if (supabase) {
    const { data } = await supabase
      .from('riviera_providers')
      .select('name, tagline')
      .eq('slug', slug)
      .single()
    if (data) { name = data.name; tagline = data.tagline ?? '' }
  }

  return {
    title:       `${name} — NIKKA Riviera`,
    description: tagline || `Réservez votre expérience avec ${name} sur la Côte d'Azur.`,
  }
}
