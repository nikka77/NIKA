// lib/devis/types.ts — types partagés du devis ARTISAN (en-tête + lignes + totaux).
// Source de vérité consommée par : Edge Function IA, escrow crypto, UI mobile.
// Enums déclarés en `as const` → réutilisés tels quels par Zod (lib/devis/schema.ts).

export const DEVIS_STATUTS = ['brouillon', 'envoye', 'accepte', 'refuse', 'expire'] as const;
export type DevisStatut = (typeof DEVIS_STATUTS)[number];

export const LIGNE_TYPES = ['materiel', 'main_oeuvre'] as const;
export type LigneType = (typeof LIGNE_TYPES)[number];

export const LIGNE_PROVENANCES = ['saisi_pro', 'suggere_ia'] as const;
export type LigneProvenance = (typeof LIGNE_PROVENANCES)[number];

export const TVA_REGIMES = ['reel', 'franchise_base'] as const;
export type TvaRegime = (typeof TVA_REGIMES)[number];

/** Ventilation de la TVA : un élément par taux distinct. */
export interface TvaVentilation {
  taux: number; // %
  base_ht: number;
  montant_tva: number;
}

/** Totaux calculés (jamais saisis) — produit de computeDevisTotals(). */
export interface DevisTotaux {
  total_ht: number;
  tva_par_taux: TvaVentilation[];
  total_tva: number;
  total_ttc: number;
  frais_deplacement: number;
}

/** Ligne telle que stockée (montant_ht généré côté DB). */
export interface DevisLigne {
  id: string;
  devis_id: string;
  position: number;
  type: LigneType;
  designation: string;
  quantite: number;
  unite: string;
  prix_unitaire_ht: number;
  montant_ht: number; // généré : round(quantite * prix_unitaire_ht, 2)
  taux_tva: number;
  provenance: LigneProvenance;
  valide_par_pro: boolean;
  lien_fournisseur?: string | null; // materiel
  a_acheter: boolean; // materiel
  taux_horaire?: number | null; // main_oeuvre (= prix_unitaire_ht)
  created_at: string;
}

/** En-tête tel que stocké. Totaux = snapshot écrit via computeDevisTotals(). */
export interface Devis {
  id: string;
  reference: string;
  statut: DevisStatut;
  artisan_id: string;
  client_id?: string | null;
  client_nom?: string | null;
  client_adresse?: string | null;
  date_emission: string;
  date_validite: string;
  date_debut_travaux?: string | null;
  artisan_siret?: string | null;
  assurance_decennale_assureur?: string | null;
  assurance_decennale_police?: string | null;
  assurance_rc_pro_assureur?: string | null;
  assurance_rc_pro_police?: string | null;
  tva_regime: TvaRegime;
  mention_tva?: string | null;
  conditions_paiement?: string | null;
  acompte_pourcent?: number | null;
  frais_deplacement: number;
  frais_deplacement_tva: number;
  total_ht?: number | null;
  total_tva?: number | null;
  total_ttc?: number | null;
  tva_par_taux: TvaVentilation[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

/** Devis complet avec ses lignes (lecture jointe). */
export interface DevisAvecLignes extends Devis {
  lignes: DevisLigne[];
}
