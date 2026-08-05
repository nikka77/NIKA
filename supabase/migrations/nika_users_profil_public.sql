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
-- LE PIÈGE À NE PAS TOMBER DEDANS (première version de ce fichier, corrigée avant application) :
-- retirer les colonnes sensibles au rôle `authenticated` par GRANT casse le portefeuille — un
-- utilisateur ne peut plus lire SON PROPRE solde. Les GRANT sont par rôle, jamais par ligne.
--
-- LA BONNE RÉPARTITION, qui sépare les deux questions :
--   · QUELLES LIGNES → politique RLS. `authenticated` ne voit que la sienne, en entier.
--   · QUELLES COLONNES pour le public → une VUE, lisible sans droit sur la table.
--
-- IMPACT APPLICATIF MESURÉ AVANT ÉCRITURE : une seule lecture d'autrui dans tout le dépôt, le
-- classement (app/leaderboard/page.tsx), et elle ne demande QUE username, level_name, xp,
-- avatar_url — exactement les colonnes de la vue. Les lectures de solde, de kyc_level et de
-- full_name ciblent toutes la ligne de l'utilisateur connecté. Les pages d'administration passent
-- par service_role, que les politiques ne concernent pas.
--
-- APPLICATION : SQL Editor du dashboard Supabase, ou
--   DB_PASSWORD=… node scripts/apply-sql.cjs supabase/migrations/nika_users_profil_public.sql
-- VÉRIFICATION APRÈS COUP :
--   node --env-file=.env.local scripts/ops-sonde-schema.mjs   ← l'alerte doit disparaître

-- 1. LA VUE PUBLIQUE. `security_invoker = off` (le défaut historique) : elle s'exécute avec les
--    droits de son propriétaire, donc elle reste lisible même quand l'appelant n'a plus aucun
--    droit sur `users`. C'est précisément ce qu'on veut : le public passe par la vue, jamais par
--    la table.
create or replace view public.profils_publics
  with (security_invoker = off) as
  select id, username, avatar_url, xp, level, level_name, badge_tier, is_pro, city, bio
  from public.users;

grant select on public.profils_publics to anon, authenticated;

-- 2. LA TABLE REDEVIENT PRIVÉE. Chacun sa ligne — en ENTIER, pour que le portefeuille, le niveau
--    et le statut KYC de l'utilisateur connecté restent lisibles par lui.
drop policy if exists users_select_public on public.users;
drop policy if exists "users are viewable by everyone" on public.users;
drop policy if exists users_lecture_profil_public on public.users;
drop policy if exists users_lecture_proprietaire on public.users;
create policy users_lecture_proprietaire
  on public.users for select
  to authenticated
  using (auth.uid() = id);

-- 3. LE PUBLIC N'A PLUS RIEN SUR LA TABLE. La clé anon n'obtient plus une seule colonne de
--    `users` : elle lit `profils_publics` ou rien. (`authenticated` garde ses colonnes : c'est la
--    politique ci-dessus qui le limite à sa propre ligne.)
revoke select on public.users from anon;

comment on view public.profils_publics is
  'Profil visible par tous (classement, mentions). La table users garde les colonnes d''autorité '
  '(nika_credits, kyc_level, is_verified) et les PII (full_name, wallet_address) : depuis le '
  '05/08/2026 elles ne sont lisibles que par leur propriétaire connecté. Une colonne d''autorité '
  'ne doit pas être seulement non-modifiable, elle ne doit pas être lisible.';
