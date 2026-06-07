// app/riviera/page.tsx — redirige vers /azur
import { redirect } from 'next/navigation'

export default function RivieraPage() {
  redirect('/azur')
}
