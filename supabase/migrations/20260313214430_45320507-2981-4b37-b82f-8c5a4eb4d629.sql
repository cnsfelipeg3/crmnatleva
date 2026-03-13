
-- Fix handle_new_user to not insert duplicate roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE((NEW.raw_user_meta_data->>'is_portal_user')::boolean, false) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;
