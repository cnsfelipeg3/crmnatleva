-- Add archive support to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_conversations_is_archived ON public.conversations(is_archived) WHERE is_archived = true;

-- Trigger function: auto-unarchive when client sends a message
CREATE OR REPLACE FUNCTION public.auto_unarchive_on_client_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL AND NEW.sender_type = 'cliente' THEN
    UPDATE public.conversations
       SET is_archived = false,
           archived_at = NULL
     WHERE id = NEW.conversation_id
       AND is_archived = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_unarchive_conv_msg ON public.conversation_messages;
CREATE TRIGGER trg_auto_unarchive_conv_msg
AFTER INSERT ON public.conversation_messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_unarchive_on_client_message();

DROP TRIGGER IF EXISTS trg_auto_unarchive_messages ON public.messages;
CREATE TRIGGER trg_auto_unarchive_messages
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_unarchive_on_client_message();