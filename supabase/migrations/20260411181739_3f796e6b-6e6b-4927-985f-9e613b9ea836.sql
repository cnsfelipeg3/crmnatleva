
-- Add quote_request_id to proposals
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS quote_request_id uuid REFERENCES public.portal_quote_requests(id) ON DELETE SET NULL;

-- Add proposal_id to portal_quote_requests
ALTER TABLE public.portal_quote_requests
ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_proposals_quote_request_id ON public.proposals(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_portal_quote_requests_proposal_id ON public.portal_quote_requests(proposal_id);
