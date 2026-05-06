
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  content TEXT,
  media_url TEXT,
  media_mimetype TEXT,
  media_filename TEXT,
  media_size_bytes BIGINT,
  caption TEXT,
  original_payload JSONB,
  created_by uuid NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  failure_reason TEXT,
  failure_detail TEXT,
  message_id_after_sent TEXT,
  CHECK (status IN ('pending','sent','cancelled','failed'))
);

CREATE INDEX IF NOT EXISTS ix_scheduled_pending
  ON public.scheduled_messages (scheduled_for ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ix_scheduled_by_conv
  ON public.scheduled_messages (conversation_id, scheduled_for ASC)
  WHERE status = 'pending';

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own + admin sees all" ON public.scheduled_messages;
CREATE POLICY "Users see own + admin sees all"
  ON public.scheduled_messages FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own" ON public.scheduled_messages;
CREATE POLICY "Users insert own"
  ON public.scheduled_messages FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users update own + admin all" ON public.scheduled_messages;
CREATE POLICY "Users update own + admin all"
  ON public.scheduled_messages FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_scheduled_messages_updated
  BEFORE UPDATE ON public.scheduled_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC para o cron pegar e travar mensagens prontas (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_scheduled_messages(p_limit int DEFAULT 50)
RETURNS SETOF public.scheduled_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id FROM public.scheduled_messages
    WHERE status = 'pending' AND scheduled_for <= now()
    ORDER BY scheduled_for ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.scheduled_messages sm
  SET status = 'sending', updated_at = now()
  FROM claimed
  WHERE sm.id = claimed.id
  RETURNING sm.*;
END;
$$;
