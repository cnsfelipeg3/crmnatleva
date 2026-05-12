
ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS sent_by_agent text;
