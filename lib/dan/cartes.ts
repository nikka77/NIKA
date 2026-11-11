// lib/dan/cartes.ts — contenu des cartes phygitales du Réseau DAN.
//
// Une carte = la page ouverte par le tap NFC (ou le QR) d'un membre. Même gabarit pour tous :
// en-tête + logo éclipse au matricule, « type », 3 portes (Ce que j'aime / Qui je suis /
// À toi de jouer), ticker de services, bouton d'action.
//
// Carte 0 = le fondateur (contenu repris de la maquette « DAN #0 — carte phygitale »).
// Cartes 1 à 9 = les chefs de pôle : squelettes prêts, portes vides tant que le chef
// ne les a pas remplies. Pour remplir une carte, éditer son entrée ici — rien d'autre à toucher.
import type { DivisionNum } from './matricule';

export type IconeService =
  | 'cube' | 'porte' | 'colis' | 'cle' | 'badge'
  | 'volant' | 'carton' | 'assiette' | 'toque' | 'outil' | 'velo' | 'livre' | 'micro'
  | 'boussole' | 'lit' | 'eclair' | 'goutte' | 'etiquette' | 'voiture' | 'cloche'
  | 'diamant' | 'stetho' | 'balance' | 'bulle' | 'globe';

export interface Service {
  nom: string;
  desc: string;
  couleur: string; // hex
  icone: IconeService;
}

export interface Accent {
  vif: string;  // néon principal (CTA, logo, pastille)
  fond: string; // halo d'aurore
  clair: string; // reflet / texte d'accent
}

export interface UniversGout {
  cle: 'ali' | 'mus' | 'fil' | 'act' | 'lie' | 'jeu';
  label: string;
  intro?: string;
  sections: { titre: string; items: string[] }[];
}

export interface Artiste { nom: string; titres: string[] }

export interface CarteDan {
  matricule: string;
  division: DivisionNum | null;
  role: string;          // « Membre fondateur », « Chef de pôle »
  type: string;          // ligne « TYPE : … »
  statut: 'actif' | 'en-preparation';
  accent: Accent;
  services: Service[];
  cta: { label: string; href: string };
  coeur: { univers: UniversGout[]; artistes: Artiste[] };
  moi: {
    naissance?: string;  // ISO, âge calculé à l'affichage
    taille?: string;
    yeux?: string;
    /** Date de dernière vérification de chaque mesure (pastilles de fraîcheur). */
    majLe?: { naissance?: string; taille?: string; yeux?: string };
    infos: { label: string; valeur: string }[];
    timeline: { annee: string; texte: string }[];
  };
  jouer: {
    defis: string[];
    checklist: string[];
    voeux: string[];
    flashback: { src?: string; legende: string }[];
  };
}

