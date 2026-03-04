
-- Drop the unique constraint on supplier_id + program_name since now we have multiple tiers per program
ALTER TABLE public.supplier_miles_programs DROP CONSTRAINT IF EXISTS supplier_miles_programs_supplier_id_program_name_key;

-- Add range columns
ALTER TABLE public.supplier_miles_programs
  ADD COLUMN min_miles integer NOT NULL DEFAULT 0,
  ADD COLUMN max_miles integer;

-- Add new unique constraint: supplier + program + min_miles
ALTER TABLE public.supplier_miles_programs
  ADD CONSTRAINT supplier_miles_programs_supplier_program_range_key UNIQUE(supplier_id, program_name, min_miles);
