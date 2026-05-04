ALTER TABLE public.conversation_messages ADD COLUMN IF NOT EXISTS failure_acknowledged_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS failure_acknowledged_at TIMESTAMPTZ;

COMMENT ON COLUMN public.conversation_messages.failure_acknowledged_at IS 'Timestamp quando o usuário marcou esta mensagem failed como lida (não muda status, só remove do contador do badge)';
COMMENT ON COLUMN public.messages.failure_acknowledged_at IS 'Timestamp quando o usuário marcou esta mensagem failed como lida (não muda status, só remove do contador do badge)';

CREATE INDEX IF NOT EXISTS idx_conv_msgs_failed_unack
  ON public.conversation_messages (created_at DESC)
  WHERE status = 'failed' AND sender_type = 'atendente' AND failure_acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_msgs_failed_unack
  ON public.messages (created_at DESC)
  WHERE status = 'failed' AND sender_type = 'atendente' AND failure_acknowledged_at IS NULL;