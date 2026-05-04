ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_status_pending
  ON public.conversation_messages(created_at DESC)
  WHERE status IN ('pending', 'sent', 'failed');