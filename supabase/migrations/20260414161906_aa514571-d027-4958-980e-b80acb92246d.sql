
CREATE TABLE IF NOT EXISTS public.checkin_passenger_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_task_id UUID NOT NULL REFERENCES checkin_tasks(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  seat TEXT DEFAULT NULL,
  boarding_pass_url TEXT DEFAULT NULL,
  boarding_pass_file_name TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(checkin_task_id, passenger_id)
);

ALTER TABLE public.checkin_passenger_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to checkin_passenger_details"
  ON public.checkin_passenger_details FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX idx_checkin_passenger_details_task ON public.checkin_passenger_details(checkin_task_id);
CREATE INDEX idx_checkin_passenger_details_passenger ON public.checkin_passenger_details(passenger_id);
