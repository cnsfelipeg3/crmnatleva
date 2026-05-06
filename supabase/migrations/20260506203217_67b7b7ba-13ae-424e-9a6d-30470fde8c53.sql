CREATE TABLE IF NOT EXISTS public.whatsapp_statuses_quarantine
  (LIKE public.whatsapp_statuses INCLUDING DEFAULTS);

INSERT INTO public.whatsapp_statuses_quarantine
SELECT * FROM public.whatsapp_statuses
WHERE raw_payload->>'isStatusReply' = 'true'
   OR (is_mine = false AND (phone IN ('unknown', 'status@broadcast', '') OR phone IS NULL));

DELETE FROM public.whatsapp_statuses
WHERE raw_payload->>'isStatusReply' = 'true'
   OR (is_mine = false AND (phone IN ('unknown', 'status@broadcast', '') OR phone IS NULL));