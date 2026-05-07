
CREATE TABLE public.checkin_boarding_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkin_task_id UUID NOT NULL REFERENCES public.checkin_tasks(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.passengers(id) ON DELETE CASCADE,
  label TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkin_bp_task ON public.checkin_boarding_passes(checkin_task_id);
CREATE INDEX idx_checkin_bp_pax ON public.checkin_boarding_passes(passenger_id);

ALTER TABLE public.checkin_boarding_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_boarding_passes_all" ON public.checkin_boarding_passes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_checkin_bp_updated_at
  BEFORE UPDATE ON public.checkin_boarding_passes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
