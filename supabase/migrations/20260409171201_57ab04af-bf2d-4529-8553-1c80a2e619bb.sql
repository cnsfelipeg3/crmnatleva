
ALTER TABLE public.cost_items ADD COLUMN IF NOT EXISTS card_info TEXT;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS email TEXT;
