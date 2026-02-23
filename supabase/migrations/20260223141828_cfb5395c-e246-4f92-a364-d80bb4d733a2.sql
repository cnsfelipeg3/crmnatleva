
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'vendedor', 'operacional', 'financeiro', 'leitura');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'vendedor',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Passengers
CREATE TABLE public.passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  passport_number TEXT,
  passport_expiry DATE,
  phone TEXT,
  address_cep TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_country TEXT DEFAULT 'Brasil',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view passengers" ON public.passengers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert passengers" ON public.passengers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update passengers" ON public.passengers FOR UPDATE TO authenticated USING (true);

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  seller_id UUID REFERENCES auth.users(id),
  close_date DATE,
  status TEXT NOT NULL DEFAULT 'Rascunho',
  payment_method TEXT,
  products TEXT[] DEFAULT '{}',
  observations TEXT,
  tag_chatguru TEXT,
  link_chat TEXT,
  origin_city TEXT,
  origin_iata TEXT,
  destination_city TEXT,
  destination_iata TEXT,
  departure_date DATE,
  return_date DATE,
  is_international BOOLEAN DEFAULT false,
  airline TEXT,
  flight_class TEXT,
  connections TEXT[] DEFAULT '{}',
  locators TEXT[] DEFAULT '{}',
  other_codes TEXT[] DEFAULT '{}',
  emission_status TEXT,
  emission_date DATE,
  emission_source TEXT,
  miles_program TEXT,
  hotel_name TEXT,
  hotel_room TEXT,
  hotel_meal_plan TEXT,
  hotel_reservation_code TEXT,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  children_ages INTEGER[] DEFAULT '{}',
  received_value NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  profit NUMERIC(12,2) DEFAULT 0,
  margin NUMERIC(5,2) DEFAULT 0,
  score INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sales" ON public.sales FOR UPDATE TO authenticated USING (true);

-- Sale passengers junction
CREATE TABLE public.sale_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  passenger_id UUID REFERENCES public.passengers(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(sale_id, passenger_id)
);
ALTER TABLE public.sale_passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage sale_passengers" ON public.sale_passengers FOR ALL TO authenticated USING (true);

-- Flight segments
CREATE TABLE public.flight_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('ida', 'volta')),
  segment_order INTEGER NOT NULL DEFAULT 1,
  airline TEXT,
  flight_number TEXT,
  origin_iata TEXT NOT NULL,
  destination_iata TEXT NOT NULL,
  departure_date DATE,
  departure_time TIME,
  arrival_time TIME,
  duration_minutes INTEGER,
  flight_class TEXT,
  cabin_type TEXT,
  operated_by TEXT,
  connection_time_minutes INTEGER,
  terminal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flight_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage flight_segments" ON public.flight_segments FOR ALL TO authenticated USING (true);

-- Cost items
CREATE TABLE public.cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('aereo', 'hotel', 'outro')),
  description TEXT,
  cash_value NUMERIC(12,2) DEFAULT 0,
  miles_quantity INTEGER DEFAULT 0,
  miles_price_per_thousand NUMERIC(8,2) DEFAULT 0,
  taxes NUMERIC(12,2) DEFAULT 0,
  taxes_included_in_cash BOOLEAN DEFAULT false,
  emission_source TEXT,
  miles_program TEXT,
  miles_cost_brl NUMERIC(12,2) DEFAULT 0,
  total_item_cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cost_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage cost_items" ON public.cost_items FOR ALL TO authenticated USING (true);

-- Attachments
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage attachments" ON public.attachments FOR ALL TO authenticated USING (true);

-- Extraction runs (AI/OCR logs)
CREATE TABLE public.extraction_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  source_text TEXT,
  extracted_json JSONB,
  confidence NUMERIC(3,2),
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.extraction_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage extraction_runs" ON public.extraction_runs FOR ALL TO authenticated USING (true);

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view audit_log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Generate display_id
CREATE OR REPLACE FUNCTION public.generate_sale_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  year_str TEXT;
  seq INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq FROM public.sales WHERE display_id LIKE 'V-' || year_str || '-%';
  NEW.display_id := 'V-' || year_str || '-' || lpad(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_sale_display_id
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.generate_sale_display_id();

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('sale-attachments', 'sale-attachments', false);

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sale-attachments');
CREATE POLICY "Authenticated users can view" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sale-attachments');
