
-- Travel budget categories for the client's personal finance tracking
CREATE TABLE public.portal_travel_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  total_budget NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  exchange_rate NUMERIC DEFAULT 1,
  foreign_currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Budget categories (alimentação, transporte, compras, etc.)
CREATE TABLE public.portal_budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.portal_travel_budgets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  planned_amount NUMERIC DEFAULT 0,
  icon TEXT DEFAULT 'circle',
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual expenses registered by the client
CREATE TABLE public.portal_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.portal_travel_budgets(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.portal_budget_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  converted_amount NUMERIC,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cartao_credito',
  card_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cash tracking (dinheiro em espécie)
CREATE TABLE public.portal_cash_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.portal_travel_budgets(id) ON DELETE CASCADE NOT NULL,
  initial_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cards used during travel
CREATE TABLE public.portal_travel_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.portal_travel_budgets(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT NOT NULL,
  brand TEXT DEFAULT 'visa',
  last_digits TEXT,
  card_type TEXT DEFAULT 'credito',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for expense card reference
ALTER TABLE public.portal_expenses
  ADD CONSTRAINT portal_expenses_card_id_fkey
  FOREIGN KEY (card_id) REFERENCES public.portal_travel_cards(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.portal_travel_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_cash_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_travel_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can manage portal_travel_budgets" ON public.portal_travel_budgets FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage portal_budget_categories" ON public.portal_budget_categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage portal_expenses" ON public.portal_expenses FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage portal_cash_tracking" ON public.portal_cash_tracking FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage portal_travel_cards" ON public.portal_travel_cards FOR ALL TO public USING (true) WITH CHECK (true);
