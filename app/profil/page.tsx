// app/profil/page.tsx — Espace privé unique (hub à onglets). Fusionne l'ancien /profil + /dashboard.
// Server : auth + lecture des données réelles (commandes, XP, crédits, POIs) → passées au hub client.
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import ProfilHub from './ProfilHub';

export const metadata: Metadata = { title: 'Mon profil — NIKA' };

export default async function ProfilPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
  if (!profile) redirect('/connexion');

  const [{ data: orders }, { data: xpTx }, { data: creditTx }, { data: pois }] = await Promise.all([
    supabase.from('orders').select('id, status, amount, created_at, pros(business_name, domain)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('xp_transactions').select('id, action, xp_amount, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
    supabase.from('credit_transactions').select('id, amount, type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
    supabase.from('pois').select('id, name, category, status, upvotes, created_at').eq('creator_id', user.id).order('created_at', { ascending: false }).limit(8),
  ]);

  return <ProfilHub profile={profile} orders={orders ?? []} xpTx={xpTx ?? []} creditTx={creditTx ?? []} pois={pois ?? []} />;
}
