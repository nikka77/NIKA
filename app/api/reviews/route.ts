import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeReview } from '@/lib/claude/review-analyzer';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // Endpoint payant (analyse Claude) → réservé aux membres connectés + bornes d'entrée.
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'DB indisponible' }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { listing_id, author_name, rating, text, source = 'direct', review_date } = body;

    if (!listing_id || !text || rating === undefined) {
      return NextResponse.json({ error: 'listing_id, text et rating requis' }, { status: 400 });
    }
    if (String(text).length > 5000 || (author_name && String(author_name).length > 120)) {
      return NextResponse.json({ error: 'Entrée trop longue' }, { status: 413 });
    }
    const numRating = Number(rating);
    if (!Number.isFinite(numRating) || numRating < 0 || numRating > 5) {
      return NextResponse.json({ error: 'Note invalide (0–5)' }, { status: 400 });
    }

    // Fetch listing context for better analysis
    const { data: listing } = await supabase
      .from('stay_listings')
      .select('name, type, description')
      .eq('id', listing_id)
      .single();

    const listingContext = listing
      ? `${listing.name} (type: ${listing.type}) — ${listing.description ?? ''}`
      : undefined;

    // 1. Save raw review immediately
    const { data: review, error: insertError } = await supabase
      .from('stay_reviews')
      .insert({
        listing_id,
        author_name: author_name ?? 'Anonyme',
        rating,
        text,
        source,
        review_date: review_date ?? new Date().toISOString(),
        analysis_status: 'pending',
      })
      .select()
      .single();

    if (insertError || !review) {
      return NextResponse.json({ error: 'Erreur sauvegarde avis' }, { status: 500 });
    }

    // 2. Async Claude analysis — non-blocking, fire and forget
    void runAnalysis(review.id, text, listingContext, listing_id, supabase);

    return NextResponse.json({ success: true, review_id: review.id }, { status: 201 });
  } catch (err) {
    console.error('POST /api/reviews error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

async function runAnalysis(
  reviewId: string,
  text: string,
  listingContext: string | undefined,
  listingId: string,
  supabase: SupabaseClient
) {
  try {
    const analysis = await analyzeReview(text, listingContext);

    // 3. Update review with analysis results
    await supabase
      .from('stay_reviews')
      .update({
        analysis_status: 'done',
        sentiment: analysis.sentiment,
        language: analysis.language,
        summary: analysis.summary,
        highlights: analysis.highlights,
        score_global: analysis.scores.global,
        score_nika: analysis.scores.nika_score,
        categories: analysis.categories,
      })
      .eq('id', reviewId);

    // 4. Upsert issues
    for (const issue of analysis.issues) {
      const { data: existing } = await supabase
        .from('stay_issues')
        .select('id, mention_count')
        .eq('listing_id', listingId)
        .eq('category', issue.category)
        .eq('status', 'open')
        .single();

      if (existing) {
        await supabase
          .from('stay_issues')
          .update({
            mention_count: existing.mention_count + 1,
            severity: issue.severity,
            last_mentioned_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('stay_issues')
          .insert({
            listing_id: listingId,
            category: issue.category,
            description: issue.description,
            severity: issue.severity,
            keywords: issue.keywords,
            mention_count: 1,
            status: 'open',
          });
      }
    }

    // 5. Recalculate listing stats
    const { data: allReviews } = await supabase
      .from('stay_reviews')
      .select('rating, score_nika, sentiment, categories')
      .eq('listing_id', listingId)
      .eq('analysis_status', 'done');

    if (allReviews && allReviews.length > 0) {
      const count = allReviews.length;
      const avgRating = allReviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / count;
      const avgNika = allReviews
        .filter((r: { score_nika: number | null }) => r.score_nika != null)
        .reduce((s: number, r: { score_nika: number }) => s + r.score_nika, 0) /
        allReviews.filter((r: { score_nika: number | null }) => r.score_nika != null).length || 0;

      const sentimentCounts: Record<string, number> = {};
      for (const r of allReviews) {
        if (r.sentiment) sentimentCounts[r.sentiment] = (sentimentCounts[r.sentiment] ?? 0) + 1;
      }

      await supabase
        .from('stay_stats')
        .upsert({
          listing_id: listingId,
          review_count: count,
          avg_rating: Math.round(avgRating * 100) / 100,
          avg_nika_score: Math.round(avgNika * 10) / 10,
          sentiment_distribution: sentimentCounts,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'listing_id' });
    }
  } catch (err) {
    console.error(`Analysis failed for review ${reviewId}:`, err);
    await supabase
      .from('stay_reviews')
      .update({ analysis_status: 'error' })
      .eq('id', reviewId);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get('listing_id');
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  if (!listingId) return NextResponse.json({ error: 'listing_id requis' }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'DB indisponible' }, { status: 503 });

  const { data: reviews, error } = await supabase
    .from('stay_reviews')
    .select('id, author_name, rating, text, source, review_date, sentiment, summary, highlights, score_nika, analysis_status')
    .eq('listing_id', listingId)
    .order('review_date', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Erreur récupération avis' }, { status: 500 });

  return NextResponse.json({ reviews });
}