/** Les neuf divisions — l'ordre fait le matricule. */
export const DIVISIONS: Record<DivisionNum, {
  nom: string; slug: string; accroche: string; accent: Accent; services: Service[]; lienNika?: string;
}> = {
  1: {
    nom: 'Drivers', slug: 'drivers',
    accroche: 'Transport de personnes, livraisons, convoyage et déménagements.',
    accent: { vif: '#2E9BFF', fond: '#1C6FD1', clair: '#8CC8FF' },
    lienNika: '/auto',
    services: [
      { nom: 'TRANSPORT', desc: 'Personnes, Nice ↔ Monaco', couleur: '#2E9BFF', icone: 'volant' },
      { nom: 'LIVRAISON', desc: 'Commandes du réseau', couleur: '#FFB92E', icone: 'colis' },
      { nom: 'CONVOYAGE', desc: 'Votre véhicule, d\'un point à l\'autre', couleur: '#17C98C', icone: 'voiture' },
      { nom: 'DÉMÉNAGEMENT', desc: 'Cartons, meubles, camion', couleur: '#A24BFF', icone: 'carton' },
    ],
  },
  2: {
    nom: 'Restauration', slug: 'restauration',
    accroche: 'Tables locales et originales, cuisine validée par le fondateur. Pas de chaînes.',
    accent: { vif: '#FF8A3D', fond: '#D9631A', clair: '#FFC79E' },
    lienNika: '/food',
    services: [
      { nom: 'TABLES LOCALES', desc: 'Adresses indépendantes', couleur: '#FF8A3D', icone: 'assiette' },
      { nom: 'CUISINE VALIDÉE', desc: 'Goûtée par le #0', couleur: '#3BF06A', icone: 'toque' },
      { nom: 'À EMPORTER', desc: 'Livré par le pôle 1', couleur: '#2E9BFF', icone: 'colis' },
    ],
  },
  3: {
    nom: 'Location', slug: 'location',
    accroche: 'Objets, outils et véhicules du coin — sur place ou livrés par les drivers.',
    accent: { vif: '#17C98C', fond: '#0E9C6B', clair: '#8FF0CC' },
    lienNika: '/rent',
    services: [
      { nom: 'OUTILS', desc: 'Bricolage, jardin', couleur: '#17C98C', icone: 'outil' },
      { nom: 'VÉHICULES', desc: 'Scooter, utilitaire, vélo', couleur: '#2E9BFF', icone: 'velo' },
      { nom: 'OBJETS', desc: 'Sport, photo, camping', couleur: '#FFB92E', icone: 'cube' },
      { nom: 'LIVRÉ', desc: 'Par un driver du pôle 1', couleur: '#A24BFF', icone: 'colis' },
    ],
  },
  4: {
    nom: 'Apprentissage', slug: 'apprentissage',
    accroche: 'Cours et mentorat : combat, musique, mécanique, psycho, histoire, géo, politique.',
    accent: { vif: '#A24BFF', fond: '#7B2FD6', clair: '#D3AEFF' },
    lienNika: '/learn',
    services: [
      { nom: 'COMBAT', desc: 'Sports de combat', couleur: '#FF2E63', icone: 'eclair' },
      { nom: 'MUSIQUE', desc: 'Instrument, voix, MAO', couleur: '#A24BFF', icone: 'micro' },
      { nom: 'MÉCANIQUE', desc: 'Les mains dans le moteur', couleur: '#FFB92E', icone: 'outil' },
      { nom: 'SAVOIRS', desc: 'Psycho, histoire, géo, politique', couleur: '#2E9BFF', icone: 'livre' },
    ],
  },
  5: {
    nom: 'Voyages & Expériences', slug: 'voyages',
    accroche: 'Destinations et hébergements insolites qui laissent un vrai souvenir.',
    accent: { vif: '#FF5CA8', fond: '#D12E7E', clair: '#FFB0D5' },
    lienNika: '/stay',
    services: [
      { nom: 'INSOLITE', desc: 'Dormir hors du commun', couleur: '#FF5CA8', icone: 'lit' },
      { nom: 'ÉCHAPPÉES', desc: 'Destinations choisies', couleur: '#2E9BFF', icone: 'boussole' },
      { nom: 'EXPÉRIENCES', desc: 'Mer, montagne, nuit', couleur: '#17C98C', icone: 'globe' },
    ],
  },
  6: {
    nom: 'Réparation', slug: 'reparation',
    accroche: 'Dépannage multi-domaines : mécanique, électrique, pneumatique, hydraulique.',
    accent: { vif: '#FFB92E', fond: '#D98E0B', clair: '#FFE0A0' },
    lienNika: '/serv',
    services: [
      { nom: 'MÉCANIQUE', desc: 'Auto, moto, deux-roues', couleur: '#FFB92E', icone: 'outil' },
      { nom: 'ÉLECTRIQUE', desc: 'Pannes, tableaux, prises', couleur: '#2E9BFF', icone: 'eclair' },
      { nom: 'PNEUMATIQUE', desc: 'Crevaison, montage', couleur: '#17C98C', icone: 'voiture' },
      { nom: 'HYDRAULIQUE', desc: 'Fuites, plomberie', couleur: '#5CC8FF', icone: 'goutte' },
    ],
  },
  7: {
    nom: 'Achat & Vente', slug: 'achat-vente',
    accroche: 'Marketplace d\'articles et de véhicules, neufs ou d\'occasion.',
    accent: { vif: '#FF4D4D', fond: '#C92A2A', clair: '#FFB0B0' },
    services: [
      { nom: 'ARTICLES', desc: 'Neufs ou d\'occasion', couleur: '#FF4D4D', icone: 'etiquette' },
      { nom: 'VÉHICULES', desc: 'Achat, vente, reprise', couleur: '#2E9BFF', icone: 'voiture' },
      { nom: 'REMISE', desc: 'En main propre ou livrée', couleur: '#FFB92E', icone: 'colis' },
    ],
  },
  8: {
    nom: 'Conciergerie de luxe', slug: 'conciergerie',
    accroche: 'Services haut de gamme et intendance privée sur mesure.',
    accent: { vif: '#E8C46A', fond: '#B8902E', clair: '#FFF0C2' },
    lienNika: '/azur',
    services: [
      { nom: 'SUR MESURE', desc: 'Demandes impossibles', couleur: '#E8C46A', icone: 'diamant' },
      { nom: 'INTENDANCE', desc: 'Villa, yacht, résidence', couleur: '#17C98C', icone: 'cle' },
      { nom: 'ACCUEIL', desc: 'Arrivées, réservations', couleur: '#A24BFF', icone: 'cloche' },
    ],
  },
  9: {
    nom: 'Santé, Droit & Conseil', slug: 'sante-droit-conseil',
    accroche: 'Professions libérales : médecins, avocats, conseillers.',
    accent: { vif: '#5CE1E6', fond: '#2BA8AD', clair: '#BDF7F9' },
    services: [
      { nom: 'SANTÉ', desc: 'Médecins, praticiens', couleur: '#5CE1E6', icone: 'stetho' },
      { nom: 'DROIT', desc: 'Avocats, juristes', couleur: '#E8C46A', icone: 'balance' },
      { nom: 'CONSEIL', desc: 'Gestion, patrimoine', couleur: '#A24BFF', icone: 'bulle' },
    ],
  },
};

