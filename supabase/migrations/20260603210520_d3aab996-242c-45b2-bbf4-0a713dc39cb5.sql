
ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS down_payment NUMERIC,
  ADD COLUMN IF NOT EXISTS down_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS installments_count INTEGER,
  ADD COLUMN IF NOT EXISTS installment_value NUMERIC,
  ADD COLUMN IF NOT EXISTS installments_method TEXT,
  ADD COLUMN IF NOT EXISTS installments_total NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_value NUMERIC,
  ADD COLUMN IF NOT EXISTS net_profit NUMERIC;
