-- Tabela de destinos populares curados
CREATE TABLE IF NOT EXISTS public.popular_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iata text UNIQUE NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  country_code text,
  region text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  typical_origin text NOT NULL DEFAULT 'GRU',
  hero_image_url text,
  description text,
  avg_trip_days integer DEFAULT 7,
  visa_required boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_popular_destinations_active
  ON public.popular_destinations(is_active, priority);

ALTER TABLE public.popular_destinations ENABLE ROW LEVEL SECURITY;

DO $mig$ BEGIN
  CREATE POLICY "popular_destinations_select_authenticated"
    ON public.popular_destinations FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $mig$;

DO $mig$ BEGIN
  CREATE POLICY "popular_destinations_write_authenticated"
    ON public.popular_destinations FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $mig$;

CREATE OR REPLACE FUNCTION public.touch_popular_destinations_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
  BEGIN NEW.updated_at = now(); RETURN NEW; END;
  $fn$;

DROP TRIGGER IF EXISTS trg_popular_destinations_updated_at
  ON public.popular_destinations;
CREATE TRIGGER trg_popular_destinations_updated_at
  BEFORE UPDATE ON public.popular_destinations
  FOR EACH ROW EXECUTE FUNCTION public.touch_popular_destinations_updated_at();

-- Cache de descoberta de voos
CREATE TABLE IF NOT EXISTS public.gflights_discovery_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_iata text NOT NULL,
  destination_iata text NOT NULL,
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  adults integer NOT NULL DEFAULT 1,
  travel_class text NOT NULL DEFAULT 'ECONOMY',
  min_price numeric,
  sample_flight jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(origin_iata, destination_iata, period_month, period_year, adults, travel_class)
);

CREATE INDEX IF NOT EXISTS idx_gflights_discovery_cache_lookup
  ON public.gflights_discovery_cache(origin_iata, destination_iata, period_month, period_year, fetched_at);

ALTER TABLE public.gflights_discovery_cache ENABLE ROW LEVEL SECURITY;

DO $mig$ BEGIN
  CREATE POLICY "gflights_discovery_cache_all"
    ON public.gflights_discovery_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $mig$;

-- Seed dos 30+ destinos
INSERT INTO public.popular_destinations
  (iata, city, country, country_code, region, tags, typical_origin, avg_trip_days, visa_required, priority)
VALUES
  ('MCZ','Maceió','Brasil','BR','Brasil',ARRAY['praia','nordeste','familia','natureza'],'GRU',6,false,90),
  ('FEN','Fernando de Noronha','Brasil','BR','Brasil',ARRAY['praia','natureza','romantico','luxo'],'GRU',5,false,80),
  ('CXJ','Caxias do Sul - Gramado','Brasil','BR','Brasil',ARRAY['frio','romantico','familia','gastronomia'],'GRU',4,false,80),
  ('IGU','Foz do Iguaçu','Brasil','BR','Brasil',ARRAY['natureza','familia','aventura'],'GRU',4,false,75),
  ('SSA','Salvador','Brasil','BR','Brasil',ARRAY['praia','cultura','nordeste'],'GRU',5,false,70),
  ('FOR','Fortaleza','Brasil','BR','Brasil',ARRAY['praia','nordeste','familia'],'GRU',6,false,70),
  ('REC','Recife','Brasil','BR','Brasil',ARRAY['praia','nordeste','cultura'],'GRU',5,false,65),
  ('EZE','Buenos Aires','Argentina','AR','Américas',ARRAY['urbano','gastronomia','cultura','romantico'],'GRU',5,false,95),
  ('SCL','Santiago','Chile','CL','Américas',ARRAY['urbano','montanha','gastronomia','aventura'],'GRU',5,false,85),
  ('CUN','Cancún','México','MX','Américas',ARRAY['praia','luxo','familia','romantico'],'GRU',7,false,95),
  ('MCO','Orlando','EUA','US','Américas',ARRAY['familia','disney','parques'],'GRU',9,true,100),
  ('MIA','Miami','EUA','US','Américas',ARRAY['praia','urbano','compras','luxo'],'GRU',7,true,90),
  ('JFK','Nova York','EUA','US','Américas',ARRAY['urbano','cultura','compras','gastronomia'],'GRU',7,true,90),
  ('LAS','Las Vegas','EUA','US','Américas',ARRAY['urbano','entretenimento','luxo'],'GRU',5,true,75),
  ('LIM','Lima','Peru','PE','Américas',ARRAY['cultura','gastronomia','aventura'],'GRU',6,false,70),
  ('CUZ','Cusco - Machu Picchu','Peru','PE','Américas',ARRAY['cultura','aventura','natureza'],'GRU',6,false,75),
  ('PUJ','Punta Cana','Rep. Dominicana','DO','Caribe',ARRAY['praia','luxo','romantico','all-inclusive'],'GRU',7,false,85),
  ('LIS','Lisboa','Portugal','PT','Europa',ARRAY['cultura','gastronomia','urbano'],'GRU',7,false,100),
  ('OPO','Porto','Portugal','PT','Europa',ARRAY['cultura','gastronomia','vinho'],'GRU',5,false,85),
  ('MAD','Madri','Espanha','ES','Europa',ARRAY['urbano','cultura','gastronomia'],'GRU',6,false,85),
  ('BCN','Barcelona','Espanha','ES','Europa',ARRAY['praia','urbano','cultura','gastronomia'],'GRU',6,false,90),
  ('CDG','Paris','França','FR','Europa',ARRAY['urbano','romantico','cultura','gastronomia','luxo'],'GRU',7,false,95),
  ('FCO','Roma','Itália','IT','Europa',ARRAY['cultura','gastronomia','romantico'],'GRU',7,false,95),
  ('AMS','Amsterdã','Holanda','NL','Europa',ARRAY['urbano','cultura'],'GRU',5,false,75),
  ('LHR','Londres','Reino Unido','UK','Europa',ARRAY['urbano','cultura','compras'],'GRU',6,false,85),
  ('ATH','Atenas/Santorini','Grécia','GR','Europa',ARRAY['praia','cultura','romantico','luxo'],'GRU',8,false,80),
  ('DXB','Dubai','EAU','AE','Oriente Médio',ARRAY['luxo','urbano','compras','familia'],'GRU',6,true,90),
  ('IST','Istambul','Turquia','TR','Oriente Médio',ARRAY['cultura','gastronomia','urbano'],'GRU',6,false,75),
  ('DOH','Doha','Catar','QA','Oriente Médio',ARRAY['luxo','urbano'],'GRU',5,true,60),
  ('CMN','Marrakech','Marrocos','MA','África',ARRAY['cultura','aventura','luxo'],'GRU',7,false,65),
  ('NRT','Tóquio','Japão','JP','Ásia',ARRAY['urbano','cultura','gastronomia','tecnologia'],'GRU',8,false,85),
  ('DPS','Bali','Indonésia','ID','Ásia',ARRAY['praia','luxo','romantico','natureza'],'GRU',9,false,75)
ON CONFLICT (iata) DO NOTHING;