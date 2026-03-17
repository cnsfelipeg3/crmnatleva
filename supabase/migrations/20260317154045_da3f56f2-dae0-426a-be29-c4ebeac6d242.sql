
-- Reconciliation log to track batch progress
CREATE TABLE public.conversation_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  phone TEXT,
  processed_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, error, skipped
  messages_before INTEGER DEFAULT 0,
  messages_after INTEGER DEFAULT 0,
  messages_inserted INTEGER DEFAULT 0,
  zapi_messages_found INTEGER DEFAULT 0,
  error TEXT,
  metadata JSONB
);

CREATE INDEX idx_recon_log_conv ON public.conversation_reconciliation_log(conversation_id);
CREATE INDEX idx_recon_log_status ON public.conversation_reconciliation_log(status);

ALTER TABLE public.conversation_reconciliation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on reconciliation_log"
ON public.conversation_reconciliation_log FOR ALL USING (true) WITH CHECK (true);

-- Add reconciled_at to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
