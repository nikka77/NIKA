import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  // Outil pro/admin : consomme le quota Google Places (clé serveur) → exige une session.
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL requise' }, { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 });

  // Extract place_id from URL or use search
  let placeId = '';
  const cidMatch = url.match(/cid=(\d+)/);
  const placeMatch = url.match(/place_id=([A-Za-z0-9_-]+)/);

  if (placeMatch) {
    placeId = placeMatch[1];
  } else if (cidMatch) {
    // Convert CID to place_id via Find Place API
    const findRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${cidMatch[1]}&inputtype=textquery&key=${apiKey}`
    );
    const findData = await findRes.json();
    placeId = findData.candidates?.[0]?.place_id || '';
  }

  if (!placeId) {
    return NextResponse.json({ error: 'Impossible de trouver le lieu depuis cette URL' }, { status: 404 });
  }

  const fields = 'name,formatted_address,geometry,photos,opening_hours,rating,formatted_phone_number';
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`
  );
  const data = await res.json();

  if (data.status !== 'OK') {
    return NextResponse.json({ error: 'Lieu non trouvé' }, { status: 404 });
  }

  const result = data.result;
  return NextResponse.json({
    name: result.name,
    formatted_address: result.formatted_address,
    lat: result.geometry?.location?.lat,
    lng: result.geometry?.location?.lng,
    rating: result.rating,
    phone: result.formatted_phone_number,
    place_id: placeId,
    opening_hours: result.opening_hours?.weekday_text,
  });
}
