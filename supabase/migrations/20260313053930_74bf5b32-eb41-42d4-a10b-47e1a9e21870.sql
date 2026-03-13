
CREATE TABLE public.client_travel_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  seat_preference text DEFAULT 'Indiferente',
  meal_preference text DEFAULT 'Sem restrição',
  cabin_class text DEFAULT 'Econômica',
  hotel_category text DEFAULT 'Conforto',
  trip_style text DEFAULT 'Lazer',
  travel_pace text DEFAULT 'Moderado',
  special_needs text,
  loyalty_programs text[] DEFAULT '{}',
  preferred_airlines text[] DEFAULT '{}',
  preferred_hotel_chains text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.client_travel_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage client_travel_preferences"
  ON public.client_travel_preferences
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
