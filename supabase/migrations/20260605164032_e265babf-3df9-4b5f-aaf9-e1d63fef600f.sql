DO $$
DECLARE
  total_groups INT;
  total_losers INT;
BEGIN
  CREATE TEMP TABLE _dup_map ON COMMIT DROP AS
  WITH norm AS (
    SELECT p.id,
           regexp_replace(COALESCE(p.cpf,''), '[^0-9]', '', 'g') AS ncpf,
           p.created_at,
           COALESCE((SELECT COUNT(*) FROM public.sale_passengers sp WHERE sp.passenger_id = p.id), 0)
           + COALESCE((SELECT COUNT(*) FROM public.sales s WHERE s.payer_passenger_id = p.id), 0) AS ref_count
    FROM public.passengers p
    WHERE p.cpf IS NOT NULL AND p.cpf <> ''
  ),
  grp AS (SELECT ncpf FROM norm WHERE length(ncpf)=11 GROUP BY ncpf HAVING COUNT(*)>1),
  ranked AS (
    SELECT n.id, n.ncpf,
           ROW_NUMBER() OVER (PARTITION BY n.ncpf ORDER BY n.ref_count DESC, n.created_at ASC, n.id ASC) rn
    FROM norm n JOIN grp g USING (ncpf)
  ),
  keepers AS (SELECT ncpf, id AS keeper_id FROM ranked WHERE rn=1)
  SELECT r.id AS passenger_id, r.ncpf, k.keeper_id, (r.rn=1) AS is_keeper
  FROM ranked r JOIN keepers k USING (ncpf);

  SELECT COUNT(DISTINCT ncpf), COUNT(*) FILTER (WHERE NOT is_keeper)
    INTO total_groups, total_losers FROM _dup_map;
  RAISE NOTICE 'Dedup groups: %, losers: %', total_groups, total_losers;

  -- Deduplicate child rows per unique key, preferring keeper, then lowest id.
  -- sale_passengers UNIQUE(sale_id, passenger_id)
  WITH r AS (
    SELECT t.id AS row_id,
           ROW_NUMBER() OVER (PARTITION BY t.sale_id, dm.ncpf
                              ORDER BY (t.passenger_id = dm.keeper_id) DESC, t.id ASC) rn
    FROM public.sale_passengers t JOIN _dup_map dm ON dm.passenger_id = t.passenger_id
  )
  DELETE FROM public.sale_passengers t USING r WHERE t.id = r.row_id AND r.rn > 1;

  -- checkin_passenger_details UNIQUE(checkin_task_id, passenger_id)
  WITH r AS (
    SELECT t.id AS row_id,
           ROW_NUMBER() OVER (PARTITION BY t.checkin_task_id, dm.ncpf
                              ORDER BY (t.passenger_id = dm.keeper_id) DESC, t.id ASC) rn
    FROM public.checkin_passenger_details t JOIN _dup_map dm ON dm.passenger_id = t.passenger_id
  )
  DELETE FROM public.checkin_passenger_details t USING r WHERE t.id = r.row_id AND r.rn > 1;

  -- conversation_companions UNIQUE(conversation_id, passenger_id)
  WITH r AS (
    SELECT t.id AS row_id,
           ROW_NUMBER() OVER (PARTITION BY t.conversation_id, dm.ncpf
                              ORDER BY (t.passenger_id = dm.keeper_id) DESC, t.id ASC) rn
    FROM public.conversation_companions t JOIN _dup_map dm ON dm.passenger_id = t.passenger_id
  )
  DELETE FROM public.conversation_companions t USING r WHERE t.id = r.row_id AND r.rn > 1;

  -- Update FK refs to keeper
  UPDATE public.sale_passengers t SET passenger_id = dm.keeper_id
    FROM _dup_map dm WHERE t.passenger_id = dm.passenger_id AND NOT dm.is_keeper;
  UPDATE public.sales t SET payer_passenger_id = dm.keeper_id
    FROM _dup_map dm WHERE t.payer_passenger_id = dm.passenger_id AND NOT dm.is_keeper;
  UPDATE public.checkin_boarding_passes t SET passenger_id = dm.keeper_id
    FROM _dup_map dm WHERE t.passenger_id = dm.passenger_id AND NOT dm.is_keeper;
  UPDATE public.checkin_passenger_details t SET passenger_id = dm.keeper_id
    FROM _dup_map dm WHERE t.passenger_id = dm.passenger_id AND NOT dm.is_keeper;
  UPDATE public.conversation_companions t SET passenger_id = dm.keeper_id
    FROM _dup_map dm WHERE t.passenger_id = dm.passenger_id AND NOT dm.is_keeper;
  UPDATE public.passenger_attachments t SET passenger_id = dm.keeper_id
    FROM _dup_map dm WHERE t.passenger_id = dm.passenger_id AND NOT dm.is_keeper;
  UPDATE public.portal_expense_group_members t SET passenger_id = dm.keeper_id
    FROM _dup_map dm WHERE t.passenger_id = dm.passenger_id AND NOT dm.is_keeper;

  DELETE FROM public.passengers p USING _dup_map dm
   WHERE p.id = dm.passenger_id AND NOT dm.is_keeper;

  UPDATE public.passengers
     SET cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
   WHERE cpf IS NOT NULL AND cpf <> regexp_replace(cpf, '[^0-9]', '', 'g');
END $$;