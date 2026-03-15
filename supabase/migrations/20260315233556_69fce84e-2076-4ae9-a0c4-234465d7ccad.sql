-- Drop the partial unique index and create a proper unique constraint for upsert compatibility
DROP INDEX IF EXISTS idx_cm_dedup;
CREATE UNIQUE INDEX idx_cm_dedup ON public.conversation_messages (conversation_id, external_message_id) WHERE (external_message_id IS NOT NULL AND external_message_id != '');