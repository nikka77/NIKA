// lib/autoData.ts — données démo du module AUTO, positionnées autour de l'utilisateur.
// Chaque entité a un offset (dx,dy en degrés) appliqué aux coords GPS → pin sur la carte.
// Les ETA sont DÉRIVÉS de la distance réelle (haversine) → cohérence pin ↔ temps affiché.

export type LngLat = { lng: number; lat: number };
export type Driver = { id: string; name: string; car: string; rating: number; dx: number; dy: number };
export type Rental = { id: string; company: string; model: string; price: string; mode: 'Livraison' | 'Retrait'; dx: number; dy: number };
export type Tow = { id: string; name: string; rating: number; dx: number; dy: number };

// ~0.001° ≈ 80–110 m à la latitude de Nice. Offsets répartis dans 4 directions
// ⇒ chauffeurs à 2–8 min, bien étalés sur la carte.
export const DRIVERS: Driver[] = [
  { id: 'd1', name: 'Karim', car: 'Tesla Model 3', rating: 4.9, dx: 0.006, dy: 0.005 },     // ~2 min, NE
  { id: 'd2', name: 'Sofia', car: 'Mercedes Classe E', rating: 4.8, dx: -0.012, dy: 0.010 }, // ~4 min, NO
  { id: 'd3', name: 'Yanis', car: 'Peugeot 508', rating: 4.7, dx: 0.018, dy: -0.015 },       // ~6 min, SE
  { id: 'd4', name: 'Léa', car: 'Renault Zoé', rating: 4.9, dx: -0.020, dy: -0.018 },        // ~7 min, SO
];
export const RENTALS: Rental[] = [
  { id: 'r1', company: 'Nice Auto Loc', model: 'Renault Clio', price: '39 €/j', mode: 'Livraison', dx: 0.009, dy: -0.006 },
  { id: 'r2', company: 'Riviera Rent', model: 'Fiat 500 cabrio', price: '59 €/j', mode: 'Retrait', dx: -0.014, dy: 0.011 },
  { id: 'r3', company: 'AzurCars', model: 'Tesla Model 3', price: '95 €/j', mode: 'Livraison', dx: 0.006, dy: 0.017 },
];
export const TOWS: Tow[] = [
  { id: 't1', name: 'NICA Dépannage', rating: 4.8, dx: 0.016, dy: 0.004 },
  { id: 't2', name: 'SOS Auto 06', rating: 4.6, dx: -0.013, dy: -0.019 },
];

export const offsetPos = (c: LngLat, o: { dx: number; dy: number }): [number, number] => [c.lng + o.dx, c.lat + o.dy];

// Distance haversine (km)
export function distKm(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const R = 6371, toR = Math.PI / 180;
  const dLa = (bLat - aLat) * toR, dLo = (bLng - aLng) * toR;
  const la1 = aLat * toR, la2 = bLat * toR;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// ETA ville (~22 km/h) en minutes, plancher 1.
export const etaMin = (km: number): number => Math.max(1, Math.round((km / 22) * 60));
// Estimation prix VTC NIKA : base 4 € + 1,7 €/km (commission < 5 %, indicatif).
export const priceVtc = (km: number): number => Math.round((4 + km * 1.7) * 10) / 10;
