ALTER TABLE public.proposal_viewers 
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS os text;

-- Add index for fast proposal lookups
CREATE INDEX IF NOT EXISTS idx_proposal_viewers_proposal_id ON public.proposal_viewers(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_interactions_proposal_id ON public.proposal_interactions(proposal_id);