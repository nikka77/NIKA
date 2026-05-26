import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#050C17',
        bg2: '#09152A',
        bg3: '#0E1F3A',
        sand: '#F0E8D4',
        az: '#0094D4',
        az2: '#00C2FF',
        gold: '#D4A017',
        gold2: '#F0C040',
        coral: '#D44B24',
        teal: '#0EA878',
        purple: '#7B5CF0',
        amber: '#E07038',
        sea: '#0868A0',
        slate: '#5A88B0',
        td: '#EBE5D6',
        td2: '#7A90A8',
        td3: '#3A5068',
        tl: '#0E1F3A',
        tl2: '#3A5870',
      },
      fontFamily: {
        bebas: ['Bebas Neue', 'Arial Black', 'sans-serif'],
        exo: ['Exo 2', 'Arial Black', 'sans-serif'],
        outfit: ['Outfit', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
