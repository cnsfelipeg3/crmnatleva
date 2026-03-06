
ALTER TABLE public.trip_alterations 
  ADD COLUMN IF NOT EXISTS pix_receiver_name text,
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_key_type text,
  ADD COLUMN IF NOT EXISTS pix_bank text,
  ADD COLUMN IF NOT EXISTS supplier_refund_origin text,
  ADD COLUMN IF NOT EXISTS supplier_refund_method text,
  ADD COLUMN IF NOT EXISTS supplier_refund_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_refund_date date,
  ADD COLUMN IF NOT EXISTS supplier_refund_status text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS supplier_settlement_ref text,
  ADD COLUMN IF NOT EXISTS product_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agency_profit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_impact numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status text DEFAULT 'programado',
  ADD COLUMN IF NOT EXISTS affected_passengers text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cost_item_id uuid REFERENCES public.cost_items(id);
