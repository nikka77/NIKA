-- nika_ops_l20.sql — l'ARBITRE des désaccords (29/07/2026).
-- Quand les deux juges (gemma local / llama-70b) se contredisent, un TROISIÈME avis d'une
-- famille encore différente (Nemotron, NVIDIA) départage : majorité 2/3 « valide » →
-- application automatique ; sinon la fiche reste dans la pile de review de Dan.
alter table agent_results add column if not exists arbitre_verdict text;
alter table agent_results add column if not exists arbitre_motif   text;
alter table agent_results add column if not exists arbitre_model   text;
alter table agent_results add column if not exists arbitre_at      timestamptz;
