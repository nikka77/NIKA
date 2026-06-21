import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { XP_ACTIONS, LEVELS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json().catch(() => ({}));
    const xpAmount = XP_ACTIONS[action as keyof typeof XP_ACTIONS];
    if (!xpAmount) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    // Identité = session serveur, JAMAIS un userId fourni par le client (IDOR).
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Écriture autoritaire via service-role (xp/level sont des colonnes protégées).
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    const userId = authUser.id;

    await admin.from('xp_transactions').insert({ user_id: userId, action, xp_amount: xpAmount });

    const { data: u } = await admin.from('users').select('xp').eq('id', userId).single();
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const newXP = (u.xp ?? 0) + xpAmount;
    let newLevel: typeof LEVELS[number] = LEVELS[0];
    for (const lvl of LEVELS) if (newXP >= lvl.minXP) newLevel = lvl;

    await admin.from('users').update({ xp: newXP, level: newLevel.n, level_name: newLevel.name }).eq('id', userId);

    return NextResponse.json({ xp: newXP, xpGained: xpAmount, level: newLevel });
  } catch (err) {
    console.error('[xp]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
