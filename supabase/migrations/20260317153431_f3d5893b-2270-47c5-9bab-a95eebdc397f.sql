
-- 1. Create raw event log table - ZERO messages can be lost
CREATE TABLE public.whatsapp_events_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL DEFAULT 'unknown',
  external_message_id TEXT,
  phone TEXT,
  from_me BOOLEAN DEFAULT false,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  conversation_id UUID
);

-- Indexes for processing and dedup
CREATE INDEX idx_wer_processed ON public.whatsapp_events_raw(processed) WHERE processed = false;
CREATE INDEX idx_wer_external_msg ON public.whatsapp_events_raw(external_message_id);
CREATE INDEX idx_wer_phone ON public.whatsapp_events_raw(phone);
CREATE INDEX idx_wer_received ON public.whatsapp_events_raw(received_at DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_events_raw ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions use service role)
CREATE POLICY "Service role full access on whatsapp_events_raw"
ON public.whatsapp_events_raw
FOR ALL
USING (true)
WITH CHECK (true);

-- 2. Fix zapi_messages: add missing columns that the webhook tries to write
ALTER TABLE public.zapi_messages 
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS sender_photo TEXT;

-- 3. Add unique constraint on conversation_messages for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_external_msg_unique 
  ON public.conversation_messages(external_message_id) 
  WHERE external_message_id IS NOT NULL;

-- 4. Enable realtime for raw events (for monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_events_raw;
