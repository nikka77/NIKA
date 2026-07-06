// components/akasha/NarutoIcons.tsx — emblèmes & icônes AKASHA (SVG maison, sans dépendance, sans hotlink de logo).
// Natures de chakra, blasons de clan, emblèmes de village (kanji du pays).
import type { ReactNode } from 'react';

// ─── Natures de chakra ───────────────────────────────────────────────
const NATURES: { match: RegExp; label: string; color: string; glyph: ReactNode }[] = [
  { match: /fire|katon/i, label: 'Feu', color: '#D44B24',
    glyph: <path d="M12 2c.8 3.2-1.8 4.6-1.8 7.2a1.8 1.8 0 003.6.2c0-.9-.2-1.6-.6-2.4 2 1.1 3.3 3.2 3.3 5.6a6.5 6.5 0 11-12.2 0C4.3 8 9 6.4 12 2z" /> },
  { match: /wind|f[uū]ton/i, label: 'Vent', color: '#0EA878',
    glyph: <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 8h8a2 2 0 10-2-2" /><path d="M3 12h12a2.2 2.2 0 11-2.2 2.3" /><path d="M3 16h7a1.9 1.9 0 11-1.9 1.9" /></g> },
  { match: /lightning|raiton/i, label: 'Foudre', color: '#F0C040',
    glyph: <path d="M13 2L4 13.5h6L9 22l9-12.5h-6z" /> },
  { match: /water|suiton/i, label: 'Eau', color: '#0094D4',
    glyph: <path d="M12 2.5s6.8 7.7 6.8 12.4a6.8 6.8 0 11-13.6 0C5.2 10.2 12 2.5 12 2.5z" /> },
  { match: /earth|doton/i, label: 'Terre', color: '#E07038',
    glyph: <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M12 3.5l8.5 4.7-8.5 4.7-8.5-4.7z" /><path d="M3.5 8.2v7.6l8.5 4.7 8.5-4.7V8.2" /></g> },
  { match: /yin.?[–-]?.?yang/i, label: 'Yin-Yang', color: '#9AA7B8',
    glyph: <path d="M12 2a10 10 0 000 20 5 5 0 010-10 5 5 0 000-10z" /> },
  { match: /yin/i, label: 'Yin', color: '#5A88B0', glyph: <circle cx="12" cy="12" r="9" /> },
  { match: /yang/i, label: 'Yang', color: '#EBE5D6',
    glyph: <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="2.2" /> },
];

export function natureMeta(nature: string) {
  return NATURES.find((n) => n.match.test(nature)) ?? null;
}

export function ChakraNatureIcon({ nature, size = 26, withLabel = false }: { nature: string; size?: number; withLabel?: boolean }) {
  const m = natureMeta(nature);
  if (!m) return null;
  const disc = (
    <span
      title={m.label}
      style={{
        display: 'inline-flex', width: size, height: size, borderRadius: '50%',
        background: `${m.color}22`, border: `1px solid ${m.color}66`, color: m.color,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} fill="currentColor" aria-hidden>
        {m.glyph}
      </svg>
    </span>
  );
  if (!withLabel) return disc;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {disc}
      <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: m.color, fontWeight: 600 }}>{m.label}</span>
    </span>
  );
}

// ─── Emblèmes de village (kanji du pays) ─────────────────────────────
const VILLAGES: Record<string, { kanji: string; color: string }> = {
  konohagakure: { kanji: '火', color: '#3FA34D' },
  sunagakure: { kanji: '風', color: '#D4A017' },
  kirigakure: { kanji: '水', color: '#0094D4' },
  iwagakure: { kanji: '土', color: '#9A6A3A' },
  kumogakure: { kanji: '雷', color: '#88A6C8' },
  amegakure: { kanji: '雨', color: '#5A88B0' },
  otogakure: { kanji: '音', color: '#7B5CF0' },
};

const E = '/images/akasha/emblems/';
// Blasons canon (forme officielle Narutopedia + couleur du chart, sur disque) — détourés/composés.
const VILLAGE_IMG: Record<string, string> = {
  konohagakure: `${E}konoha.webp`, sunagakure: `${E}suna.webp`, kirigakure: `${E}kiri.webp`,
  kumogakure: `${E}kumo.webp`, iwagakure: `${E}iwa.webp`, amegakure: `${E}ame.webp`, otogakure: `${E}oto.webp`,
};
const CLAN_IMG: Record<string, string> = {
  uchiha: `${E}uchiha.webp`, uzumaki: `${E}uzumaki.webp`, senju: `${E}senju.webp`, hyuga: `${E}hyuga.webp`,
  nara: `${E}nara.webp`, akimichi: `${E}akimichi.webp`, yamanaka: `${E}yamanaka.webp`, inuzuka: `${E}inuzuka.webp`,
  aburame: `${E}aburame.webp`, sarutobi: `${E}sarutobi.webp`, otsutsuki: `${E}otsutsuki.webp`,
  fuma: `${E}fuma.webp`, kamizuru: `${E}kamizuru.webp`, funato: `${E}funato.webp`,
};

