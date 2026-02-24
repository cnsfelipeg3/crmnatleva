
-- Suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text,
  contact_name text,
  phone text,
  email text,
  category text DEFAULT 'geral',
  payment_conditions text,
  bank_name text,
  bank_agency text,
  bank_account text,
  bank_pix_key text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Chart of accounts
CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('receita','despesa')),
  parent_id uuid REFERENCES public.chart_of_accounts(id),
  code text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage chart_of_accounts" ON public.chart_of_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Accounts receivable
CREATE TABLE public.accounts_receivable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  client_id uuid REFERENCES public.clients(id),
  seller_id uuid,
  description text,
  gross_value numeric NOT NULL DEFAULT 0,
  fee_percent numeric DEFAULT 0,
  fee_value numeric DEFAULT 0,
  net_value numeric NOT NULL DEFAULT 0,
  due_date date,
  received_date date,
  payment_method text,
  installment_number integer DEFAULT 1,
  installment_total integer DEFAULT 1,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','recebido','atrasado','cancelado')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage accounts_receivable" ON public.accounts_receivable FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Accounts payable
CREATE TABLE public.accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  cost_item_id uuid REFERENCES public.cost_items(id),
  category_id uuid REFERENCES public.chart_of_accounts(id),
  description text,
  value numeric NOT NULL DEFAULT 0,
  due_date date,
  paid_date date,
  payment_method text,
  installment_number integer DEFAULT 1,
  installment_total integer DEFAULT 1,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','pago','atrasado','cancelado')),
  is_recurring boolean DEFAULT false,
  recurrence_interval text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage accounts_payable" ON public.accounts_payable FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Credit cards
CREATE TABLE public.credit_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text NOT NULL,
  bank text,
  last_digits text,
  card_type text DEFAULT 'fisico',
  credit_limit numeric DEFAULT 0,
  closing_day integer DEFAULT 1,
  due_day integer DEFAULT 10,
  default_fee_percent numeric DEFAULT 0,
  responsible text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage credit_cards" ON public.credit_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Credit card items (transactions on a card)
CREATE TABLE public.credit_card_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id uuid REFERENCES public.credit_cards(id) NOT NULL,
  description text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  value numeric NOT NULL DEFAULT 0,
  installment_number integer DEFAULT 1,
  installment_total integer DEFAULT 1,
  category_id uuid REFERENCES public.chart_of_accounts(id),
  sale_id uuid REFERENCES public.sales(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  is_refund boolean DEFAULT false,
  status text DEFAULT 'aberto',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_card_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage credit_card_items" ON public.credit_card_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payment fee rules
CREATE TABLE public.payment_fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method text NOT NULL,
  installments integer DEFAULT 1,
  fee_percent numeric NOT NULL DEFAULT 0,
  fee_fixed numeric DEFAULT 0,
  acquirer text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_fee_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage payment_fee_rules" ON public.payment_fee_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Commission rules
CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid,
  product_type text,
  commission_type text NOT NULL DEFAULT 'percentual' CHECK (commission_type IN ('fixa','percentual','margem')),
  commission_value numeric NOT NULL DEFAULT 0,
  min_margin_percent numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage commission_rules" ON public.commission_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed chart of accounts
INSERT INTO public.chart_of_accounts (name, type, code) VALUES
  ('Aéreo', 'receita', 'R01'),
  ('Hotel', 'receita', 'R02'),
  ('Seguro Viagem', 'receita', 'R03'),
  ('Passeios', 'receita', 'R04'),
  ('Pacotes', 'receita', 'R05'),
  ('Consultoria', 'receita', 'R06'),
  ('Outros Receitas', 'receita', 'R99'),
  ('Operacional', 'despesa', 'D01'),
  ('Marketing', 'despesa', 'D02'),
  ('Ferramentas', 'despesa', 'D03'),
  ('Impostos', 'despesa', 'D04'),
  ('Comissões', 'despesa', 'D05'),
  ('Fornecedores', 'despesa', 'D06'),
  ('Estrutura', 'despesa', 'D07'),
  ('Outros Despesas', 'despesa', 'D99');
