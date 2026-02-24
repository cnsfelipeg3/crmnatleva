
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS rg text;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'SILVER';
