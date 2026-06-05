DO $$
DECLARE
  groups INT;
  losers INT;
BEGIN
  CREATE TEMP TABLE _cdup ON COMMIT DROP AS
  WITH norm AS (
    SELECT c.id,
           c.phone,
           lower(regexp_replace(
             translate(coalesce(c.display_name,''),
               'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
               'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
             ), '\s+',' ','g')) AS nname,
           c.created_at,
           COALESCE((SELECT COUNT(*) FROM public.sales s WHERE s.client_id = c.id),0)
           + COALESCE((SELECT COUNT(*) FROM public.conversations cv WHERE cv.client_id = c.id),0)
           + COALESCE((SELECT COUNT(*) FROM public.proposals p WHERE p.client_id = c.id),0)
           + COALESCE((SELECT COUNT(*) FROM public.portal_access pa WHERE pa.client_id = c.id),0)
           + COALESCE((SELECT COUNT(*) FROM public.accounts_receivable ar WHERE ar.client_id = c.id),0)
           AS refs
    FROM public.clients c
    WHERE c.phone IS NOT NULL AND c.phone <> ''
      AND c.display_name IS NOT NULL AND trim(c.display_name) <> ''
  ),
  grp AS (
    SELECT nname, phone FROM norm
    GROUP BY nname, phone HAVING COUNT(*) > 1
  ),
  ranked AS (
    SELECT n.id, n.nname, n.phone,
           ROW_NUMBER() OVER (PARTITION BY n.nname, n.phone
                              ORDER BY n.refs DESC, n.created_at ASC, n.id ASC) AS rn
    FROM norm n JOIN grp g USING (nname, phone)
  ),
  keepers AS (SELECT nname, phone, id AS keeper_id FROM ranked WHERE rn=1)
  SELECT r.id AS client_id, r.nname, r.phone, k.keeper_id, (r.rn=1) AS is_keeper
  FROM ranked r JOIN keepers k USING (nname, phone);

  SELECT COUNT(DISTINCT (nname,phone)), COUNT(*) FILTER (WHERE NOT is_keeper)
    INTO groups, losers FROM _cdup;
  RAISE NOTICE 'Client dedup groups: %, losers: %', groups, losers;

  -- 1) Preserve best email on keeper before deleting losers
  UPDATE public.clients k
     SET email = COALESCE(NULLIF(k.email,''), best.email)
    FROM (
      SELECT dm.keeper_id, MIN(c.email) AS email
      FROM _cdup dm
      JOIN public.clients c ON c.id = dm.client_id
      WHERE c.email IS NOT NULL AND c.email <> ''
      GROUP BY dm.keeper_id
    ) best
   WHERE k.id = best.keeper_id;

  -- 2) Tables with UNIQUE(client_id) — keep only keeper's row, delete loser rows
  DELETE FROM public.portal_access pa
   USING _cdup dm
   WHERE pa.client_id = dm.client_id AND NOT dm.is_keeper
     AND EXISTS (SELECT 1 FROM public.portal_access pa2 WHERE pa2.client_id = dm.keeper_id);

  DELETE FROM public.client_travel_preferences t
   USING _cdup dm
   WHERE t.client_id = dm.client_id AND NOT dm.is_keeper
     AND EXISTS (SELECT 1 FROM public.client_travel_preferences t2 WHERE t2.client_id = dm.keeper_id);

  -- 3) Reassign all FK refs to keeper
  UPDATE public.sales t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.accounts_receivable t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.conversations t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.proposals t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.client_notes t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.client_contacts t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.portal_access t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.portal_published_sales t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.portal_notifications t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.portal_checklist_items t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.portal_travel_budgets t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.portal_quote_requests t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.client_travel_preferences t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.client_trip_memory t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.ai_learning_events t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.natleva_brain_insights t SET related_client_id = dm.keeper_id
    FROM _cdup dm WHERE t.related_client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.quotation_briefings t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;
  UPDATE public.affiliate_referrals t SET client_id = dm.keeper_id
    FROM _cdup dm WHERE t.client_id = dm.client_id AND NOT dm.is_keeper;

  -- 4) Delete loser client rows
  DELETE FROM public.clients c USING _cdup dm
   WHERE c.id = dm.client_id AND NOT dm.is_keeper;
END $$;