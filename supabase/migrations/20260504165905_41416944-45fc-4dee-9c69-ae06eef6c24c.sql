ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS media_filename TEXT;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_storage_url TEXT,
  ADD COLUMN IF NOT EXISTS media_mimetype TEXT,
  ADD COLUMN IF NOT EXISTS media_status TEXT,
  ADD COLUMN IF NOT EXISTS media_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS media_filename TEXT;