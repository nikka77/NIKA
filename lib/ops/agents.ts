// lib/ops/agents.ts — catalogue des agents NIKA OPS (source unique pour la console).
// Un « agent » = un type de tâche que le worker sait exécuter, avec son rôle et son modèle.
// L'état (au travail / en attente / inactif) est calculé à l'exécution dans l'API.

export type AgentDef = {
  type: string;          // task_type dans la file
  nom: string;
  role: string;          // ce qu'il fait, en une phrase
  modele: string;
  famille: 'data' | 'controle' | 'claude';
};

export const AGENTS: AgentDef[] = [
  {
    type: 'fandom_descfr',
    nom: 'Biographe',
    role: 'Lit la page canon du wiki et rédige la fiche française',
    modele: 'expert de l’univers',
    famille: 'data',
  },
  {
    type: 'akasha_attrs',
    nom: 'Taxonomiste',
    role: 'Renseigne les axes (village, clan, équipage, division…) avec preuve à l’appui',
    modele: 'expert de l’univers',
    famille: 'data',
  },
  {
    type: 'akasha_relations',
    nom: 'Historien',
    role: 'Retrace les relations majeures d’un personnage (famille, mentors, ennemis, équipages passés), preuve à l’appui',
    modele: 'expert de l’univers',
    famille: 'data',
  },
  {
    type: 'flavor_akasha',
    nom: 'Reformulateur',
    role: 'Reformule un résumé existant (déclassé : produisait des paraphrases)',
    modele: 'gemma4:12b',
    famille: 'data',
  },
  {
    type: 'review_local',
    nom: 'Relecteur',
    role: 'Vérifie chaque production contre sa source et rend un verdict motivé',
    modele: 'gemma4:12b',
    famille: 'controle',
  },
  {
    type: 'hhem_ancrage',
    nom: 'Vérificateur d’ancrage',
    role: 'Note 0→1 si l’affirmation est réellement étayée par la source (CPU, hors GPU)',
    modele: 'HHEM-2.1 (0,1 Md)',
    famille: 'controle',
  },
  {
    type: 'claude_console',
    nom: 'Claude',
    role: 'Développe le site sur demande depuis cette console',
    modele: 'claude -p (abonnement)',
    famille: 'claude',
  },
];

export type AgentEtat = AgentDef & {
  etat: 'travaille' | 'attente' | 'inactif';
  enFile: number;
  action: string;        // texte court : ce qu'il fait en ce moment
  dernier?: string;      // horodatage ISO de sa dernière production
};
