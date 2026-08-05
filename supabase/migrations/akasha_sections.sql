-- supabase/migrations/akasha_sections.sql — décision 4 du plan minimal (05/08/2026).
--
-- UNE SECTION EST UNE LIGNE, plus un élément d'un tableau JSONB réécrit en entier.
--
-- CE QUE LE JSONB COÛTE. `akasha_entries.attributes` porte aujourd'hui un tableau `sections`, et
-- chaque pose fait un lire-modifier-écrire de TOUT l'objet : on relit la fiche, on ajoute la
-- section, on réécrit `attributes`. Deux écrivains simultanés — l'usine et un blitz fenêtre, ce
-- qui arrive tous les jours — se perdent mutuellement leur travail, EN SILENCE : le dernier à
-- écrire gagne, et personne ne voit qu'une section a disparu. C'est la même classe de faute que
-- les relations dormantes du JSONB (4 137 arêtes invisibles, rapatriées le 05/08).
--
-- CE QUE LA TABLE APPORTE. Chaque section porte sa propre ligne : deux écrivains ne se marchent
-- plus dessus. La contrainte d'unicité (entry_id, idx) rend la pose IDEMPOTENTE par construction —
-- reposer deux fois la même section ne la duplique pas, là où le tableau demandait de dédupliquer
-- à la main dans chaque script. Et une section devient citable, datable, révocable individuellement.
--
-- APPLICATION (le mot de passe est dans Supabase → Settings → Database ; il n'a pas sa place
-- dans .env.local, c'est pourquoi cette migration n'a pas pu être posée par un agent) :
--   DB_PASSWORD=… node scripts/apply-sql.cjs supabase/migrations/akasha_sections.sql
--
-- PUIS, dans cet ordre :
--   node --env-file=.env.local scripts/ops-migrer-sections.mjs --dry   ← compte, n'écrit rien
--   node --env-file=.env.local scripts/ops-migrer-sections.mjs         ← copie le JSONB en lignes
--   node --env-file=.env.local scripts/ops-migrer-sections.mjs --verifier
--   node --env-file=.env.local scripts/ops-migrer-sections.mjs --purger  ← seulement si vérifié

create table if not exists public.akasha_sections (
  id          bigint generated always as identity primary key,
  entry_id    uuid not null references public.akasha_entries(id) on delete cascade,
  -- L'index vient du wiki et n'est pas toujours un entier (« 2.1 ») : du texte, jamais un int.
  idx         text not null,
  titre       text,
  texte       text not null,
  -- Signature du producteur : quel modèle, par quelle voie (usine ou blitz). Une section
  -- publiée doit pouvoir dire d'où elle vient — c'est ce qui a permis de mesurer que les deux
  -- voies se valent (audit du 03/08 : 8,3 contre 8,4 sur 10).
  source      text,
  created_at  timestamptz not null default now(),
  -- LE CŒUR DE LA MIGRATION : l'idempotence devient structurelle au lieu d'être une discipline
  -- que chaque script doit tenir sans se tromper.
  constraint akasha_sections_unicite unique (entry_id, idx)
);

create index if not exists akasha_sections_entry_idx on public.akasha_sections (entry_id);

alter table public.akasha_sections enable row level security;

-- Lecture publique : c'est du contenu d'encyclopédie, déjà servi par les pages. L'écriture reste
-- au service_role — les agents n'écrivent jamais avec la clé publique.
drop policy if exists akasha_sections_lecture_publique on public.akasha_sections;
create policy akasha_sections_lecture_publique
  on public.akasha_sections for select
  using (true);

comment on table public.akasha_sections is
  'Une section de dossier = une ligne. Remplace akasha_entries.attributes.sections, dont le '
  'lire-modifier-écrire faisait perdre des sections entre deux écrivains simultanés. '
  'Voir lib/akasha/sections.ts : c''est le SEUL chemin d''écriture.';
