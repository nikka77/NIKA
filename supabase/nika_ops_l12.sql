-- NIKA OPS L12 — autonomie à double verdict (26/07/2026, « go double verdict » Dan).
-- Décision issue de l'audit à l'aveugle : précision du juge seul = 86 % < 90 % requis.
-- Règle : une production ne s'applique SEULE que si DEUX juges de familles différentes
-- (gemma4 local + Gemini cloud) disent « valide » — sinon elle attend Dan, comme avant.
alter table public.agent_results
  add column if not exists auto2_verdict text,          -- verdict du 2e juge (cloud, autre famille)
  add column if not exists auto2_motif   text,
  add column if not exists auto2_model   text,
  add column if not exists auto2_at      timestamptz,
  add column if not exists auto_applique boolean not null default false;  -- appliquée SANS Dan (journal + annulable)

notify pgrst, 'reload schema';
