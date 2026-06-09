
CREATE TABLE IF NOT EXISTS public.proposal_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  linked_by uuid,
  linked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_conversations_proposal ON public.proposal_conversations(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_conversations_conv ON public.proposal_conversations(conversation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_conversations TO authenticated, anon;
GRANT ALL ON public.proposal_conversations TO service_role;

ALTER TABLE public.proposal_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all proposal_conversations" ON public.proposal_conversations FOR ALL USING (true) WITH CHECK (true);
