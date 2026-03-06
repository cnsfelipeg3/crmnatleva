
-- Supplier settlements (fechamentos)
CREATE TABLE public.supplier_settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_due_date DATE NOT NULL,
  total_value NUMERIC NOT NULL DEFAULT 0,
  supplier_invoice_value NUMERIC,
  difference_value NUMERIC GENERATED ALWAYS AS (COALESCE(supplier_invoice_value, total_value) - total_value) STORED,
  emission_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto',
  payment_date DATE,
  payment_method TEXT,
  payment_account TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage supplier_settlements" ON public.supplier_settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Settlement items (individual emissions)
CREATE TABLE public.supplier_settlement_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_id UUID NOT NULL REFERENCES public.supplier_settlements(id) ON DELETE CASCADE,
  cost_item_id UUID REFERENCES public.cost_items(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  emission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_name TEXT,
  product_description TEXT,
  miles_program TEXT,
  miles_quantity INTEGER DEFAULT 0,
  miles_price_per_thousand NUMERIC DEFAULT 0,
  emission_value NUMERIC NOT NULL DEFAULT 0,
  emission_source TEXT,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  card_installments INTEGER,
  card_invoice_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_settlement_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage supplier_settlement_items" ON public.supplier_settlement_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
