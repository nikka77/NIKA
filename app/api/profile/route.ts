// app/api/profile/route.ts — mise à jour du profil du membre connecté.
// PATCH { full_name?, city?, bio?, avatar_url?, is_pro?, pro_domains? }
import { createClient } from '@/lib/supabase/server';

const VALID_DOMAINS = ['food', 'stay', 'azur', 'auto', 'serv'];

export async function PATCH(req: Request) {
  const supabase = await createClient();
  if (!supabase) return Response.json({ error: 'Service indisponible' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.full_name === 'string') patch.full_name = body.full_name.trim().slice(0, 80);
  if (typeof body.city === 'string') patch.city = body.city.trim().slice(0, 80);
  if (typeof body.bio === 'string') patch.bio = body.bio.trim().slice(0, 140); // 140 chars max
  if (typeof body.avatar_url === 'string') patch.avatar_url = body.avatar_url.trim().slice(0, 500);
  if (typeof body.is_pro === 'boolean') patch.is_pro = body.is_pro; // peut changer librement
  if (Array.isArray(body.pro_domains)) {
    patch.pro_domains = [...new Set(body.pro_domains.filter((d: unknown) => typeof d === 'string' && VALID_DOMAINS.includes(d)))];
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: 'Rien à mettre à jour' }, { status: 400 });

  // RLS « Own profile update » (auth.uid() = id) autorise ces champs de profil.
  const { data, error } = await supabase
    .from('users').update(patch).eq('id', user.id)
    .select('full_name, city, bio, avatar_url, is_pro, pro_domains').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, profile: data });
}
