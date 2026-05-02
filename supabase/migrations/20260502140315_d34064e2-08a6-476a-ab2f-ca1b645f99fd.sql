CREATE TABLE IF NOT EXISTS public.external_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NULL,
  notes TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_external_sellers_active ON public.external_sellers (active, name) WHERE active = true;

ALTER TABLE public.external_sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_es" ON public.external_sellers;
CREATE POLICY "auth_read_es" ON public.external_sellers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_es" ON public.external_sellers;
CREATE POLICY "auth_insert_es" ON public.external_sellers FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "auth_update_es" ON public.external_sellers;
CREATE POLICY "auth_update_es" ON public.external_sellers FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS external_seller_id UUID NULL
  REFERENCES public.external_sellers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_external_seller ON public.sales (external_seller_id) WHERE external_seller_id IS NOT NULL;

INSERT INTO public.external_sellers (name, notes, active)
SELECT 'Gustavo Machado', 'Ex-funcionário NatLeva. Histórico mantido.', false
WHERE NOT EXISTS (SELECT 1 FROM public.external_sellers WHERE name = 'Gustavo Machado');