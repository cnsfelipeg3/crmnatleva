
-- 1. Remover Susana totalmente (cascade vai limpar profile e user_roles)
DELETE FROM auth.users WHERE id = '898d8031-63e7-4a46-8fca-a28b31f39a67';

-- 2. Atualizar trigger para NÃO atribuir role 'vendedor' automaticamente
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
  -- Roles agora devem ser atribuídos manualmente por um admin via /admin/users
  RETURN NEW;
END;
$function$;
