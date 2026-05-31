import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeReview } from '@/lib/claude/review-analyzer';

// Airbnb official host export CSV columns:
// Confirmation Code, Date, Guest Name, Listing, Review from Guest, Response from Host

interface AirbnbCsvRow {
  confirmationCode: string;
  date: string;
  guestName: string;
  listing: string;
  reviewFromGuest: string;
  responseFromHost?: string;
}

function parseCsv(csvText: string): AirbnbCsvRow[] {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Find header indices (case-insensitive, flexible)
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());

  const idx = {
    code: headers.findIndex(h => h.includes('confirmation')),
    date: headers.findIndex(h => h.includes('date')),
    guest: headers.findIndex(h => h.includes('guest name') || h === 'guest'),
    listing: headers.findIndex(h => h.includes('listing')),
    review: headers.findIndex(h => h.includes('review from guest') || h.includes('review')),
    response: headers.findIndex(h => h.includes('response')),
  };

  const rows: AirbnbCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const review = cols[idx.review]?.replace(/^"|"$/g, '') ?? '';
    if (!review) continue; // Skip rows without a review

    rows.push({
      confirmationCode: cols[idx.code]?.replace(/^"|"$/g, '') ?? '',
      date: cols[idx.date]?.replace(/^"|"$/g, '') ?? new Date().toISOString().split('T')[0],
      guestName: cols[idx.guest]?.replace(/^"|"$/g, '') ?? 'Anonyme',
      listing: cols[idx.listing]?.replace(/^"|"$/g, '') ?? '',
      reviewFromGuest: review,
      responseFromHost: idx.response >= 0 ? cols[idx.response]?.replace(/^"|"$/g, '') : undefined,
    });
  }
  return rows;
}

// Handles quoted CSV fields containing commas
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const listingId = formData.get('listing_id') as string | null;

    if (!file || !listingId) {
      return NextResponse.json({ error: 'Fichier CSV et listing_id requis' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Format accepté: CSV uniquement' }, { status: 400 });
    }

    const csvText = await file.text();
    const rows = parseCsv(csvText);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Aucun avis trouvé dans le fichier' }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'DB indisponible' }, { status: 503 });

    // Get listing context once
    const { data: listing } = await supabase
      .from('stay_listings')
      .select('title, theme, description')
      .eq('id', listingId)
      .single();

    const listingContext = listing
      ? `${listing.title} (thème: ${listing.theme}) — ${listing.description ?? ''}`
      : undefined;

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        // Deduplicate by confirmation code
        if (row.confirmationCode) {
          const { data: existing } = await supabase
            .from('stay_reviews')
            .select('id')
            .eq('listing_id', listingId)
            .eq('source_ref', row.confirmationCode)
            .single();

          if (existing) {
            skipped++;
            continue;
          }
        }

        // Analyze with Claude
        const analysis = await analyzeReview(row.reviewFromGuest, listingContext);

        // Save with analysis already done
        await supabase.from('stay_reviews').insert({
          listing_id: listingId,
          author_name: row.guestName,
          rating: null, // Airbnb star rating not in export
          text: row.reviewFromGuest,
          source: 'airbnb_import',
          source_ref: row.confirmationCode || null,
          review_date: row.date,
          analysis_status: 'done',
          sentiment: analysis.sentiment,
          language: analysis.language,
          summary: analysis.summary,
          highlights: analysis.highlights,
          score_global: analysis.scores.global,
          score_nika: analysis.scores.nika_score,
          categories: analysis.categories,
        });

        // Upsert issues
        for (const issue of analysis.issues) {
          const { data: existingIssue } = await supabase
            .from('stay_issues')
            .select('id, mention_count')
            .eq('listing_id', listingId)
            .eq('category', issue.category)
            .eq('status', 'open')
            .single();

          if (existingIssue) {
            await supabase
              .from('stay_issues')
              .update({
                mention_count: existingIssue.mention_count + 1,
                severity: issue.severity,
                last_mentioned_at: row.date,
              })
              .eq('id', existingIssue.id);
          } else {
            await supabase.from('stay_issues').insert({
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

        imported++;
      } catch (err) {
        errors.push(`Ligne ${imported + skipped + 1}: ${err instanceof Error ? err.message : 'erreur inconnue'}`);
      }
    }

    // Recalculate stats after full import
    const { data: allReviews } = await supabase
      .from('stay_reviews')
      .select('rating, score_nika, sentiment')
      .eq('listing_id', listingId)
      .eq('analysis_status', 'done');

    if (allReviews && allReviews.length > 0) {
      const count = allReviews.length;
      const ratedReviews = allReviews.filter((r: { rating: number | null }) => r.rating != null);
      const avgRating = ratedReviews.length > 0
        ? ratedReviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / ratedReviews.length
        : 0;
      const nikaReviews = allReviews.filter((r: { score_nika: number | null }) => r.score_nika != null);
      const avgNika = nikaReviews.length > 0
        ? nikaReviews.reduce((s: number, r: { score_nika: number }) => s + r.score_nika, 0) / nikaReviews.length
        : 0;

      const sentimentCounts: Record<string, number> = {};
      for (const r of allReviews) {
        if (r.sentiment) sentimentCounts[r.sentiment] = (sentimentCounts[r.sentiment] ?? 0) + 1;
      }

      await supabase.from('stay_stats').upsert({
        listing_id: listingId,
        review_count: count,
        avg_rating: Math.round(avgRating * 100) / 100,
        avg_nika_score: Math.round(avgNika * 10) / 10,
        sentiment_distribution: sentimentCounts,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'listing_id' });
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('POST /api/reviews/import error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
