-- Dashboard aggregation RPC: returns pre-computed KPIs to avoid fetching 5000+ rows client-side
CREATE OR REPLACE FUNCTION public.dashboard_kpis(
  p_period text DEFAULT 'all',
  p_seller_id uuid DEFAULT NULL,
  p_destination text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  cutoff_start timestamptz := NULL;
  cutoff_end timestamptz := NULL;
BEGIN
  -- Calculate period cutoffs
  IF p_period = '7d' THEN cutoff_start := now() - interval '7 days';
  ELSIF p_period = '30d' THEN cutoff_start := now() - interval '30 days';
  ELSIF p_period = '90d' THEN cutoff_start := now() - interval '90 days';
  ELSIF p_period = '12m' THEN cutoff_start := now() - interval '12 months';
  ELSIF p_period = 'this_month' THEN cutoff_start := date_trunc('month', now());
  ELSIF p_period = 'last_month' THEN 
    cutoff_start := date_trunc('month', now() - interval '1 month');
    cutoff_end := date_trunc('month', now());
  ELSIF p_period = 'today' THEN cutoff_start := date_trunc('day', now());
  END IF;

  SELECT jsonb_build_object(
    'total_sales', COUNT(*),
    'total_revenue', COALESCE(SUM(received_value), 0),
    'total_cost', COALESCE(SUM(total_cost), 0),
    'total_profit', COALESCE(SUM(profit), 0),
    'avg_ticket', CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(received_value) / COUNT(*), 0) ELSE 0 END,
    'avg_margin', CASE WHEN COUNT(*) > 0 THEN COALESCE(AVG(margin), 0) ELSE 0 END,
    'by_status', (
      SELECT jsonb_object_agg(s.status, s.cnt)
      FROM (
        SELECT status, COUNT(*) as cnt
        FROM sales sub
        WHERE (cutoff_start IS NULL OR sub.created_at >= cutoff_start)
          AND (cutoff_end IS NULL OR sub.created_at < cutoff_end)
          AND (p_seller_id IS NULL OR sub.seller_id = p_seller_id)
          AND (p_destination IS NULL OR sub.destination_iata = p_destination)
          AND (p_status IS NULL OR sub.status = p_status)
        GROUP BY status
      ) s
    ),
    'by_seller', (
      SELECT jsonb_agg(jsonb_build_object(
        'seller_id', sub.seller_id,
        'seller_name', COALESCE(p.full_name, 'Sem vendedor'),
        'count', sub.cnt,
        'revenue', sub.revenue,
        'profit', sub.profit_sum
      ))
      FROM (
        SELECT seller_id, COUNT(*) as cnt, 
               COALESCE(SUM(received_value), 0) as revenue,
               COALESCE(SUM(profit), 0) as profit_sum
        FROM sales s2
        WHERE (cutoff_start IS NULL OR s2.created_at >= cutoff_start)
          AND (cutoff_end IS NULL OR s2.created_at < cutoff_end)
          AND (p_status IS NULL OR s2.status = p_status)
        GROUP BY seller_id
        ORDER BY revenue DESC
        LIMIT 20
      ) sub
      LEFT JOIN profiles p ON p.id = sub.seller_id
    ),
    'top_destinations', (
      SELECT jsonb_agg(jsonb_build_object('iata', dest, 'count', cnt, 'revenue', rev))
      FROM (
        SELECT destination_iata as dest, COUNT(*) as cnt, COALESCE(SUM(received_value), 0) as rev
        FROM sales s3
        WHERE destination_iata IS NOT NULL
          AND (cutoff_start IS NULL OR s3.created_at >= cutoff_start)
          AND (cutoff_end IS NULL OR s3.created_at < cutoff_end)
          AND (p_seller_id IS NULL OR s3.seller_id = p_seller_id)
          AND (p_status IS NULL OR s3.status = p_status)
        GROUP BY destination_iata
        ORDER BY cnt DESC
        LIMIT 15
      ) d
    ),
    'monthly_trend', (
      SELECT jsonb_agg(jsonb_build_object('month', m, 'count', cnt, 'revenue', rev))
      FROM (
        SELECT to_char(created_at, 'YYYY-MM') as m, COUNT(*) as cnt, COALESCE(SUM(received_value), 0) as rev
        FROM sales s4
        WHERE s4.created_at >= now() - interval '12 months'
          AND (p_seller_id IS NULL OR s4.seller_id = p_seller_id)
          AND (p_status IS NULL OR s4.status = p_status)
        GROUP BY to_char(created_at, 'YYYY-MM')
        ORDER BY m
      ) t
    )
  ) INTO result
  FROM sales
  WHERE (cutoff_start IS NULL OR created_at >= cutoff_start)
    AND (cutoff_end IS NULL OR created_at < cutoff_end)
    AND (p_seller_id IS NULL OR seller_id = p_seller_id)
    AND (p_destination IS NULL OR destination_iata = p_destination)
    AND (p_status IS NULL OR status = p_status);

  RETURN result;
END;
$$;

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_sales_created_status ON public.sales (created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_sales_seller_created ON public.sales (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_destination ON public.sales (destination_iata) WHERE destination_iata IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_ts ON public.conversation_messages (conversation_id, timestamp DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_conversations_stage ON public.conversations (stage) WHERE stage IS NOT NULL;
