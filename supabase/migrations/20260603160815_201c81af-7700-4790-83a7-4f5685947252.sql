
CREATE OR REPLACE FUNCTION public.register_proposal_viewer(
  p_proposal_id uuid,
  p_email text,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_referred_by_share_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_existing_views int;
BEGIN
  IF p_proposal_id IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id, total_views
    INTO v_id, v_existing_views
  FROM public.proposal_viewers
  WHERE proposal_id = p_proposal_id
    AND lower(email) = lower(p_email)
  ORDER BY first_viewed_at ASC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.proposal_viewers
       SET last_active_at = now(),
           total_views = COALESCE(v_existing_views, 1) + 1,
           name = COALESCE(NULLIF(p_name, ''), name),
           phone = COALESCE(NULLIF(p_phone, ''), phone),
           device_type = COALESCE(p_device_type, device_type),
           user_agent = COALESCE(p_user_agent, user_agent),
           ip_address = COALESCE(p_ip, ip_address),
           city = COALESCE(p_city, city),
           region = COALESCE(p_region, region),
           country = COALESCE(p_country, country),
           latitude = COALESCE(p_latitude, latitude),
           longitude = COALESCE(p_longitude, longitude),
           referred_by_share_id = COALESCE(p_referred_by_share_id, referred_by_share_id)
     WHERE id = v_id;
  ELSE
    INSERT INTO public.proposal_viewers (
      proposal_id, email, name, phone, device_type, user_agent,
      ip_address, city, region, country, latitude, longitude,
      referred_by_share_id, first_viewed_at, last_active_at, total_views
    ) VALUES (
      p_proposal_id, p_email, NULLIF(p_name, ''), NULLIF(p_phone, ''),
      p_device_type, p_user_agent, p_ip, p_city, p_region, p_country,
      p_latitude, p_longitude, p_referred_by_share_id,
      now(), now(), 1
    )
    RETURNING id INTO v_id;
  END IF;

  UPDATE public.proposals
     SET views_count = COALESCE(views_count, 0) + 1,
         last_viewed_at = now()
   WHERE id = p_proposal_id;

  BEGIN
    INSERT INTO public.proposal_views (proposal_id, device_type, user_agent)
    VALUES (p_proposal_id, p_device_type, p_user_agent);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_proposal_viewer(uuid, text, text, text, text, text, text, text, text, text, numeric, numeric, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.register_proposal_viewer(uuid, text, text, text, text, text, text, text, text, text, numeric, numeric, uuid) TO anon, authenticated, service_role;
