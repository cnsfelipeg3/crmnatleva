CREATE TABLE IF NOT EXISTS public.gflights_rapidapi_cache (
  cache_key text PRIMARY KEY,
  action text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gflights_cache_expires_idx ON public.gflights_rapidapi_cache (expires_at);
CREATE INDEX IF NOT EXISTS gflights_cache_action_idx ON public.gflights_rapidapi_cache (action);

CREATE TABLE IF NOT EXISTS public.gflights_rapidapi_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  params jsonb,
  cache_hit boolean NOT NULL DEFAULT false,
  status_code int,
  latency_ms int,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gflights_logs_created_idx ON public.gflights_rapidapi_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS gflights_logs_action_idx ON public.gflights_rapidapi_logs (action);

ALTER TABLE public.gflights_rapidapi_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gflights_rapidapi_logs ENABLE ROW LEVEL SECURITY;

-- Sem políticas públicas: apenas service role (edge function) acessa
