
-- Function: when affiliate status transitions to approved/rejected, call send-transactional-email
CREATE OR REPLACE FUNCTION public.notify_affiliate_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template text;
  v_url text := 'https://mexlhkqcmiaktjxsyvod.supabase.co/functions/v1/send-transactional-email';
  v_service_key text;
  v_body jsonb;
  v_first_name text;
BEGIN
  -- Only fire on transitions FROM pending into approved/rejected (or any change to those states)
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    v_template := 'affiliate-approved';
  ELSIF NEW.status = 'rejected' THEN
    v_template := 'affiliate-rejected';
  ELSE
    RETURN NEW;
  END IF;

  -- Read service-role key from vault (set by setup_email_infra)
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'email_queue_service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  IF v_service_key IS NULL THEN
    RAISE WARNING 'notify_affiliate_status_change: missing email_queue_service_role_key';
    RETURN NEW;
  END IF;

  v_first_name := split_part(coalesce(NEW.full_name, ''), ' ', 1);

  v_body := jsonb_build_object(
    'templateName', v_template,
    'recipientEmail', NEW.email,
    'idempotencyKey', 'affiliate-' || NEW.id::text || '-' || NEW.status::text,
    'templateData', jsonb_build_object(
      'name', NULLIF(v_first_name, ''),
      'reason', NEW.notes,
      'portalUrl', 'https://adm.natleva.com/vitrine'
    )
  );

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := v_body
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_affiliate_status_change ON public.affiliates;
CREATE TRIGGER trg_notify_affiliate_status_change
AFTER UPDATE OF status ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.notify_affiliate_status_change();
