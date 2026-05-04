ALTER TABLE public.watchdog_runs
  ADD COLUMN IF NOT EXISTS marked_media_conversation_messages INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marked_media_messages INT DEFAULT 0;