CREATE OR REPLACE FUNCTION public.watchdog_mark_silent_timeouts(p_table text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  marked_count INT := 0;
BEGIN
  IF p_table NOT IN ('conversation_messages', 'messages') THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table;
  END IF;

  EXECUTE format($f$
    UPDATE public.%1$I outer_msg
    SET status = 'failed',
        failure_reason = COALESCE(failure_reason, 'silent_timeout'),
        failure_detail = COALESCE(failure_detail, 'watchdog: 24h sem confirmação E sem resposta do cliente')
    WHERE sender_type = 'atendente'
      AND status IN ('pending', 'sent', 'retrying')
      AND created_at < now() - interval '24 hours'
      AND created_at > now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.%1$I newer_msg
        WHERE newer_msg.conversation_id = outer_msg.conversation_id
          AND newer_msg.sender_type = 'cliente'
          AND newer_msg.created_at > outer_msg.created_at
      )
  $f$, p_table);

  GET DIAGNOSTICS marked_count = ROW_COUNT;
  RETURN marked_count;
END;
$$;