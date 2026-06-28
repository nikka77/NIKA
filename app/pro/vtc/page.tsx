// app/pro/vtc/page.tsx — Espace chauffeur VTC (pro). Auth requise → app chauffeur client.
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import VtcDriverApp from './VtcDriverApp';

export const metadata: Metadata = { title: 'Espace chauffeur VTC — NIKA' };

export default async function ProVtcPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion?next=/pro/vtc');
  const { data: profile } = await supabase.from('users').select('full_name, username').eq('id', user.id).single();
  return <VtcDriverApp driverName={profile?.full_name?.split(' ')[0] || profile?.username || 'Chauffeur'} />;
}
