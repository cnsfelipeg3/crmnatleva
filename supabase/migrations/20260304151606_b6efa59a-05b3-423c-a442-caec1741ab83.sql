ALTER TABLE public.payment_fee_rules 
  ADD COLUMN holder_type text,
  ADD COLUMN holder_id uuid;

COMMENT ON COLUMN public.payment_fee_rules.holder_type IS 'supplier or client';
COMMENT ON COLUMN public.payment_fee_rules.holder_id IS 'References suppliers.id or clients.id depending on holder_type';