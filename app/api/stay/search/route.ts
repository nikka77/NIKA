// app/api/stay/search/route.ts
// Smart search : trouve des logements dispo pour N nuits consécutives
// GET /api/stay/search?nights=3&from=2026-07-01&to=2026-07-31

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ nights: 3, from: '', to: '', count: 0, results: [] });
  }

  const p = req.nextUrl.searchParams;
  const nights = Math.max(1, Math.min(30, parseInt(p.get('nights') || '3')));
  const today  = new Date().toISOString().split('T')[0];
  const from   = p.get('from') || today;
  const to     = p.get('to')   || new Date(Date.now() + 60 * 864e5).toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('find_available_stays', {
    p_nights: nights,
    p_from:   from,
    p_to:     to,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    nights,
    from,
    to,
    count:   data?.length || 0,
    results: data || [],
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300' },
  });
}
