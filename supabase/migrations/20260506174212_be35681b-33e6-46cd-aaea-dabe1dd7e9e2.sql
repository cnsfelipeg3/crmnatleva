-- Backfill completo: processar todos os status_broadcast ReceivedCallback ainda não inseridos
INSERT INTO public.whatsapp_statuses (
  phone, contact_name, is_mine, status_type,
  text_content, media_url, media_thumbnail_url, media_mimetype, caption,
  external_status_id, external_zaap_id, posted_at, raw_payload
)
SELECT
  COALESCE(NULLIF(payload->>'participantPhone',''), NULLIF(payload->>'senderPhone',''), 'unknown') AS phone,
  NULLIF(payload->>'senderName','') AS contact_name,
  COALESCE((payload->>'fromMe')::boolean, false) AS is_mine,
  CASE
    WHEN payload ? 'image' THEN 'image'
    WHEN payload ? 'video' THEN 'video'
    ELSE 'text'
  END AS status_type,
  CASE WHEN NOT (payload ? 'image' OR payload ? 'video')
       THEN COALESCE(payload->'text'->>'message', payload->>'message') END AS text_content,
  COALESCE(payload->'image'->>'imageUrl', payload->'video'->>'videoUrl') AS media_url,
  COALESCE(payload->'image'->>'thumbnailUrl', payload->'video'->>'thumbnailUrl') AS media_thumbnail_url,
  COALESCE(payload->'image'->>'mimeType', payload->'video'->>'mimeType') AS media_mimetype,
  COALESCE(payload->'image'->>'caption', payload->'video'->>'caption', payload->>'caption') AS caption,
  payload->>'messageId' AS external_status_id,
  payload->>'zaapId' AS external_zaap_id,
  to_timestamp(((payload->>'momment')::bigint)/1000.0) AS posted_at,
  payload AS raw_payload
FROM public.whatsapp_events_raw
WHERE event_type = 'status_broadcast'
  AND payload->>'type' = 'ReceivedCallback'
  AND payload->>'messageId' IS NOT NULL
  AND to_timestamp(((payload->>'momment')::bigint)/1000.0) > now() - interval '24 hours'
ON CONFLICT (external_status_id) DO NOTHING;