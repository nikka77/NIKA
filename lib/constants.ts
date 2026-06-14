export const XP_ACTIONS = {
  DAILY_LOGIN: 20,
  PROFILE_COMPLETE: 100,
  FIRST_ORDER: 80,
  ORDER: 30,
  REVIEW_LEFT: 50,
  POI_CREATED: 80,
  POI_APPROVED: 40,
  NEWS_PUBLISHED: 100,
  NEWS_UPVOTE_RECEIVED: 5,
  INVITATION_ACCEPTED: 150,
  SEARCH_FIRST: 10,
  MAP_USED: 15,
  CHECKIN: 25,
  CHALLENGE_COMPLETED: 150,
} as const;

export const LEVELS = [
  { n: 1,  name: 'Inconnu',      minXP: 0,     badge: '/images/levels/1-inconnu.webp' },
  { n: 2,  name: 'Curieux',      minXP: 200,   badge: '/images/levels/2-curieux.webp' },
  { n: 3,  name: 'Local',        minXP: 600,   badge: '/images/levels/3-local.webp' },
  { n: 4,  name: 'Connecté',     minXP: 1500,  badge: '/images/levels/4-connecte.webp' },
  { n: 5,  name: 'Ancré',        minXP: 3000,  badge: '/images/levels/5-ancre.webp' },
  { n: 6,  name: 'Régulier',     minXP: 6000,  badge: '/images/levels/6-regulier.webp' },
  { n: 7,  name: 'Habitué',      minXP: 11000, badge: '/images/levels/7-habitue.webp' },
  { n: 8,  name: 'Connaisseur',  minXP: 20000, badge: '/images/levels/8-connaisseur.webp' },
  { n: 9,  name: 'Insider',      minXP: 35000, badge: '/images/levels/9-insider.webp' },
  { n: 10, name: 'Légende',      minXP: 60000, badge: '/images/levels/10-legende.webp' },
] as const;

export function getLevelFromXP(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

/** Badge médaille d'un niveau, identifié par son nom (ex. "Local"). */
export function levelBadge(name: string): string | undefined {
  return LEVELS.find(l => l.name === name)?.badge;
}

export const DOMAINS = [
  { slug: 'food',  label: 'FOOD',  icon: '🍽️', num: '01', color: '#D4A017', desc: 'Alimentation' },
  { slug: 'auto',  label: 'AUTO',  icon: '🚗', num: '02', color: '#0094D4', desc: 'Automobile & VTC' },
  { slug: 'stay',  label: 'STAY',  icon: '🏡', num: '03', color: '#E07038', desc: 'Logement insolite' },
  { slug: 'azur',  label: 'AZUR',  icon: '🛥️', num: '04', color: '#0868A0', desc: 'Mer & Bateaux' },
  { slug: 'rent',  label: 'RENT',  icon: '📦', num: '05', color: '#5A88B0', desc: 'Location matériel' },
  { slug: 'serv',  label: 'SERV',  icon: '🔧', num: '06', color: '#0EA878', desc: 'Services' },
  { slug: 'learn', label: 'LEARN', icon: '📚', num: '07', color: '#7B5CF0', desc: 'Compétences' },
  { slug: 'sec',   label: 'SEC',   icon: '🔒', num: '08', color: '#D44B24', desc: 'Sécurité' },
  { slug: 'news',  label: 'NEWS',  icon: '📡', num: '09', color: '#5A88B0', desc: 'Actualités' },
] as const;

export type DomainSlug = typeof DOMAINS[number]['slug'];

export const NFC_ITEMS = [
  { n: '01', name: 'DÉPANNEUR',    slug: 'depanneur',    icon: '🔑', color: '#0094D4' },
  { n: '02', name: 'VTC',          slug: 'vtc',          icon: '🚖', color: '#0094D4' },
  { n: '03', name: 'FIDÉLITÉ',     slug: 'fidelite',     icon: '⭐', color: '#D4A017' },
  { n: '04', name: 'CAUTION-FREE', slug: 'caution-free', icon: '🔓', color: '#F0C040' },
  { n: '05', name: 'SKIPPER',      slug: 'skipper',      icon: '⚓', color: '#0868A0' },
  { n: '06', name: 'BEACH CLUB',   slug: 'beach',        icon: '🏖️', color: '#E07038' },
  { n: '07', name: 'SERRURIER',    slug: 'serrurier',    icon: '🗝️', color: '#D44B24' },
  { n: '08', name: 'NIKA PASS',    slug: 'pass',         icon: '🎖️', color: '#F0C040' },
  { n: '09', name: 'FOOD TRUCK',   slug: 'foodtruck',    icon: '🚚', color: '#D4A017' },
  { n: '10', name: 'WELLNESS',     slug: 'wellness',     icon: '🌸', color: '#7B5CF0' },
  { n: '11', name: 'AQUA DIVE',    slug: 'aqua',         icon: '🤿', color: '#0868A0' },
  { n: '12', name: 'BOULANGERIE',  slug: 'boulangerie',  icon: '🥐', color: '#D4A017' },
  { n: '13', name: 'STAY INSOLITE',slug: 'stay',         icon: '🏡', color: '#E07038' },
  { n: '14', name: 'ARTISAN',      slug: 'artisan',      icon: '🔨', color: '#0EA878' },
  { n: '15', name: 'WATER TAXI',   slug: 'watertaxi',    icon: '⛵', color: '#0868A0' },
  { n: '16', name: 'COACH SPORT',  slug: 'coach',        icon: '💪', color: '#0EA878' },
  { n: '17', name: 'LEGACY',       slug: 'legacy',       icon: '👑', color: '#F0C040' },
  { n: '18', name: 'SOMMELIER',    slug: 'sommelier',    icon: '🍷', color: '#7B5CF0' },
  { n: '19', name: 'CONCIERGE',    slug: 'concierge',    icon: '🛎️', color: '#0094D4' },
  { n: '20', name: 'BBQ BOARD',    slug: 'bbq',          icon: '🍖', color: '#D44B24' },
] as const;
