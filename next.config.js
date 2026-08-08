/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // .nosync : exclut le dossier de build de la sync iCloud Drive en LOCAL
  // (iCloud corrompt le cache Turbopack — manifests supprimés en plein write).
  // Sur Vercel (env VERCEL=1), garder ".next" car le builder l'attend en dur.
  distDir: process.env.VERCEL ? '.next' : '.next.nosync',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'a0.muscache.com' },
      { protocol: 'https', hostname: 'cf.bstatic.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  experimental: {
    optimizePackageImports: ['@anthropic-ai/sdk', '@supabase/supabase-js', '@supabase/ssr'],
  },
  async redirects() {
    return [
      { source: '/riviera', destination: '/azur', permanent: true },
      { source: '/riviera/:path*', destination: '/azur/:path*', permanent: true },
      { source: '/azur/services', destination: '/azur', permanent: true },
      { source: '/azur/bateau/:id', destination: '/azur', permanent: true },
      // 08/08/2026 — chantier doublets de conteneurs AKASHA (41 groupes fusionnés,
      // 42 slugs abandonnés). Trace : data/audits/doublets-conteneurs-trace.json.
      { source: '/learn/akasha/skypiea', destination: '/learn/akasha/skypiea-lieu', permanent: true },
      { source: '/learn/akasha/loguetown', destination: '/learn/akasha/loguetown-lieu', permanent: true },
      { source: '/learn/akasha/little-garden', destination: '/learn/akasha/little-garden-lieu', permanent: true },
      { source: '/learn/akasha/water-seven', destination: '/learn/akasha/water-seven-lieu', permanent: true },
      { source: '/learn/akasha/ile-de-drum', destination: '/learn/akasha/drum-island', permanent: true },
      { source: '/learn/akasha/ile-des-hommes-poissons', destination: '/learn/akasha/fishman-island', permanent: true },
      { source: '/learn/akasha/dressrosa', destination: '/learn/akasha/dressrosa-lieu', permanent: true },
      { source: '/learn/akasha/village-de-shimotsuki', destination: '/learn/akasha/shimotsuki-village', permanent: true },
      { source: '/learn/akasha/royaume-de-germa', destination: '/learn/akasha/germa-kingdom', permanent: true },
      { source: '/learn/akasha/alabasta', destination: '/learn/akasha/alabasta-lieu', permanent: true },
      { source: '/learn/akasha/enies-lobby', destination: '/learn/akasha/enies-lobby-lieu', permanent: true },
      { source: '/learn/akasha/east-blue-one-piece', destination: '/learn/akasha/east-blue', permanent: true },
      { source: '/learn/akasha/royaume-de-goa', destination: '/learn/akasha/goa-kingdom', permanent: true },
      { source: '/learn/akasha/green-bit', destination: '/learn/akasha/green-bit-op', permanent: true },
      { source: '/learn/akasha/impel-down', destination: '/learn/akasha/impel-down-lieu', permanent: true },
      { source: '/learn/akasha/royaume-de-lvneel', destination: '/learn/akasha/lvneel-kingdom', permanent: true },
      { source: '/learn/akasha/royaume-de-luvneel', destination: '/learn/akasha/lvneel-kingdom', permanent: true },
      { source: '/learn/akasha/ohara', destination: '/learn/akasha/ohara-lieu', permanent: true },
      { source: '/learn/akasha/punk-hazard', destination: '/learn/akasha/punk-hazard-lieu', permanent: true },
      { source: '/learn/akasha/reverse-mountain', destination: '/learn/akasha/reverse-mountain-lieu', permanent: true },
      { source: '/learn/akasha/long-ring-long-land', destination: '/learn/akasha/long-ring-long-land-op', permanent: true },
      { source: '/learn/akasha/thriller-bark', destination: '/learn/akasha/thriller-bark-lieu', permanent: true },
      { source: '/learn/akasha/weatheria', destination: '/learn/akasha/weatheria-op', permanent: true },
      { source: '/learn/akasha/royaume-de-prodence', destination: '/learn/akasha/prodence-kingdom', permanent: true },
      { source: '/learn/akasha/gotei-13-bleach', destination: '/learn/akasha/gotei-13', permanent: true },
      { source: '/learn/akasha/baggy-s-delivery', destination: '/learn/akasha/buggy-s-delivery', permanent: true },
      { source: '/learn/akasha/royaume-de-mogalo', destination: '/learn/akasha/mogaro-kingdom', permanent: true },
      { source: '/learn/akasha/archipel-de-boing', destination: '/learn/akasha/boin-archipelago', permanent: true },
      { source: '/learn/akasha/erbaf', destination: '/learn/akasha/elbaf', permanent: true },
      { source: '/learn/akasha/l-equipage-des-marquereaux', destination: '/learn/akasha/l-equipage-des-maquereaux', permanent: true },
      { source: '/learn/akasha/shells-town', destination: '/learn/akasha/shells-town-op', permanent: true },
      { source: '/learn/akasha/archipel-des-sabaody', destination: '/learn/akasha/sabaody', permanent: true },
      { source: '/learn/akasha/baterilla', destination: '/learn/akasha/baterilla-island', permanent: true },
      { source: '/learn/akasha/baratie', destination: '/learn/akasha/baratie-lieu', permanent: true },
      { source: '/learn/akasha/chapeau-de-paille', destination: '/learn/akasha/l-equipage-du-chapeau-de-paille', permanent: true },
      { source: '/learn/akasha/archipel-conomi', destination: '/learn/akasha/conomi-islands', permanent: true },
      { source: '/learn/akasha/archipel-des-gecko', destination: '/learn/akasha/gecko-islands', permanent: true },
      { source: '/learn/akasha/cap-des-jumeaux', destination: '/learn/akasha/twin-cape', permanent: true },
      { source: '/learn/akasha/ile-aux-cactus', destination: '/learn/akasha/cactus-island', permanent: true },
      { source: '/learn/akasha/ile-des-animaux-etranges', destination: '/learn/akasha/island-of-rare-animals', permanent: true },
      { source: '/learn/akasha/pays-des-wa', destination: '/learn/akasha/wano', permanent: true },
      { source: '/learn/akasha/zo', destination: '/learn/akasha/zou', permanent: true },
    ];
  },
};

module.exports = nextConfig;
