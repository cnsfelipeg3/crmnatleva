CREATE TABLE IF NOT EXISTS public.chat_presence (
  phone text PRIMARY KEY,
  status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_presence_updated
  ON public.chat_presence(updated_at DESC);

ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;

DO $mig$ BEGIN
  CREATE POLICY "chat_presence_select_authenticated"
    ON public.chat_presence FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $mig$;

DO $mig$ BEGIN
  CREATE POLICY "chat_presence_all_service"
    ON public.chat_presence FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $mig$;

-- Realtime
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_presence;
EXCEPTION WHEN duplicate_object THEN null; END $mig$;