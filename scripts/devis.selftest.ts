// scripts/devis.selftest.ts — vérifie la couche données devis (DoD).
//   npx tsx scripts/devis.selftest.ts
// 1) Zod valide un devis complet.  2) Zod rejette une ligne IA non validée en « accepte ».
// 3) computeDevisTotals donne le bon résultat.
import { devisInputSchema, computeDevisTotals } from '../lib/devis';

let failures = 0;
const ok = (label: string) => console.log(`  ✓ ${label}`);
const fail = (label: string, detail?: unknown) => { failures++; console.error(`  ✗ ${label}`, detail ?? ''); };
function assert(cond: boolean, label: string, detail?: unknown) { cond ? ok(label) : fail(label, detail); }

const ARTISAN = '11111111-1111-4111-8111-111111111111';
const CLIENT = '22222222-2222-4222-8222-222222222222';

// Devis complet valide : 1 matériel saisi pro + 1 main d'œuvre + 1 ligne IA validée. Statut accepte.
const devisValide = {
  reference: 'DEV-2026-0001',
  statut: 'accepte',
  artisan_id: ARTISAN,
  client_id: CLIENT,
  client_nom: 'Mme Martin',
  client_adresse: "12 rue de la Buffa, 06000 Nice",
  date_emission: '2026-06-21',
  date_validite: '2026-07-21',
  date_debut_travaux: '2026-07-01',
  artisan_siret: '12345678900012',
  assurance_decennale_assureur: 'AXA',
  assurance_decennale_police: 'DEC-99887',
  assurance_rc_pro_assureur: 'AXA',
  assurance_rc_pro_police: 'RC-44556',
  tva_regime: 'reel',
  conditions_paiement: 'Acompte 30% à la commande, solde à réception.',
  acompte_pourcent: 30,
  frais_deplacement: 30,
  frais_deplacement_tva: 20,
  total_ttc: 441, // ignoré par le schéma (non défini) → ne doit PAS bloquer
  lignes: [
    { type: 'materiel', designation: 'Carrelage 60x60', quantite: 2, unite: 'm2', prix_unitaire_ht: 100, taux_tva: 20, a_acheter: true, lien_fournisseur: 'https://fournisseur.fr/ref', provenance: 'saisi_pro', valide_par_pro: true },
    { type: 'main_oeuvre', designation: 'Pose carrelage', quantite: 3, unite: 'heures', prix_unitaire_ht: 50, taux_horaire: 50, taux_tva: 10, provenance: 'saisi_pro', valide_par_pro: true },
    { type: 'materiel', designation: 'Colle (suggérée IA)', quantite: 1, unite: 'u', prix_unitaire_ht: 0, taux_tva: 20, provenance: 'suggere_ia', valide_par_pro: true },
  ],
};

// 1) Devis complet valide
{
  const r = devisInputSchema.safeParse(devisValide);
  assert(r.success, '1) Zod accepte un devis complet valide', r.success ? '' : r.error.issues);
}

// 2) Ligne IA non validée + statut accepte → rejet, avec issue sur valide_par_pro
{
  const devisInvalide = {
    ...devisValide,
    reference: 'DEV-2026-0002',
    lignes: devisValide.lignes.map((l, i) => (i === 2 ? { ...l, valide_par_pro: false } : l)),
  };
  const r = devisInputSchema.safeParse(devisInvalide);
  const hitsRule = !r.success && r.error.issues.some(iss => iss.path.join('.').includes('valide_par_pro'));
  assert(!r.success, '2) Zod REJETTE un « accepte » avec ligne IA non validée');
  assert(hitsRule, "2b) l'erreur pointe valide_par_pro", r.success ? '' : r.error.issues.map(i => i.path.join('.')));
}

// 2c) Même devis mais en brouillon → autorisé (l'IA peut rester non validée tant que brouillon)
{
  const brouillon = { ...devisValide, reference: 'DEV-2026-0003', statut: 'brouillon', lignes: devisValide.lignes.map((l, i) => (i === 2 ? { ...l, valide_par_pro: false } : l)) };
  const r = devisInputSchema.safeParse(brouillon);
  assert(r.success, '2c) Zod accepte le même devis en brouillon (IA non validée tolérée)', r.success ? '' : r.error.issues);
}

// 3) Totaux : 2×100@20 + 3×50@10 + frais 30@20  →  HT 380, TVA 61, TTC 441
{
  const t = computeDevisTotals(
    [
      { quantite: 2, prix_unitaire_ht: 100, taux_tva: 20 },
      { quantite: 3, prix_unitaire_ht: 50, taux_tva: 10 },
    ],
    { frais_deplacement: 30, frais_deplacement_tva: 20 },
  );
  assert(t.total_ht === 380, `3) total_ht = 380 (obtenu ${t.total_ht})`);
  assert(t.total_tva === 61, `3) total_tva = 61 (obtenu ${t.total_tva})`);
  assert(t.total_ttc === 441, `3) total_ttc = 441 (obtenu ${t.total_ttc})`);
  const tva10 = t.tva_par_taux.find(v => v.taux === 10);
  const tva20 = t.tva_par_taux.find(v => v.taux === 20);
  assert(!!tva10 && tva10.base_ht === 150 && tva10.montant_tva === 15, '3) ventilation 10% = base 150 / TVA 15', tva10);
  assert(!!tva20 && tva20.base_ht === 230 && tva20.montant_tva === 46, '3) ventilation 20% = base 230 / TVA 46', tva20);
}

// 3b) Arrondi par taux (5.5%) : 1×9.99@5.5 → TVA 0.55, TTC 10.54
{
  const t = computeDevisTotals([{ quantite: 1, prix_unitaire_ht: 9.99, taux_tva: 5.5 }]);
  assert(t.total_ht === 9.99 && t.total_tva === 0.55 && t.total_ttc === 10.54, '3b) arrondi TVA 5,5% correct', t);
}

console.log(failures === 0 ? '\n✅ devis self-test : OK' : `\n❌ devis self-test : ${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
