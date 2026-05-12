
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_autopilot_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_autopilot_agent text,
  ADD COLUMN IF NOT EXISTS ai_autopilot_paused_until timestamptz,
  ADD COLUMN IF NOT EXISTS ai_autopilot_last_reply_at timestamptz;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sent_by_agent text;

INSERT INTO public.ai_config (config_key, config_value)
VALUES
  ('ai_autopilot_global', 'on'),
  ('ai_autopilot_allowlist', '5511973045950')
ON CONFLICT (config_key) DO NOTHING;
