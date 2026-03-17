
-- Lean persistence for hotel media scrape results
-- One table, JSONB payload, keyed by normalized hotel name

CREATE TABLE public.hotel_media_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_name TEXT NOT NULL,
  hotel_name_normalized TEXT NOT NULL,
  official_domain TEXT,
  domain_confidence SMALLINT DEFAULT 0,
  scrape_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  photos_count INT DEFAULT 0,
  rooms_found INT DEFAULT 0,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique on normalized name to prevent duplicate caches
CREATE UNIQUE INDEX idx_hotel_media_cache_name ON public.hotel_media_cache (hotel_name_normalized);

-- Index for quick lookups
CREATE INDEX idx_hotel_media_cache_domain ON public.hotel_media_cache (official_domain) WHERE official_domain IS NOT NULL;

-- Enable RLS
ALTER TABLE public.hotel_media_cache ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read cache (shared resource)
CREATE POLICY "Authenticated users can read hotel media cache"
  ON public.hotel_media_cache FOR SELECT TO authenticated USING (true);

-- All authenticated users can insert/update cache
CREATE POLICY "Authenticated users can insert hotel media cache"
  ON public.hotel_media_cache FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update hotel media cache"
  ON public.hotel_media_cache FOR UPDATE TO authenticated USING (true);
