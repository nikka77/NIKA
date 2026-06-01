import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XP_ACTIONS, LEVELS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { userId, action } = await req.json();
    if (!userId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const xpAmount = XP_ACTIONS[action as keyof typeof XP_ACTIONS];
    if (!xpAmount) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

    const supabase = createClient(url, key);

    // Log transaction
    await supabase.from('xp_transactions').insert({ user_id: userId, action, xp_amount: xpAmount });

    // Get current XP
    const { data: user } = await supabase.from('users').select('xp').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const newXP = user.xp + xpAmount;

    // Calculate new level
    let newLevel: typeof LEVELS[number] = LEVELS[0];
    for (const lvl of LEVELS) {
      if (newXP >= lvl.minXP) newLevel = lvl;
    }

    // Update user
    await supabase.from('users').update({
      xp: newXP,
      level: newLevel.n,
      level_name: newLevel.name,
    }).eq('id', userId);

    return NextResponse.json({ xp: newXP, xpGained: xpAmount, level: newLevel });
  } catch (err) {
    console.error('[xp]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
