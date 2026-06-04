ALTER TABLE public.prateleira_orders
  ADD COLUMN IF NOT EXISTS buyer_address jsonb,
  ADD COLUMN IF NOT EXISTS passengers jsonb,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_accepted_ip text,
  ADD COLUMN IF NOT EXISTS checkout_step text NOT NULL DEFAULT 'resumo';