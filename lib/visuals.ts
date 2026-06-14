// lib/visuals.ts — Manifeste des visuels gamifiés générés (Higgsfield)
//
// Tant qu'un slug n'est PAS listé dans GENERATED, les composants retombent
// proprement sur l'emoji-podium. Dès qu'un asset est produit, ajouter sa clé
// ici (`groupe/slug`) → l'image clé + le loop 360° s'affichent automatiquement.
//
// Convention de fichiers (voir tasks/visual-assets-prompts.md) :
//   public/images/<groupe>/<slug>.webp       (image clé / poster)
//   public/images/<groupe>/<slug>-360.webm   (loop 360°)

export const ASSET_BASE = '/images';

// Images clés générées (Higgsfield + remove_background → webp alpha).
const GENERATED = new Set<string>([
  // Icônes des 9 domaines
  'domains/food', 'domains/auto', 'domains/stay', 'domains/azur', 'domains/rent',
  'domains/serv', 'domains/learn', 'domains/sec', 'domains/news',
  // Plats RAKOMORIA (16)
  'food/rakomoria/couscousma', 'food/rakomoria/riz-sauce-rouge-boeuf', 'food/rakomoria/foutra-burger',
  'food/rakomoria/riz-viande-rougai', 'food/rakomoria/gratin-pates', 'food/rakomoria/riz-legumes-boeuf',
  'food/rakomoria/tacos-tenders', 'food/rakomoria/tacos-viande-hachee', 'food/rakomoria/cheese-burger',
  'food/rakomoria/chicken-burger', 'food/rakomoria/tasty-croust', 'food/rakomoria/triangle',
  'food/rakomoria/wrakos', 'food/rakomoria/samboussa', 'food/rakomoria/jus-tamarin',
  'food/rakomoria/jus-gingembre',
  // Catégories FOOD
  'food/cats/restaurant', 'food/cats/fastfood', 'food/cats/pizzeria', 'food/cats/boulangerie',
  'food/cats/sushi', 'food/cats/vegan', 'food/cats/foodtruck', 'food/cats/cave',
  // Catégories RENT
  'rent/cats/sport', 'rent/cats/bricolage', 'rent/cats/photo', 'rent/cats/camping',
  'rent/cats/materiel', 'rent/cats/vehicule',
  // Catégories SERV
  'serv/cats/plomberie', 'serv/cats/electricite', 'serv/cats/menage', 'serv/cats/jardinage',
  'serv/cats/demenagement', 'serv/cats/informatique', 'serv/cats/serrurerie', 'serv/cats/peinture',
  // Catégories LEARN
  'learn/cats/sport', 'learn/cats/langue', 'learn/cats/musique', 'learn/cats/cuisine',
  'learn/cats/code', 'learn/cats/art', 'learn/cats/surf', 'learn/cats/yoga',
  // Catégories SEC
  'sec/cats/gardiennage', 'sec/cats/serrurerie', 'sec/cats/alarme', 'sec/cats/coffre',
  'sec/cats/protection', 'sec/cats/cybersecu',
  // Plats afroweek06
  'food/afroweek06/thieboudienne', 'food/afroweek06/poulet-yassa', 'food/afroweek06/mafe',
  'food/afroweek06/vermicelles', 'food/afroweek06/thieboli-yapp', 'food/afroweek06/pastels',
  'food/afroweek06/bissap',
  // Cartes phygitales NFC (20)
  'nfc/depanneur', 'nfc/vtc', 'nfc/fidelite', 'nfc/caution-free', 'nfc/skipper',
  'nfc/beach', 'nfc/serrurier', 'nfc/pass', 'nfc/foodtruck', 'nfc/wellness',
  'nfc/aqua', 'nfc/boulangerie', 'nfc/stay', 'nfc/artisan', 'nfc/watertaxi',
  'nfc/coach', 'nfc/legacy', 'nfc/sommelier', 'nfc/concierge', 'nfc/bbq',
  // Médailles classement (podium top 3)
  'ranks/or', 'ranks/argent', 'ranks/bronze',
  // Icônes thèmes STAY (logements insolites)
  'stay/themes/silo-bunker', 'stay/themes/sous-marin', 'stay/themes/maison-hobbit',
  'stay/themes/tour-observation', 'stay/themes/bulle-transparente',
  'stay/themes/architecture-surrealiste', 'stay/themes/maison-terre',
  // Avatar agent NIKO (idle / active)
  'niko/niko-idle', 'niko/niko-active',
  // Héros cinématiques par domaine (fonds de section)
  'heroes/food', 'heroes/auto', 'heroes/stay', 'heroes/azur', 'heroes/rent',
  'heroes/serv', 'heroes/learn', 'heroes/sec', 'heroes/news',
  // Héros page d'accueil (Côte d'Azur)
  'heroes/home',
]);

// Sous-ensemble disposant EN PLUS d'un loop 360° (.webm). Ajouter quand la vidéo existe.
const VIDEOS_360 = new Set<string>([
  // 'token/nika-coin',
]);

// Sous-ensemble disposant EN PLUS d'un loop vidéo ambiant (.mp4, joué au scroll
// via <ScrollVideo>). Fichier attendu : public/images/<groupe>/<slug>.mp4
const LOOP_VIDEOS = new Set<string>([
  'heroes/home', 'heroes/food', 'heroes/azur', 'heroes/auto',
]);

export interface VisualAsset {
  poster?: string;
  video?: string;
}

/** Retourne poster (image clé) + video (loop 360° si dispo), sinon {} (→ fallback emoji). */
export function visual(group: string, slug: string): VisualAsset {
  const key = `${group}/${slug}`;
  if (!GENERATED.has(key)) return {};
  const asset: VisualAsset = { poster: `${ASSET_BASE}/${group}/${slug}.webp` };
  if (VIDEOS_360.has(key)) asset.video = `${ASSET_BASE}/${group}/${slug}-360.webm`;
  else if (LOOP_VIDEOS.has(key)) asset.video = `${ASSET_BASE}/${group}/${slug}.mp4`;
  return asset;
}
