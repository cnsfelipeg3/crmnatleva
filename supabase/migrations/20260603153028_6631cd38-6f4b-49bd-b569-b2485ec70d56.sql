
-- 1. Extend affiliates table
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_key_type text CHECK (pix_key_type IN ('cpf','cnpj','email','phone','random')),
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS total_earned numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ref_code text;

-- Generate ref_code for existing rows where null
UPDATE public.affiliates
SET ref_code = lower(substr(replace(id::text, '-', ''), 1, 8))
WHERE ref_code IS NULL;

-- Make ref_code unique and not-null going forward
ALTER TABLE public.affiliates
  ALTER COLUMN ref_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_ref_code_key ON public.affiliates(ref_code);

-- 2. affiliate_referrals
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  ref_code text NOT NULL,
  product_id uuid REFERENCES public.experience_products(id) ON DELETE SET NULL,
  product_slug text,
  visitor_ip text,
  user_agent text,
  source_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  lead_name text,
  lead_phone text,
  lead_email text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  converted_at timestamptz,
  status text NOT NULL DEFAULT 'click' CHECK (status IN ('click','lead','negotiating','converted','lost')),
  estimated_commission numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate ON public.affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON public.affiliate_referrals(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_sale ON public.affiliate_referrals(sale_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_created ON public.affiliate_referrals(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_referrals TO authenticated;
GRANT SELECT, INSERT ON public.affiliate_referrals TO anon;
GRANT ALL ON public.affiliate_referrals TO service_role;

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate sees own referrals"
  ON public.affiliate_referrals FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Public can insert referral click"
  ON public.affiliate_referrals FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admin updates referrals"
  ON public.affiliate_referrals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin deletes referrals"
  ON public.affiliate_referrals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_affiliate_referrals_updated_at
  BEFORE UPDATE ON public.affiliate_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. affiliate_commissions
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.affiliate_referrals(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.experience_products(id) ON DELETE SET NULL,
  sale_value numeric NOT NULL DEFAULT 0,
  commission_percent numeric NOT NULL DEFAULT 0,
  commission_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','available','paid','canceled')),
  available_at timestamptz,
  paid_at timestamptz,
  payment_method text,
  payment_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON public.affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_sale ON public.affiliate_commissions(sale_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_created ON public.affiliate_commissions(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate sees own commissions"
  ON public.affiliate_commissions FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin inserts commissions"
  ON public.affiliate_commissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin updates commissions"
  ON public.affiliate_commissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin deletes commissions"
  ON public.affiliate_commissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_affiliate_commissions_updated_at
  BEFORE UPDATE ON public.affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
