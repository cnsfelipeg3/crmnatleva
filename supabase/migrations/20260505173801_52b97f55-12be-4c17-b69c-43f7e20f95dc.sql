
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS passport_photo_url text;

CREATE TABLE IF NOT EXISTS public.passenger_signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text,
  user_agent text,
  slug text,
  status text NOT NULL,
  error text,
  payload_email text,
  payload_cpf text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psa_ip_created ON public.passenger_signup_attempts(ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psa_created ON public.passenger_signup_attempts(created_at DESC);

CREATE TABLE IF NOT EXISTS public.passenger_signup_blocked_ips (
  ip text PRIMARY KEY,
  reason text,
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.passenger_signup_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_signup_blocked_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read attempts" ON public.passenger_signup_attempts;
CREATE POLICY "admin read attempts" ON public.passenger_signup_attempts FOR SELECT USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin all blocked" ON public.passenger_signup_blocked_ips;
CREATE POLICY "admin all blocked" ON public.passenger_signup_blocked_ips FOR ALL USING (public.has_role(auth.uid(),'admin'));
