INSERT INTO public.popular_destinations
  (iata, city, country, country_code, region, tags, typical_origin, avg_trip_days, visa_required, priority)
VALUES
  ('MXP','Milão','Itália','IT','Europa', ARRAY['urbano','cultura','gastronomia','luxo','compras'],'GRU',5,false,90),
  ('VCE','Veneza','Itália','IT','Europa', ARRAY['romantico','cultura','gastronomia'],'GRU',5,false,90),
  ('FLR','Florença','Itália','IT','Europa', ARRAY['cultura','gastronomia','romantico'],'GRU',5,false,85),
  ('NAP','Nápoles','Itália','IT','Europa', ARRAY['cultura','gastronomia','praia'],'GRU',6,false,75),
  ('CTA','Catânia (Sicília)','Itália','IT','Europa', ARRAY['praia','cultura','gastronomia'],'GRU',7,false,70),
  ('VIE','Viena','Áustria','AT','Europa', ARRAY['cultura','urbano','romantico'],'GRU',5,false,75),
  ('PRG','Praga','República Tcheca','CZ','Europa', ARRAY['cultura','urbano','romantico','gastronomia'],'GRU',5,false,80),
  ('BUD','Budapeste','Hungria','HU','Europa', ARRAY['cultura','urbano','romantico'],'GRU',5,false,70),
  ('ZRH','Zurique','Suíça','CH','Europa', ARRAY['montanha','natureza','luxo'],'GRU',6,false,75),
  ('KEF','Reykjavík','Islândia','IS','Europa', ARRAY['natureza','aventura','frio'],'GRU',7,false,75),
  ('BER','Berlim','Alemanha','DE','Europa', ARRAY['cultura','urbano','história'],'GRU',5,false,75),
  ('GIG','Rio de Janeiro','Brasil','BR','Brasil', ARRAY['praia','urbano','cultura','romantico'],'GRU',5,false,95),
  ('BPS','Porto Seguro','Brasil','BR','Brasil', ARRAY['praia','familia','nordeste'],'GRU',6,false,70),
  ('NAT','Natal','Brasil','BR','Brasil', ARRAY['praia','nordeste','familia'],'GRU',6,false,70),
  ('AUA','Aruba','Aruba','AW','Caribe', ARRAY['praia','luxo','romantico','all-inclusive'],'GRU',7,false,75),
  ('BKK','Bangkok','Tailândia','TH','Ásia', ARRAY['urbano','gastronomia','cultura','aventura'],'GRU',8,false,75),
  ('SIN','Singapura','Singapura','SG','Ásia', ARRAY['urbano','luxo','gastronomia'],'GRU',6,false,70)
ON CONFLICT (iata) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_popular_destinations_country_code
  ON public.popular_destinations(country_code);