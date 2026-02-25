
CREATE TABLE public.user_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  city text NOT NULL,
  state text,
  country text DEFAULT 'Brasil',
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own location
CREATE POLICY "Users can upsert own location" ON public.user_locations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admins/gestors can view all locations
CREATE POLICY "Admins can view all locations" ON public.user_locations
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)
  );
