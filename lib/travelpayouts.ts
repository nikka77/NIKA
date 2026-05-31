/**
 * Travelpayouts affiliate integration — NIKA STAY
 *
 * Setup:
 *   1. Crée un compte sur https://www.travelpayouts.com
 *   2. Récupère ton marker dans Paramètres → API
 *   3. Ajoute dans .env.local :
 *        NEXT_PUBLIC_TP_MARKER=123456
 *   4. Rejoins le programme Booking.com via Travelpayouts pour l'AID
 */

const MARKER = process.env.NEXT_PUBLIC_TP_MARKER || '';

// AID Booking.com attribué via le programme Travelpayouts
const BOOKING_AID = '304142';

/**
 * URL de recherche hôtels Hotellook (moteur de Travelpayouts)
 * Redirige vers Hotellook avec tracking affilié
 */
export function tpHotelSearch(
  destination: string,
  opts?: { checkIn?: string; checkOut?: string; guests?: number }
): string {
  const p: Record<string, string> = {
    destination,
    locale: 'fr',
    currency: 'EUR',
  };
  if (MARKER) p.marker = MARKER;
  if (opts?.checkIn) p.checkIn = opts.checkIn;
  if (opts?.checkOut) p.checkOut = opts.checkOut;
  if (opts?.guests) p.adults = String(opts.guests);
  return `https://hotellook.com/search?${new URLSearchParams(p)}`;
}

/**
 * Ajoute l'affiliation Travelpayouts à une URL Booking.com
 */
export function tpBookingLink(url: string): string {
  if (!MARKER) return url;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://www.booking.com`);
    u.searchParams.set('aid', BOOKING_AID);
    u.searchParams.set('label', `nika-${MARKER}`);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Transforme n'importe quelle URL d'hébergement en lien affilié
 * Booking.com → affiliate AID | Autres → Hotellook search
 */
export function tpAffilLink(url: string, fallbackDestination?: string): string {
  // URL générique (homepage Booking) → recherche Hotellook sur la destination
  if (!url || url === 'https://www.booking.com' || url === 'https://booking.com') {
    return fallbackDestination ? tpHotelSearch(fallbackDestination) : '#';
  }
  if (url.includes('booking.com')) return tpBookingLink(url);
  if (url.includes('hotellook.com') && MARKER) {
    const u = new URL(url);
    u.searchParams.set('marker', MARKER);
    return u.toString();
  }
  // Airbnb / autres → Hotellook search sur la destination
  if (fallbackDestination) return tpHotelSearch(fallbackDestination);
  return url;
}
