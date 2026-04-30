
-- 1. Audit log table for webhook auth attempts
CREATE TABLE IF NOT EXISTS public.webhook_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ip TEXT,
  header_present BOOLEAN DEFAULT false,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.webhook_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.webhook_audit_log FOR ALL USING (false);

-- 2. Webhook errors table
CREATE TABLE IF NOT EXISTS public.webhook_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  error_message TEXT,
  stack_trace TEXT,
  raw_body JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.webhook_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only errors" ON public.webhook_errors FOR ALL USING (false);

-- 3. Deduplicate zapi_messages before adding UNIQUE
DELETE FROM public.zapi_messages a USING public.zapi_messages b
WHERE a.id > b.id AND a.message_id IS NOT NULL AND a.message_id = b.message_id;

-- Add UNIQUE constraint
ALTER TABLE public.zapi_messages ADD CONSTRAINT zapi_messages_message_id_unique UNIQUE (message_id);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conv_msgs_conv_created ON public.conversation_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_msgs_created ON public.conversation_messages(created_at DESC);

-- 5. Media metadata columns on conversation_messages
ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS media_storage_url TEXT,
  ADD COLUMN IF NOT EXISTS media_original_url TEXT,
  ADD COLUMN IF NOT EXISTS media_mimetype TEXT,
  ADD COLUMN IF NOT EXISTS media_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS media_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS audio_duration_sec INT,
  ADD COLUMN IF NOT EXISTS is_voice_note BOOLEAN;