const VIDE_COEUR: CarteDan['coeur'] = { univers: [], artistes: [] };
const VIDE_JOUER: CarteDan['jouer'] = { defis: [], checklist: [], voeux: [], flashback: [] };

/** Carte 0 — le fondateur. Contenu issu de la maquette validée (« DAN #0 — carte phygitale »). */
const CARTE_0: CarteDan = {
  matricule: '0',
  division: null,
  role: 'Membre fondateur',
  type: 'Spécialisation',
  statut: 'actif',
  accent: { vif: '#22E04B', fond: '#17C24E', clair: '#3BF06A' },
  services: [
    { nom: 'EL CUBO', desc: 'Matérialisation 3D', couleur: '#4C6BFF', icone: 'cube' },
    { nom: 'RADIO CLAP', desc: 'Porte claquée, sans forçage', couleur: '#FF2E63', icone: 'porte' },
    { nom: 'TRACKPACK', desc: 'Colis localisé en agence', couleur: '#FFB92E', icone: 'colis' },
    { nom: 'SOS CAMTAR', desc: 'Dépannage auto express', couleur: '#17C98C', icone: 'cle' },
    { nom: 'PASS+', desc: 'Badge d\'accès configuré', couleur: '#A24BFF', icone: 'badge' },
  ],
  cta: { label: 'Me contacter', href: '/contact?carte=0' },
  coeur: {
    // Univers ouverts mais pas encore remplis : à compléter par le #0 (pas de goûts inventés).
    univers: [
      { cle: 'ali', label: 'Alimentaire', sections: ['Cuisine', 'Légumes', 'Fruits', 'Viandes', 'Poissons', 'Breuvages'].map(titre => ({ titre, items: [] })) },
      { cle: 'mus', label: 'Musique', sections: [] },
      { cle: 'fil', label: 'Films & séries', sections: [{ titre: 'Films & séries', items: [] }] },
      { cle: 'act', label: 'Activités', intro: 'Les activités que j\'aimerais essayer pour la première fois.', sections: [{ titre: 'À essayer', items: [] }] },
      { cle: 'lie', label: 'Lieux', sections: [{ titre: 'Lieux', items: [] }] },
      { cle: 'jeu', label: 'Jeux', sections: [{ titre: 'Jeux', items: [] }] },
    ],
    artistes: [
      { nom: 'Ninho', titres: ['Jefe', 'VVS', 'Goutte de pluie'] },
      { nom: 'Tiakola', titres: ['Meuda', 'La clé', 'Gasolina'] },
      { nom: 'Burna Boy', titres: ['Last Last', 'City Boys', 'On Form'] },
      { nom: 'Rema', titres: ['Calm Down', 'Charm', 'Woman'] },
      { nom: 'Aya Nakamura', titres: ['Djadja', 'Pookie', 'Copines'] },
      { nom: 'Team Paiya', titres: ['Coup du marteau'] },
    ],
  },
  moi: {
    naissance: '1998-05-26',
    taille: '185 cm',
    yeux: 'Marrons',
    majLe: { naissance: '2026-06-01', taille: '2026-06-01', yeux: '2026-08-18' },
    infos: [
      { label: 'Ville', valeur: 'Nice' },
      { label: 'Langues', valeur: 'FR · EN' },
      { label: 'Main', valeur: 'Droite' },
      { label: 'Pointure', valeur: '45' },
    ],
    timeline: [
      { annee: '1998', texte: 'Naissance à Abidjan.' },
      { annee: '2016', texte: 'Bac en poche, départ pour Paris.' },
      { annee: '2020', texte: 'Premier projet lancé — premier échec formateur.' },
      { annee: '2023', texte: 'L\'idée NIKA prend forme.' },
      { annee: '2025', texte: 'NIKA #0 — la carte que tu tiens.' },
    ],
  },
  jouer: {
    defis: [],
    checklist: [],
    voeux: [],
    // Les photos arrivent dans public/images/dan/0/ ; une case sans src affiche sa légende.
    flashback: [1, 2, 3, 4].map(i => ({ legende: `Souvenir 0${i}` })),
  },
};

function carteChef(d: DivisionNum): CarteDan {
  const div = DIVISIONS[d];
  return {
    matricule: String(d),
    division: d,
    role: 'Chef de pôle',
    type: div.nom,
    statut: 'en-preparation',
    accent: div.accent,
    services: div.services,
    cta: { label: 'Rejoindre le pôle', href: `/inscription?pole=${d}` },
    coeur: VIDE_COEUR,
    moi: { infos: [{ label: 'Division', valeur: `${d} — ${div.nom}` }, { label: 'Zone', valeur: 'Nice · Cannes · Monaco' }, { label: 'Matricules', valeur: `${d}1, ${d}2, ${d}3…` }, { label: 'Label', valeur: 'Validé par le 0' }], timeline: [] },
    jouer: VIDE_JOUER,
  };
}

export const CARTES: CarteDan[] = [
  CARTE_0,
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9] as DivisionNum[]).map(carteChef),
];

export function trouverCarte(matricule: string): CarteDan | undefined {
  return CARTES.find(c => c.matricule === matricule);
}
