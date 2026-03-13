
CREATE TABLE public.portal_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  portal_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  origin_city TEXT,
  origin_iata TEXT,
  destination_city TEXT,
  destination_iata TEXT,
  departure_date DATE,
  return_date DATE,
  trip_type TEXT DEFAULT 'roundtrip',
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  cabin_class TEXT DEFAULT 'economy',
  hotel_needed BOOLEAN DEFAULT false,
  hotel_preferences TEXT,
  transfer_needed BOOLEAN DEFAULT false,
  insurance_needed BOOLEAN DEFAULT false,
  flexible_dates BOOLEAN DEFAULT false,
  budget_range TEXT,
  special_requests TEXT,
  traveler_names JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_quote_requests ENABLE ROW LEVEL SECURITY;

-- Portal users can insert and view their own
CREATE POLICY "Portal users can insert own quotes"
  ON public.portal_quote_requests FOR INSERT TO authenticated
  WITH CHECK (portal_user_id = auth.uid());

CREATE POLICY "Portal users can view own quotes"
  ON public.portal_quote_requests FOR SELECT TO authenticated
  USING (portal_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "CRM users can update quotes"
  ON public.portal_quote_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));
