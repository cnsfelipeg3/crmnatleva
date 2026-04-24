-- Função utilitária (caso ainda não exista)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1) Catálogo
CREATE TABLE IF NOT EXISTS public.product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon_name TEXT,
  icon_color TEXT,
  category TEXT,
  is_composite BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_types_select_all_authenticated"
  ON public.product_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_types_insert_admin"
  ON public.product_types FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "product_types_update_admin"
  ON public.product_types FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "product_types_delete_admin"
  ON public.product_types FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_product_types_updated_at
  BEFORE UPDATE ON public.product_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Backup
CREATE TABLE IF NOT EXISTS public.sales_products_backup_2026_04_24 AS
SELECT id AS sale_id, products AS products_original, now() AS backed_up_at
FROM public.sales;

ALTER TABLE public.sales_products_backup_2026_04_24 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_products_backup_admin_only"
  ON public.sales_products_backup_2026_04_24 FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));