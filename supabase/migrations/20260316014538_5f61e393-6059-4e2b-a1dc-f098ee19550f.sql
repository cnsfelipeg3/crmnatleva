
CREATE TABLE public.client_trip_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  trip_destination text NOT NULL,
  trip_subdestinations text[] DEFAULT '{}',
  trip_dates text,
  passengers integer,
  conversation_period text,
  trip_status text NOT NULL DEFAULT 'cotacao_solicitada',
  proposal_id uuid,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  confidence_score text DEFAULT 'media',
  source_summary text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_trip_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage trip memory"
  ON public.client_trip_memory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_trip_memory_client ON public.client_trip_memory(client_id);
CREATE INDEX idx_trip_memory_status ON public.client_trip_memory(trip_status);
