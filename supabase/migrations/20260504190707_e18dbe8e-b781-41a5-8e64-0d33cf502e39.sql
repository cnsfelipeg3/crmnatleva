-- FASE 3: Trigger para manter conversations.last_message_at consistente
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.conversation_id IS NULL THEN RETURN NEW; END IF;

  -- Rejeita timestamps muito no futuro (>1h adiantado)
  IF NEW.created_at > NOW() + interval '1 hour' THEN
    RETURN NEW;
  END IF;

  -- Só sobe se o novo timestamp for MAIOR (proteção fora-de-ordem)
  -- NOTA: usa created_at como proxy do timestamp original do WhatsApp
  -- (não existe coluna whatsapp_timestamp dedicada; conversation_messages.timestamp existe mas é redundante)
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id
    AND (last_message_at IS NULL OR NEW.created_at > last_message_at);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_update_conv_last_msg_cm ON public.conversation_messages;
CREATE TRIGGER trg_update_conv_last_msg_cm
AFTER INSERT ON public.conversation_messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

DROP TRIGGER IF EXISTS trg_update_conv_last_msg_m ON public.messages;
CREATE TRIGGER trg_update_conv_last_msg_m
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- FASE 4: Backfill de last_message_at
UPDATE public.conversations c
SET last_message_at = sub.max_ts
FROM (
  SELECT conversation_id, MAX(ts) AS max_ts FROM (
    SELECT conversation_id, MAX(created_at) AS ts FROM public.conversation_messages
      WHERE conversation_id IS NOT NULL GROUP BY conversation_id
    UNION ALL
    SELECT conversation_id, MAX(created_at) AS ts FROM public.messages
      WHERE conversation_id IS NOT NULL GROUP BY conversation_id
  ) all_msgs
  GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND sub.max_ts IS NOT NULL
  AND (c.last_message_at IS NULL OR c.last_message_at <> sub.max_ts);

-- FASE 5: Índice descendente
CREATE INDEX IF NOT EXISTS ix_conversations_last_message_at_desc 
  ON public.conversations (last_message_at DESC NULLS LAST, id DESC);

-- FASE 9: Função de auditoria
CREATE OR REPLACE FUNCTION public.audit_conversation_ordering()
RETURNS TABLE(conv_id uuid, last_message_at_atual timestamptz, last_message_at_real timestamptz, diff_seconds int)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT c.id, c.last_message_at, real_max.max_ts,
         EXTRACT(EPOCH FROM (real_max.max_ts - c.last_message_at))::int
  FROM public.conversations c
  JOIN LATERAL (
    SELECT GREATEST(
      (SELECT MAX(created_at) FROM public.conversation_messages WHERE conversation_id = c.id),
      (SELECT MAX(created_at) FROM public.messages WHERE conversation_id = c.id)
    ) AS max_ts
  ) real_max ON true
  WHERE real_max.max_ts IS NOT NULL
    AND (c.last_message_at IS NULL OR c.last_message_at <> real_max.max_ts);
$$;