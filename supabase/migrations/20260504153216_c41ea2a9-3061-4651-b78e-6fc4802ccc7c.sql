ALTER TABLE public.whatsapp_dispatch_logs
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS failure_detail TEXT;