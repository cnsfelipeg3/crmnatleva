-- Backfill: corrige sender_name em mensagens de grupo usando o nome real
-- do contato (clients > zapi_contacts) quando temos sender_phone confiável.
UPDATE public.conversation_messages cm
SET sender_name = c.display_name
FROM public.clients c
WHERE cm.sender_phone IS NOT NULL
  AND cm.sender_phone = c.phone
  AND cm.sender_type = 'cliente'
  AND c.display_name IS NOT NULL
  AND LENGTH(TRIM(c.display_name)) > 0
  AND COALESCE(cm.sender_name, '') <> c.display_name;

UPDATE public.conversation_messages cm
SET sender_name = z.name
FROM public.zapi_contacts z
WHERE cm.sender_phone IS NOT NULL
  AND cm.sender_phone = z.phone
  AND cm.sender_type = 'cliente'
  AND z.name IS NOT NULL
  AND LENGTH(TRIM(z.name)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.clients c2
    WHERE c2.phone = cm.sender_phone AND c2.display_name IS NOT NULL
  )
  AND COALESCE(cm.sender_name, '') <> z.name;