
-- Add reservation_code to cost_items for per-product reservation codes
ALTER TABLE public.cost_items ADD COLUMN IF NOT EXISTS reservation_code text;

-- Add product_type to cost_items for better categorization (transfer, trem, seguro, etc)
ALTER TABLE public.cost_items ADD COLUMN IF NOT EXISTS product_type text;

-- Add cost_item_id to attachments for per-item attachment linking
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS cost_item_id uuid REFERENCES public.cost_items(id) ON DELETE SET NULL;

-- Add supplier_id to cost_items
ALTER TABLE public.cost_items ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
