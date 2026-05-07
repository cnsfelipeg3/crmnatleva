-- Tabela para rastrear status de entrega/leitura por destinatário (membros de grupos)
CREATE TABLE IF NOT EXISTS public.message_recipient_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_message_id text NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  participant_phone text NOT NULL,
  participant_name text,
  delivered_at timestamptz,
  read_at timestamptz,
  played_at timestamptz,
  is_group boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_message_id, participant_phone)
);

CREATE INDEX IF NOT EXISTS idx_mrs_external_message_id ON public.message_recipient_status(external_message_id);
CREATE INDEX IF NOT EXISTS idx_mrs_conversation_id ON public.message_recipient_status(conversation_id);

ALTER TABLE public.message_recipient_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read message_recipient_status" ON public.message_recipient_status FOR SELECT USING (true);
CREATE POLICY "Allow all insert message_recipient_status" ON public.message_recipient_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update message_recipient_status" ON public.message_recipient_status FOR UPDATE USING (true);
CREATE POLICY "Allow all delete message_recipient_status" ON public.message_recipient_status FOR DELETE USING (true);
