
-- Add display_name to conversations for imported chats without a linked client
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS display_name text;

-- Add source column to track where conversations came from
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Create unique index on external_id for conversation dedup
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_external_id_unique 
ON public.conversations (external_id) WHERE external_id IS NOT NULL;

-- Create index on external_message_id for message dedup
CREATE INDEX IF NOT EXISTS idx_chat_messages_external_message_id 
ON public.chat_messages (external_message_id) WHERE external_message_id IS NOT NULL;

-- Add responsavel column to chat_messages for tracking which agent sent it
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
