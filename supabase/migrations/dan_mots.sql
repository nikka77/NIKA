-- ===================================================
-- RÉSEAU DAN — livre d'or et suggestions des cartes phygitales
-- À exécuter dans le SQL Editor de Supabase
-- ===================================================
-- Une ligne = un mot laissé par un visiteur sur une carte (/dan/0, /dan/1 … /dan/9).
-- Écriture et lecture passent par /api/dan/[matricule]/mots (clé service) : aucune
-- politique publique, donc rien n'est lisible ni inscriptible directement depuis le navigateur.
-- Pour retirer un mot sans le supprimer : update dan_mots set visible = false where id = '…';

create table if not exists dan_mots (
  id uuid default gen_random_uuid() primary key,
  matricule text not null check (matricule ~ '^(0|[1-9][0-9]{0,6})$'),
  genre text not null check (genre in ('livre', 'suggestion')),
  nom text not null default 'ANONYME' check (char_length(nom) <= 40),
  texte text not null check (char_length(texte) between 1 and 280),
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists dan_mots_carte_idx on dan_mots (matricule, created_at desc);

alter table dan_mots enable row level security;
