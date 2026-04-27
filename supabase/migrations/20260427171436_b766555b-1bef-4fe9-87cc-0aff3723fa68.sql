WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY sale_id, direction
      ORDER BY 
        CASE WHEN status IN ('CONCLUIDO','CANCELADO') THEN 0 ELSE 1 END,
        CASE WHEN segment_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
    ) AS rn
  FROM public.checkin_tasks
)
DELETE FROM public.checkin_tasks WHERE id IN (SELECT id FROM ranked WHERE rn > 1);