
CREATE OR REPLACE FUNCTION public.recount_conversation_unread(conv_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_outgoing_at timestamptz;
  cnt integer := 0;
BEGIN
  SELECT GREATEST(
    COALESCE((SELECT MAX(created_at) FROM public.conversation_messages
              WHERE conversation_id = conv_id AND sender_type = 'atendente'), '1970-01-01'::timestamptz),
    COALESCE((SELECT MAX(created_at) FROM public.messages
              WHERE conversation_id = conv_id AND sender_type = 'atendente'), '1970-01-01'::timestamptz)
  ) INTO last_outgoing_at;

  SELECT
    (SELECT COUNT(*) FROM public.conversation_messages
       WHERE conversation_id = conv_id
         AND sender_type = 'cliente'
         AND created_at > last_outgoing_at)
    +
    (SELECT COUNT(*) FROM public.messages
       WHERE conversation_id = conv_id
         AND sender_type = 'cliente'
         AND created_at > last_outgoing_at)
  INTO cnt;

  UPDATE public.conversations
  SET unread_count = COALESCE(cnt, 0)
  WHERE id = conv_id;

  RETURN COALESCE(cnt, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recount_unread_on_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    PERFORM public.recount_conversation_unread(NEW.conversation_id);
    IF NEW.sender_type = 'atendente' THEN
      UPDATE public.conversations
      SET manually_marked_unread = FALSE, marked_unread_by = NULL
      WHERE id = NEW.conversation_id AND manually_marked_unread = TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recount_unread_on_conversation_messages ON public.conversation_messages;
CREATE TRIGGER recount_unread_on_conversation_messages
AFTER INSERT ON public.conversation_messages
FOR EACH ROW EXECUTE FUNCTION public.trg_recount_unread_on_message();

DROP TRIGGER IF EXISTS recount_unread_on_messages ON public.messages;
CREATE TRIGGER recount_unread_on_messages
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.trg_recount_unread_on_message();

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.conversations LOOP
    PERFORM public.recount_conversation_unread(r.id);
  END LOOP;
END $$;
