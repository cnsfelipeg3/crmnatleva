
-- Conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'novo',
  tags text[] DEFAULT '{}'::text[],
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  unread_count integer DEFAULT 0,
  external_id text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage conversations"
  ON public.conversations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'atendente',
  sender_id uuid,
  message_type text NOT NULL DEFAULT 'text',
  content text,
  media_url text,
  external_message_id text,
  read_status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage chat_messages"
  ON public.chat_messages FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Conversation transfer log
CREATE TABLE public.conversation_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_user_id uuid,
  to_user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage conversation_transfers"
  ON public.conversation_transfers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- WhatsApp integration config
CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id text,
  access_token text,
  webhook_url text,
  verify_token text,
  connection_status text DEFAULT 'disconnected',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage whatsapp_config"
  ON public.whatsapp_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
