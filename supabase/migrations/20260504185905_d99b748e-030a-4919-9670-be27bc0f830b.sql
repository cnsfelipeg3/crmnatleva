ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS manually_marked_unread BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marked_unread_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.conversations.manually_marked_unread IS 'Estado global: usuário marcou conversa como não lida via menu de contexto. Reset automático quando atendente envia próxima mensagem.';

CREATE OR REPLACE FUNCTION public.reset_manually_marked_unread()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'atendente' AND NEW.conversation_id IS NOT NULL THEN
    UPDATE public.conversations
    SET manually_marked_unread = FALSE, marked_unread_by = NULL
    WHERE id = NEW.conversation_id AND manually_marked_unread = TRUE;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reset_unread_cm ON public.conversation_messages;
CREATE TRIGGER trg_reset_unread_cm
AFTER INSERT ON public.conversation_messages
FOR EACH ROW EXECUTE FUNCTION public.reset_manually_marked_unread();

DROP TRIGGER IF EXISTS trg_reset_unread_msgs ON public.messages;
CREATE TRIGGER trg_reset_unread_msgs
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.reset_manually_marked_unread();