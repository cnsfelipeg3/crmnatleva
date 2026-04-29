CREATE TABLE IF NOT EXISTS public.concierge_places_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_normalized text NOT NULL,
  city_context text,
  place_id text,
  name text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  rating numeric,
  user_ratings_total integer,
  photo_reference text,
  types text[],
  price_level integer,
  business_status text,
  opening_hours jsonb,
  google_maps_url text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(query_normalized, city_context)
);

CREATE INDEX IF NOT EXISTS idx_concierge_places_cache_lookup
  ON public.concierge_places_cache(query_normalized, city_context, fetched_at);

ALTER TABLE public.concierge_places_cache ENABLE ROW LEVEL SECURITY;

DO $mig$ BEGIN
  CREATE POLICY "concierge_places_select_authenticated"
    ON public.concierge_places_cache FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $mig$;