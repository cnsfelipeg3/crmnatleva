
-- Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  client_type text NOT NULL DEFAULT 'pessoa_fisica',
  phone text,
  email text,
  city text,
  state text,
  country text DEFAULT 'Brasil',
  tags text[] DEFAULT '{}',
  observations text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage clients" ON public.clients FOR ALL TO authenticated USING (true);

-- Create client_notes table
CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client_notes" ON public.client_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage client_notes" ON public.client_notes FOR ALL TO authenticated USING (true);

-- Create client_contacts table
CREATE TABLE public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client_contacts" ON public.client_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage client_contacts" ON public.client_contacts FOR ALL TO authenticated USING (true);

-- Add client_id to sales
ALTER TABLE public.sales ADD COLUMN client_id uuid REFERENCES public.clients(id);

-- Create index for performance
CREATE INDEX idx_sales_client_id ON public.sales(client_id);

-- Create airline_logos cache table
CREATE TABLE public.airline_logos (
  airline_iata text PRIMARY KEY,
  airline_icao text,
  airline_name text,
  logo_url text NOT NULL,
  source text NOT NULL DEFAULT 'FALLBACK',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.airline_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view airline_logos" ON public.airline_logos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage airline_logos" ON public.airline_logos FOR ALL TO authenticated USING (true);
