
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS proposal_outcome text DEFAULT 'pending';
COMMENT ON COLUMN public.proposals.proposal_outcome IS 'Outcome: pending, won, lost, expired';
