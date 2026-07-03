'use client';
// components/akasha/CharacterDossier.tsx — dossier complet d'un personnage, en onglets (max d'infos rangé).
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChakraNatureIcon, familyLabel, CategoryIcon, ToolIcon } from './NarutoIcons';
import EntityRelations from './EntityRelations';
import DatabookRadar, { type Stats } from './DatabookRadar';
import Moveset2D from './Moveset2D';
import Character3D from './Character3D';
import threeD from '@/data/akasha-3d.json';
import type { AkashaEntryDetail } from '@/lib/akasha/types';

type Model3D = { src: string; poster?: string; note?: string };

const ACCENT = '#7B5CF0';

// Aura de chakra selon la forme active (déclenche l'overlay dans le moveset). null = pas d'aura.
const chakraAura = (label: string): string | null => {
  const l = label.toLowerCase();
  if (/six chemins|baryon|bij[uū]/.test(l)) return '#ffd24a'; // doré (Bijū / Six Chemins / Baryon)
  if (/kurama/.test(l)) return '#ff9c1e';                      // orange chakra (Chakra Kurama)
  if (/queue|version/.test(l)) return '#ff4d2a';              // manteau rouge (1 Queue / Version 2)
  return null;                                                 // Partie I/II, Ermite, Hokage
};

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : str(v) ? [v as string] : [];
type Fam = { rel: string; name: string; slug?: string };
const familyList = (v: unknown): Fam[] =>
  Array.isArray(v) ? (v.filter((f) => f && typeof f === 'object' && 'name' in f) as Fam[]) : [];

const ICONS: Record<string, ReactNode> = {
  age: <path d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  height: <path d="M12 3v18M8 6l4-4 4 4M8 18l4 4 4-4" />,
  weight: <path d="M12 3a3 3 0 013 3H9a3 3 0 013-3zM5 6h14l1.5 14H3.5z" />,
  blood: <path d="M12 2.5s6.5 7.4 6.5 12a6.5 6.5 0 11-13 0C5.5 9.9 12 2.5 12 2.5z" />,
  sex: <path d="M14 6a4 4 0 11-4 4M14 6h4M14 6V2" />,
  cal: <path d="M3 5h18v16H3zM3 9h18M8 3v4M16 3v4" />,
};

function Vital({ k, label, value }: { k: keyof typeof ICONS; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.7rem', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 9 }}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={ACCENT} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>{ICONS[k]}</svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td)', fontWeight: 600, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        <div style={{ fontFamily: 'var(--fo)', fontSize: 8.5, color: 'var(--td3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      </div>
    </div>
  );
}

function Chips({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((t, i) => (
        <span key={i} style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td2)', background: `${color}14`, border: `1px solid ${color}33`, borderRadius: 7, padding: '3px 9px' }}>{t}</span>
      ))}
    </div>
  );
}

// Traduction FR des outils/armes (affichage seul — l'icône reste calée sur le nom EN via ToolIcon).
const TOOL_FR: Record<string, string> = {
  'absorbing hand': 'Main absorbante',
  'bō': 'Bâton Bō',
  'chakra blade': 'Lame de chakra',
  'flying thunder god kunai': 'Kunai de l’Éclair Volant (Minato)',
  'fūma shuriken': 'Shuriken Fūma',
  'hidden kunai mechanism': 'Mécanisme à kunai caché',
  'konoha chakra blade': 'Lame de chakra de Konoha',
  'sand': 'Sable',
  'stone of gelel': 'Pierre de Gelel',
};

