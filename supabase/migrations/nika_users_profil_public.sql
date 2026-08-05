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

-- ✅ APPLIQUÉE LE 05/08/2026 (éditeur SQL du tableau de bord). Vérifiée après coup : les cinq
--    colonnes sensibles renvoient 0 ligne à la clé publique, la vue rend le classement, et
--    service_role voit toujours la donnée intacte.
--
-- 1. LA VUE PUBLIQUE. On NE met PAS `security_invoker` : le défaut de PostgreSQL est déjà
--    « droits du propriétaire », donc la vue reste lisible quand l'appelant n'a aucun droit sur
--    `users`. C'est exactement ce qu'on veut — le public passe par la vue, jamais par la table.
create or replace view public.profils_publics as
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

-- 3. RIEN À RÉVOQUER, et c'est le point mesuré. Une fois « Public profiles » retirée, `anon`
--    n'a plus AUCUNE politique de lecture sur `users` : PostgreSQL lui rend 0 ligne, sans erreur.
--    Le `revoke select … from anon` envisagé au départ était donc superflu — et il aurait masqué
--    la vraie protection derrière une seconde, plus difficile à auditer. On s'en tient à RLS.
--
--    ÉTAT VÉRIFIÉ APRÈS APPLICATION (pg_policies sur `users`) :
--      Create profile on signup   INSERT  {public}         NULL
--      users_lecture_proprietaire SELECT  {authenticated}  (id = auth.uid())
--      Own profile update         UPDATE  {public}         (auth.uid() = id)
--
--    POUR REVENIR EN ARRIÈRE, une seule instruction :
--      create policy "Public profiles" on public.users for select to public using (true);

comment on view public.profils_publics is
  'Profil visible par tous (classement, mentions). La table users garde les colonnes d''autorité '
  '(nika_credits, kyc_level, is_verified) et les PII (full_name, wallet_address) : depuis le '
  '05/08/2026 elles ne sont lisibles que par leur propriétaire connecté. Une colonne d''autorité '
  'ne doit pas être seulement non-modifiable, elle ne doit pas être lisible.';
