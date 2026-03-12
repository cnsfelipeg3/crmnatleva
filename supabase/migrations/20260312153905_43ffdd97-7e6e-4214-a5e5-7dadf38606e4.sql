
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS external_conversation_id text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS stage text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.zapi_messages ADD COLUMN IF NOT EXISTS type text;

ALTER TABLE public.flows ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

ALTER TABLE public.flow_execution_logs ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.flow_execution_logs ADD COLUMN IF NOT EXISTS execution_path jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.flow_execution_logs ADD COLUMN IF NOT EXISTS variables_snapshot jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.flow_execution_logs ADD COLUMN IF NOT EXISTS trigger_type text;
