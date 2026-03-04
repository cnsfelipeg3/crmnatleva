
CREATE TABLE public.supplier_miles_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  program_name text NOT NULL,
  price_per_thousand numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, program_name)
);

ALTER TABLE public.supplier_miles_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage supplier_miles_programs"
  ON public.supplier_miles_programs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
