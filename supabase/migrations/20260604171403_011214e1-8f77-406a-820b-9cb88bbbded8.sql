ALTER TABLE public.prateleira_orders
  ADD COLUMN IF NOT EXISTS pax integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price_cents integer,
  ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prateleira_orders_sale ON public.prateleira_orders(sale_id);

DROP POLICY IF EXISTS "prateleira_orders_select_authenticated" ON public.prateleira_orders;

CREATE POLICY "prateleira_orders_select_internal"
  ON public.prateleira_orders
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));
