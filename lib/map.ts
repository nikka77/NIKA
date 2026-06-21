// lib/map.ts — configuration carte MapLibre GL (remplace Leaflet).
// Style vectoriel CARTO « dark-matter-nolabels » : sombre, sans étiquettes
// (look minimap GTA), open-source, gratuit, SANS clé API. Les POI NIKA sont
// les seuls repères. MapLibre = même moteur que le globe du héros.
// ⚠️ MapLibre utilise l'ordre [lng, lat] (GeoJSON), pas [lat, lng] comme Leaflet.

export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

// Centre de Nice en [lng, lat]
export const NICE: [number, number] = [7.262, 43.7102];

export const POI_COLORS: Record<string, string> = {
  food: '#D4A017', auto: '#0094D4', azur: '#0868A0', sec: '#D44B24', secu: '#D44B24',
  stay: '#E07038', serv: '#0EA878', learn: '#7B5CF0', rent: '#5A88B0',
  news: '#5A88B0', general: '#5A88B0',
};
export const POI_ICONS: Record<string, string> = {
  food: '🍽️', auto: '🚗', azur: '🛥️', sec: '🔒', secu: '🔒', stay: '🏡',
  serv: '🔧', learn: '📚', rent: '📦', news: '📡', general: '📍',
};

// Élément DOM d'un marqueur (pastille NIKA) pour `new maplibregl.Marker({ element })`.
// (MapLibre n'a pas de divIcon comme Leaflet — on fournit un vrai nœud DOM.)
export function markerEl(category: string): HTMLDivElement {
  const color = POI_COLORS[category] || POI_COLORS.general;
  const icon = POI_ICONS[category] || POI_ICONS.general;
  const el = document.createElement('div');
  el.className = 'nika-poi';
  el.dataset.cat = category;
  el.style.cssText =
    `width:32px;height:32px;border-radius:50%;background:${color}26;border:2px solid ${color};` +
    `display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;` +
    `box-shadow:0 2px 10px rgba(0,0,0,.5)`;
  el.textContent = icon;
  return el;
}

export function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
