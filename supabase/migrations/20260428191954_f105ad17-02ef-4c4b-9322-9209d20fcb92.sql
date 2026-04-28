ALTER TABLE public.popular_destinations
  ADD COLUMN IF NOT EXISTS hero_photographer text,
  ADD COLUMN IF NOT EXISTS hero_photographer_url text,
  ADD COLUMN IF NOT EXISTS hero_unsplash_id text,
  ADD COLUMN IF NOT EXISTS hero_fetched_at timestamptz;