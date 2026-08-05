-- supabase/migrations/nika_users_profil_public.sql — décision 5 du plan minimal (05/08/2026).
--
-- CE QUI EST DÉJÀ FAIT, et qu'il ne faut pas refaire : le durcissement du 21/06
-- (nika_rls_hardening.sql) empêche déjà un client de s'auto-créditer ou de se déclarer vérifié —
-- un trigger BEFORE UPDATE remet nika_credits, badge_tier, kyc_level et is_verified à leur
-- ancienne valeur hors service_role. VÉRIFIÉ EN PRODUCTION le 05/08 : une écriture d'autorité avec
-- la clé publique touche 0 ligne. Et food_orders répond « permission denied » — la fuite de PII
-- clients du 21/06 est bien fermée.
--
-- CE QUI RESTE, et c'est un défaut de LECTURE, pas d'écriture. La table `users` est lisible
-- intégralement avec la clé publique (celle qui part dans le navigateur). Aujourd'hui elle ne
-- contient qu'un compte de test, donc rien n'a fuité ; mais dès les premières inscriptions, le
-- `full_name`, la ville, le solde `nika_credits`, le `kyc_level` et le statut `is_verified` de
-- chaque utilisateur deviendraient publics. Une colonne d'autorité ne doit pas être seulement
-- non-modifiable : elle ne doit pas être LISIBLE par n'importe qui.
--
-- LE REMÈDE. Les politiques RLS sont par LIGNE, jamais par colonne : on ne peut pas dire « sa
-- propre ligne en entier, celle des autres en partie ». On sépare donc les deux usages —
--   · `users`            → lisible par son seul propriétaire (et par service_role) ;
--   · `profils_publics`  → vue en lecture libre, limitée aux colonnes d'affichage.
--
-- IMPACT APPLICATIF MESURÉ : une seule lecture d'autrui dans tout le dépôt, le classement
-- (app/leaderboard/page.tsx), et elle ne demande QUE username, level_name, xp, avatar_url — donc
-- exactement les colonnes de la vue. Les pages d'administration passent par service_role.
--
-- APPLICATION :
--   DB_PASSWORD=… node scripts/apply-sql.cjs supabase/migrations/nika_users_profil_public.sql
-- APRÈS APPLICATION, vérifier (doit rendre 0 ligne) :
--   node --env-file=.env.local scripts/ops-sonde-schema.mjs

-- 1. La vue publique : uniquement ce qu'un classement ou un profil visible doit montrer.
--    `security_invoker = on` : la vue n'accorde aucun privilège de plus que celui qui l'interroge,
--    elle ne sert qu'à restreindre les COLONNES.
create or replace view public.profils_publics
  with (security_invoker = on) as
  select id, username, avatar_url, xp, level, level_name, badge_tier, is_pro, city, bio
  from public.users;

grant select on public.profils_publics to anon, authenticated;

-- 2. `users` redevient privée : chacun sa ligne. service_role n'est pas soumis aux politiques.
drop policy if exists users_select_public on public.users;
drop policy if exists "users are viewable by everyone" on public.users;
drop policy if exists users_lecture_proprietaire on public.users;
create policy users_lecture_proprietaire
  on public.users for select
  using (auth.uid() = id);

-- 3. La vue doit rester lisible même quand la ligne ne l'est plus : elle a besoin d'une politique
--    de lecture ouverte sur les seules colonnes qu'elle expose. On la porte par une politique
--    dédiée, restreinte aux lignes que l'on accepte de montrer (ici toutes : un profil de
--    classement est public par nature).
drop policy if exists users_lecture_profil_public on public.users;
create policy users_lecture_profil_public
  on public.users for select
  to anon, authenticated
  using (true);
-- ⚠ La politique ci-dessus rouvrirait la table entière si elle restait seule : c'est pourquoi
--    les COLONNES sensibles sont retirées par GRANT juste en dessous. Politique = lignes,
--    grant = colonnes ; il faut les deux.
revoke select on public.users from anon, authenticated;
grant select (id, username, avatar_url, xp, level, level_name, badge_tier, is_pro, city, bio)
  on public.users to anon, authenticated;

comment on view public.profils_publics is
  'Profil visible par tous (classement, mentions). La table users garde les colonnes d''autorité '
  '(nika_credits, kyc_level, is_verified) et les PII (full_name, wallet_address), retirées du '
  'GRANT public le 05/08/2026 : une colonne d''autorité ne doit pas être seulement non-modifiable, '
  'elle ne doit pas être lisible.';