function KonohaLeaf({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} aria-hidden>
      <path d="M12 2.5c-3.4 3.4-5.2 7-5.2 10.2A5.2 5.2 0 0012 18a5.2 5.2 0 005.2-5.3c0-3.2-1.8-6.8-5.2-10.2z" fill={color} />
      <path d="M12 7.5v8.5" stroke="#050C17" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <path d="M12 16c-1.7 0-3-1.1-3-2.6" fill="none" stroke="#050C17" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function VillageEmblem({ slug, size = 30 }: { slug?: string | null; size?: number }) {
  const img = slug ? VILLAGE_IMG[slug] : null;
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt="" width={size} height={size} style={{ objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.55))' }} />;
  }
  const v = slug ? VILLAGES[slug] : null;
  if (!v) return null;
  return (
    <span
      title={slug ?? undefined}
      style={{
        display: 'inline-flex', width: size, height: size, borderRadius: 9,
        background: `${v.color}1F`, border: `1.5px solid ${v.color}`, color: v.color,
        alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.5),
        fontWeight: 700, lineHeight: 1, flexShrink: 0,
      }}
    >
      {slug === 'konohagakure' ? <KonohaLeaf size={size} color={v.color} /> : v.kanji}
    </span>
  );
}

// ─── Blasons de clan ─────────────────────────────────────────────────
function UzumakiSwirl({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M12 2 A10 10 0 1 1 2 12 A8 8 0 1 0 12 4 A6 6 0 1 1 6 12 A4 4 0 1 0 12 8 A2 2 0 1 1 10 12" />
    </svg>
  );
}
function UchihaFan({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="9.2" fill="#EBE5D6" />
      <path d="M12 2.8a9.2 9.2 0 019.05 7.7H2.95A9.2 9.2 0 0112 2.8z" fill="#C0392B" />
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="#1a1208" strokeWidth="0.8" opacity="0.5" />
      <rect x="11.2" y="19" width="1.6" height="3.2" rx="0.8" fill="#C0392B" />
    </svg>
  );
}

export function ClanCrest({ slug, name, size = 30 }: { slug?: string | null; name?: string | null; size?: number }) {
  const s = (slug ?? '').toLowerCase();
  if (CLAN_IMG[s]) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={CLAN_IMG[s]} alt="" width={size} height={size} style={{ objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.55))' }} />;
  }
  if (s === 'uzumaki') return <UzumakiSwirl size={size} />;
  if (s === 'uchiha') return <UchihaFan size={size} />;
  if (!slug && !name) return null;
  const initial = (name ?? slug ?? '?').replace(/^clan\s+/i, '').charAt(0).toUpperCase();
  return (
    <span
      title={name ?? slug ?? undefined}
      style={{
        display: 'inline-flex', width: size, height: size, borderRadius: '50%',
        background: 'rgba(123,92,240,0.14)', border: '1.5px solid #7B5CF0', color: '#B8A6F5',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fe)', fontStyle: 'italic',
        fontWeight: 800, fontSize: Math.round(size * 0.46), flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}

// ─── Icônes de catégories (Higgsfield, détourées) ────────────────────
const CAT_ICON: Record<string, string> = {
  kekkei: '/images/akasha/cat/kekkei.webp',
  techniques: '/images/akasha/cat/techniques.webp',
  clan: '/images/akasha/cat/clan.webp',
  classification: '/images/akasha/cat/classification.webp',
  affiliations: '/images/akasha/cat/affiliations.webp',
  fonctions: '/images/akasha/cat/fonctions.webp',
  outils: '/images/akasha/cat/outils.webp',
};
export function CategoryIcon({ name, size = 18 }: { name: string; size?: number }) {
  const src = CAT_ICON[name];
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} style={{ objectFit: 'contain', flexShrink: 0 }} />;
}

// ─── Icônes d'outils & armes (Higgsfield, style plat détouré + réf. Fandom) ──
const foldAscii = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const TOOL_IMG: Record<string, string> = {
  'kunai': 'kunai',
  'shuriken': 'shuriken',
  'absorbing hand': 'absorbing-hand',
  'bo': 'bo',
  'chakra blade': 'chakra-blade',
  'flying thunder god kunai': 'flying-thunder-god-kunai',
  'fuma shuriken': 'fuma-shuriken',
  'hidden kunai mechanism': 'hidden-kunai-mechanism',
  'konoha chakra blade': 'konoha-chakra-blade',
  'sand': 'sand-tool',
};
export function ToolIcon({ name, size = 28 }: { name: string; size?: number }) {
  const slug = TOOL_IMG[foldAscii(name.trim())];
  const src = slug ? `/images/akasha/ref/${slug}.webp` : '/images/akasha/cat/outils.webp';
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} style={{ objectFit: 'contain', flexShrink: 0 }} />;
}

// Libellés FR des liens de famille (API → français).
export const FAMILY_LABELS: Record<string, string> = {
  father: 'Père', mother: 'Mère', son: 'Fils', daughter: 'Fille',
  wife: 'Épouse', husband: 'Époux', brother: 'Frère', sister: 'Sœur',
  'adoptive son': 'Fils adoptif', 'adoptive daughter': 'Fille adoptive',
  godfather: 'Parrain', godmother: 'Marraine', grandfather: 'Grand-père',
  grandmother: 'Grand-mère', uncle: 'Oncle', aunt: 'Tante', cousin: 'Cousin',
  'great-grandfather': 'Arrière-grand-père', ancestor: 'Ancêtre',
};
export const familyLabel = (rel: string) => FAMILY_LABELS[rel.toLowerCase()] ?? rel.replace(/_/g, ' ');
