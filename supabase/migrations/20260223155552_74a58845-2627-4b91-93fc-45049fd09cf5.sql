
-- Add hotel check-in/check-out date fields to sales (non-breaking, nullable)
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS hotel_checkin_date date,
  ADD COLUMN IF NOT EXISTS hotel_checkout_date date;

-- Table: lodging_confirmation_tasks
CREATE TABLE public.lodging_confirmation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  hotel_name text,
  hotel_reservation_code text,
  hotel_checkin_datetime_utc timestamptz,
  milestone text NOT NULL DEFAULT 'D14',
  scheduled_at_utc timestamptz,
  status text NOT NULL DEFAULT 'PENDENTE',
  urgency_level text NOT NULL DEFAULT 'LOW',
  assigned_to_user_id uuid,
  created_by text NOT NULL DEFAULT 'SYSTEM',
  last_notified_at timestamptz,
  contact_method text,
  contact_details text,
  notes text,
  evidence_attachment_ids uuid[] DEFAULT '{}',
  confirmed_at timestamptz,
  confirmed_by_user_id uuid,
  issue_type text,
  issue_resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lodging_confirmation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lodging_confirmation_tasks"
  ON public.lodging_confirmation_tasks FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage lodging_confirmation_tasks"
  ON public.lodging_confirmation_tasks FOR ALL USING (true);

CREATE INDEX idx_lodging_tasks_sale_id ON public.lodging_confirmation_tasks(sale_id);
CREATE INDEX idx_lodging_tasks_status ON public.lodging_confirmation_tasks(status);
CREATE INDEX idx_lodging_tasks_milestone ON public.lodging_confirmation_tasks(milestone);
CREATE INDEX idx_lodging_tasks_scheduled ON public.lodging_confirmation_tasks(scheduled_at_utc);
CREATE INDEX idx_lodging_tasks_sale_milestone ON public.lodging_confirmation_tasks(sale_id, milestone);

-- Table: hotel_contact_directory
CREATE TABLE public.hotel_contact_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_name_normalized text NOT NULL,
  emails text[] DEFAULT '{}',
  phones text[] DEFAULT '{}',
  whatsapp text[] DEFAULT '{}',
  reservation_portal_url text,
  notes text,
  preferred_language text DEFAULT 'PT',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_contact_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view hotel_contact_directory"
  ON public.hotel_contact_directory FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage hotel_contact_directory"
  ON public.hotel_contact_directory FOR ALL USING (true);
