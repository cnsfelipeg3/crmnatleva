ALTER TABLE public.conversation_messages
  DROP CONSTRAINT IF EXISTS conversation_messages_status_check;

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_status_check
  CHECK (status IN ('pending','queued','sending','sent','delivered','read','failed','received','retrying'));