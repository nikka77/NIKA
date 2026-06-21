'use client'
// app/pro/reviews/import/ImportClient.tsx — formulaire upload CSV Airbnb

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Listing {
  id: string
  name: string
  type?: string | null
}

interface ImportResult {
  success?: boolean
  imported?: number
  skipped?: number
  errors?: string[]
  error?: string
}

export default function ImportClient({ listings }: { listings: Listing[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [listingId, setListingId] = useState(listings[0]?.id ?? '')
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !listingId) return

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('listing_id', listingId)

      const res = await fetch('/api/reviews/import', { method: 'POST', body: formData })
      const data: ImportResult = await res.json()
      setResult(data)
      if (data.success) router.refresh()
    } catch {
      setResult({ error: 'Erreur réseau — réessayez' })
    } finally {
      setLoading(false)
    }
  }

  if (listings.length === 0) {
    return (
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td2)', marginBottom: '0.5rem' }}>
          Aucun logement STAY associé à votre compte pro.
        </p>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td3)' }}>
          Ajoutez d&apos;abord un logement pour pouvoir importer ses avis.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Étape 1 — logement */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '1.4rem', marginBottom: '1rem' }}>
        <label htmlFor="listing" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)', display: 'block', marginBottom: '0.6rem' }}>
          1 · Logement concerné
        </label>
        <select
          id="listing"
          value={listingId}
          onChange={e => setListingId(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            background: 'var(--bg)', border: '1px solid var(--bd2)',
            fontFamily: 'var(--fo)', fontSize: 14, color: 'var(--td)',
          }}
        >
          {listings.map(l => (
            <option key={l.id} value={l.id}>{l.name}{l.type ? ` · ${l.type}` : ''}</option>
          ))}
        </select>
      </div>

      {/* Étape 2 — fichier */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 12, padding: '1.4rem', marginBottom: '1rem' }}>
        <label htmlFor="csv" style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)', display: 'block', marginBottom: '0.6rem' }}>
          2 · Fichier CSV Airbnb
        </label>
        <label htmlFor="csv" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: '2rem 1rem', borderRadius: 10, cursor: 'pointer',
          border: `2px dashed ${fileName ? 'rgba(224,112,56,0.5)' : 'var(--bd2)'}`,
          background: fileName ? 'rgba(224,112,56,0.06)' : 'transparent',
          transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: 28 }}>{fileName ? '📄' : '📤'}</span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 600, color: fileName ? '#E07038' : 'var(--td2)' }}>
            {fileName ?? 'Cliquez pour choisir le fichier .csv'}
          </span>
          <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
            Airbnb → Historique des commentaires → Exporter
          </span>
        </label>
        <input
          ref={fileRef}
          id="csv"
          type="file"
          accept=".csv"
          onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
          style={{ display: 'none' }}
        />
      </div>

      {/* Résultat */}
      {result && (
        <div style={{
          borderRadius: 12, padding: '1.2rem 1.4rem', marginBottom: '1rem',
          background: result.error ? 'rgba(212,75,36,0.1)' : 'rgba(14,168,120,0.1)',
          border: `1px solid ${result.error ? 'rgba(212,75,36,0.3)' : 'rgba(14,168,120,0.3)'}`,
        }}>
          {result.error ? (
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--coral)', margin: 0 }}>
              ✗ {result.error}
            </p>
          ) : (
            <>
              <p style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--teal)', margin: '0 0 0.3rem' }}>
                ✓ Import terminé — {result.imported} avis analysé{(result.imported ?? 0) > 1 ? 's' : ''}
                {(result.skipped ?? 0) > 0 ? ` · ${result.skipped} doublon${(result.skipped ?? 0) > 1 ? 's' : ''} ignoré${(result.skipped ?? 0) > 1 ? 's' : ''}` : ''}
              </p>
              {result.errors && result.errors.length > 0 && (
                <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', margin: 0 }}>
                  {result.errors.length} ligne{result.errors.length > 1 ? 's' : ''} en erreur : {result.errors.slice(0, 3).join(' · ')}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !fileName || !listingId}
        style={{
          width: '100%', padding: '14px', borderRadius: 10, border: 'none',
          fontFamily: 'var(--fo)', fontSize: 14, fontWeight: 700,
          letterSpacing: '0.04em', cursor: loading || !fileName ? 'not-allowed' : 'pointer',
          background: loading || !fileName ? 'var(--bg3)' : '#E07038',
          color: loading || !fileName ? 'var(--td3)' : '#fff',
          transition: 'all 0.2s',
        }}
      >
        {loading ? '⏳ Analyse IA en cours… (peut prendre 1 min)' : '↑ Importer et analyser'}
      </button>

      <p style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)', marginTop: '0.8rem', lineHeight: 1.6, textAlign: 'center' }}>
        Les doublons (même code de confirmation) sont automatiquement ignorés.
      </p>
    </form>
  )
}
