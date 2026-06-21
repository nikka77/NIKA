import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Avis & Problèmes — NIKA Pro' };

const CATEGORY_LABELS: Record<string, string> = {
  proprete: 'Propreté',
  bruit: 'Bruit',
  wifi: 'WiFi / Connectivité',
  equipements: 'Équipements',
  hote: 'Communication hôte',
  localisation: 'Localisation',
  rapport_qualite_prix: 'Rapport qualité/prix',
  securite: 'Sécurité',
};

const SEVERITY_COLOR: Record<string, string> = {
  high: 'var(--coral)',
  medium: '#E07038',
  low: 'var(--teal)',
};

const SEVERITY_BG: Record<string, string> = {
  high: 'rgba(212,75,36,0.12)',
  medium: 'rgba(224,112,56,0.12)',
  low: 'rgba(14,168,120,0.1)',
};

const SENTIMENT_COLOR: Record<string, string> = {
  positif: 'var(--teal)',
  negatif: 'var(--coral)',
  mitige: '#E07038',
  neutre: 'var(--td3)',
};

const SENTIMENT_LABEL: Record<string, string> = {
  positif: 'Positif',
  negatif: 'Négatif',
  mitige: 'Mitigé',
  neutre: 'Neutre',
};

export default async function ProReviewsPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/connexion');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');

  const { data: pro } = await supabase.from('pros').select('id, business_name').eq('user_id', user.id).eq('active', true).single();
  if (!pro) redirect('/pro/inscription');

  // Fetch all STAY listings for this pro
  const { data: listings } = await supabase
    .from('stay_listings')
    .select('id, name, type')
    .eq('pro_id', pro.id);

  const listingIds = (listings ?? []).map((l: { id: string }) => l.id);

  const [issuesResult, reviewsResult, statsResult] = await Promise.all([
    listingIds.length > 0
      ? supabase
          .from('stay_issues')
          .select('id, listing_id, category, description, severity, mention_count, status, last_mentioned_at')
          .in('listing_id', listingIds)
          .order('mention_count', { ascending: false })
          .limit(50)
      : { data: [] },
    listingIds.length > 0
      ? supabase
          .from('stay_reviews')
          .select('id, listing_id, author_name, rating, review_date, sentiment, summary, score_nika, analysis_status')
          .in('listing_id', listingIds)
          .eq('analysis_status', 'done')
          .order('review_date', { ascending: false })
          .limit(30)
      : { data: [] },
    listingIds.length > 0
      ? supabase
          .from('stay_stats')
          .select('listing_id, review_count, avg_rating, avg_nika_score, sentiment_distribution')
          .in('listing_id', listingIds)
      : { data: [] },
  ]);

  const issues = (issuesResult.data ?? []) as {
    id: string; listing_id: string; category: string; description: string;
    severity: string; mention_count: number; status: string; last_mentioned_at: string;
  }[];

  const reviews = (reviewsResult.data ?? []) as {
    id: string; listing_id: string; author_name: string; rating: number | null;
    review_date: string; sentiment: string; summary: string; score_nika: number;
    analysis_status: string;
  }[];

  const stats = (statsResult.data ?? []) as {
    listing_id: string; review_count: number; avg_rating: number;
    avg_nika_score: number; sentiment_distribution: Record<string, number>;
  }[];

  const openIssues = issues.filter(i => i.status === 'open');
  const highIssues = openIssues.filter(i => i.severity === 'high');

  const listingMap = new Map((listings ?? []).map((l: { id: string; name: string; type: string }) => [l.id, l]));
  const statsMap = new Map(stats.map(s => [s.listing_id, s]));

  const totalReviews = stats.reduce((s, st) => s + (st.review_count ?? 0), 0);
  const avgNika = stats.length > 0
    ? (stats.reduce((s, st) => s + (st.avg_nika_score ?? 0), 0) / stats.length).toFixed(1)
    : '—';

  return (
    <main style={{ padding: '3rem 1.4rem 5rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E07038', marginBottom: '0.4rem' }}>
          🏡 STAY · Espace Pro
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <h1 style={{ fontFamily: 'var(--fe)', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', lineHeight: 0.95 }}>
            Avis & Problèmes
          </h1>
          <Link
            href="/pro/reviews/import"
            style={{ fontFamily: 'var(--fo)', fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 6, background: 'rgba(224,112,56,0.12)', border: '1px solid rgba(224,112,56,0.3)', color: '#E07038', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            ↑ Importer CSV Airbnb
          </Link>
        </div>
        <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)', marginTop: '0.5rem' }}>
          Analyse IA des avis · Détection d&apos;issues · Score NIKA
        </p>
      </div>

      {/* KPI bar */}
      <div style={{ gap: '1rem', marginBottom: '2.5rem' }} className="g-4 max-md:grid-cols-2">
        {[
          { val: String(totalReviews), label: 'Avis analysés', color: 'var(--teal)' },
          { val: String(openIssues.length), label: 'Problèmes ouverts', color: openIssues.length > 0 ? '#E07038' : 'var(--teal)' },
          { val: String(highIssues.length), label: 'Priorité haute', color: highIssues.length > 0 ? 'var(--coral)' : 'var(--td3)' },
          { val: avgNika !== '—' ? `${avgNika}/25` : '—', label: 'Score NIKA moyen', color: 'var(--az2)' },
        ].map(({ val, label, color }) => (
          <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.4rem 1.2rem' }}>
            <div style={{ fontFamily: 'var(--fe)', fontSize: 32, fontWeight: 900, fontStyle: 'italic', color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td3)', marginTop: 6 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Stats per listing */}
      {listings && listings.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
            Par logement
          </h2>
          <div style={{ gap: '0.8rem' }} className="g-3 max-md:grid-cols-1">
            {(listings as { id: string; name: string; type: string }[]).map(listing => {
              const st = statsMap.get(listing.id);
              return (
                <div key={listing.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '1.2rem' }}>
                  <div style={{ fontFamily: 'var(--fe)', fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: 'var(--td)', marginBottom: 6 }}>
                    {listing.name}
                  </div>
                  <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {listing.type}
                  </div>
                  {st ? (
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>
                        <strong style={{ color: 'var(--teal)' }}>{st.review_count}</strong> avis
                      </span>
                      {st.avg_rating > 0 && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>
                          ⭐ <strong style={{ color: 'var(--gold2)' }}>{st.avg_rating.toFixed(1)}</strong>
                        </span>
                      )}
                      {st.avg_nika_score > 0 && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)' }}>
                          NIKA <strong style={{ color: 'var(--az2)' }}>{st.avg_nika_score.toFixed(1)}</strong>/25
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>Aucun avis analysé</span>
                  )}
                  {openIssues.filter(i => i.listing_id === listing.id).length > 0 && (
                    <div style={{ marginTop: 8, fontFamily: 'var(--fo)', fontSize: 11, color: '#E07038' }}>
                      ⚠ {openIssues.filter(i => i.listing_id === listing.id).length} problème(s) ouvert(s)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Open issues */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Problèmes ouverts
          {openIssues.length > 0 && (
            <span style={{ fontFamily: 'var(--fo)', fontSize: 11, fontWeight: 700, marginLeft: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(224,112,56,0.12)', border: '1px solid rgba(224,112,56,0.3)', color: '#E07038', verticalAlign: 'middle' }}>
              {openIssues.length}
            </span>
          )}
        </h2>

        {openIssues.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--teal)' }}>Aucun problème détecté — excellent !</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {openIssues.map(issue => {
              const listing = listingMap.get(issue.listing_id);
              return (
                <div key={issue.id} style={{ background: 'var(--bg2)', border: `1px solid ${SEVERITY_BG[issue.severity] || 'var(--bd)'}`, borderLeft: `3px solid ${SEVERITY_COLOR[issue.severity] || 'var(--td3)'}`, borderRadius: 8, padding: '1rem 1.2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 20, background: SEVERITY_BG[issue.severity], color: SEVERITY_COLOR[issue.severity] }}>
                        {issue.severity === 'high' ? '● Haute' : issue.severity === 'medium' ? '● Moyenne' : '● Basse'}
                      </span>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 11, color: 'var(--td3)' }}>
                        {CATEGORY_LABELS[issue.category] ?? issue.category}
                      </span>
                      {listing && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontStyle: 'italic' }}>
                          — {listing.name}
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td)', lineHeight: 1.5, margin: 0 }}>
                      {issue.description}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--fe)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: SEVERITY_COLOR[issue.severity], lineHeight: 1 }}>
                      {issue.mention_count}×
                    </div>
                    <div style={{ fontFamily: 'var(--fo)', fontSize: 9, color: 'var(--td3)', marginTop: 2 }}>mentions</div>
                    {issue.last_mentioned_at && (
                      <div style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', marginTop: 4 }}>
                        {new Date(issue.last_mentioned_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent reviews */}
      <div>
        <h2 style={{ fontFamily: 'var(--fe)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--td)', marginBottom: '1rem' }}>
          Avis récents analysés
        </h2>

        {reviews.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 10, padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--fo)', fontSize: 13, color: 'var(--td3)' }}>
              Aucun avis analysé.{' '}
              <Link href="/pro/reviews/import" style={{ color: '#E07038', textDecoration: 'underline' }}>
                Importer depuis Airbnb →
              </Link>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {reviews.map(review => {
              const listing = listingMap.get(review.listing_id);
              return (
                <div key={review.id} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 8, padding: '1rem 1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 13, fontWeight: 700, color: 'var(--td)' }}>
                        {review.author_name}
                      </span>
                      {review.rating && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--gold2)' }}>⭐ {review.rating}</span>
                      )}
                      {review.sentiment && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${SENTIMENT_COLOR[review.sentiment]}18`, border: `1px solid ${SENTIMENT_COLOR[review.sentiment]}40`, color: SENTIMENT_COLOR[review.sentiment] }}>
                          {SENTIMENT_LABEL[review.sentiment] ?? review.sentiment}
                        </span>
                      )}
                      {listing && (
                        <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)', fontStyle: 'italic' }}>
                          {listing.name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {review.score_nika > 0 && (
                        <span style={{ fontFamily: 'var(--fe)', fontSize: 15, fontWeight: 900, fontStyle: 'italic', color: 'var(--az2)' }}>
                          {review.score_nika.toFixed(1)}/25
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--fo)', fontSize: 10, color: 'var(--td3)' }}>
                        {new Date(review.review_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  {review.summary && (
                    <p style={{ fontFamily: 'var(--fo)', fontSize: 12, color: 'var(--td2)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                      &ldquo;{review.summary}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
