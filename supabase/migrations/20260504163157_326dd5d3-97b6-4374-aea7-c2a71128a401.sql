ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS failure_detail TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_messages_status_failed_recent 
  ON public.messages(created_at DESC) 
  WHERE status IN ('pending','failed');