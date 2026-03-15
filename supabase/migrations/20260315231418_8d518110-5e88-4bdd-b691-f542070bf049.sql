
-- ETAPA 1: Create unified conversation_messages table
CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  external_message_id TEXT,
  direction TEXT NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming', 'outgoing', 'system')),
  sender_type TEXT NOT NULL DEFAULT 'cliente' CHECK (sender_type IN ('cliente', 'atendente', 'sistema')),
  content TEXT NOT NULL DEFAULT '',
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'ptt')),
  media_url TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
  metadata JSONB,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_cm_conversation_created ON public.conversation_messages(conversation_id, created_at);
CREATE INDEX idx_cm_external_id ON public.conversation_messages(external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX idx_cm_conversation_direction ON public.conversation_messages(conversation_id, direction);

-- Unique constraint for deduplication
CREATE UNIQUE INDEX idx_cm_dedup ON public.conversation_messages(conversation_id, external_message_id) WHERE external_message_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies (authenticated users can read/write)
CREATE POLICY "Authenticated users can read conversation_messages"
  ON public.conversation_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert conversation_messages"
  ON public.conversation_messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update conversation_messages"
  ON public.conversation_messages FOR UPDATE TO authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;

-- Function to reindex a single conversation's metadata
CREATE OR REPLACE FUNCTION public.reindex_conversation(conv_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  last_msg RECORD;
  msg_count INTEGER;
BEGIN
  SELECT content, message_type, created_at, direction
  INTO last_msg
  FROM public.conversation_messages
  WHERE conversation_id = conv_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_msg IS NULL THEN
    UPDATE public.conversations SET
      last_message_preview = NULL,
      last_message_at = NULL
    WHERE id = conv_id;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO msg_count
  FROM public.conversation_messages
  WHERE conversation_id = conv_id
    AND direction = 'incoming'
    AND status != 'read';

  UPDATE public.conversations SET
    last_message_preview = CASE 
      WHEN last_msg.message_type = 'text' THEN LEFT(last_msg.content, 200)
      ELSE '📎 ' || last_msg.message_type
    END,
    last_message_at = last_msg.created_at,
    unread_count = msg_count
  WHERE id = conv_id;
END;
$$;
