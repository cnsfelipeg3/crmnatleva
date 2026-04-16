
-- Add address and qualification fields to suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_name TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_phone TEXT,
  ADD COLUMN IF NOT EXISTS registration_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Create index on registration_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_registration_token ON public.suppliers(registration_token);

-- Policy: allow public read by token (for the registration form)
CREATE POLICY "Public can read supplier by registration token"
  ON public.suppliers
  FOR SELECT
  TO anon
  USING (registration_token IS NOT NULL);

-- Policy: allow public update by token (supplier self-registration)
CREATE POLICY "Public can update supplier via registration token"
  ON public.suppliers
  FOR UPDATE
  TO anon
  USING (registration_token IS NOT NULL)
  WITH CHECK (registration_token IS NOT NULL);
