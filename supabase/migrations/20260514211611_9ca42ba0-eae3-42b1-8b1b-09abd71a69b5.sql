ALTER TABLE public.experience_products
  ADD COLUMN IF NOT EXISTS pax_adults integer,
  ADD COLUMN IF NOT EXISTS pax_children integer;