
CREATE TABLE IF NOT EXISTS public.whatsapp_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'voice',
  call_status TEXT NOT NULL DEFAULT 'missed',
  is_video BOOLEAN NOT NULL DEFAULT false,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  caller_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  external_call_id TEXT UNIQUE,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_conversation ON public.whatsapp_calls(conversation_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_phone ON public.whatsapp_calls(phone, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_calls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_calls TO anon;
GRANT ALL ON public.whatsapp_calls TO service_role;

ALTER TABLE public.whatsapp_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls_all_access" ON public.whatsapp_calls FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_whatsapp_calls_updated_at
  BEFORE UPDATE ON public.whatsapp_calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_calls;
