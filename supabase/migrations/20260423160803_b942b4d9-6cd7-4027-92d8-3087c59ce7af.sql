-- ============================================================
-- Booking RapidAPI Integration (BETA)
-- Cache e logs de chamadas à API do Booking.com (via RapidAPI)
-- Isolado do módulo de hospedagem existente
-- ============================================================

-- Tabela de cache de respostas da API
CREATE TABLE IF NOT EXISTS public.booking_rapidapi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  action TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_rapidapi_cache_key
  ON public.booking_rapidapi_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_booking_rapidapi_cache_expires
  ON public.booking_rapidapi_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_booking_rapidapi_cache_action
  ON public.booking_rapidapi_cache(action);

COMMENT ON TABLE public.booking_rapidapi_cache IS
  'Cache de respostas da API Booking.com (RapidAPI) — reduz consumo de requests. TTL varia por ação.';

-- Tabela de logs de chamadas (análise de uso, debug, métricas)
CREATE TABLE IF NOT EXISTS public.booking_rapidapi_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  status_code INT,
  latency_ms INT,
  error_message TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_rapidapi_logs_created
  ON public.booking_rapidapi_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_rapidapi_logs_action
  ON public.booking_rapidapi_logs(action);

CREATE INDEX IF NOT EXISTS idx_booking_rapidapi_logs_user
  ON public.booking_rapidapi_logs(user_id);

COMMENT ON TABLE public.booking_rapidapi_logs IS
  'Logs de chamadas à API Booking.com (RapidAPI). Útil pra monitorar consumo, performance e identificar destinos mais buscados.';

-- Função utilitária pra limpeza periódica do cache expirado
CREATE OR REPLACE FUNCTION public.cleanup_booking_rapidapi_cache()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public.booking_rapidapi_cache
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_booking_rapidapi_cache() IS
  'Remove entradas expiradas do cache do Booking RapidAPI. Pode ser chamada por cron ou manualmente.';

-- RLS habilitada (só service role acessa)
ALTER TABLE public.booking_rapidapi_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_rapidapi_logs ENABLE ROW LEVEL SECURITY;