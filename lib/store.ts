'use client';
import { create } from 'zustand';
import type { User } from './types';

interface MapStore {
  isOpen: boolean;
  openMap: () => void;
  closeMap: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  isOpen: false,
  openMap: () => set({ isOpen: true }),
  closeMap: () => set({ isOpen: false }),
}));

// ===== Pont barre du bas ↔ hero =====
// La barre du bas (globale) pilote la scène/module du hero (accueil) ; le hero publie
// le domaine actif. Sert au double-tap : 1er tap = ouvrir le module, 2e tap = page /domaine.
interface HeroNav {
  activeDomain: string | null;          // domaine affiché dans le hero (publié par le hero)
  setActiveDomain: (d: string | null) => void;
  pendingDomain: string | null;         // domaine demandé par la barre (consommé par le hero)
  requestDomain: (d: string | null) => void;
}
export const useHeroNav = create<HeroNav>((set) => ({
  activeDomain: null,
  setActiveDomain: (d) => set({ activeDomain: d }),
  pendingDomain: null,
  requestDomain: (d) => set({ pendingDomain: d }),
}));

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// ===== Géolocalisation partagée =====
// Source de vérité unique de la position de l'utilisateur, réutilisable par tous
// les services de proximité (livraison, VTC, dépannage, foodtruck/restos proches…).
// GPS haute précision + reverse-geocoding (Nominatim rue+n°, fallback BigDataCloud commune).
export type GeoCoords = { lat: number; lng: number; accuracy?: number };
export type GeoAddress = {
  label: string;        // concis : « 12 Promenade des Anglais » (rue + n°) ou commune
  houseNumber?: string;
  road?: string;
  city?: string;
  postcode?: string;
  full?: string;        // adresse complète (display_name)
};
export type GeoStatus = 'idle' | 'locating' | 'located' | 'denied' | 'unavailable';

async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
  // 1) Nominatim (OSM) — adresse précise rue + n°
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=fr`);
    if (r.ok) {
      const j = await r.json();
      const a = j.address || {};
      const road = a.road || a.pedestrian || a.footway || a.cycleway || a.path || a.neighbourhood;
      const city = a.city || a.town || a.village || a.municipality || a.suburb;
      const label = [a.house_number, road].filter(Boolean).join(' ') || road || a.suburb || city;
      if (label) return { label, houseNumber: a.house_number, road, city, postcode: a.postcode, full: j.display_name };
    }
  } catch { /* réseau/CORS → fallback */ }
  // 2) Fallback BigDataCloud — commune (sans clé)
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=fr`);
    if (r.ok) { const j = await r.json(); const city = j.city || j.locality; if (city) return { label: city, city, full: city }; }
  } catch { /* ignore */ }
  return null;
}

interface LocationStore {
  status: GeoStatus;
  coords: GeoCoords | null;
  address: GeoAddress | null;
  locate: () => void;
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  status: 'idle',
  coords: null,
  address: null,
  locate: () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { set({ status: 'unavailable' }); return; }
    if (get().status === 'locating') return;
    set({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: GeoCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        set({ coords });
        const address = await reverseGeocode(coords.lat, coords.lng);
        set({ address, status: 'located' });
      },
      (err) => set({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  },
}));
