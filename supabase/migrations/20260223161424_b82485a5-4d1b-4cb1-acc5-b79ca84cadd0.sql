
-- Add hotel metadata columns to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS hotel_city text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS hotel_country text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS hotel_address text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS hotel_lat double precision;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS hotel_lng double precision;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS hotel_place_id text;

-- Performance indexes for checkin_tasks
CREATE INDEX IF NOT EXISTS idx_checkin_tasks_sale_id ON public.checkin_tasks(sale_id);
CREATE INDEX IF NOT EXISTS idx_checkin_tasks_status ON public.checkin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_checkin_tasks_departure ON public.checkin_tasks(departure_datetime_utc);

-- Performance indexes for lodging_confirmation_tasks
CREATE INDEX IF NOT EXISTS idx_lodging_tasks_sale_id ON public.lodging_confirmation_tasks(sale_id);
CREATE INDEX IF NOT EXISTS idx_lodging_tasks_status ON public.lodging_confirmation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lodging_tasks_checkin ON public.lodging_confirmation_tasks(hotel_checkin_datetime_utc);
