-- FASE 1 · Backup + flag is_fictional

CREATE TABLE IF NOT EXISTS public._backup_proposals_pre_migration_2026_05 AS 
  SELECT * FROM public.proposals WHERE 1=0;

INSERT INTO public._backup_proposals_pre_migration_2026_05 
  SELECT * FROM public.proposals 
  WHERE NOT EXISTS (SELECT 1 FROM public._backup_proposals_pre_migration_2026_05 b WHERE b.id = proposals.id);

CREATE TABLE IF NOT EXISTS public._backup_quotation_briefings_pre_migration_2026_05 AS 
  SELECT * FROM public.quotation_briefings WHERE 1=0;

INSERT INTO public._backup_quotation_briefings_pre_migration_2026_05 
  SELECT * FROM public.quotation_briefings
  WHERE NOT EXISTS (SELECT 1 FROM public._backup_quotation_briefings_pre_migration_2026_05 b WHERE b.id = quotation_briefings.id);

ALTER TABLE public.proposals 
  ADD COLUMN IF NOT EXISTS is_fictional BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.quotation_briefings 
  ADD COLUMN IF NOT EXISTS is_fictional BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.proposals 
SET is_fictional = TRUE
WHERE source = 'simulator' OR simulator_session_id IS NOT NULL;

UPDATE public.quotation_briefings 
SET is_fictional = TRUE
WHERE lead_origin ILIKE '%simulador%' 
   OR (created_by = 'atlas' AND conversation_id IS NULL);

CREATE INDEX IF NOT EXISTS ix_proposals_real ON public.proposals (created_at DESC) WHERE is_fictional = FALSE;
CREATE INDEX IF NOT EXISTS ix_briefings_real ON public.quotation_briefings (created_at DESC) WHERE is_fictional = FALSE;