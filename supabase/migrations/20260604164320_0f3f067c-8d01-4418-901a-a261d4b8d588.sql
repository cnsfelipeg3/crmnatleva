CREATE TABLE IF NOT EXISTS public.prateleira_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.experience_products(id) ON DELETE SET NULL,
  product_slug text,
  product_title text,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  amount_cents integer NOT NULL,
  paid_amount_cents integer,
  currency text NOT NULL DEFAULT 'BRL',
  payment_intent text,
  is_entry_only boolean NOT NULL DEFAULT false,
  balance_cents integer,
  installments integer,
  capture_method text,
  invoice_slug text,
  transaction_nsu text,
  receipt_url text,
  checkout_url text,
  webhook_token text NOT NULL DEFAULT replace(gen_random_uuid()::text,'-',''),
  source text NOT NULL DEFAULT 'catalogo_publico',
  affiliate_ref text,
  commission_cents integer,
  status text NOT NULL DEFAULT 'pending',
  raw_webhook jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prateleira_orders_status ON public.prateleira_orders(status);
CREATE INDEX IF NOT EXISTS idx_prateleira_orders_product ON public.prateleira_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_prateleira_orders_created ON public.prateleira_orders(created_at DESC);

GRANT SELECT ON public.prateleira_orders TO authenticated;
GRANT ALL ON public.prateleira_orders TO service_role;

ALTER TABLE public.prateleira_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prateleira_orders_select_authenticated"
  ON public.prateleira_orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_prateleira_orders_updated_at
  BEFORE UPDATE ON public.prateleira_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();