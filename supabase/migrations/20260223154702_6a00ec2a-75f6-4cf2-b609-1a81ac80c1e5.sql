
-- Table: airline_checkin_rules
CREATE TABLE public.airline_checkin_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_iata text NOT NULL UNIQUE,
  airline_name text NOT NULL DEFAULT '',
  default_window_hours integer NOT NULL DEFAULT 48,
  earliest_checkin_hours integer NOT NULL DEFAULT 48,
  latest_checkin_minutes_before_departure integer NOT NULL DEFAULT 60,
  checkin_url text,
  app_deeplink text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.airline_checkin_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view airline_checkin_rules"
  ON public.airline_checkin_rules FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can manage airline_checkin_rules"
  ON public.airline_checkin_rules FOR ALL
  USING (true);

-- Table: checkin_tasks
CREATE TABLE public.checkin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'ida',
  segment_id uuid REFERENCES public.flight_segments(id) ON DELETE SET NULL,
  departure_datetime_utc timestamptz,
  checkin_open_datetime_utc timestamptz,
  checkin_due_datetime_utc timestamptz,
  status text NOT NULL DEFAULT 'PENDENTE',
  priority_score integer NOT NULL DEFAULT 0,
  assigned_to_user_id uuid,
  created_by text NOT NULL DEFAULT 'SYSTEM',
  last_notified_at timestamptz,
  notes text,
  seat_info text,
  evidence_attachment_ids uuid[] DEFAULT '{}',
  completed_at timestamptz,
  completed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkin_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view checkin_tasks"
  ON public.checkin_tasks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can manage checkin_tasks"
  ON public.checkin_tasks FOR ALL
  USING (true);

-- Indexes for performance
CREATE INDEX idx_checkin_tasks_sale_id ON public.checkin_tasks(sale_id);
CREATE INDEX idx_checkin_tasks_status ON public.checkin_tasks(status);
CREATE INDEX idx_checkin_tasks_departure ON public.checkin_tasks(departure_datetime_utc);
CREATE INDEX idx_checkin_tasks_direction_sale ON public.checkin_tasks(sale_id, direction);
