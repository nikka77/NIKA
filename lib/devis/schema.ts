// lib/devis/schema.ts — validation Zod du devis ARTISAN.
// Sert plus tard à valider (a) la sortie de l'Edge Function IA et (b) les saisies de l'app.
// Les totaux (total_ht/tva/ttc) et montant_ht NE figurent PAS ici : ils sont calculés
// (computeDevisTotals / colonne générée), jamais saisis.
import { z } from 'zod';
import { DEVIS_STATUTS, LIGNE_PROVENANCES, TVA_REGIMES } from './types';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format YYYY-MM-DD');
const montantHT = z.number().nonnegative().finite();
const taux = z.number().min(0).max(100);

// Champs communs à toutes les lignes (hors montant_ht = généré).
const ligneBase = {
  id: z.uuid().optional(),
  position: z.number().int().nonnegative().optional(),
  designation: z.string().min(1),
  quantite: z.number().positive().finite(),
  prix_unitaire_ht: montantHT,
  taux_tva: taux.default(20),
  provenance: z.enum(LIGNE_PROVENANCES).default('saisi_pro'),
  valide_par_pro: z.boolean().default(false),
};

export const ligneMaterielSchema = z.object({
  type: z.literal('materiel'),
  unite: z.string().min(1), // u, m2, ml, kg, l…
  lien_fournisseur: z.url().nullish(),
  a_acheter: z.boolean().default(false),
  taux_horaire: z.null().optional(),
  ...ligneBase,
});

export const ligneMainOeuvreSchema = z.object({
  type: z.literal('main_oeuvre'),
  unite: z.literal('heures').default('heures'),
  taux_horaire: montantHT, // = prix_unitaire_ht (vérifié au niveau devis + CHECK DB)
  a_acheter: z.literal(false).default(false),
  lien_fournisseur: z.null().optional(),
  ...ligneBase,
});

export const ligneSchema = z.discriminatedUnion('type', [ligneMaterielSchema, ligneMainOeuvreSchema]);
export type LigneInput = z.infer<typeof ligneSchema>;

export const devisInputSchema = z
  .object({
    reference: z.string().min(1),
    statut: z.enum(DEVIS_STATUTS).default('brouillon'),
    artisan_id: z.uuid(),
    client_id: z.uuid().nullish(),
    client_nom: z.string().nullish(),
    client_adresse: z.string().nullish(),
    date_emission: isoDate,
    date_validite: isoDate,
    date_debut_travaux: isoDate.nullish(),
    // Mentions légales FR (données)
    artisan_siret: z.string().nullish(),
    assurance_decennale_assureur: z.string().nullish(),
    assurance_decennale_police: z.string().nullish(),
    assurance_rc_pro_assureur: z.string().nullish(),
    assurance_rc_pro_police: z.string().nullish(),
    tva_regime: z.enum(TVA_REGIMES).default('reel'),
    mention_tva: z.string().nullish(),
    conditions_paiement: z.string().nullish(),
    acompte_pourcent: z.number().min(0).max(100).nullish(),
    frais_deplacement: z.number().nonnegative().default(0),
    frais_deplacement_tva: taux.default(20),
    notes: z.string().nullish(),
    lignes: z.array(ligneSchema).min(1),
  })
  .superRefine((d, ctx) => {
    // Cohérence des dates.
    if (d.date_validite < d.date_emission) {
      ctx.addIssue({ code: 'custom', path: ['date_validite'], message: 'date_validite doit être ≥ date_emission.' });
    }
    // main_oeuvre : taux_horaire = prix_unitaire_ht.
    d.lignes.forEach((l, i) => {
      if (l.type === 'main_oeuvre' && l.taux_horaire !== l.prix_unitaire_ht) {
        ctx.addIssue({ code: 'custom', path: ['lignes', i, 'taux_horaire'], message: 'main_oeuvre : taux_horaire doit égaler prix_unitaire_ht.' });
      }
    });
    // RÈGLE MÉTIER — l'IA propose, le pro valide TOUJOURS avant envoi/acceptation.
    if (d.statut === 'envoye' || d.statut === 'accepte') {
      d.lignes.forEach((l, i) => {
        if (l.provenance === 'suggere_ia' && l.valide_par_pro !== true) {
          ctx.addIssue({
            code: 'custom',
            path: ['lignes', i, 'valide_par_pro'],
            message: `Ligne ${i + 1} suggérée par l'IA : doit être validée par le pro (valide_par_pro=true) avant le statut « ${d.statut} ».`,
          });
        }
      });
    }
    // RÈGLE MÉTIER — franchise en base (art. 293 B) : aucune TVA.
    if (d.tva_regime === 'franchise_base') {
      d.lignes.forEach((l, i) => {
        if (l.taux_tva !== 0) {
          ctx.addIssue({ code: 'custom', path: ['lignes', i, 'taux_tva'], message: 'Franchise en base (art. 293 B) : taux_tva doit être 0.' });
        }
      });
      if (d.frais_deplacement_tva !== 0) {
        ctx.addIssue({ code: 'custom', path: ['frais_deplacement_tva'], message: 'Franchise en base : frais_deplacement_tva doit être 0.' });
      }
    }
  });

export type DevisInput = z.infer<typeof devisInputSchema>;
