
CREATE TABLE public.passenger_signup_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT,
  created_by UUID,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_passenger_signup_links_slug ON public.passenger_signup_links(slug);

ALTER TABLE public.passenger_signup_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon all passenger_signup_links"
ON public.passenger_signup_links
FOR ALL
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_passenger_signup_links_updated_at
BEFORE UPDATE ON public.passenger_signup_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.passengers
  ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS signup_link_id UUID REFERENCES public.passenger_signup_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT;
