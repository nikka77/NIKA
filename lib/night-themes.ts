// lib/night-themes.ts — identités visuelles des enseignes « Food de nuit » (indexées par slug).
// Source unique partagée par la carte (NightProviderCard) ET la page commande du pro.
export type NightDish = { name: string; img: string };
export type NightTheme = {
  name?: string;      // nom d'affichage (sinon provider.name) — ex. « AFROWEEK » vs handle
  accent: string;     // couleur principale (bordure, CTA)
  accent2: string;    // secondaire (accroche, accents)
  flag?: string;      // drapeau (remplace la mention « cuisine … »)
  tagline?: string;   // accroche courte (si pas de drapeau)
  dishes: NightDish[]; // 1 plat + 1 accompagnement + 1 boisson (vignettes images)
  bg?: string;        // motif de fond généré (Higgsfield)
  logo?: string;      // logo détouré de l'enseigne
};

export const NIGHT_THEMES: Record<string, NightTheme> = {
  rakomoriafood: {
    accent: '#0E9E8E', accent2: '#F2B705',
    flag: '🇰🇲',
    dishes: [
      { name: 'Riz viande rougaï', img: '/images/food/rakomoria/riz-viande-rougai.webp' },
      { name: 'Samboussa', img: '/images/food/rakomoria/samboussa.webp' },
      { name: 'Jus de Tamarin', img: '/images/food/rakomoria/jus-tamarin.webp' },
    ],
    bg: '/images/food/nuit/rakomoria-bg.jpg',
    logo: '/images/food/nuit/rakomoria-logo.png',
  },
  afroweek06: {
    name: 'AFROWEEK',
    accent: '#E2571E', accent2: '#1FA35A',
    flag: '🇸🇳',
    dishes: [
      { name: 'Poulet Yassa', img: '/images/food/afroweek06/poulet-yassa.webp' },
      { name: 'Pastels', img: '/images/food/afroweek06/pastels.webp' },
      { name: 'Bissap', img: '/images/food/afroweek06/bissap.webp' },
    ],
    bg: '/images/food/nuit/afroweek-bg.jpg',
    logo: '/images/food/nuit/afroweek-logo.png',
  },
};
