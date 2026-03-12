
-- Portal access table (links auth user to client)
CREATE TABLE public.portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  first_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(client_id)
);

ALTER TABLE public.portal_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_access_own_select" ON public.portal_access
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "portal_access_own_update" ON public.portal_access
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "portal_access_crm_all" ON public.portal_access
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

-- Helper function (after table exists)
CREATE OR REPLACE FUNCTION public.get_portal_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.portal_access
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Portal published sales table
CREATE TABLE public.portal_published_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  published_by uuid,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  cover_image_url text,
  custom_title text,
  notes_for_client text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sale_id)
);

ALTER TABLE public.portal_published_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_pub_select" ON public.portal_published_sales
  FOR SELECT TO authenticated
  USING (
    client_id = public.get_portal_client_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "portal_pub_crm_insert" ON public.portal_published_sales
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "portal_pub_crm_update" ON public.portal_published_sales
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "portal_pub_crm_delete" ON public.portal_published_sales
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

-- Update handle_new_user to skip portal users
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE((NEW.raw_user_meta_data->>'is_portal_user')::boolean, false) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor');
  RETURN NEW;
END;
$$;
