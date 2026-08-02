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
    type: 'fiche_technique',
    nom: 'Archiviste des techniques',
    role: 'Fiches des jutsu, transformations et attaques (606 en attente — Naruto, Dragon Ball, Bleach)',
    modele: 'expert de l’univers',
    famille: 'data',
  },
  {
    type: 'fiche_artefact',
    nom: 'Conservateur des artefacts',
    role: 'Fiches des armes et objets (sabres Meitō One Piece, outils Naruto…)',
    modele: 'expert de l’univers',
    famille: 'data',
  },
  {
    type: 'fiche_lieu',
    nom: 'Cartographe',
    role: 'Fiches des lieux — villages Naruto, mondes de Bleach, îles One Piece',
    modele: 'expert de l’univers',
    famille: 'data',
  },
  {
    type: 'fiche_lexique',
    nom: 'Lexicographe',
    role: 'Rangs, statuts, clans et organisations (Hokage, clan Uchiha, Gotei 13…)',
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
    type: 'claude_dispatcheur',
    nom: 'Dispatcheur',
    role: 'Répartit les piles sur les couloirs toutes les 15 min depuis l’état réel (guichets, pannes, volumes) — le plan que l’usine consulte',
    modele: 'claude-haiku-4-5 (abonnement, VPS)',
    famille: 'claude',
  },
  {
    type: 'arbitrage_claude',
    nom: 'Arbitre suprême',
    role: 'Tranche les litiges que les petits juges n’ont pas su régler (77 % de faux positifs mesurés le 02/08) — verdicts signés ⚖ Claude',
    modele: 'claude-haiku-4-5 (abonnement/API)',
    famille: 'claude',
  },
  {
    type: 'claude_curateur',
    nom: 'Curateur d’alias',
    role: 'Relie nos noms français/romanisés aux titres canon des wikis — chaque paire sondée contre la page réelle avant d’entrer au registre',
    modele: 'claude-haiku-4-5 + sonde wiki',
    famille: 'claude',
  },
  {
    type: 'claude_audit',
    nom: 'Auditeur à l’aveugle',
    role: 'Note chaque dimanche un échantillon de chaque couloir contre sa source, modèles masqués — embauche/licencie sur mesure',
    modele: 'claude-haiku-4-5 (dimanche 9h30)',
    famille: 'claude',
  },
  {
    type: 'claude_redacteur',
    nom: 'Rédacteur des sans-source',
    role: 'Écrit les fiches de figurants depuis leurs mentions éparses — signées, sourcées, ou honnêtement laissées vierges',
    modele: 'claude-haiku-4-5',
    famille: 'claude',
  },
  {
    type: 'claude_controle',
    nom: 'Contrôle qualité final',
    role: 'Relit un échantillon de chaque univers terminé et livre un taux de confiance chiffré avant l’œil de Dan',
    modele: 'claude-haiku-4-5',
    famille: 'claude',
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
