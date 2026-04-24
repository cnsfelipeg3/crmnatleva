
ALTER TABLE public.sales_products_backup_2026_04_24 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sales backup"
ON public.sales_products_backup_2026_04_24
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
