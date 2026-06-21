// app/api/badge/[number]/route.ts — badge NIKA en SVG (style examen Hunter x Hunter).
// Disque blanc ovale, numéro massif Bebas Neue, pastille KYC, bandeaux NIKA / tier.
// Ex: /api/badge/77?tier=pioneer&kyc=2
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Embarque Bebas Neue (best effort). Les SVG chargés en <img> n'acceptent pas les
// polices externes ; une data-URI marche sur la plupart des navigateurs, sinon
// fallback condensé système (Impact) pour garder le look HxH.
let FONT_FACE = '';
try {
  const p = join(process.cwd(), 'node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2');
  FONT_FACE = `@font-face{font-family:'Bebas Neue';src:url(data:font/woff2;base64,${readFileSync(p).toString('base64')}) format('woff2');font-weight:400;font-style:normal;}`;
} catch {
  FONT_FACE = '';
}

const FAMILY = "'Bebas Neue', Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
const TIER_LABEL: Record<string, string> = { founder: 'FONDATEUR', pioneer: 'PIONNIER', initie: 'INITIÉ', member: 'MEMBRE' };
const KYC_COLOR: Record<number, string> = { 1: '#9AA3AD', 2: '#0094D4', 3: '#D4A017' };

// Taille adaptive : gros pour 1-2 chiffres, plus petit au-delà.
function numberFontSize(digits: number): number {
  if (digits <= 2) return 122;
  if (digits === 3) return 94;
  if (digits === 4) return 72;
  return 58;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const { number: numParam } = await params;
  const sp = req.nextUrl.searchParams;
  const number = (sp.get('number') ?? numParam ?? '0').replace(/[^0-9]/g, '') || '0';
  const tier = sp.get('tier') ?? 'member';
  const kyc = Math.max(0, Math.min(3, Number.parseInt(sp.get('kyc') ?? '0', 10) || 0));

  const tierLabel = TIER_LABEL[tier] ?? 'MEMBRE';
  const fontSize = numberFontSize(number.length);
  const pastille = kyc >= 1
    ? `<circle cx="196" cy="150" r="14" fill="${KYC_COLOR[kyc]}" stroke="#0B0B0B" stroke-width="2"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" width="240" height="200" role="img" aria-label="Badge NIKA numéro ${number}, ${tierLabel}, KYC ${kyc}">
  <style>${FONT_FACE}text{font-family:${FAMILY};fill:#0B0B0B;}</style>
  <ellipse cx="120" cy="100" rx="117" ry="97" fill="#FFFFFF" stroke="#0B0B0B" stroke-width="2"/>
  <text x="120" y="33" text-anchor="middle" font-size="17" letter-spacing="3">NIKA</text>
  <text x="120" y="102" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" letter-spacing="1">#${number}</text>
  <text x="120" y="181" text-anchor="middle" font-size="15" letter-spacing="2">${tierLabel}</text>
  ${pastille}
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // Badge déterministe par (number, tier, kyc) → immutable : la police embarquée
      // (~21 Ko) ne transite qu'une fois par URL, puis cache CDN/navigateur.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
