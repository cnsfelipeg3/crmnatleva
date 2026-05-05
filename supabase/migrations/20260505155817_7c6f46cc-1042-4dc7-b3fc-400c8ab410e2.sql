ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS ai_media_transcript TEXT NULL,
  ADD COLUMN IF NOT EXISTS ai_media_processed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS ai_media_model TEXT NULL;

COMMENT ON COLUMN public.conversation_messages.ai_media_transcript IS
  'Texto transcrito/descrito da mídia (cache pra resumos com IA).';
COMMENT ON COLUMN public.conversation_messages.ai_media_processed_at IS
  'Quando a mídia foi processada pela IA.';
COMMENT ON COLUMN public.conversation_messages.ai_media_model IS
  'Modelo usado (ex: google/gemini-2.5-flash).';

CREATE INDEX IF NOT EXISTS idx_conv_msg_unprocessed_media
  ON public.conversation_messages (conversation_id, created_at)
  WHERE message_type IN ('audio','ptt','image','document','video')
    AND ai_media_transcript IS NULL
    AND media_url IS NOT NULL;