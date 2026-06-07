// app/azur/prestataires/nayah-boat/page.tsx — route statique (priorité sur [slug])
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import NayahBoatDetail, { type NayahProvider, type Review } from './NayahBoatDetail'

export const metadata: Metadata = {
  title: 'Nayah Boat — NIKA Azur',
  description: "Sorties en mer à la carte sur la Côte d'Azur. 6 bateaux disponibles, 3 formules, repas à bord. Halal.",
}

// ─── Fallback statique ────────────────────────────────────────────────────────

const NAYAH_FALLBACK: NayahProvider = {
  name:             'Nayah Boat',
  tagline:          'Sorties en mer à la carte — 6 bateaux pour tous les budgets',
  location:         'Nice — Antibes',
  rating:           4.8,
  review_count:     84,
  verified:         true,
  accent_color:     '#c9a84c',
  contact_instagram:'@nayah-boat06',
  contact_snapchat: 'NAYAH-BOAT06',
  bateaux: [
    { id: 'pacific_craft', nom: 'Pacific Craft 5.70', capacite: 6,  tarifs: { coucher_soleil: 200, demi_journee: 400, journee: 550 } },
    { id: 'flyer_6',       nom: 'Flyer 6.5',          capacite: 8,  tarifs: { coucher_soleil: 200, demi_journee: 400, journee: 550 } },
    { id: 'tempest_700',   nom: 'Tempest 700',         capacite: 10, tarifs: { coucher_soleil: 250, demi_journee: 450, journee: 700 } },
    { id: 'qs_675',        nom: 'Quicksilver 675',     capacite: 8,  tarifs: { coucher_soleil: 250, demi_journee: 450, journee: 700 } },
    { id: 'cc_715',        nom: 'Cap Camarat 715',     capacite: 8,  tarifs: { coucher_soleil: 250, demi_journee: 450, journee: 700 } },
    { id: 'leader_805',    nom: 'Leader 805',          capacite: 9,  tarifs: { coucher_soleil: 350, demi_journee: 600, journee: 850 } },
  ],
  formules_repas: [
    { key: 'bbq',         label: 'Formule BBQ',           prix: 30,  unite: 'pers.',   emoji: '🔥', gradient: 'linear-gradient(135deg,#3d1500,#7c2d00)' },
    { key: 'burger',      label: 'Formule Burger',         prix: 25,  unite: 'pers.',   emoji: '🍔', gradient: 'linear-gradient(135deg,#2d0a0a,#5c1a1a)' },
    { key: 'charcuterie', label: 'Charcuterie & Fromages', prix: 20,  unite: 'pers.',   emoji: '🧀', gradient: 'linear-gradient(135deg,#2d1f0a,#5c3d0f)' },
    { key: 'mini_sales',  label: 'Mini Salés',             prix: 1.5, unite: 'pièce',  emoji: '🥗', gradient: 'linear-gradient(135deg,#0a1f2d,#0f3d5c)', minimum: 20 },
    { key: 'bento_cake',  label: 'Bento Cake',             prix: 35,  unite: 'prest.', emoji: '🎂', gradient: 'linear-gradient(135deg,#1a0a2d,#3d0f5c)', hasCounter: false },
  ],
  feux_artifice: [
    { date: '14 juillet 2025', lieu: 'Nice — Promenade des Anglais', heure: '22h00' },
    { date: '24 juillet 2025', lieu: 'Cannes — Baie de Cannes',     heure: '22h30' },
    { date: '15 août 2025',    lieu: 'Monaco — Port Hercule',        heure: '21h30' },
  ],
  conditions: [
    { icon: '⚓', title: 'Acompte',    desc: '200€ non remboursables (100€ bateau + 100€ équipement)' },
    { icon: '🍽️', title: 'Repas',      desc: 'Formules repas payées séparément, en avance' },
    { icon: '👤', title: 'Skipper',    desc: 'Skipper professionnel inclus dans tous les packs' },
    { icon: '⛽', title: 'Carburant',  desc: 'Inclus dans chaque formule' },
    { icon: '🌤️', title: 'Météo',     desc: 'Mauvais temps → report ou remboursement complet' },
    { icon: '📅', title: 'Annulation', desc: "Gratuite jusqu'à 48h avant la sortie" },
  ],
}

const REVIEWS_FALLBACK: Review[] = [
  { author_name: 'Yasmine B.', rating: 5, comment: "Formule coucher de soleil sur le Leader 805 — vue imprenable. Repas BBQ à bord, parfait !", pack_name: 'Coucher de soleil', date_review: '2026-05-20', initials_color: '#c9a84c' },
  { author_name: 'Karim A.',   rating: 5, comment: 'Service impeccable, bateau propre. Le Tempest 700 pour 10 personnes, c\'est énorme.',         pack_name: 'Journée complète',  date_review: '2026-04-30', initials_color: '#4a90d9' },
  { author_name: 'Lina S.',    rating: 4, comment: "Bento Cake à bord pour l'anniversaire de ma sœur — une surprise réussie !",                   pack_name: 'Demi-journée',      date_review: '2026-04-12', initials_color: '#c9a84c' },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function NayahBoatPage() {
  const supabase = createAdminClient()
  let provider: NayahProvider = NAYAH_FALLBACK
  let reviews: Review[] = REVIEWS_FALLBACK

  if (supabase) {
    const [{ data: providerData }, { data: reviewsData }] = await Promise.all([
      supabase
        .from('azur_providers')
        .select('*')
        .eq('slug', 'nayah-boat')
        .single(),
      supabase
        .from('azur_reviews')
        .select('*')
        .eq('provider_slug', 'nayah-boat')
        .order('date_review', { ascending: false })
        .limit(5),
    ])

    if (providerData) provider = providerData as NayahProvider
    if (reviewsData?.length) reviews = reviewsData as Review[]
  }

  return <NayahBoatDetail provider={provider} reviews={reviews} />
}
