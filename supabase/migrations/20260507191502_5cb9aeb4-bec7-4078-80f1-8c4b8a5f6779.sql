-- Índice único pra suportar UPSERT com onConflict em whatsapp_status_views
CREATE UNIQUE INDEX IF NOT EXISTS uq_status_views_status_viewer
  ON public.whatsapp_status_views (status_id, viewer_phone);

-- Índice complementar pra queries de "viewers de um status"
CREATE INDEX IF NOT EXISTS ix_status_views_status
  ON public.whatsapp_status_views (status_id, viewed_at DESC);

-- Garantir pg_cron disponível
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Limpar quarantine de status automaticamente após 30 dias
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-status-quarantine');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-status-quarantine',
  '0 4 * * *',
  $$ DELETE FROM public.whatsapp_statuses_quarantine
     WHERE created_at < now() - interval '30 days' $$
);