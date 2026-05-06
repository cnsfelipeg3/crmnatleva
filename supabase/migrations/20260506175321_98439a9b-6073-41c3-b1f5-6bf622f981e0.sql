ALTER TABLE public.conversation_messages 
ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_pinned 
ON public.conversation_messages(conversation_id, is_pinned) 
WHERE is_pinned = true;