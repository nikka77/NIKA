import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ theme: string }> };

const THEME_DATA: Record<string, { label: string; icon: string; desc: string }> = {
  'maison-flottante': { label: 'Maison flottante', icon: '🚤', desc: 'Dormez sur l\'eau dans des maisons flottantes uniques, du lac de Côme aux fjords norvégiens.' },
  'avion':            { label: 'Avion reconverti',  icon: '✈️', desc: 'Des Boeing aux Concorde, dormez dans des avions transformés en hôtels insolites.' },
  'sous-marin':       { label: 'Sous-marin',        icon: '🤿', desc: 'Découvrez la vie sous-marine depuis votre chambre avec vue sur les fonds marins.' },
  'cabane-arbres':    { label: 'Cabane dans les arbres', icon: '🌲', desc: 'Perchés dans les forêts du monde, vivez une expérience hors du temps.' },
  'grotte':           { label: 'Grotte / Cave',     icon: '🏔️', desc: 'Des grottes aménagées en suites luxueuses, de Cappadoce aux îles grecques.' },
  'fusee':            { label: 'Fusée / Espace',    icon: '🚀', desc: 'L\'hébergement du futur. Capsules et simulateurs pour une nuit hors atmosphère.' },
  'igloo':            { label: 'Igloo',              icon: '❄️', desc: 'Dormez sous les aurores boréales dans un igloo chauffé en Laponie ou en Islande.' },
  'chateau':          { label: 'Château',            icon: '🏰', desc: 'Châteaux médiévaux, manoirs et forteresses transformés en hôtels de caractère.' },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { theme } = await params;
  const t = THEME_DATA[theme];
  const label = t?.label || theme;
  return {
    title: `${label} — Logement insolite NIKA STAY`,
    description: t?.desc || `Hébergements insolites thème ${label}. Sélection mondiale curatée par NIKA.`,
    keywords: [`${label} hébergement`, `${label} airbnb`, 'logement insolite'],
  };
}

export async function generateStaticParams() {
  return Object.keys(THEME_DATA).map(theme => ({ theme }));
}

export default async function StayThemePage({ params }: Props) {
  const { theme } = await params;
  const t = THEME_DATA[theme] || { label: theme, icon: '🏡', desc: '' };
  const supabase = await createClient();
  const { data: listings } = supabase
    ? await supabase.from('listings').select('*').eq('domain', 'stay').contains('metadata', { theme }).eq('available', true).limit(12)
    : { data: null };

  return (
    <main>
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', padding: '5rem 1.4rem 3rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E07038', marginBottom: '0.6rem' }}>NIKA STAY · THÈME</p>
          <div style={{ fontSize: 52, marginBottom: '0.5rem' }}>{t.icon}</div>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95, marginBottom: '1rem' }}>
            {t.label}
          </h1>
          <p style={{ fontFamily: 'var(--fo)', fontSize: 15, color: 'var(--td2)', lineHeight: 1.7, maxWidth: 520 }}>{t.desc}</p>
        </div>
      </div>

      <div style={{ padding: '3rem 1.4rem', maxWidth: 1100, margin: '0 auto' }}>
        {listings && listings.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}
            className="max-md:grid-cols-2 max-sm:grid-cols-1">
            {listings.map((l) => (
              <div key={l.id} style={{ background: 'var(--bg2)', border: '1px solid rgba(224,112,56,0.15)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ height: 160, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{t.icon}</div>
                <div style={{ padding: '1.2rem' }}>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 17, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: '0.5rem' }}>{l.title}</div>
                  {l.price && <div style={{ fontFamily: 'var(--fe)', fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: '#E07038' }}>{l.price}€ / nuit</div>}
                  {l.affil_url && (
                    <a href={l.affil_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '0.8rem', fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, color: '#fff', background: '#FF5A5F', padding: '6px 14px', borderRadius: 4 }}>
                      Voir sur Airbnb →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--fo)', color: 'var(--td3)', fontSize: 14 }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>{t.icon}</div>
            <p>Les listings <strong style={{ color: 'var(--td)' }}>{t.label}</strong> arrivent bientôt.</p>
          </div>
        )}
      </div>
    </main>
  );
}
