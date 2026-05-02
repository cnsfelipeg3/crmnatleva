-- Habilita extensions necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Eventos de conexão WhatsApp (Z-API). Histórico permanente.
CREATE TABLE IF NOT EXISTS public.whatsapp_connection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,    -- "connected" | "disconnected" | "heartbeat_ok" | "heartbeat_fail"
  instance_id text,
  status text,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_conn_events_created
  ON public.whatsapp_connection_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_conn_events_type
  ON public.whatsapp_connection_events(event_type, created_at DESC);

ALTER TABLE public.whatsapp_connection_events ENABLE ROW LEVEL SECURITY;

DO $mig$ BEGIN
  CREATE POLICY "wa_conn_events_select_authenticated"
    ON public.whatsapp_connection_events FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $mig$;

DO $mig$ BEGIN
  CREATE POLICY "wa_conn_events_insert_service"
    ON public.whatsapp_connection_events FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $mig$;

-- View · status atual da conexão
CREATE OR REPLACE VIEW public.whatsapp_connection_current AS
SELECT
  event_type AS last_event,
  created_at AS last_event_at,
  EXTRACT(EPOCH FROM (now() - created_at))::int AS seconds_since,
  error_message,
  raw_payload
FROM public.whatsapp_connection_events
ORDER BY created_at DESC
LIMIT 1;

-- Realtime
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_connection_events;
EXCEPTION WHEN duplicate_object THEN null; END $mig$;

-- Cron heartbeat · 5 min
DO $mig$ BEGIN
  PERFORM cron.unschedule('zapi-heartbeat-check');
EXCEPTION WHEN OTHERS THEN null; END $mig$;

SELECT cron.schedule(
  'zapi-heartbeat-check',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mexlhkqcmiaktjxsyvod.supabase.co/functions/v1/zapi-heartbeat',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);