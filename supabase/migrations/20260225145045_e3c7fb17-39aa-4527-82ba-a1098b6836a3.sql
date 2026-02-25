
-- Webhook logs table
CREATE TABLE public.webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL DEFAULT 'unknown',
  payload jsonb NULL,
  status text NOT NULL DEFAULT 'received',
  error_message text NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage webhook_logs" ON public.webhook_logs FOR ALL USING (true) WITH CHECK (true);

-- Message queue table (future use)
CREATE TABLE public.message_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NULL REFERENCES public.conversations(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  error_message text NULL,
  sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage message_queue" ON public.message_queue FOR ALL USING (true) WITH CHECK (true);

-- Add missing columns to whatsapp_config if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_config' AND column_name = 'waba_id') THEN
    ALTER TABLE public.whatsapp_config ADD COLUMN waba_id text NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_config' AND column_name = 'app_id') THEN
    ALTER TABLE public.whatsapp_config ADD COLUMN app_id text NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_config' AND column_name = 'app_secret') THEN
    ALTER TABLE public.whatsapp_config ADD COLUMN app_secret text NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_config' AND column_name = 'environment') THEN
    ALTER TABLE public.whatsapp_config ADD COLUMN environment text NOT NULL DEFAULT 'teste';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_config' AND column_name = 'configured_by') THEN
    ALTER TABLE public.whatsapp_config ADD COLUMN configured_by uuid NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_config' AND column_name = 'last_event_at') THEN
    ALTER TABLE public.whatsapp_config ADD COLUMN last_event_at timestamptz NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_config' AND column_name = 'last_error') THEN
    ALTER TABLE public.whatsapp_config ADD COLUMN last_error text NULL;
  END IF;
END $$;
