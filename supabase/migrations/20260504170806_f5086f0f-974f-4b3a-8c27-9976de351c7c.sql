ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS media_failure_reason TEXT;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_failure_reason TEXT;

CREATE OR REPLACE FUNCTION public.watchdog_mark_stuck_media(p_table text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  marked_count INT := 0;
BEGIN
  IF p_table NOT IN ('conversation_messages', 'messages') THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table;
  END IF;

  EXECUTE format($f$
    UPDATE public.%I
    SET media_status = 'failed',
        media_failure_reason = COALESCE(media_failure_reason, 'watchdog_stuck')
    WHERE media_status IN ('pending', 'downloading')
      AND created_at < now() - interval '5 minutes'
      AND created_at > now() - interval '24 hours'
  $f$, p_table);

  GET DIAGNOSTICS marked_count = ROW_COUNT;
  RETURN marked_count;
END;
$function$;