'use client'
// components/stay/SmartSearch.tsx
// Recherche par disponibilité : N nuits consécutives dans une période

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface SearchResult {
  slug: string
  first_date: string
  last_date: string
  consecutive_days: number
  name: string
  wow_score: number
  rating: number
  listing_type: string
  country: string
  cover_image?: string
}

const QUICK_MODES = [
  { id: 'asap',   label: 'Dès maintenant', days: 30 },
  { id: 'month',  label: 'Ce mois-ci',     days: 0  },
  { id: 'summer', label: 'Été 2026',       days: -1 },
  { id: 'winter', label: 'Hiver 2026',     days: -2 },
]

function getDateRange(mode: string): { from: string; to: string } {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const add = (d: Date, n: number) => new Date(d.getTime() + n * 864e5)

  if (mode === 'asap')   return { from: fmt(now), to: fmt(add(now, 30)) }
  if (mode === 'month')  return {
    from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
    to:   fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
  if (mode === 'summer') return { from: fmt(new Date(2026, 6, 1)), to: fmt(new Date(2026, 7, 31)) }
  if (mode === 'winter') return { from: fmt(new Date(2026, 11, 1)), to: fmt(new Date(2027, 1, 28)) }
  return { from: fmt(now), to: fmt(add(now, 60)) }
}

function formatDate(d: string, short = false) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: short ? 'short' : 'long',
  })
}

export default function SmartSearch() {
  const [nights,   setNights]   = useState(3)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [mode,     setMode]     = useState('asap')
  const [results,  setResults]  = useState<SearchResult[] | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)

  const selectMode = (m: string) => {
    setMode(m)
    const range = getDateRange(m)
    setDateFrom(range.from)
    setDateTo(range.to)
  }

  const search = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      const from = dateFrom || getDateRange('asap').from
      const to   = dateTo   || getDateRange('asap').to
      const res  = await fetch(`/api/stay/search?nights=${nights}&from=${from}&to=${to}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [nights, dateFrom, dateTo])

  return (
    <div className="smart-search-wrap">
      {/* ── Barre de recherche ── */}
      <div className="smart-search-bar">
        <div className="ss-field">
          <label>Combien de nuits ?</label>
          <div className="nights-stepper">
            <button onClick={() => setNights(n => Math.max(1, n - 1))}>−</button>
            <span>{nights} nuit{nights > 1 ? 's' : ''}</span>
            <button onClick={() => setNights(n => Math.min(30, n + 1))}>+</button>
          </div>
        </div>

        <div className="ss-field">
          <label>Tes dates <span className="opt-tag">optionnel</span></label>
          <div className="date-inputs">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setMode('') }} />
            <span>→</span>
            <input type="date" value={dateTo}   onChange={e => { setDateTo(e.target.value); setMode('') }} />
          </div>
        </div>

        <button className="ss-btn" onClick={search} disabled={loading}>
          {loading ? '...' : 'Trouver mes dates →'}
        </button>
      </div>

      {/* ── Raccourcis ── */}
      <div className="ss-modes">
        <span>Raccourcis :</span>
        {QUICK_MODES.map(m => (
          <button
            key={m.id}
            className={`mode-chip${mode === m.id ? ' active' : ''}`}
            onClick={() => selectMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Résultats ── */}
      {searched && !loading && results !== null && (
        <div className="ss-results">
          <div className="ss-results-header">
            {results.length > 0 ? (
              <>
                <h2>
                  {results.length} logement{results.length > 1 ? 's' : ''} disponible{results.length > 1 ? 's' : ''} pour {nights} nuit{nights > 1 ? 's' : ''}
                </h2>
                <span className="ss-dates-label">
                  {dateFrom && dateTo
                    ? `du ${formatDate(dateFrom, true)} au ${formatDate(dateTo, true)}`
                    : 'dans les 60 prochains jours'
                  }
                </span>
              </>
            ) : (
              <div className="ss-no-results">
                <p>Aucun logement disponible pour {nights} nuits consécutives.</p>
                {nights > 1 && (
                  <button onClick={() => { setNights(n => Math.max(1, n - 1)); search() }}>
                    Essayer avec {nights - 1} nuit{nights - 1 > 1 ? 's' : ''} →
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="ss-grid">
            {results.map(r => (
              <Link key={`${r.slug}-${r.first_date}`} href={`/stay/${r.slug}`} className="ss-card">
                <div className="ss-card-img">
                  {r.cover_image
                    ? <Image src={r.cover_image} alt={r.name} fill style={{ objectFit: 'cover' }} />
                    : <div className="ss-card-placeholder" />
                  }
                  <div className="ss-card-score">WOW {r.wow_score}</div>
                </div>
                <div className="ss-card-body">
                  <div className="ss-avail-badge">
                    <span className="dot" />
                    {formatDate(r.first_date)} → {formatDate(r.last_date)}
                  </div>
                  <h3>{r.name}</h3>
                  <p className="ss-card-meta">{r.listing_type} · {r.country}</p>
                  <p className="ss-card-nights">★ {r.rating} · {nights} nuits trouvées</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
