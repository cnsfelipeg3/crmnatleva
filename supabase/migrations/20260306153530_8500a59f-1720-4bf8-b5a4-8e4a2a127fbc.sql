ALTER TABLE public.sale_payments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pago';
ALTER TABLE public.sale_payments ADD COLUMN IF NOT EXISTS due_date date;