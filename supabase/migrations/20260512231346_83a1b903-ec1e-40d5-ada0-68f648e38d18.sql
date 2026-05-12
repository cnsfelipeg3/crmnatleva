CREATE OR REPLACE FUNCTION public.proposals_pulse(p_hours integer DEFAULT 24)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  cutoff timestamptz := now() - make_interval(hours => GREATEST(p_hours, 1));
  margin_avg numeric;
BEGIN
  SELECT COALESCE(AVG(NULLIF(profit, 0) / NULLIF(received_value, 0)), 0)
    INTO margin_avg
  FROM public.sales
  WHERE close_date >= (current_date - 90)
    AND received_value > 0
    AND profit IS NOT NULL;

  WITH base AS (
    SELECT p.*
    FROM public.proposals p
    WHERE p.created_at >= cutoff
      AND p.is_fictional = false
      AND COALESCE(p.status, '') <> 'draft'
  ),
  agg AS (
    SELECT
      COUNT(*)::int AS sent_count,
      COALESCE(SUM(total_value), 0)::numeric AS total_value,
      COALESCE(AVG(NULLIF(total_value, 0)), 0)::numeric AS avg_ticket
    FROM base
  ),
  viewers AS (
    SELECT v.*
    FROM public.proposal_viewers v
    JOIN base b ON b.id = v.proposal_id
  ),
  viewer_agg AS (
    SELECT
      COUNT(DISTINCT proposal_id)::int AS proposals_opened,
      COUNT(*)::int AS unique_viewers,
      COALESCE(AVG(NULLIF(active_seconds, 0)) FILTER (WHERE active_seconds > 5), 0)::int AS avg_active_seconds,
      COUNT(*) FILTER (WHERE active_seconds >= 60)::int AS high_engagement_count,
      COUNT(*) FILTER (WHERE whatsapp_clicked)::int AS whatsapp_clicks,
      COUNT(*) FILTER (WHERE cta_clicked)::int AS cta_clicks
    FROM viewers
  ),
  shares_agg AS (
    SELECT COUNT(*)::int AS shares_count
    FROM public.proposal_shares s
    JOIN base b ON b.id = s.proposal_id
    WHERE s.created_at >= cutoff
  ),
  top_engaged AS (
    SELECT
      b.id,
      b.title,
      b.client_name,
      b.total_value,
      b.slug,
      COALESCE(SUM(v.active_seconds), 0)::int AS total_active_seconds,
      COUNT(v.id)::int AS viewers_count,
      BOOL_OR(COALESCE(v.whatsapp_clicked, false)) AS any_whatsapp,
      BOOL_OR(COALESCE(v.cta_clicked, false)) AS any_cta,
      EXISTS (SELECT 1 FROM public.proposal_shares s WHERE s.proposal_id = b.id AND s.created_at >= cutoff) AS shared
    FROM base b
    LEFT JOIN public.proposal_viewers v ON v.proposal_id = b.id
    GROUP BY b.id, b.title, b.client_name, b.total_value, b.slug
    ORDER BY total_active_seconds DESC NULLS LAST, viewers_count DESC
    LIMIT 5
  )
  SELECT jsonb_build_object(
    'window_hours', p_hours,
    'generated_at', now(),
    'margin_used', margin_avg,
    'sent_count', a.sent_count,
    'total_value', a.total_value,
    'avg_ticket', a.avg_ticket,
    'estimated_profit', (a.total_value * margin_avg),
    'proposals_opened', va.proposals_opened,
    'unique_viewers', va.unique_viewers,
    'open_rate', CASE WHEN a.sent_count > 0
                      THEN ROUND((va.proposals_opened::numeric / a.sent_count) * 100, 1)
                      ELSE 0 END,
    'avg_active_seconds', va.avg_active_seconds,
    'high_engagement_count', va.high_engagement_count,
    'shares_count', sa.shares_count,
    'whatsapp_clicks', va.whatsapp_clicks,
    'cta_clicks', va.cta_clicks,
    'top_engaged', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
          'id', t.id,
          'title', t.title,
          'client_name', t.client_name,
          'total_value', t.total_value,
          'slug', t.slug,
          'total_active_seconds', t.total_active_seconds,
          'viewers_count', t.viewers_count,
          'whatsapp_clicked', t.any_whatsapp,
          'cta_clicked', t.any_cta,
          'shared', t.shared
       )) FROM top_engaged t),
      '[]'::jsonb
    )
  ) INTO result
  FROM agg a, viewer_agg va, shares_agg sa;

  RETURN result;
END;
$function$;