import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReviewIssue {
  category: 'proprete' | 'bruit' | 'wifi' | 'equipements' | 'hote' | 'localisation' | 'rapport_qualite_prix' | 'securite';
  description: string;
  severity: 'low' | 'medium' | 'high';
  keywords: string[];
}

export interface ReviewCategories {
  proprete: number;        // 0-10
  confort: number;
  localisation: number;
  communication: number;
  rapport_qualite_prix: number;
  esthetique: number;      // NIKA exclusive
  wow_factor: number;      // NIKA exclusive
  authenticite: number;    // NIKA exclusive
}

export interface ReviewAnalysis {
  summary: string;
  sentiment: 'positif' | 'negatif' | 'mitige' | 'neutre';
  language: string;
  highlights: string[];
  issues: ReviewIssue[];
  categories: ReviewCategories;
  scores: {
    global: number;        // 0-10
    nika_score: number;    // 0-25 (weighted NIKA formula)
  };
}

const ANALYSIS_PROMPT = `Tu es l'IA de NIKA, une plateforme de logements insolites haut de gamme sur la Côte d'Azur et dans le monde.
Analyse cet avis client et réponds UNIQUEMENT en JSON valide (zéro markdown, zéro texte avant ou après) :

{
  "summary": "Résumé en 1-2 phrases, en français",
  "sentiment": "positif|negatif|mitige|neutre",
  "language": "fr|en|de|it|es|autre",
  "highlights": ["point positif 1", "point positif 2"],
  "issues": [
    {
      "category": "proprete|bruit|wifi|equipements|hote|localisation|rapport_qualite_prix|securite",
      "description": "Description précise du problème en français",
      "severity": "low|medium|high",
      "keywords": ["mot-clé1", "mot-clé2"]
    }
  ],
  "categories": {
    "proprete": 0,
    "confort": 0,
    "localisation": 0,
    "communication": 0,
    "rapport_qualite_prix": 0,
    "esthetique": 0,
    "wow_factor": 0,
    "authenticite": 0
  },
  "scores": {
    "global": 0,
    "nika_score": 0
  }
}

Règles de scoring :
- Toutes les notes categories : 0-10 (0 si non mentionné)
- global : moyenne pondérée des catégories mentionnées (0-10)
- nika_score : formule NIKA = (esthetique×0.20 + wow_factor×0.20 + authenticite×0.15 + confort×0.15 + proprete×0.10 + communication×0.10 + localisation×0.05 + rapport_qualite_prix×0.05) × 2.5 → résultat 0-25
- issues : ne lister que les problèmes réels mentionnés (tableau vide si aucun)
- highlights : points positifs concrets mentionnés (max 5)

{{LISTING_CONTEXT}}

Avis à analyser :
{{REVIEW_TEXT}}`;

export async function analyzeReview(
  reviewText: string,
  listingContext?: string
): Promise<ReviewAnalysis> {
  const contextBlock = listingContext
    ? `Contexte du logement : ${listingContext}`
    : '';

  const prompt = ANALYSIS_PROMPT
    .replace('{{LISTING_CONTEXT}}', contextBlock)
    .replace('{{REVIEW_TEXT}}', reviewText);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Réponse Claude invalide — JSON introuvable');
  }

  const result = JSON.parse(jsonMatch[0]) as ReviewAnalysis;
  return result;
}
