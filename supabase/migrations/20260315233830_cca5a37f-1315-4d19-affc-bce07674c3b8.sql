-- Drop and recreate message_type check to be more permissive
ALTER TABLE public.conversation_messages DROP CONSTRAINT conversation_messages_message_type_check;
ALTER TABLE public.conversation_messages ADD CONSTRAINT conversation_messages_message_type_check 
  CHECK (message_type = ANY (ARRAY['text', 'image', 'audio', 'video', 'document', 'sticker', 'ptt', 'ciphertext', 'vcard', 'call_log', 'multi_vcard', 'location', 'interactive_quick_reply', 'other']));

-- Now run the bulk migration from chat_messages
INSERT INTO public.conversation_messages (conversation_id, external_message_id, direction, sender_type, content, message_type, media_url, status, metadata, timestamp, created_at)
SELECT 
  cm.conversation_id,
  cm.external_message_id,
  CASE 
    WHEN cm.sender_type = 'atendente' THEN 'outgoing'
    WHEN cm.sender_type = 'sistema' THEN 'system'
    ELSE 'incoming'
  END,
  COALESCE(cm.sender_type, 'cliente'),
  COALESCE(cm.content, ''),
  COALESCE(cm.message_type, 'text'),
  cm.media_url,
  CASE 
    WHEN cm.read_status = 'read' THEN 'read'
    WHEN cm.read_status = 'delivered' THEN 'delivered'
    ELSE 'sent'
  END,
  cm.metadata,
  cm.created_at,
  cm.created_at
FROM public.chat_messages cm
WHERE cm.conversation_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate from legacy messages table
INSERT INTO public.conversation_messages (conversation_id, external_message_id, direction, sender_type, content, message_type, media_url, status, timestamp, created_at)
SELECT 
  m.conversation_id,
  m.external_message_id,
  CASE 
    WHEN m.sender_type = 'atendente' THEN 'outgoing'
    WHEN m.sender_type = 'sistema' THEN 'system'
    ELSE 'incoming'
  END,
  COALESCE(m.sender_type, 'cliente'),
  COALESCE(m.text, ''),
  CASE WHEN m.message_type = 'ptt' THEN 'audio' ELSE COALESCE(m.message_type, 'text') END,
  m.media_url,
  CASE 
    WHEN LOWER(COALESCE(m.status, 'sent')) IN ('read', 'lido', 'seen', 'played') THEN 'read'
    WHEN LOWER(COALESCE(m.status, 'sent')) IN ('delivered', 'entregue', 'received', 'delivery_ack') THEN 'delivered'
    ELSE 'sent'
  END,
  m.created_at,
  m.created_at
FROM public.messages m
WHERE m.conversation_id IS NOT NULL
ON CONFLICT DO NOTHING;