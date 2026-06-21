-- ===================================================
-- NIKA ARTISAN — Devis (en-tête + lignes)
-- Couche DONNÉES = source de vérité, consommée plus tard par :
--   (1) l'Edge Function de génération IA (dictée/photo → JSON),
--   (2) la logique d'escrow crypto (lit total_ttc d'un devis « accepte »),
--   (3) l'UI mobile (affichage + édition par le pro).
-- À exécuter dans le SQL Editor de Supabase (APRÈS schema.sql : tables users + pros).
-- Statuts/valeurs en français non accentué (convention repo, cf. reviews.sql).
-- ===================================================

-- ── EN-TÊTE ─────────────────────────────────────────
create table if not exists devis (
  id uuid default gen_random_uuid() primary key,
  reference text not null unique,
  statut text not null default 'brouillon'
    check (statut in ('brouillon','envoye','accepte','refuse','expire')),

  -- Parties
  artisan_id uuid not null references pros(id) on delete cascade,   -- pro domain='serv'
  client_id uuid references users(id) on delete set null,           -- null tant que le client n'a pas de compte NIKA
  client_nom text,            -- identité client affichée sur le devis (snapshot légal)
  client_adresse text,

  -- Dates
  date_emission date not null default current_date,
  date_validite date not null,                 -- fin de validité de l'offre
  date_debut_travaux date,                     -- début de travaux estimé (optionnel)

  -- Mentions légales FR (DONNÉES, pas du texte en dur)
  artisan_siret text,
  assurance_decennale_assureur text,
  assurance_decennale_police text,
  assurance_rc_pro_assureur text,
  assurance_rc_pro_police text,
  tva_regime text not null default 'reel' check (tva_regime in ('reel','franchise_base')),
  mention_tva text,                            -- ex. « TVA non applicable, art. 293 B du CGI »
  conditions_paiement text,
  acompte_pourcent numeric(5,2)
    check (acompte_pourcent is null or (acompte_pourcent >= 0 and acompte_pourcent <= 100)),

  -- Frais (SAISIE pro) — entrent dans les totaux
  frais_deplacement numeric(10,2) not null default 0 check (frais_deplacement >= 0),
  frais_deplacement_tva numeric(5,2) not null default 20
    check (frais_deplacement_tva >= 0 and frais_deplacement_tva <= 100),

  -- Totaux : JAMAIS saisis. Snapshot écrit par lib/devis/totaux.ts (computeDevisTotals).
  total_ht numeric(12,2),
  total_tva numeric(12,2),
  total_ttc numeric(12,2),
  tva_par_taux jsonb not null default '[]',    -- [{ taux, base_ht, montant_tva }]

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint devis_dates_validite check (date_validite >= date_emission),
  -- L'escrow lit total_ttc d'un devis « accepte » → il doit exister.
  constraint devis_accepte_total check (statut <> 'accepte' or (total_ttc is not null and total_ttc >= 0))
);

-- ── LIGNES ──────────────────────────────────────────
create table if not exists devis_lignes (
  id uuid default gen_random_uuid() primary key,
  devis_id uuid not null references devis(id) on delete cascade,
  position integer not null default 0,         -- ordre d'affichage

  type text not null check (type in ('materiel','main_oeuvre')),
  designation text not null,
  quantite numeric(10,3) not null check (quantite > 0),
  unite text not null,                         -- materiel: u/m2/ml/kg/l… ; main_oeuvre: 'heures'
  prix_unitaire_ht numeric(12,2) not null check (prix_unitaire_ht >= 0),
  -- Montant calculé : JAMAIS saisi (colonne générée).
  montant_ht numeric(12,2) generated always as (round(quantite * prix_unitaire_ht, 2)) stored,
  taux_tva numeric(5,2) not null default 20 check (taux_tva >= 0 and taux_tva <= 100),

  -- Provenance + validation : l'IA propose, le pro valide.
  provenance text not null default 'saisi_pro' check (provenance in ('saisi_pro','suggere_ia')),
  valide_par_pro boolean not null default false,

  -- Spécifique matériel
  lien_fournisseur text,
  a_acheter boolean not null default false,    -- pour la liste de courses consolidée

  -- Spécifique main d'œuvre (taux horaire = prix unitaire)
  taux_horaire numeric(12,2),

  created_at timestamptz not null default now(),

  -- Champs cohérents avec `type`
  constraint devis_ligne_materiel check (
    type <> 'materiel' or taux_horaire is null
  ),
  constraint devis_ligne_main_oeuvre check (
    type <> 'main_oeuvre' or (
      unite = 'heures'
      and taux_horaire is not null
      and taux_horaire = prix_unitaire_ht
      and a_acheter = false
      and lien_fournisseur is null
    )
  )
);

-- ── INDEX ───────────────────────────────────────────
create index if not exists idx_devis_artisan on devis(artisan_id);
create index if not exists idx_devis_client on devis(client_id);
create index if not exists idx_devis_statut on devis(statut);
create index if not exists idx_devis_lignes_devis on devis_lignes(devis_id, position);
-- Liste de courses consolidée : matériels à acheter, agrégés multi-devis.
create index if not exists idx_devis_lignes_achat on devis_lignes(devis_id)
  where type = 'materiel' and a_acheter = true;

-- ── updated_at automatique ──────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_devis_updated_at on devis;
create trigger trg_devis_updated_at
  before update on devis
  for each row execute function set_updated_at();

-- ── RÈGLE MÉTIER : l'IA propose, le pro valide ──────
-- Un devis ne peut PAS passer à « envoye » / « accepte » s'il reste une ligne
-- provenance='suggere_ia' non validée (valide_par_pro = false).
create or replace function devis_enforce_ia_validation()
returns trigger language plpgsql as $$
declare
  n_non_valide integer;
begin
  if new.statut in ('envoye','accepte') then
    select count(*) into n_non_valide
    from devis_lignes l
    where l.devis_id = new.id
      and l.provenance = 'suggere_ia'
      and l.valide_par_pro = false;
    if n_non_valide > 0 then
      raise exception
        'Devis %: % ligne(s) IA non validee(s) par le pro — validation requise avant le statut "%"',
        new.reference, n_non_valide, new.statut
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_devis_ia_validation on devis;
create trigger trg_devis_ia_validation
  before insert or update of statut on devis
  for each row execute function devis_enforce_ia_validation();

-- ── ROW LEVEL SECURITY ──────────────────────────────
alter table devis enable row level security;
alter table devis_lignes enable row level security;

-- DEVIS : l'artisan gère ses devis ; le client lit les devis le concernant.
drop policy if exists "devis_artisan_all" on devis;
create policy "devis_artisan_all" on devis
  for all
  using (artisan_id in (select id from pros where user_id = auth.uid()))
  with check (artisan_id in (select id from pros where user_id = auth.uid()));

drop policy if exists "devis_client_read" on devis;
create policy "devis_client_read" on devis
  for select using (client_id = auth.uid());

-- LIGNES : suivent le devis parent.
drop policy if exists "devis_lignes_artisan_all" on devis_lignes;
create policy "devis_lignes_artisan_all" on devis_lignes
  for all
  using (
    devis_id in (
      select d.id from devis d
      join pros p on p.id = d.artisan_id
      where p.user_id = auth.uid()
    )
  )
  with check (
    devis_id in (
      select d.id from devis d
      join pros p on p.id = d.artisan_id
      where p.user_id = auth.uid()
    )
  );

drop policy if exists "devis_lignes_client_read" on devis_lignes;
create policy "devis_lignes_client_read" on devis_lignes
  for select using (
    devis_id in (select id from devis where client_id = auth.uid())
  );
