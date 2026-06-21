// app/api/kyc/complete/route.ts — valide un niveau KYC et crédite les $NIKKA.
// POST { level: 1 | 2 | 3 }. Exige que le niveau précédent soit complété.
// Mise à jour AUTORITAIRE via le client admin (service role) → la récompense ne
// dépend pas de la RLS (qui autorise l'auto-update du profil).
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const REWARDS: Record<number, number> = { 1: 50, 2: 100, 3: 200 };

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) return Response.json({ error: 'Service indisponible' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const level = Number(body?.level);
  if (![1, 2, 3].includes(level)) return Response.json({ error: 'Niveau invalide' }, { status: 400 });

  const { data: me } = await supabase.from('users').select('kyc_level, nika_credits').eq('id', user.id).single();
  if (!me) return Response.json({ error: 'Profil introuvable' }, { status: 404 });

  const current = me.kyc_level ?? 0;
  if (level <= current) return Response.json({ error: 'Niveau déjà atteint', kyc_level: current }, { status: 409 });
  if (level !== current + 1) return Response.json({ error: 'Niveau précédent requis', kyc_level: current }, { status: 409 });

  const reward = REWARDS[level];
  const nika_credits = (me.nika_credits ?? 0) + reward; // ne descend jamais
  const patch: Record<string, unknown> = { kyc_level: level, nika_credits };
  if (level >= 2) { patch.is_verified = true; patch.verified_at = new Date().toISOString(); }

  // Écriture STRICTEMENT autoritaire via service-role : les colonnes kyc/credits sont
  // protégées par trigger côté DB ; jamais de repli sur la session client.
  const admin = createAdminClient();
  if (!admin) return Response.json({ error: 'Service de récompense indisponible' }, { status: 503 });
  const { error } = await admin.from('users').update(patch).eq('id', user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, kyc_level: level, reward, nika_balance: nika_credits });
}
