-- Add simulator tracking columns to proposals so we can link a proposal back
-- to the simulator session that generated it (Manual / Auto / Chameleon).
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS simulator_session_id TEXT,
  ADD COLUMN IF NOT EXISTS simulator_mode TEXT;

-- Index used by the "Visualizar Proposta" button to find an existing
-- proposal for the current simulator session.
CREATE INDEX IF NOT EXISTS idx_proposals_simulator_session
  ON public.proposals(simulator_session_id)
  WHERE simulator_session_id IS NOT NULL;