-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Audit table
CREATE TABLE IF NOT EXISTS public.watchdog_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  marked_count_conversation_messages INT DEFAULT 0,
  marked_count_messages INT DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchdog_runs_started_at ON public.watchdog_runs(started_at DESC);

-- Detection function (table-aware via dynamic SQL)
CREATE OR REPLACE FUNCTION public.watchdog_mark_silent_timeouts(p_table TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  marked_count INT := 0;
BEGIN
  IF p_table NOT IN ('conversation_messages', 'messages') THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table;
  END IF;

  EXECUTE format($f$
    UPDATE public.%I
    SET status = 'failed',
        failure_reason = COALESCE(failure_reason, 'silent_timeout'),
        failure_detail = COALESCE(failure_detail, 'Mensagem sem confirmação de entrega após 10 minutos')
    WHERE sender_type = 'atendente'
      AND status IN ('pending', 'sent', 'retrying')
      AND created_at < now() - interval '10 minutes'
      AND created_at > now() - interval '24 hours'
  $f$, p_table);

  GET DIAGNOSTICS marked_count = ROW_COUNT;
  RETURN marked_count;
END;
$$;