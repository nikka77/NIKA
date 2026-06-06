// app/api/calendar/[slug]/route.ts
// Retourne les disponibilités d'un listing depuis Supabase
// GET /api/calendar/sous-marin-jaune-nouvelle-zelande?months=2

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Props = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  const { slug } = await params;
  const months = parseInt(request.nextUrl.searchParams.get('months') || '2');

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { slug, available_dates: [], unavailable_dates: [], last_sync: null, note: 'no_data' },
      { status: 200 }
    );
  }

  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth() + months, 0);

  const { data, error } = await supabase
    .from('stay_availability')
    .select('date, available, min_nights, price_native, currency, fetched_at')
    .eq('slug', slug)
    .gte('date', today.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    return NextResponse.json({
      slug,
      available_dates: [],
      unavailable_dates: [],
      last_sync: null,
      note: 'no_data',
    });
  }

  const available = data.filter(d => d.available).map(d => d.date);
  const unavailable = data.filter(d => !d.available).map(d => d.date);
  const lastSync = data[0]?.fetched_at;
  const minutesAgo = lastSync
    ? Math.round((Date.now() - new Date(lastSync).getTime()) / 60000)
    : null;

  return NextResponse.json({
    slug,
    available_dates: available,
    unavailable_dates: unavailable,
    min_nights: data.find(d => d.available)?.min_nights || null,
    currency: data.find(d => d.price_native)?.currency || null,
    last_sync: lastSync,
    sync_minutes_ago: minutesAgo,
    total_days: data.length,
  }, {
    // Cache 1h côté CDN
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  });
}
