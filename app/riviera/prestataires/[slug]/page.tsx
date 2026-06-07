// app/riviera/prestataires/[slug]/page.tsx — redirige vers /azur/prestataires/[slug]
import { redirect } from 'next/navigation'

type Props = { params: Promise<{ slug: string }> }

export default async function RivieraProviderPage({ params }: Props) {
  const { slug } = await params
  redirect(`/azur/prestataires/${slug}`)
}
