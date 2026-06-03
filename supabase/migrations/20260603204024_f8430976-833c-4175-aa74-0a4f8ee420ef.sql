ALTER TABLE public.affiliates DROP CONSTRAINT IF EXISTS affiliates_user_id_fkey;
ALTER TABLE public.affiliates DROP CONSTRAINT IF EXISTS affiliates_user_id_key;
ALTER TABLE public.affiliates ALTER COLUMN user_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS affiliates_user_id_unique_notnull ON public.affiliates (user_id) WHERE user_id IS NOT NULL;