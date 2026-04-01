
-- Quotation briefings table: stores structured briefing data from ATLAS escalation
CREATE TABLE public.quotation_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  urgency TEXT NOT NULL DEFAULT 'media',
  
  -- Lead info
  lead_name TEXT NOT NULL,
  lead_phone TEXT,
  lead_origin TEXT,
  lead_score INTEGER DEFAULT 0,
  
  -- Trip details
  destination TEXT,
  departure_date TEXT,
  return_date TEXT,
  duration_days INTEGER,
  flexible_dates BOOLEAN DEFAULT false,
  trip_motivation TEXT,
  
  -- Group composition
  total_people INTEGER DEFAULT 1,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  children_ages TEXT[],
  group_details TEXT,
  
  -- Accommodation
  hotel_preference TEXT,
  hotel_stars TEXT,
  hotel_needs TEXT[],
  hotel_location TEXT,
  hotel_notes TEXT,
  
  -- Transport
  departure_airport TEXT,
  flight_preference TEXT,
  cabin_class TEXT,
  preferred_airline TEXT,
  rental_car BOOLEAN DEFAULT false,
  transfer_needed BOOLEAN DEFAULT false,
  transport_notes TEXT,
  
  -- Experiences
  must_have_experiences TEXT[],
  desired_experiences TEXT[],
  travel_pace TEXT,
  experience_notes TEXT,
  
  -- Budget
  budget_range TEXT,
  budget_behavioral_reading TEXT,
  price_sensitivity TEXT DEFAULT 'media',
  
  -- Lead profile (AI-generated)
  lead_type TEXT,
  lead_sentiment TEXT,
  lead_urgency TEXT DEFAULT 'media',
  travel_experience TEXT,
  behavioral_notes TEXT,
  
  -- AI-generated summaries
  conversation_summary TEXT,
  ai_recommendation TEXT,
  next_steps TEXT,
  
  -- Return-to-AI flow
  return_to_ai_reason TEXT,
  returned_at TIMESTAMPTZ,
  updated_fields TEXT[],
  
  -- Metadata
  created_by TEXT DEFAULT 'atlas',
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.quotation_briefings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can view briefings"
  ON public.quotation_briefings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert briefings"
  ON public.quotation_briefings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update briefings"
  ON public.quotation_briefings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotation_briefings;
