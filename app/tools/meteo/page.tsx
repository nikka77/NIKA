'use client';
// app/tools/meteo/page.tsx — Météo & mer (API open-meteo, gratuite, sans clé, CORS).
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const CY = '#12B8CC';
const CY2 = '#3AD7E6';
const CITIES = [
  { key: 'nice', label: 'Nice', lat: 43.7009, lng: 7.2683, slat: 43.69, slng: 7.31 },
  { key: 'cannes', label: 'Cannes', lat: 43.5528, lng: 7.0174, slat: 43.54, slng: 7.03 },
  { key: 'antibes', label: 'Antibes', lat: 43.5808, lng: 7.1251, slat: 43.57, slng: 7.14 },
  { key: 'menton', label: 'Menton', lat: 43.7765, lng: 7.5000, slat: 43.77, slng: 7.52 },
];
function wmo(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: 'Ensoleillé' };
  if (code <= 2) return { emoji: '🌤️', label: 'Peu nuageux' };
  if (code === 3) return { emoji: '☁️', label: 'Couvert' };
  if (code <= 48) return { emoji: '🌫️', label: 'Brouillard' };
  if (code <= 57) return { emoji: '🌦️', label: 'Bruine' };
  if (code <= 67) return { emoji: '🌧️', label: 'Pluie' };
  if (code <= 77) return { emoji: '🌨️', label: 'Neige' };
  if (code <= 82) return { emoji: '🌦️', label: 'Averses' };
  if (code <= 86) return { emoji: '🌨️', label: 'Averses de neige' };
  return { emoji: '⛈️', label: 'Orage' };
}
const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

type Data = { temp: number; feels: number; code: number; wind: number; hum: number; daily: { d: string; max: number; min: number; code: number }[]; sea: number | null; wave: number | null };

export default function MeteoPage() {
  const [city, setCity] = useState(CITIES[0]);
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'err'>('loading');

  const load = useCallback(async () => {
    setState('loading'); setData(null);
    try {
      const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=4`).then(r => r.json());
      let sea: number | null = null, wave: number | null = null;
      try {
        const mar = await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${city.slat}&longitude=${city.slng}&current=wave_height,sea_surface_temperature&timezone=auto`).then(r => r.json());
        sea = mar?.current?.sea_surface_temperature ?? null;
        wave = mar?.current?.wave_height ?? null;
      } catch { /* mer optionnelle */ }
      const c = wx.current, d = wx.daily;
      const daily = (d?.time ?? []).slice(0, 4).map((t: string, i: number) => ({ d: DAYS[new Date(t).getDay()], max: Math.round(d.temperature_2m_max[i]), min: Math.round(d.temperature_2m_min[i]), code: d.weather_code[i] }));
      setData({ temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), code: c.weather_code, wind: Math.round(c.wind_speed_10m), hum: c.relative_humidity_2m, daily, sea: sea != null ? Math.round(sea) : null, wave });
      setState('ok');
    } catch { setState('err'); }
  }, [city]);
  useEffect(() => { load(); }, [load]);

  const now = data ? wmo(data.code) : null;
  const cardS: React.CSSProperties = { borderRadius: 16, border: `1px solid ${CY}40`, background: `${CY}0c`, padding: '1.2rem' };

  return (
    <main style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#04181C,var(--bg) 40%)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(1.4rem,4vw,2.4rem) 1.1rem 4rem' }}>
        <Link href="/tools" style={{ fontFamily: 'var(--fo)', fontSize: 12, color: CY, textDecoration: 'none' }}>← Outils</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '0.8rem 0 1.2rem' }}>
          <span style={{ fontSize: 30 }} aria-hidden>🌊</span>
          <h1 style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: 'var(--td)', margin: 0 }}>Météo &amp; mer</h1>
        </div>

        <div className="hero-domabar" style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 14 }}>
          {CITIES.map(c => {
            const a = c.key === city.key;
            return <button key={c.key} onClick={() => setCity(c)} style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${a ? CY : 'var(--bd2)'}`, background: a ? `${CY}22` : 'rgba(255,255,255,0.04)', color: a ? CY2 : 'var(--td2)', fontFamily: 'var(--fo)', fontSize: 12.5, fontWeight: a ? 700 : 500 }}>{c.label}</button>;
          })}
        </div>

        {state === 'err' ? (
          <div style={{ ...cardS, textAlign: 'center' }}><p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)' }}>Météo indisponible. <button onClick={load} style={{ background: 'none', border: 'none', color: CY2, textDecoration: 'underline', cursor: 'pointer' }}>Réessayer</button></p></div>
        ) : state === 'loading' || !data || !now ? (
          <div style={{ ...cardS, textAlign: 'center', fontFamily: 'var(--fo)', color: 'var(--td3)' }}>Chargement…</div>
        ) : (
          <>
            <div style={cardS}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 52 }} aria-hidden>{now.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--fn)', fontSize: 48, color: 'var(--td)', lineHeight: 1 }}>{data.temp}°</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td2)', marginTop: 2 }}>{now.label} · ressenti {data.feels}°</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
                <Metric label="Vent" value={`${data.wind} km/h`} />
                <Metric label="Humidité" value={`${data.hum}%`} />
                {data.sea != null && <Metric label="Mer" value={`${data.sea}°`} />}
                {data.wave != null && <Metric label="Vagues" value={`${data.wave} m`} />}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {data.daily.map((day, i) => { const w = wmo(day.code); return (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '12px 4px', borderRadius: 12, border: '1px solid var(--bd2)', background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', textTransform: 'uppercase' }}>{i === 0 ? "Auj." : day.d}</div>
                  <div style={{ fontSize: 22, margin: '4px 0' }} aria-hidden>{w.emoji}</div>
                  <div style={{ fontFamily: 'var(--fn)', fontSize: 15, color: 'var(--td)' }}>{day.max}°</div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>{day.min}°</div>
                </div>
              ); })}
            </div>
          </>
        )}
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10.5, color: 'var(--td3)', textAlign: 'center', marginTop: 14 }}>Données open-meteo.com · mer indicative près des côtes</p>
      </div>
    </main>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div><div style={{ fontFamily: 'var(--fo)', fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--td3)' }}>{label}</div><div style={{ fontFamily: 'var(--fe)', fontStyle: 'italic', fontWeight: 800, fontSize: 15, color: 'var(--td)', marginTop: 2 }}>{value}</div></div>;
}
