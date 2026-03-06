
CREATE TABLE public.trip_alterations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  created_by uuid,
  alteration_type text NOT NULL DEFAULT 'cancelamento_total',
  product_type text NOT NULL DEFAULT 'aereo',
  status text NOT NULL DEFAULT 'solicitado',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  description text,
  
  -- Financial
  original_value numeric DEFAULT 0,
  penalty_value numeric DEFAULT 0,
  refund_value numeric DEFAULT 0,
  credit_value numeric DEFAULT 0,
  client_refund_value numeric DEFAULT 0,
  
  -- Miles
  miles_program text,
  miles_used integer DEFAULT 0,
  miles_penalty integer DEFAULT 0,
  miles_returned integer DEFAULT 0,
  
  -- Refund details
  refund_method text,
  refund_date date,
  refund_notes text,
  
  -- Segment reference
  segment_id uuid REFERENCES public.flight_segments(id) ON DELETE SET NULL,
  
  -- Metadata
  notes text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_alterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage trip_alterations" ON public.trip_alterations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Attachments for alterations
CREATE TABLE public.trip_alteration_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alteration_id uuid NOT NULL REFERENCES public.trip_alterations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_alteration_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage trip_alteration_attachments" ON public.trip_alteration_attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- History/audit for alterations
CREATE TABLE public.trip_alteration_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alteration_id uuid NOT NULL REFERENCES public.trip_alterations(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_alteration_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage trip_alteration_history" ON public.trip_alteration_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
