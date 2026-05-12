
-- Extend experience_products for Prateleira NatLeva
ALTER TABLE public.experience_products
  ADD COLUMN IF NOT EXISTS product_kind text NOT NULL DEFAULT 'passeio',
  ADD COLUMN IF NOT EXISTS departure_date date,
  ADD COLUMN IF NOT EXISTS return_date date,
  ADD COLUMN IF NOT EXISTS flexible_dates boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_promo numeric,
  ADD COLUMN IF NOT EXISTS price_label text,
  ADD COLUMN IF NOT EXISTS installments_max int,
  ADD COLUMN IF NOT EXISTS installments_no_interest int,
  ADD COLUMN IF NOT EXISTS pix_discount_percent numeric,
  ADD COLUMN IF NOT EXISTS payment_terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_promo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_badge text,
  ADD COLUMN IF NOT EXISTS origin_city text,
  ADD COLUMN IF NOT EXISTS origin_iata text,
  ADD COLUMN IF NOT EXISTS destination_iata text,
  ADD COLUMN IF NOT EXISTS airline text,
  ADD COLUMN IF NOT EXISTS hotel_name text,
  ADD COLUMN IF NOT EXISTS hotel_stars int,
  ADD COLUMN IF NOT EXISTS nights int,
  ADD COLUMN IF NOT EXISTS pax_min int,
  ADD COLUMN IF NOT EXISTS pax_max int,
  ADD COLUMN IF NOT EXISTS seats_total int,
  ADD COLUMN IF NOT EXISTS seats_left int,
  ADD COLUMN IF NOT EXISTS sale_page_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS whatsapp_cta_text text,
  ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_experience_products_kind ON public.experience_products (product_kind);
CREATE INDEX IF NOT EXISTS idx_experience_products_status ON public.experience_products (status);
CREATE INDEX IF NOT EXISTS idx_experience_products_promo ON public.experience_products (is_promo);

-- Leads table for Prateleira
CREATE TABLE IF NOT EXISTS public.prateleira_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.experience_products(id) ON DELETE SET NULL,
  product_slug text,
  product_title text,
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  country_code text DEFAULT 'BR',
  message text,
  ip text,
  device text,
  user_agent text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prateleira_leads_product ON public.prateleira_leads (product_id);
CREATE INDEX IF NOT EXISTS idx_prateleira_leads_created ON public.prateleira_leads (created_at DESC);

ALTER TABLE public.prateleira_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prateleira_leads_all_anon"
ON public.prateleira_leads
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER trg_prateleira_leads_updated_at
BEFORE UPDATE ON public.prateleira_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
