-- Tabela de permissões granulares por menu
CREATE TABLE IF NOT EXISTS public.employee_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, menu_key)
);

CREATE INDEX IF NOT EXISTS idx_employee_permissions_employee ON public.employee_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_permissions_menu ON public.employee_permissions(menu_key);

ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

-- Admins podem tudo
CREATE POLICY "Admins manage all permissions"
ON public.employee_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Colaboradores podem ver as próprias
CREATE POLICY "Users view own permissions"
ON public.employee_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_permissions.employee_id
      AND e.user_id = auth.uid()
  )
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_employee_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employee_permissions_updated_at ON public.employee_permissions;
CREATE TRIGGER trg_employee_permissions_updated_at
BEFORE UPDATE ON public.employee_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_employee_permissions_updated_at();

-- Função para checar permissão (usada no front e edge functions)
CREATE OR REPLACE FUNCTION public.has_menu_permission(_user_id UUID, _menu_key TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_id UUID;
  result BOOLEAN := false;
BEGIN
  -- Admin sempre tem acesso
  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;

  SELECT id INTO emp_id FROM public.employees WHERE user_id = _user_id LIMIT 1;
  IF emp_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    CASE _action
      WHEN 'view' THEN can_view
      WHEN 'create' THEN can_create
      WHEN 'edit' THEN can_edit
      WHEN 'delete' THEN can_delete
      ELSE false
    END
  INTO result
  FROM public.employee_permissions
  WHERE employee_id = emp_id AND menu_key = _menu_key
  LIMIT 1;

  RETURN COALESCE(result, false);
END;
$$;