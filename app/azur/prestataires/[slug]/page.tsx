// app/azur/prestataires/[slug]/page.tsx — Server Component
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import ProviderDetail, { type Provider, type Review } from './ProviderDetail'

// ─── Fallback statique ────────────────────────────────────────────────────────

const RENTBOAT_FALLBACK: Provider = {
  slug:             'rentboat-06',
  name:             'Rentboat 06',
  category:         'nautique',
  tagline:          'Vivez la mer autrement',
  location:         'Cannes Marina',
  rating:           4.9,
  review_count:     127,
  verified:         true,
  accent_color:     '#0ea5e9',
  contact_whatsapp: '+33XXXXXXXXX',
  contact_instagram:'@rentboat06',
  boat_model:       'Cap Camarat 9WA — 2×250 CV',
  capacity_max:     10,
  photos: [
    'https://www.jeanneau.com/static/version1/frontend/jeanneau/fr_FR/images/boat/cap-camarat-9-0-wa/cap-camarat-9-0-wa-ambiance-1.jpg',
    'https://www.jeanneau.com/static/version1/frontend/jeanneau/fr_FR/images/boat/cap-camarat-9-0-wa/cap-camarat-9-0-wa-ambiance-2.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Lerins_Islands_from_Air.jpg/1280px-Lerins_Islands_from_Air.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Cannes_Sunset.jpg/1280px-Cannes_Sunset.jpg',
  ],
  inclus_default:   ['Skipper', 'Essence', 'Sono', 'Frigo', 'Masques'],
  promo_social:     'Barbecue offert si vous partagez votre sortie en story Instagram en nous notifiant',
  packs: [
    { name: 'Pack Journée',    price: 990, original_price: 1140, hours: '10h00–18h00', destination: 'Îles de Lérins ou Baie de Théoule',  inclus: ['Skipper','Essence','Sono','Frigo','Paddle','Masques'] },
    { name: 'Afterwork',       price: 590, original_price:  790, hours: '19h00–22h00', destination: 'Baie de Théoule-sur-Mer',           inclus: ['Skipper','Essence','Sono','Hookah','Frigo'] },
    { name: "Feu d'Artifices", price: 790, original_price:  950, hours: '19h00–23h00', destination: 'Baie de Cannes',                    inclus: ['Skipper','Essence','Sono','Frigo'] },
  ],
  options: [
    { key: 'bbq',        label: 'Barbecue',                    description: 'Mise à disposition — viande à prévoir',   price: 150 },
    { key: 'seabob',     label: 'Seabob',                      description: 'Scooter sous-marin électrique',           price: 200 },
    { key: 'jetski',     label: "Jetski à l'heure",            description: 'Permis bateau obligatoire',               price: 150 },
    { key: 'plateforme', label: 'Plateforme flottante géante', description: 'Bain de soleil à côté du bateau',         price: 300 },
    { key: 'piscine',    label: 'Piscine anti-méduses',        description: '3,5 × 5 mètres',                         price: 300 },
    { key: 'fruits',     label: 'Plateau de fruits',           description: 'Sur demande',                             price: null },
  ],
}

const FALLBACKS: Record<string, Provider> = {
  'rentboat-06': RENTBOAT_FALLBACK,
}

// ─── Avis fallback ────────────────────────────────────────────────────────────

const REVIEWS_FALLBACK: Record<string, Review[]> = {
  'rentboat-06': [
    { author_name: 'Sophie M.', rating: 5, comment: 'Super expérience, skipper au top ! Les îles de Lérins sont magnifiques sous ce soleil.',  pack_name: 'Pack Journée', date_review: '2026-05-12', initials_color: '#0ea5e9' },
    { author_name: 'Marc D.',   rating: 5, comment: 'Sortie afterwork parfaite. Coucher de soleil sur Théoule-sur-Mer, inoubliable.',           pack_name: 'Afterwork',    date_review: '2026-04-28', initials_color: '#f59e0b' },
    { author_name: 'Julien R.', rating: 4, comment: 'Bateau nickel, packs clairs, tout inclus comme promis. On reviendra cet été !',            pack_name: 'Pack Journée', date_review: '2026-04-10', initials_color: '#7c3aed' },
  ],
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ slug: string }> }

export default async function ProviderPage({ params }: Props) {
  const { slug } = await params

  const supabase = createAdminClient()
  let provider: Provider | null = null
  let reviews: Review[] = REVIEWS_FALLBACK[slug] ?? []

  if (supabase) {
    const [{ data: providerData }, { data: reviewsData }] = await Promise.all([
      supabase
        .from('azur_providers')
        .select('*')
        .eq('slug', slug)
        .single(),
      supabase
        .from('azur_reviews')
        .select('*')
        .eq('provider_slug', slug)
        .order('date_review', { ascending: false })
        .limit(5),
    ])

    if (providerData) provider = providerData as Provider
    if (reviewsData?.length) reviews = reviewsData as Review[]
  }

  if (!provider) provider = FALLBACKS[slug] ?? null
  if (!provider) notFound()

  return <ProviderDetail provider={provider} reviews={reviews} />
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()

  let name    = FALLBACKS[slug]?.name    ?? 'Prestataire'
  let tagline = FALLBACKS[slug]?.tagline ?? ''

  if (supabase) {
    const { data } = await supabase
      .from('azur_providers')
      .select('name, tagline')
      .eq('slug', slug)
      .single()
    if (data) { name = data.name; tagline = data.tagline ?? '' }
  }

  return {
    title:       `${name} — NIKA Azur`,
    description: tagline || `Réservez votre expérience avec ${name} sur la Côte d'Azur.`,
  }
}
