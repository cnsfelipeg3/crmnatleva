
-- Add role column to sale_passengers
ALTER TABLE public.sale_passengers 
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'acompanhante',
  ADD COLUMN IF NOT EXISTS observations text;

-- Add payer_passenger_id to sales
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS payer_passenger_id uuid REFERENCES public.passengers(id);
