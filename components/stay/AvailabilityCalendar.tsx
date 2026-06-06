'use client'
// components/stay/AvailabilityCalendar.tsx
// Calendrier de disponibilités en temps réel pour les pages /stay/[slug]
// Usage : <AvailabilityCalendar slug="sous-marin-jaune-nouvelle-zelande" airbnbId="20605023" />

import { useEffect, useState } from 'react'

interface AvailabilityData {
  available_dates: string[]
  unavailable_dates: string[]
  last_sync: string | null
  sync_minutes_ago: number | null
  min_nights: number | null
  note?: string
}

interface Props {
  slug: string
  airbnbId: string
  className?: string
}

// Générer les jours d'un mois
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['Lu','Ma','Me','Je','Ve','Sa','Di']

export default function AvailabilityCalendar({ slug, airbnbId, className = '' }: Props) {
  const [data, setData]       = useState<AvailabilityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/calendar/${slug}?months=3`)
        if (!res.ok) throw new Error('Erreur serveur')
        const json = await res.json()
        setData(json)
      } catch {
        setError('Impossible de charger les disponibilités')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [slug])

  const availableSet   = new Set(data?.available_dates || [])
  const unavailableSet = new Set(data?.unavailable_dates || [])
  const today = new Date().toISOString().split('T')[0]

  const days = getDaysInMonth(viewMonth.year, viewMonth.month)
  const firstDayOffset = (days[0].getDay() + 6) % 7 // 0=lundi

  const goNextMonth = () => setViewMonth(v => {
    const m = v.month === 11 ? 0 : v.month + 1
    const y = v.month === 11 ? v.year + 1 : v.year
    return { year: y, month: m }
  })
  const goPrevMonth = () => setViewMonth(v => {
    const m = v.month === 0 ? 11 : v.month - 1
    const y = v.month === 0 ? v.year - 1 : v.year
    return { year: y, month: m }
  })

  if (loading) return (
    <div className={`nika-calendar-loading ${className}`}>
      <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ color: 'var(--az2)', fontSize: 13 }}>⏳ Chargement des disponibilités...</div>
      </div>
    </div>
  )

  if (error || data?.note === 'no_data') return (
    <div className={`nika-calendar-error ${className}`}>
      <a
        href={`https://www.airbnb.fr/rooms/${airbnbId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg2)', borderRadius: 12, padding: '14px 20px',
          color: 'var(--sand)', fontSize: 14, textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <span>📅</span>
        <span>Voir les disponibilités sur Airbnb</span>
        <span style={{ marginLeft: 'auto', opacity: 0.5 }}>↗</span>
      </a>
    </div>
  )

  return (
    <div className={`nika-calendar ${className}`} style={{
      background: 'var(--bg2)',
      borderRadius: 16,
      padding: 20,
      border: '1px solid rgba(255,255,255,0.06)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ color: 'var(--sand)', margin: 0, fontSize: 15, fontWeight: 600 }}>
            Disponibilités
          </h3>
          {data?.sync_minutes_ago !== null && data?.sync_minutes_ago !== undefined && (
            <div style={{ color: 'var(--az2)', fontSize: 11, marginTop: 2, opacity: 0.7 }}>
              Mis à jour {data.sync_minutes_ago < 60
                ? `il y a ${data.sync_minutes_ago} min`
                : `il y a ${Math.round(data.sync_minutes_ago / 60)}h`
              }
            </div>
          )}
        </div>
        {data?.min_nights && (
          <div style={{
            background: 'rgba(0,148,212,0.15)', color: 'var(--az2)',
            padding: '4px 10px', borderRadius: 20, fontSize: 12
          }}>
            {data.min_nights} nuits min.
          </div>
        )}
      </div>

      {/* Navigation mois */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={goPrevMonth} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--sand)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
          fontSize: 16
        }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', color: 'var(--sand)', fontSize: 14, fontWeight: 600 }}>
          {MONTHS_FR[viewMonth.month]} {viewMonth.year}
        </div>
        <button onClick={goNextMonth} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--sand)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
          fontSize: 16
        }}>›</button>
      </div>

      {/* Jours de la semaine */}
      <div className="g-7" style={{ gap: 2, marginBottom: 6 }}>
        {DAYS_FR.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 11, color: 'rgba(240,232,212,0.4)',
            fontWeight: 600, padding: '4px 0'
          }}>{d}</div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="g-7" style={{ gap: 2 }}>
        {/* Offset premier jour */}
        {Array(firstDayOffset).fill(null).map((_, i) => <div key={`pad-${i}`} />)}

        {days.map(day => {
          const dateStr = day.toISOString().split('T')[0]
          const isPast      = dateStr < today
          const isAvailable = availableSet.has(dateStr)
          const isBooked    = unavailableSet.has(dateStr)
          const isToday     = dateStr === today

          let bg = 'transparent'
          let color = 'rgba(240,232,212,0.25)'
          let border = 'none'
          let cursor = 'default'

          if (isPast) {
            color = 'rgba(240,232,212,0.12)'
          } else if (isAvailable) {
            bg = 'rgba(14,168,120,0.15)'
            color = '#0EA878'
            border = '1px solid rgba(14,168,120,0.3)'
            cursor = 'pointer'
          } else if (isBooked) {
            bg = 'rgba(212,75,36,0.08)'
            color = 'rgba(240,232,212,0.2)'
          }

          if (isToday) {
            border = '1px solid var(--az)'
            color = 'var(--az2)'
          }

          return (
            <div
              key={dateStr}
              title={isAvailable ? 'Disponible' : isBooked ? 'Réservé' : ''}
              style={{
                aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, fontSize: 12, fontWeight: isToday ? 700 : 400,
                background: bg, color, border, cursor,
                textDecoration: isBooked && !isPast ? 'line-through' : 'none',
                opacity: isPast ? 0.4 : 1,
                transition: 'all 0.1s'
              }}
            >
              {day.getDate()}
            </div>
          )
        })}
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(14,168,120,0.3)', border: '1px solid #0EA878' }} />
          <span style={{ color: 'rgba(240,232,212,0.5)' }}>Disponible</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(212,75,36,0.15)' }} />
          <span style={{ color: 'rgba(240,232,212,0.5)' }}>Réservé</span>
        </div>
      </div>

      {/* CTA Airbnb */}
      <a
        href={`https://www.airbnb.fr/rooms/${airbnbId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block', marginTop: 16,
          background: 'linear-gradient(135deg, var(--az) 0%, var(--az2) 100%)',
          color: '#fff', textAlign: 'center', padding: '12px 0',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          textDecoration: 'none', letterSpacing: '0.03em'
        }}
      >
        Réserver sur Airbnb →
      </a>
    </div>
  )
}
