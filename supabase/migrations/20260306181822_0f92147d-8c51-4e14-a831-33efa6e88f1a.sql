
-- Tariff conditions for products in a sale
CREATE TABLE public.tariff_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  cost_item_id UUID REFERENCES public.cost_items(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL DEFAULT 'aereo',
  product_label TEXT,
  fare_name TEXT,
  is_refundable TEXT DEFAULT 'nao_reembolsavel',
  alteration_allowed BOOLEAN DEFAULT false,
  cancellation_allowed BOOLEAN DEFAULT false,
  refund_type TEXT DEFAULT 'nao_reembolsavel',
  penalty_type TEXT DEFAULT 'sem_multa',
  penalty_percent NUMERIC DEFAULT 0,
  penalty_fixed_value NUMERIC DEFAULT 0,
  fare_difference_applies BOOLEAN DEFAULT false,
  penalty_plus_fare_difference BOOLEAN DEFAULT false,
  cancellation_deadline TEXT,
  alteration_deadline TEXT,
  credit_voucher_allowed BOOLEAN DEFAULT false,
  credit_miles_allowed BOOLEAN DEFAULT false,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tariff_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage tariff_conditions"
  ON public.tariff_conditions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
