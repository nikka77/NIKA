// app/dashboard/page.tsx — fusionné dans l'espace profil unique (#38). Redirige vers /profil.
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  redirect('/profil');
}
