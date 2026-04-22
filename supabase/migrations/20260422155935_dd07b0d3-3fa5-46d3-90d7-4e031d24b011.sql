ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS passengers_adults INTEGER,
  ADD COLUMN IF NOT EXISTS passengers_children INTEGER,
  ADD COLUMN IF NOT EXISTS children_ages INTEGER[];