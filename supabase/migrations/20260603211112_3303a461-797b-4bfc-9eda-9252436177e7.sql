ALTER TABLE public.affiliate_referrals
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS time_on_page_seconds integer;

CREATE INDEX IF NOT EXISTS idx_aff_ref_affiliate_created ON public.affiliate_referrals(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_ref_product ON public.affiliate_referrals(product_id);
CREATE INDEX IF NOT EXISTS idx_aff_ref_session ON public.affiliate_referrals(session_id);