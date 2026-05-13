
CREATE TABLE IF NOT EXISTS public.prateleira_product_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.experience_products(id) ON DELETE CASCADE,
  product_slug TEXT,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  country_code TEXT,
  device_type TEXT,
  user_agent TEXT,
  ip_address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  total_views INTEGER NOT NULL DEFAULT 1,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicked BOOLEAN NOT NULL DEFAULT false,
  cta_clicked BOOLEAN NOT NULL DEFAULT false,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, email)
);

CREATE INDEX IF NOT EXISTS idx_prateleira_viewers_product ON public.prateleira_product_viewers(product_id, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_prateleira_viewers_slug ON public.prateleira_product_viewers(product_slug);

ALTER TABLE public.prateleira_product_viewers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert prateleira viewers" ON public.prateleira_product_viewers;
CREATE POLICY "Public can insert prateleira viewers"
  ON public.prateleira_product_viewers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update own prateleira viewer row" ON public.prateleira_product_viewers;
CREATE POLICY "Public can update own prateleira viewer row"
  ON public.prateleira_product_viewers FOR UPDATE
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read prateleira viewers" ON public.prateleira_product_viewers;
CREATE POLICY "Authenticated users can read prateleira viewers"
  ON public.prateleira_product_viewers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS trg_prateleira_viewers_updated_at ON public.prateleira_product_viewers;
CREATE TRIGGER trg_prateleira_viewers_updated_at
  BEFORE UPDATE ON public.prateleira_product_viewers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