function ToolChips({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map((t, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 11px 5px 5px', background: `${color}0F`, border: `1px solid ${color}33`, borderRadius: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: `${color}1A`, flexShrink: 0 }}>
            <ToolIcon name={t} size={20} />
          </span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11.5, color: 'var(--td2)', fontWeight: 600 }}>{TOOL_FR[t.toLowerCase()] ?? t}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Techniques regroupées par famille (présentation, tous persos) ───
// Ordre = précédence : on teste Rasengan/Rasenshuriken AVANT les modes (« Sage Art: … Rasengan »
// tombe bien dans Rasengan). « spiralling …spher » = variantes Rasengan (Odama, etc.), sans capter
// « Gentle Step Spiralling Twin Lion Fists » (pas de « sphere »).
const JUTSU_FAMILIES: [string, RegExp][] = [
  ['Rasengan', /rasengan|spiralling[\s-].*spher/i],
  ['Rasenshuriken', /rasenshuriken/i],
  ['Multiclonage', /clone/i],
  ['Modes & senjutsu', /sage mode|sage art|chakra mode|baryon|senjutsu|yang power/i],
  ['Kurama & Bijū', /tailed beast|kurama|truth-seeking|chibaku/i],
  ['Invocations & crapauds', /toad|frog|summoning|food cart/i],
  ['Transformations', /sexy|harem|transformation|thousand years of death/i],
  ['Taijutsu & combos', /combo|fist|kata|strike|formation|heel drop|body blow/i],
];
function groupJutsu(items: string[]): { label: string; items: string[] }[] {
  const buckets = new Map<string, string[]>();
  for (const j of items) {
    const fam = JUTSU_FAMILIES.find(([, re]) => re.test(j))?.[0] ?? 'Autres techniques';
    if (!buckets.has(fam)) buckets.set(fam, []);
    buckets.get(fam)!.push(j);
  }
  const order = [...JUTSU_FAMILIES.map(([k]) => k), 'Autres techniques'];
  return order.filter((k) => buckets.has(k)).map((k) => ({ label: k, items: buckets.get(k)! }));
}

// Techniques ayant une fiche AKASHA dédiée → chip cliquable + icône de réf.
// Clé = nom EN normalisé (minuscules) ; valeur = slug de l'entité (type power).
const JUTSU_LINK: Record<string, string> = {
  'rasengan': 'rasengan',
  'shadow clone technique': 'shadow-clone',
  'multiple shadow clone technique': 'shadow-clone',
  'tailed beast ball': 'tailed-beast-ball',
  'chidori': 'chidori',
  'amaterasu': 'amaterasu',
  'susanoo': 'susanoo',
};

// Traduction FR des techniques (affichage seul — les données restent EN pour le regroupement/liens).
// Clé = nom EN en minuscules. Les noms propres canon (Rasengan, Rasenshuriken, Bijūdama, Senjutsu…)
// sont conservés tels quels (ce sont AUSSI leurs noms français).
const JUTSU_FR: Record<string, string> = {
  // Rasengan
  'rasengan': 'Rasengan',
  'big ball rasengan': 'Rasengan géant',
  'big ball spiralling serial zone spheres': 'Rasengan géants multiples de zone',
  'crescent moon rasengan': 'Rasengan croissant de lune',
  'gelel rasengan': 'Rasengan de Gelel',
  'guts rasengan': 'Rasengan du cran',
  "naruto and shion's super chakra rasengan": 'Super Rasengan de chakra (Naruto & Shion)',
  'parent and child rasengan': 'Rasengan du père et du fils',
  'planetary rasengan': 'Rasengan planétaire',
  'rasengan: flash': 'Rasengan éclair',
  'runt ball rasengan': 'Petit Rasengan',
  'sage art: magnet release rasengan': 'Art de l’ermite : Rasengan magnétique',
  'sage art: many ultra-big ball spiralling serial spheres': 'Art de l’ermite : multiples Rasengan ultra-géants en série',
  'seven-coloured rasengan': 'Rasengan aux sept couleurs',
  'spiralling absorption sphere': 'Sphère tourbillonnante d’absorption',
  'spiralling serial spheres': 'Rasengan en série',
  'spiralling strife spheres': 'Sphères tourbillonnantes de discorde',
  'super-ultra-big ball rasengan': 'Rasengan ultra-géant suprême',
  'supreme ultimate rasengan': 'Rasengan ultime suprême',
  'tailed beast rasengan': 'Rasengan de Bijū',
  'tornado rasengan': 'Rasengan tornade',
  'ultra-big ball rasengan': 'Rasengan ultra-géant',
  'ultra-many spiralling serial spheres': 'Multiples Rasengan ultra en série',
  'wind release: rasengan': 'Rasengan — élément Vent',
  // Rasenshuriken
  'wind release: rasenshuriken': 'Rasenshuriken',
  'big ball rasenshuriken': 'Rasenshuriken géant',
  'mini-rasenshuriken': 'Mini-Rasenshuriken',
  'sage art: lava release rasenshuriken': 'Art de l’ermite : Rasenshuriken de lave',
  'sage art: super tailed beast rasenshuriken': 'Art de l’ermite : Rasenshuriken de Bijū suprême',
  'six paths: ultra-big ball rasenshuriken': 'Six Chemins : Rasenshuriken ultra-géant',
  'tailed beast ball rasenshuriken': 'Rasenshuriken Bijūdama',
  'wind release: repeated rasenshuriken': 'Rasenshuriken répété',
  'wind release: ultra-big ball rasenshuriken': 'Rasenshuriken ultra-géant',
  // Multiclonage
  'shadow clone technique': 'Multiclonage',
  'multiple shadow clone technique': 'Multiclonage suprême',
  'clone body blow': 'Coup de corps du clone',
  'clone flying arrow': 'Flèche volante du clone',
  'clone spinning heel drop': 'Coup de talon tournant du clone',
  'shuriken shadow clone technique': 'Multiclonage de shuriken',
  // Modes & senjutsu
  'sage mode': 'Mode ermite',
  'six paths sage mode': 'Mode ermite des Six Chemins',
  'nine-tails chakra mode': 'Mode chakra de Kurama',
  'baryon mode': 'Mode Baryon',
  'six paths senjutsu': 'Senjutsu des Six Chemins',
  'six paths yang power': 'Pouvoir Yang des Six Chemins',
  // Kurama & Bijū
  'tailed beast ball': 'Bijūdama',
  'continuous tailed beast balls': 'Bijūdama en rafale',
  'kurama arm attack': 'Attaque des bras de Kurama',
  'six paths — chibaku tensei': 'Six Chemins : Chibaku Tensei',
  'super mini-tailed beast ball': 'Super mini-Bijūdama',
  'tailed beast chakra arms': 'Bras de chakra du Bijū',
  'tailed beast full charge': 'Charge complète du Bijū',
  'tailed beast shockwave': 'Onde de choc du Bijū',
  'truth-seeking ball': 'Boule de quête de vérité',
  // Invocations & crapauds
  'summoning technique (toad)': 'Invocation (crapaud)',
  'fire release: toad oil flame bullet': 'Boulet de flammes à l’huile de crapaud',
  'frog kata': 'Kata de la grenouille',
  'frog strike': 'Frappe de la grenouille',
  'summoning: food cart destroyer technique': 'Invocation : destructeur de charrette',
  'turning into a frog technique': 'Transformation en grenouille',
  'wind release: toad gun': 'Canon à huile de crapaud (Vent)',
  'wind release: toad oil bullet': 'Boulet d’huile de crapaud (Vent)',
  'wind release: toad oil flame bullet': 'Boulet de flammes à l’huile de crapaud (Vent)',
  // Transformations
  'sexy technique': 'Métamorphose sexy',
  'one thousand years of death': 'Mille ans de souffrance',
  'combination transformation': 'Métamorphose combinée',
  'harem technique': 'Technique du harem',
  'new sexy technique': 'Nouvelle métamorphose sexy',
  'sexy reverse harem technique': 'Technique du harem inversé',
  'sexy technique: pole dance and nice body': 'Métamorphose sexy : pole dance',
  // Taijutsu & combos
  'erupting propulsion fist': 'Poing à propulsion explosive',
  'gentle step spiralling twin lion fists': 'Poings jumeaux du lion tourbillonnant',
  'naruto region combo': 'Combo Naruto',
  'naruto uzumaki combo': 'Combo Naruto Uzumaki',
  'naruto uzumaki two thousand combo': 'Combo des 2000 de Naruto Uzumaki',
  'strong fist': 'Poing solide',
  'uzumaki formation': 'Formation Uzumaki',
  // Autres
  'all directions shuriken': 'Shuriken tous azimuts',
  'boil release: unrivalled strength': 'Élément Ébullition : force sans égale',
  'chakra transfer technique': 'Transfert de chakra',
  'earth release: earth-style wall': 'Mur de terre (Doton)',
  'hurricane thunderclap — majestic attire sword stroke': 'Frappe de l’épée de l’ouragan',
  'ink creation': 'Création d’encre',
  'negative emotions sensing': 'Détection des émotions négatives',
  'ninja art: bare-handed blade block': 'Art ninja : blocage de lame à mains nues',
  'pachinko technique': 'Technique du pachinko',
  'parachute': 'Parachute',
  'regeneration ability': 'Capacité de régénération',
  'scorch release: halo hurricane jet black arrow style zero': 'Élément Calcination : flèche noire de l’ouragan — style zéro',
  'shadow shuriken technique': 'Technique du shuriken de l’ombre',
  'soap bubble ninjutsu': 'Ninjutsu des bulles de savon',
  'torii seal': 'Sceau du torii',
  'typhoon water vortex technique': 'Vortex aquatique typhon',
  'wisdom wolf decay': 'Décrépitude du loup de sagesse',
};
const frJutsu = (t: string) => JUTSU_FR[t.toLowerCase()] ?? t;

function JutsuChips({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((t, i) => {
        const slug = JUTSU_LINK[t.toLowerCase()];
        const fr = frJutsu(t);
        const base = { fontFamily: 'var(--fo)', fontSize: 11.5, borderRadius: 7, padding: '3px 9px' } as const;
        if (!slug)
          return <span key={i} style={{ ...base, color: 'var(--td2)', background: `${color}14`, border: `1px solid ${color}33` }}>{fr}</span>;
        return (
          <Link key={i} href={`/learn/akasha/${slug}`}
            style={{ ...base, display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none', color, fontWeight: 600, background: `${color}22`, border: `1px solid ${color}66`, padding: '3px 9px 3px 5px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/akasha/ref/${slug}.webp`} alt="" width={15} height={15} style={{ objectFit: 'contain', flexShrink: 0 }} />
            {fr}
          </Link>
        );
      })}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s', flexShrink: 0 }} aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function JutsuGroups({ items, color }: { items: string[]; color: string }) {
  const groups = groupJutsu(items);
  const [open, setOpen] = useState<Record<string, boolean>>(() => (groups[0] ? { [groups[0].label]: true } : {}));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {groups.map((g) => {
        const on = !!open[g.label];
        return (
          <div key={g.label} style={{ border: '1px solid var(--bd)', borderRadius: 10, background: 'var(--bg)', overflow: 'hidden' }}>
            <button
              onClick={() => setOpen((o) => ({ ...o, [g.label]: !o[g.label] }))}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', background: 'transparent', border: 'none', cursor: 'pointer', color: on ? color : 'var(--td2)' }}
            >
              <Chevron open={on} />
              <span style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, flex: 1, textAlign: 'left' }}>{g.label}</span>
              <span style={{ fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color, background: `${color}18`, borderRadius: 20, padding: '1px 8px' }}>{g.items.length}</span>
            </button>
            {on && <div style={{ padding: '0 11px 11px' }}><JutsuChips items={g.items} color={color} /></div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Arbre généalogique ──────────────────────────────────────────────
const FAM_ANCESTORS = ['father', 'mother', 'grandfather', 'grandmother', 'great-grandfather', 'ancestor'];
const FAM_PARTNERS = ['wife', 'husband'];
const FAM_CHILDREN = ['son', 'daughter', 'adoptive son', 'adoptive daughter'];
type FamNodeT = { rel?: string; name: string; slug?: string; self?: boolean };

function Heart({ color }: { color: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', padding: '0 3px' }} aria-hidden>
      <svg viewBox="0 0 24 24" width="12" height="12" fill={color} opacity="0.45">
        <path d="M12 21s-7-4.6-9.3-9C1 8.8 2.4 5.5 5.6 5.5c1.9 0 3.2 1.1 4.4 2.6 1.2-1.5 2.5-2.6 4.4-2.6 3.2 0 4.6 3.3 2.9 6.5C19 16.4 12 21 12 21z" />
      </svg>
    </span>
  );
}
const VLine = ({ h = 16 }: { h?: number }) => <div style={{ width: 2, height: h, background: 'var(--bd2)', flexShrink: 0 }} />;

function FamNode({ node, color }: { node: FamNodeT; color: string }) {
  const { name, slug, rel, self } = node;
  const label = self ? null : rel ? familyLabel(rel) : null;
  const body = (
    <div style={{ padding: '6px 12px', borderRadius: 10, textAlign: 'center', minWidth: 90,
      border: `1px solid ${self ? color : 'var(--bd)'}`, background: self ? `${color}1F` : 'var(--bg)' }}>
      <div style={{ fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, lineHeight: 1.15, whiteSpace: 'nowrap', color: self ? color : slug ? color : 'var(--td)' }}>{name}</div>
      {label && <div style={{ fontFamily: 'var(--fo)', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--td3)', marginTop: 1 }}>{label}</div>}
    </div>
  );
  return slug && !self ? <Link href={`/learn/akasha/${slug}`} style={{ textDecoration: 'none' }}>{body}</Link> : body;
}

function Couple({ nodes, color }: { nodes: FamNodeT[]; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {nodes.map((n, i) => [
        i > 0 ? <Heart key={`h${i}`} color={color} /> : null,
        <FamNode key={i} node={n} color={color} />,
      ])}
    </div>
  );
}

function FamilyTree({ family, selfName, selfSlug, color }: { family: Fam[]; selfName: string; selfSlug?: string; color: string }) {
  const inB = (b: string[]) => (f: Fam) => b.includes(f.rel.toLowerCase());
  const ancestors = family.filter(inB(FAM_ANCESTORS));
  const partners = family.filter(inB(FAM_PARTNERS));
  const children = family.filter(inB(FAM_CHILDREN));
  const known = [...FAM_ANCESTORS, ...FAM_PARTNERS, ...FAM_CHILDREN];
  const others = family.filter((f) => !known.includes(f.rel.toLowerCase()));

  const hasTree = ancestors.length || partners.length || children.length;
  const self: FamNodeT = { name: selfName, slug: selfSlug, self: true };

  return (
    <div style={{ overflowX: 'auto' }} className="hero-domabar">
      {hasTree ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 'max-content', padding: '2px 4px 4px' }}>
          {ancestors.length > 0 && (<><Couple nodes={ancestors} color={color} /><VLine /></>)}
          <Couple nodes={[self, ...partners]} color={color} />
          {children.length > 0 && (
            <>
              <VLine h={children.length > 1 ? 12 : 16} />
              <div style={{ position: 'relative', display: 'flex', gap: 14, justifyContent: 'center', paddingTop: 14 }}>
                {children.length > 1 && <div style={{ position: 'absolute', top: 0, left: 46, right: 46, height: 2, background: 'var(--bd2)' }} />}
                {children.map((c, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 2, height: 14, background: 'var(--bd2)', marginTop: -14 }} />
                    <FamNode node={c} color={color} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
      {others.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: hasTree ? 16 : 0 }}>
          {others.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fo)', fontSize: 13 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--td3)', minWidth: 78 }}>{familyLabel(f.rel)}</span>
              {f.slug ? (
                <Link href={`/learn/akasha/${f.slug}`} style={{ color, textDecoration: 'none', fontWeight: 600 }}>{f.name}</Link>
              ) : (
                <span style={{ color: 'var(--td2)' }}>{f.name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Radar comparatif : stats databook (approx. canon /5) de rivaux à superposer ──
const RIVALS: { key: string; name: string; color: string; stats: Stats }[] = [
  { key: 'sasuke', name: 'Sasuke', color: '#E23B4E', stats: { nin: 5, tai: 4.5, gen: 5, int: 4, for: 3.5, vit: 5, end: 4, sce: 4 } },
  { key: 'kakashi', name: 'Kakashi', color: '#4C9BE0', stats: { nin: 5, tai: 4, gen: 4, int: 5, for: 3.5, vit: 4.5, end: 4, sce: 4 } },
  { key: 'sakura', name: 'Sakura', color: '#F06CAE', stats: { nin: 4, tai: 4, gen: 4, int: 5, for: 5, vit: 3.5, end: 3.5, sce: 3.5 } },
];

function Legend({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--fo)', fontSize: 10.5, fontWeight: 700, color: 'var(--td2)' }}>
      <span style={{ width: 16, height: 2, background: solid ? color : 'transparent', borderTop: solid ? 'none' : `2px dashed ${color}` }} />
      {label}
    </span>
  );
}

function RadarCompare({ selfLabel, selfStats, color }: { selfLabel: string; selfStats: Stats; color: string }) {
  const [rival, setRival] = useState<string | null>(null);
  const r = RIVALS.find((x) => x.key === rival);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 210, maxWidth: '100%' }}>
          <DatabookRadar stats={selfStats} color={color} compare={r?.stats} compareColor={r?.color} size={200} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, margin: '2px 0 11px', flexWrap: 'wrap' }}>
        <Legend color={color} label={`Naruto · ${selfLabel}`} solid />
        {r && <Legend color={r.color} label={r.name} />}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {RIVALS.map((x) => {
          const on = rival === x.key;
          return (
            <button key={x.key} onClick={() => setRival(on ? null : x.key)}
              style={{ fontFamily: 'var(--fo)', fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${on ? x.color : 'var(--bd2)'}`, background: on ? `${x.color}22` : 'transparent', color: on ? x.color : 'var(--td2)' }}>
              {on ? '✓ ' : 'vs '}{x.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Sec({ title, accent = ACCENT, icon, children }: { title: string; accent?: string; icon?: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon ? <CategoryIcon name={icon} size={20} /> : <span style={{ width: 3, height: 12, borderRadius: 2, background: accent, flexShrink: 0 }} />}
        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td3)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function CharacterDossier({ entry, sel = 0 }: { entry: AkashaEntryDetail; sel?: number }) {
  const a = entry.attributes as Record<string, unknown>;
  // Forme active : le dossier évolue avec la carte (même index `sel`).
  const forms = (Array.isArray(a.forms) ? (a.forms as Record<string, unknown>[]) : []).filter((x) => x && typeof x.url === 'string');
  const f = (forms[sel] ?? {}) as Record<string, unknown>;
  const hasCurated = forms.length > 0;
  const pick = (fv: unknown, base: unknown): string[] => (fv !== undefined ? list(fv) : list(base));
  const fstr = (fv: unknown, base: unknown): string | null => (typeof fv === 'string' && fv.trim() ? fv.trim() : hasCurated ? null : str(base));

  const natures = pick(f.natures, a.natureType);
  const classification = pick(f.classification, a.classification);
  const kekkei = pick(f.kekkeiGenkai, a.kekkeiGenkai);
  const jutsu = list(a.jutsu);
  const tools = list(a.tools);
  const fStats = f.stats && typeof f.stats === 'object' ? (f.stats as Stats) : undefined;
  const occupation = pick(f.occupation, a.occupation);
  const affiliation = pick(f.affiliation, a.affiliation);
  const family = familyList(a.family);
  const titles = list(a.titles);
  // Champs enrichis (base, non liés à la forme)
  const status = str(a.status);
  const tailedBeast = str(a.tailedBeast);
  // Champs multi-univers (One Piece / Dragon Ball…) — surfacés dans l'onglet Identité.
  const roleAttr = str(a.role);
  const showRole = roleAttr && !/^Personnage (principal|secondaire)$/.test(roleAttr);
  const bounty = str(a.bounty);
  const crew = str(a.crew);
  const fruit = str(a.fruit);
  const race = str(a.race);
  const ki = str(a.ki);
  const sizeV = str(a.size);
  // Naruto (import de masse) : clan / village / rang — non couverts par classification/affiliation.
  const clanV = str(a.clan);
  const villageV = affiliation.length ? null : str(a.village);
  const rankV = str(a.rank);
  const multiUniv = !!(showRole || bounty || crew || fruit || race || ki || sizeV || clanV || villageV || rankV);
  const squad = a.squad && typeof a.squad === 'object' ? (a.squad as { name?: string; members?: { rel: string; name: string; slug?: string }[] }) : null;
  const bio = str(a.bio);
  const personality = str(a.personality);
  const quotes = list(a.quotes);
  const trivia = list(a.trivia);
  const voiceActors = a.voiceActors && typeof a.voiceActors === 'object' ? (a.voiceActors as { jp?: string[]; en?: string[] }) : null;
  const debutAll = a.debutAll && typeof a.debutAll === 'object' ? (a.debutAll as Record<string, string>) : null;
  const ageV = fstr(f.age, a.age);
  const heightV = fstr(f.height, a.height);
  const weightV = fstr(f.weight, a.weight);
  const vitals = [ageV, heightV, weightV, sizeV, str(a.bloodType), str(a.sex), str(a.birthdate)].some(Boolean);

  const model3d = (threeD as unknown as Record<string, Model3D>)[entry.slug];

  const tabs = [
    { key: 'identite', label: 'Identité', show: vitals || classification.length || affiliation.length || occupation.length || titles.length || multiUniv },
    // ⬢ 3D : la visionneuse fonctionne (GLB riggé chargé au clic, pas au load — Identité reste par défaut),
    //    MAIS le mesh Meshy a des artefacts (tache rouge torse, tête cadrée hors champ) → masquée tant que
    //    le modèle n'est pas régénéré propre. Mettre `show: !!model3d` pour la réactiver.
    { key: 'modele3d', label: '⬢ 3D', show: false },
    { key: 'histoire', label: 'Histoire', show: !!(bio || personality || quotes.length || trivia.length) },
    // Parcours déplacé HORS du dossier → frise chronologique horizontale au-dessus de la carte (ArcFrieze).
    { key: 'aptitudes', label: 'Aptitudes', show: natures.length || kekkei.length || jutsu.length },
    { key: 'arsenal', label: 'Arsenal', show: tools.length },
    { key: 'famille', label: 'Famille', show: family.length },
    { key: 'media', label: 'Média', show: !!(voiceActors || debutAll) },
    { key: 'liens', label: 'Liens', show: entry.relationsOut.length || entry.relationsIn.length },
  ].filter((t) => t.show);

  const [active, setActive] = useState(tabs[0]?.key ?? 'identite');
  if (!tabs.length) return null;

  return (
    <div>
      {/* onglets */}
      <div className="hero-domabar" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
        {tabs.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className="ak-dtab"
              style={{
                fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer',
                padding: '7px 14px', borderRadius: 20,
                border: `1px solid ${on ? ACCENT : 'var(--bd2)'}`,
                background: on ? 'rgba(123,92,240,0.16)' : 'transparent',
                color: on ? ACCENT : 'var(--td2)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 14, padding: 15, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {active === 'modele3d' && model3d && (
          <Character3D src={model3d.src} poster={model3d.poster} note={model3d.note} accent={ACCENT} />
        )}

        {active === 'identite' && (
          <>
            {vitals && (
              <div className="g-3 max-sm:grid-cols-3" style={{ gap: 7 }}>
                <Vital k="age" label="Âge" value={ageV} />
                <Vital k="height" label="Taille" value={heightV} />
                <Vital k="weight" label="Poids" value={weightV} />
                <Vital k="size" label="Taille" value={sizeV} />
                <Vital k="blood" label="Sang" value={str(a.bloodType)} />
                <Vital k="sex" label="Sexe" value={str(a.sex) === 'Male' ? 'Homme' : str(a.sex) === 'Female' ? 'Femme' : str(a.sex)} />
                <Vital k="cal" label="Naissance" value={str(a.birthdate)} />
              </div>
            )}
            {classification.length > 0 && <Sec title="Classification" icon="classification"><Chips items={classification} color="#7B5CF0" /></Sec>}
            {affiliation.length > 0 && <Sec title="Affiliations" accent="#0EA878" icon="affiliations"><Chips items={affiliation} color="#0EA878" /></Sec>}
            {occupation.length > 0 && <Sec title="Fonctions" accent="#0094D4" icon="fonctions"><Chips items={occupation} color="#0094D4" /></Sec>}
            {titles.length > 0 && <Sec title="Surnoms" accent="#D4A017"><Chips items={titles} color="#D4A017" /></Sec>}
            {showRole && <Sec title="Rôle" accent="#7B5CF0"><Chips items={[roleAttr]} color="#7B5CF0" /></Sec>}
            {clanV && <Sec title="Clan" accent="#7B5CF0"><Chips items={[clanV]} color="#7B5CF0" /></Sec>}
            {villageV && <Sec title="Village" accent="#0EA878" icon="affiliations"><Chips items={[villageV]} color="#0EA878" /></Sec>}
            {rankV && <Sec title="Rang ninja" accent="#0094D4"><Chips items={[rankV]} color="#0094D4" /></Sec>}
            {race && <Sec title="Espèce / Race" accent="#0094D4"><Chips items={[race]} color="#0094D4" /></Sec>}
            {bounty && (
              <Sec title="Prime" accent="#D4A017">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 18, color: '#D4A017', background: '#D4A0171A', border: '1px solid #D4A01755', borderRadius: 8, padding: '5px 12px' }}>
                  <span aria-hidden>🏴‍☠️</span>{bounty}
                </span>
              </Sec>
            )}
            {crew && <Sec title="Équipage" accent="#0EA878" icon="affiliations"><Chips items={[crew]} color="#0EA878" /></Sec>}
            {fruit && <Sec title="Fruit du Démon" accent="#E8623A"><Chips items={[fruit]} color="#E8623A" /></Sec>}
            {ki && <Sec title="Puissance (Ki)" accent="#D4A017"><Chips items={[ki]} color="#D4A017" /></Sec>}
            {status && <Sec title="Statut" accent="#0EA878"><Chips items={[status]} color="#0EA878" /></Sec>}
            {tailedBeast && (
              <Sec title="Bijū — démon à queues" accent="#E8623A">
                <Link href={`/learn/akasha/${tailedBeast.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: 700, color: '#E8623A', textDecoration: 'none', background: '#E8623A1A', border: '1px solid #E8623A55', borderRadius: 8, padding: '5px 12px' }}>
                  <span aria-hidden>🦊</span>{tailedBeast}
                </Link>
              </Sec>
            )}
            {squad && Array.isArray(squad.members) && squad.members.length > 0 && (
              <Sec title={squad.name || 'Équipe'} accent="#0094D4" icon="affiliations">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {squad.members.map((mb, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--fo)', fontSize: 13 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--td3)', minWidth: 84 }}>{mb.rel}</span>
                      {mb.slug ? (
                        <Link href={`/learn/akasha/${mb.slug}`} style={{ color: '#0094D4', textDecoration: 'none', fontWeight: 600 }}>{mb.name}</Link>
                      ) : (
                        <span style={{ color: 'var(--td2)' }}>{mb.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Sec>
            )}
          </>
        )}

        {active === 'aptitudes' && (
          <>
            {natures.length > 0 && (
              <Sec title="Natures de chakra" accent="#F0C040">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {natures.map((n, i) => <ChakraNatureIcon key={i} nature={n} size={24} withLabel />)}
                </div>
              </Sec>
            )}
            {kekkei.length > 0 && <Sec title="Kekkei Genkai" accent="#D44B24" icon="kekkei"><Chips items={kekkei} color="#D44B24" /></Sec>}
            {jutsu.length > 0 && <Sec title={`Techniques · ${jutsu.length}`} icon="techniques"><JutsuGroups items={jutsu} color={ACCENT} /></Sec>}
            {fStats && (
              <Sec title="Radar comparatif — databook" accent="#F0C040">
                <RadarCompare selfLabel={str(f.label) ?? 'forme'} selfStats={fStats} color={ACCENT} />
              </Sec>
            )}
            <Moveset2D slug={entry.slug} aura={chakraAura(str(f.label) ?? '')} caption="Sprite : Naruto adulte · l'aura suit la forme sélectionnée" />
          </>
        )}

        {active === 'arsenal' && tools.length > 0 && (
          <Sec title="Outils & armes" accent="#D4A017" icon="outils"><ToolChips items={tools} color="#D4A017" /></Sec>
        )}

        {active === 'famille' && family.length > 0 && (
          <Sec title="Arbre généalogique">
            <FamilyTree family={family} selfName={entry.name} selfSlug={entry.slug} color={ACCENT} />
          </Sec>
        )}

        {active === 'histoire' && (
          <>
            {bio && (
              <Sec title="Biographie" icon="techniques">
                <p style={{ margin: 0, fontFamily: 'var(--fo)', fontSize: 13, lineHeight: 1.65, color: 'var(--td2)' }}>{bio}</p>
              </Sec>
            )}
            {personality && (
              <Sec title="Personnalité" accent="#0EA878">
                <p style={{ margin: 0, fontFamily: 'var(--fo)', fontSize: 13, lineHeight: 1.65, color: 'var(--td2)' }}>{personality}</p>
              </Sec>
            )}
            {quotes.length > 0 && (
              <Sec title="Citations" accent="#D4A017">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {quotes.map((q, i) => (
                    <div key={i} style={{ position: 'relative', padding: '8px 11px 8px 27px', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 10 }}>
                      <span aria-hidden style={{ position: 'absolute', left: 9, top: 2, fontFamily: 'var(--fe)', fontSize: 26, lineHeight: 1, color: '#D4A017AA', fontStyle: 'italic', fontWeight: 900 }}>“</span>
                      <span style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 700, fontSize: 13.5, color: 'var(--td)', lineHeight: 1.4 }}>{q}</span>
                    </div>
                  ))}
                </div>
              </Sec>
            )}
            {trivia.length > 0 && (
              <Sec title="Le saviez-vous ?" accent="#7B5CF0">
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {trivia.map((t, i) => (
                    <li key={i} style={{ fontFamily: 'var(--fo)', fontSize: 12.5, color: 'var(--td2)', lineHeight: 1.55 }}>{t}</li>
                  ))}
                </ul>
              </Sec>
            )}
          </>
        )}

        {active === 'media' && (
          <>
            {voiceActors && (!!voiceActors.jp?.length || !!voiceActors.en?.length) && (
              <Sec title="Voix" accent="#E8623A">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {voiceActors.jp && voiceActors.jp.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--fo)', fontSize: 13 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--td3)', minWidth: 78 }}>Japonais</span>
                      <span style={{ color: 'var(--td2)' }}>{voiceActors.jp.join(' · ')}</span>
                    </div>
                  )}
                  {voiceActors.en && voiceActors.en.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--fo)', fontSize: 13 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--td3)', minWidth: 78 }}>Anglais</span>
                      <span style={{ color: 'var(--td2)' }}>{voiceActors.en.join(' · ')}</span>
                    </div>
                  )}
                </div>
              </Sec>
            )}
            {debutAll && (
              <Sec title="Apparitions" accent="#0094D4" icon="fonctions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {([['manga', 'Manga'], ['anime', 'Anime'], ['novel', 'Roman'], ['movie', 'Film'], ['game', 'Jeu'], ['ova', 'OVA']] as const).map(([k, lbl]) =>
                    debutAll[k] ? (
                      <div key={k} style={{ display: 'flex', gap: 8, fontFamily: 'var(--fo)', fontSize: 12.5 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0094D4', minWidth: 56, flexShrink: 0 }}>{lbl}</span>
                        <span style={{ color: 'var(--td2)' }}>{debutAll[k]}</span>
                      </div>
                    ) : null,
                  )}
                </div>
              </Sec>
            )}
          </>
        )}

        {active === 'liens' && <EntityRelations out={entry.relationsOut} incoming={entry.relationsIn} />}
      </div>
    </div>
  );
}
