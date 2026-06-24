// lib/stayData.ts — Données STAY (module in-hero).
// 4 catégories : Location (€/nuit) · Achat-Vente (prix total) · Spots (lieux secrets communautaires) · Explore (WOW insolites).
// Données réalistes Côte d'Azur (Nice/Cannes/Antibes/Menton/Cap-Ferrat/…). Aucune vraie enseigne de marque.
// Les images réelles n'existent pas encore pour Location/Achat/Spots → repli dégradé + emoji (Thumb). Explore = vraies covers /images/wow.

/* ───────────────────────── Quartiers (filtre partagé Location + Achat) ───────────────────────── */
export const AREAS = ['Nice', 'Cannes', 'Antibes', 'Menton', 'Villefranche', 'Saint-Paul', 'Cap-Ferrat', 'Mougins'] as const;

/* ───────────────────────── LOCATION (€/nuit) ───────────────────────── */
export type RentKind = 'hotel' | 'appartement' | 'propriete';
export type Rental = {
  id: string; name: string; kind: RentKind; area: string; guests: number; bedrooms: number;
  rating: number; reviews: number; price: number; seaview: boolean; pool: boolean;
};
export const RENT_KINDS: { key: RentKind; label: string; emoji: string }[] = [
  { key: 'hotel', label: 'Hôtel', emoji: '🏨' },
  { key: 'appartement', label: 'Appartement', emoji: '🏢' },
  { key: 'propriete', label: 'Propriété', emoji: '🏡' },
];
const R = (id: string, name: string, kind: RentKind, area: string, guests: number, bedrooms: number, rating: number, reviews: number, price: number, seaview = false, pool = false): Rental =>
  ({ id, name, kind, area, guests, bedrooms, rating, reviews, price, seaview, pool });
export const RENTALS: Rental[] = [
  R('r1', 'Palais de la Mer', 'hotel', 'Nice', 2, 1, 4.8, 412, 240, true, true),
  R('r2', 'Hôtel Belle Époque', 'hotel', 'Cannes', 2, 1, 4.7, 388, 290, true, true),
  R('r3', 'Le Cap Riviera', 'hotel', 'Cap-Ferrat', 2, 1, 4.9, 256, 350, true, true),
  R('r4', 'Maison Azuréenne', 'hotel', 'Menton', 2, 1, 4.6, 190, 165, false, false),
  R('r5', 'Studio Vieux-Nice', 'appartement', 'Nice', 2, 1, 4.7, 321, 95),
  R('r6', 'Appart Croisette Vue Mer', 'appartement', 'Cannes', 4, 2, 4.8, 210, 180, true),
  R('r7', 'Loft Port Vauban', 'appartement', 'Antibes', 3, 1, 4.6, 145, 130),
  R('r8', 'Duplex Carré d’Or', 'appartement', 'Nice', 4, 2, 4.9, 178, 210, true),
  R('r9', 'Villa Les Oliviers', 'propriete', 'Saint-Paul', 8, 4, 4.9, 96, 690, false, true),
  R('r10', 'Mas Provençal', 'propriete', 'Mougins', 6, 3, 4.8, 74, 520, false, true),
  R('r11', 'Villa Cap Ferrat', 'propriete', 'Cap-Ferrat', 10, 5, 5.0, 52, 1200, true, true),
  R('r12', 'Bastide des Vignes', 'propriete', 'Saint-Paul', 6, 3, 4.7, 61, 430, false, true),
];
export const RENT_PRICE_MIN = Math.min(...RENTALS.map(r => r.price));
export const RENT_PRICE_MAX = Math.max(...RENTALS.map(r => r.price));

/* ───────────────────────── ACHAT / VENTE (prix total) ───────────────────────── */
export type SaleKind = 'appartement' | 'villa' | 'propriete' | 'terrain';
export type SaleProp = {
  id: string; name: string; kind: SaleKind; area: string; surface: number; bedrooms: number;
  price: number; seaview: boolean; pool: boolean;
};
export const SALE_KINDS: { key: SaleKind; label: string; emoji: string }[] = [
  { key: 'appartement', label: 'Appartement', emoji: '🏢' },
  { key: 'villa', label: 'Villa', emoji: '🏖️' },
  { key: 'propriete', label: 'Propriété', emoji: '🏰' },
  { key: 'terrain', label: 'Terrain', emoji: '🌿' },
];
const S = (id: string, name: string, kind: SaleKind, area: string, surface: number, bedrooms: number, price: number, seaview = false, pool = false): SaleProp =>
  ({ id, name, kind, area, surface, bedrooms, price, seaview, pool });
