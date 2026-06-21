import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODERATION_PROMPT = `Tu es modérateur pour NIKA, une plateforme d'infos locales sur Nice et la Côte d'Azur.
Analyse cette publication et réponds UNIQUEMENT en JSON valide (pas de markdown, pas d'explication) :
{
  "approved": boolean,
  "reason": "string si refusé, sinon null",
  "reformulation": "texte corrigé si approuvé (neutre, sans insultes, sans fautes), sinon null",
  "category": "local|auto|food|sea|general"
}

Critères d'approbation : info locale pertinente, fait vérifiable ou expérience réelle,
pas d'insultes, pas de spam, pas de contenu haineux ou illégal.
Reformule systématiquement pour corriger fautes et améliorer la clarté.

Publication à analyser :
Titre: {{TITLE}}
Contenu: {{CONTENT}}`;

export async function POST(req: NextRequest) {
  try {
    // Endpoint payant (Claude) → réservé aux membres connectés + bornes d'entrée.
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { title, content } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ error: 'Titre et contenu requis' }, { status: 400 });
    }
    if (String(title).length > 200 || String(content).length > 5000) {
      return NextResponse.json({ error: 'Contenu trop long' }, { status: 413 });
    }

    const prompt = MODERATION_PROMPT
      .replace('{{TITLE}}', title)
      .replace('{{CONTENT}}', content);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ approved: false, reason: 'Erreur de modération. Réessaye.' });
    }
    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Moderation error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
