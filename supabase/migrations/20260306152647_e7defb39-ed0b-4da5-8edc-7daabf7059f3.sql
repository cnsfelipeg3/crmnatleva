
-- Table for receiving accounts (bank accounts, pix keys, crypto wallets)
CREATE TABLE public.receiving_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_type text NOT NULL DEFAULT 'pix',
  bank_name text,
  pix_key text,
  pix_key_type text,
  agency text,
  account_number text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receiving_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage receiving_accounts" ON public.receiving_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Table for individual sale payments (multi-payment support)
CREATE TABLE public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method text NOT NULL DEFAULT 'pix',
  gateway text,
  installments integer DEFAULT 1,
  gross_value numeric NOT NULL DEFAULT 0,
  fee_percent numeric DEFAULT 0,
  fee_fixed numeric DEFAULT 0,
  fee_total numeric DEFAULT 0,
  net_value numeric NOT NULL DEFAULT 0,
  receiving_account_id uuid REFERENCES public.receiving_accounts(id),
  payment_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage sale_payments" ON public.sale_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