export const SALES: SaleProp[] = [
  S('s1', 'Studio Investissement', 'appartement', 'Nice', 32, 0, 215_000),
  S('s2', 'Terrain Constructible', 'terrain', 'Saint-Paul', 1200, 0, 480_000),
  S('s3', 'Appartement Vue Mer', 'appartement', 'Nice', 78, 2, 685_000, true),
  S('s4', 'Maison de Village', 'propriete', 'Saint-Paul', 160, 3, 920_000),
  S('s5', 'Mas Rénové', 'propriete', 'Mougins', 310, 5, 1_850_000, false, true),
  S('s6', 'Villa Contemporaine', 'villa', 'Mougins', 220, 4, 2_450_000, false, true),
  S('s7', 'Penthouse Croisette', 'appartement', 'Cannes', 130, 3, 3_900_000, true, true),
  S('s8', 'Villa Pieds dans l’eau', 'villa', 'Cap-Ferrat', 400, 6, 12_500_000, true, true),
];
export const SALE_PRICE_MIN = Math.min(...SALES.map(s => s.price));
export const SALE_PRICE_MAX = Math.max(...SALES.map(s => s.price));

/* ───────────────────────── SPOTS (lieux secrets communautaires) ─────────────────────────
   Modèle : le lieu est GRATUIT et public. On paie un petit « déverrouillage » à l'unité
   pour obtenir le GPS exact + les conseils du local. Le partageur plafonne le nombre de
   personnes (rareté → préserve le lieu du surtourisme). */
export type SpotTagKey = 'vue' | 'calme' | 'baignade' | 'ambiance' | 'original' | 'ombrage' | 'coucher' | 'sauvage';
export const SPOT_TAGS: { key: SpotTagKey; label: string; emoji: string }[] = [
  { key: 'vue', label: 'Jolie vue', emoji: '🌅' },
  { key: 'calme', label: 'Calme', emoji: '🤫' },
  { key: 'baignade', label: 'Baignade', emoji: '🏊' },
  { key: 'ambiance', label: 'Ambiance', emoji: '✨' },
  { key: 'original', label: 'Original', emoji: '🎭' },
  { key: 'ombrage', label: 'Ombragé', emoji: '🌳' },
  { key: 'coucher', label: 'Coucher de soleil', emoji: '🌇' },
  { key: 'sauvage', label: 'Sauvage', emoji: '🏝️' },
];
export const spotTag = (k: SpotTagKey) => SPOT_TAGS.find(t => t.key === k) ?? SPOT_TAGS[0];
export type Spot = {
  id: string; name: string; zone: string; tags: SpotTagKey[]; rating: number; reviews: number;
  capacity: number; taken: number; price: number; sharer: string;
};
const SP = (id: string, name: string, zone: string, tags: SpotTagKey[], rating: number, reviews: number, capacity: number, taken: number, price: number, sharer: string): Spot =>
  ({ id, name, zone, tags, rating, reviews, capacity, taken, price, sharer });
export const SPOTS: Spot[] = [
  SP('sp1', 'Crique des contrebandiers', 'Cap d’Antibes · côté est', ['baignade', 'calme', 'sauvage'], 4.9, 38, 20, 14, 2, 'Léa M.'),
  SP('sp2', 'Rocher du coucher de soleil', 'Èze · bord de mer', ['vue', 'coucher', 'calme'], 4.8, 51, 15, 9, 1, 'Marco P.'),
  SP('sp3', 'Calanque cachée de Théoule', 'Théoule-sur-Mer', ['baignade', 'sauvage', 'vue'], 4.7, 29, 25, 25, 3, 'Sofia R.'),
  SP('sp4', 'Sentier des oliviers oublié', 'Saint-Paul-de-Vence', ['calme', 'ombrage', 'original'], 4.6, 22, 30, 11, 1, 'Thomas G.'),
  SP('sp5', 'Belvédère secret sur Monaco', 'La Turbie', ['vue', 'coucher'], 4.9, 44, 12, 8, 2, 'Inès B.'),
  SP('sp6', 'Vasque fraîche du Loup', 'Gorges du Loup', ['baignade', 'original', 'sauvage'], 4.8, 33, 18, 6, 2, 'Hugo L.'),
  SP('sp7', 'Plage de galets oubliée', 'Villefranche-sur-Mer', ['baignade', 'calme', 'vue'], 4.7, 40, 22, 17, 1, 'Camille D.'),
  SP('sp8', 'Spot apéro sur les toits', 'Vieux-Nice', ['ambiance', 'vue', 'coucher'], 4.5, 27, 10, 7, 2, 'Yanis K.'),
];

