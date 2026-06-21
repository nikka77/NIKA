// lib/devis/totaux.ts — calcul CENTRALISÉ des totaux d'un devis.
// SOURCE UNIQUE, utilisée à la fois côté app (preview avant save) ET côté serveur
// (Edge Function / persistance). Ne JAMAIS dupliquer cette logique : les totaux ne
// sont jamais saisis, ils dérivent toujours des lignes + frais de déplacement.
import type { DevisTotaux, TvaVentilation } from './types';

/** Arrondi commercial au centime (demi vers le haut), robuste aux flottants. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Entrée minimale d'une ligne pour le calcul (compatible lignes DB, saisies, ou IA). */
export interface LigneCalcul {
  quantite: number;
  prix_unitaire_ht: number;
  taux_tva: number;
}

export interface TotauxOptions {
  frais_deplacement?: number;
  frais_deplacement_tva?: number; // défaut 20
}

/**
 * Calcule total_ht, ventilation TVA par taux, total_tva et total_ttc.
 * Le montant HT d'une ligne = round(quantite * prix_unitaire_ht). Les frais de
 * déplacement s'ajoutent à la base HT de leur propre taux. La TVA est arrondie
 * PAR TAUX puis sommée (évite la dérive au centime).
 */
export function computeDevisTotals(lignes: LigneCalcul[], options: TotauxOptions = {}): DevisTotaux {
  const frais = round2(options.frais_deplacement ?? 0);
  const fraisTva = options.frais_deplacement_tva ?? 20;

  // Base HT cumulée par taux de TVA.
  const baseParTaux = new Map<number, number>();
  const addBase = (taux: number, ht: number) =>
    baseParTaux.set(taux, round2((baseParTaux.get(taux) ?? 0) + ht));

  for (const l of lignes) addBase(l.taux_tva, round2(l.quantite * l.prix_unitaire_ht));
  if (frais > 0) addBase(fraisTva, frais);

  const tva_par_taux: TvaVentilation[] = [...baseParTaux.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([taux, base_ht]) => ({
      taux,
      base_ht: round2(base_ht),
      montant_tva: round2((base_ht * taux) / 100),
    }));

  const total_ht = round2(tva_par_taux.reduce((s, v) => s + v.base_ht, 0));
  const total_tva = round2(tva_par_taux.reduce((s, v) => s + v.montant_tva, 0));
  const total_ttc = round2(total_ht + total_tva);

  return { total_ht, tva_par_taux, total_tva, total_ttc, frais_deplacement: frais };
}
