
-- Hotel payment cache
CREATE TABLE IF NOT EXISTS public.hotel_payment_cache (
  hotel_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('booking', 'hotelscom')),
  available_modalities TEXT[] NOT NULL DEFAULT '{}',
  has_free_cancellation BOOLEAN NOT NULL DEFAULT false,
  offers_count INT NOT NULL DEFAULT 0,
  raw_offers JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hotel_id, source)
);

CREATE INDEX IF NOT EXISTS ix_hotel_payment_cache_fresh
  ON public.hotel_payment_cache (fetched_at DESC);

CREATE INDEX IF NOT EXISTS ix_hotel_payment_cache_modalities
  ON public.hotel_payment_cache USING GIN (available_modalities);

ALTER TABLE public.hotel_payment_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read hotel cache" ON public.hotel_payment_cache;
CREATE POLICY "Authenticated read hotel cache" ON public.hotel_payment_cache
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role manage hotel cache" ON public.hotel_payment_cache;
CREATE POLICY "Service role manage hotel cache" ON public.hotel_payment_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon read for public proposal pages that may reference cached offers
DROP POLICY IF EXISTS "Anon read hotel cache" ON public.hotel_payment_cache;
CREATE POLICY "Anon read hotel cache" ON public.hotel_payment_cache
  FOR SELECT TO anon USING (true);

-- Proposal items: payment fields
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS payment_modality TEXT,
  ADD COLUMN IF NOT EXISTS payment_label TEXT,
  ADD COLUMN IF NOT EXISTS payment_description TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_label TEXT,
  ADD COLUMN IF NOT EXISTS free_cancellation_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prepayment_amount NUMERIC(10,2);