/* ───────────────────────── EXPLORE (WOW insolites) ─────────────────────────
   Sélection curatée depuis data/wow_listings.json (vraies covers /images/wow/<slug>/<cover>). */
export type WowType = 'sous-marin' | 'bunker-militaire' | 'architecture-surréaliste' | 'train-reconverti'
  | 'maison-terre' | 'suite-flottante' | 'grotte' | 'tiny-house' | 'eco-cabin';
export const WOW_TYPE_EMOJI: Record<string, string> = {
  'sous-marin': '🟡', 'bunker-militaire': '🛡️', 'architecture-surréaliste': '🛸', 'train-reconverti': '🚂',
  'maison-terre': '🧱', 'suite-flottante': '⛵', 'grotte': '🕳️', 'tiny-house': '🛖', 'eco-cabin': '🌲',
};
export type Wow = { slug: string; name: string; type: WowType; place: string; score: number; price: number; cover: string };
const W = (slug: string, name: string, type: WowType, place: string, score: number, price: number, cover: string): Wow =>
  ({ slug, name, type, place, score, price, cover: `/images/wow/${slug}/${cover}` });
export const EXPLORE: Wow[] = [
  W('sous-marin-jaune-nouvelle-zelande', 'Sous-marin jaune', 'sous-marin', 'Nouvelle-Zélande', 25, 280, 'cover.jpg'),
  W('express-voiture-salon-14630-normandie', 'L’Express Voiture-Salon', 'train-reconverti', 'Normandie · France', 24, 195, 'cover.jpg'),
  W('ovni-guadalupe-vallee-baja', 'OVNI de Guadalupe', 'architecture-surréaliste', 'Mexique', 24, 285, 'gallery-01.jpg'), // cover = nuit étoilée → UFO crépuscule (cf. /stay)
  W('anthenea-suite-flottante-perros-guirec', 'Anthénéa, suite flottante', 'suite-flottante', 'Perros-Guirec · France', 23, 380, 'cover.jpeg'),
  W('silo-missiles-bunker-atlas-f-roswell', 'Silo à missiles Atlas F', 'bunker-militaire', 'Roswell · USA', 25, 320, 'gallery-01.jpg'), // cover = photo de soirée couple → silo (cf. /stay)
  W('grotte-nid2reve-savignac-perigord', 'La Grotte de Nid2Rêve', 'grotte', 'Périgord · France', 23, 145, 'cover.jpg'),
  W('cob-cottage-mayne-island-canada', 'Cob Cottage sculpté main', 'maison-terre', 'Canada', 24, 240, 'cover.jpg'),
  W('birdbox-lotsbergskaara-lote-nordfjord-norvege', 'Birdbox sur le fjord', 'tiny-house', 'Nordfjord · Norvège', 22, 420, 'cover.jpg'),
  W('maison-hobbit-saint-affrique-occitanie', 'Maison Hobbit', 'maison-terre', 'Occitanie · France', 22, 180, 'gallery-01.jpg'), // cover = terrasse → façade hobbit (cf. /stay)
  W('gawthornes-hut-top10-monde-mudgee-australie', 'Gawthorne’s Hut · top 10 monde', 'eco-cabin', 'Australie', 24, 390, 'cover.jpg'),
];

/* ───────────────────────── Format prix ───────────────────────── */
// Prix total Achat/Vente compacté : 215 000 € → « 215 k », 2 450 000 € → « 2,45 M ».
export function fmtPrice(n: number): { value: string; suffix: string } {
  if (n >= 1_000_000) return { value: (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace('.', ',').replace(',00', ''), suffix: 'M €' };
  if (n >= 1_000) return { value: Math.round(n / 1_000).toString(), suffix: 'k €' };
  return { value: n.toString(), suffix: '€' };
}
