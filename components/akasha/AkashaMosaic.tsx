// components/akasha/AkashaMosaic.tsx — LA MOSAÏQUE du registre (lot 4d) : remplaçant définitif
// d'AkashaGrid/AkashaCard sur les 7 gabarits. Sobre (esprit AAA×Apple) : rareté en liseré fin
// (plus de cadre TCG), zéro emoji (type en micro-label, univers en point coloré, fallbacks
// d'image par icône webp de catégorie ou losange teinté), image entière sur fond flouté conservée.
// Server Component pur — aucune dépendance d'animation.
import Link from 'next/link';
import { TYPE_META, RARITY_META, universeMeta, type AkashaEntryCard } from '@/lib/akasha/types';
import { flavorText } from '@/lib/akasha/flavor';

/** Teinte de fallback par collection (entrées sans image — pouvoirs à 98 %). */
const CATEGORY_TINT: Record<string, string> = {
  'Jutsu': '#D44B24', 'Technique': '#D44B24', 'Attaque': '#D44B24', 'Nature de chakra': '#D44B24',
  'Arme & outil': '#D4A017', 'Relique': '#D4A017', 'Titre & rang': '#D4A017',
  'Organisation': '#E07038', 'Équipage': '#D63C3C', 'Saga': '#D63C3C', 'Gear': '#D63C3C', 'Dōjutsu': '#D63C3C',
  'Métier': '#0094D4', 'Navire': '#0094D4', 'Planète': '#0094D4', 'Voiture': '#0094D4', 'Écurie de course': '#0094D4',
  'Kekkei genkai': '#7B5CF0', 'Fruit du Démon': '#8E44AD', 'Stand': '#8E44AD',
  'Classification': '#7A90A8', 'Village': '#0EA878', 'Lieu': '#0EA878',
  'Clan': '#E8623A', 'Clan & lignée': '#E8623A', 'Haki': '#5A88B0',
  'Transformation': '#F2A93B', 'Aptitude': '#12B8CC', 'Race & espèce': '#3FA35C',
};

/** Icônes webp de catégorie (assets cat/ existants) pour les fallbacks sans image. */
const CATEGORY_ICON: Record<string, string> = {
  'Jutsu': '/images/akasha/cat/techniques.webp', 'Technique': '/images/akasha/cat/techniques.webp',
  'Attaque': '/images/akasha/cat/techniques.webp', 'Arme & outil': '/images/akasha/cat/outils.webp',
  'Organisation': '/images/akasha/cat/affiliations.webp', 'Métier': '/images/akasha/cat/fonctions.webp',
  'Kekkei genkai': '/images/akasha/cat/kekkei.webp', 'Classification': '/images/akasha/cat/classification.webp',
  'Clan': '/images/akasha/cat/clan.webp', 'Clan & lignée': '/images/akasha/cat/clan.webp',
  'Village': '/images/akasha/emblems/konoha.webp', 'Dōjutsu': '/images/akasha/cat/dojutsu.webp',
  'Nature de chakra': '/images/akasha/cat/nature.webp', 'Titre & rang': '/images/akasha/cat/titre-rang.webp',
};

function Tile({ entry }: { entry: AkashaEntryCard }) {
  const m = TYPE_META[entry.type];
  const tint = (entry.category && CATEGORY_TINT[entry.category]) || m.color;
  const icon = entry.category ? CATEGORY_ICON[entry.category] : undefined;
  const rar = entry.rarity ? RARITY_META[entry.rarity] : null;
  const flavor = flavorText(entry.descFr);
  const text = flavor ?? entry.summary;
  const uni = entry.universe ? universeMeta(entry.universe) : null;

  return (
    <Link
      href={`/learn/akasha/${entry.slug}`}
      className="dom-card akasha-card"
      style={{
        width: '100%', background: 'var(--bg2)', border: '1px solid var(--bd)',
        borderLeft: `3px solid ${rar ? rar.color : 'var(--bd2)'}`,
        borderRadius: 12, overflow: 'hidden', textDecoration: 'none',
        display: 'flex', flexDirection: 'column', ['--dc' as string]: m.color,
      }}
    >
      {/* Visuel : image entière sur fond flouté d'elle-même, sinon fallback catégorie. */}
      <div style={{ position: 'relative', height: 130, background: entry.image_url ? 'var(--bg3)' : `radial-gradient(120% 120% at 50% 0%, ${tint}30 0%, ${tint}10 45%, rgba(5,8,18,0.92) 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {entry.image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img aria-hidden src={entry.image_url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'blur(16px) saturate(1.2) brightness(0.5)', transform: 'scale(1.2)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.image_url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
          </>
        ) : icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" loading="lazy" width={52} height={52} style={{ objectFit: 'contain', filter: `drop-shadow(0 6px 18px ${tint}66)` }} />
        ) : (
          <span aria-hidden style={{ width: 30, height: 30, transform: 'rotate(45deg)', borderRadius: 6, background: `linear-gradient(135deg, ${tint}, ${tint}55)`, boxShadow: `0 6px 22px -6px ${tint}` }} />
        )}
        <span style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'var(--fo)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: 'rgba(5,12,23,0.62)', color: m.color, border: `1px solid ${m.color}44` }}>
          {m.label}
        </span>
        {rar && entry.rarity !== 'common' && (
          <span style={{ position: 'absolute', top: 8, right: 8, fontFamily: 'var(--fo)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: 'rgba(5,12,23,0.62)', color: rar.color, border: `1px solid ${rar.color}55` }}>
            {rar.label}
          </span>
        )}
      </div>

      {/* Corps */}
      <div style={{ padding: '0.85rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 17, color: 'var(--td)', lineHeight: 1.1 }}>
          {entry.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {uni && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td3)' }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: uni.color, display: 'inline-block' }} />
              {entry.universe}
            </span>
          )}
          {entry.category && entry.type !== 'character' && (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, color: '#0EA878', background: 'rgba(14,168,120,0.10)', border: '1px solid rgba(14,168,120,0.35)', borderRadius: 20, padding: '1px 8px' }}>
              ◈ {entry.category}
            </span>
          )}
        </div>
        {text && (
          <p style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td2)', fontStyle: flavor ? 'italic' : 'normal', lineHeight: 1.5, margin: '0.2rem 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {flavor ? `« ${text} »` : text}
          </p>
        )}
      </div>
    </Link>
  );
}

/** Grille du registre — même contrat qu'AkashaGrid (drop-in), sans framer-motion. */
export default function AkashaMosaic({ entries }: { entries: AkashaEntryCard[] }) {
  if (!entries.length) return null;
  return (
    <div className="g-4 max-sm:grid-cols-2" style={{ gap: '1rem' }}>
      {entries.map((e) => <Tile key={e.slug} entry={e} />)}
    </div>
  );
}
