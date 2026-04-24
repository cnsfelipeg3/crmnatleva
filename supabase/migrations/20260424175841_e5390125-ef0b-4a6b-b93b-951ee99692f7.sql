
-- ============================================================
-- PASSO 0: BACKUP
-- ============================================================
DROP TABLE IF EXISTS public.sales_products_backup_2026_04_24;

CREATE TABLE public.sales_products_backup_2026_04_24 AS
SELECT id, products, name, display_id, updated_at
FROM public.sales;

-- ============================================================
-- PASSO 1: Tabela de log de auditoria
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  old_products TEXT[],
  new_products TEXT[],
  source TEXT NOT NULL CHECK (source IN ('combo_expansion','concat_split','mapped','inferred_data','inferred_hotel','inferred_keyword')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products_migration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view migration log"
ON public.products_migration_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- PASSO 2a: Expand combo "Passagem Aérea e Hospedagem"
-- ============================================================
WITH affected AS (
  SELECT id, products AS old_products
  FROM public.sales
  WHERE 'Passagem Aérea e Hospedagem' = ANY(products)
)
INSERT INTO public.products_migration_log (sale_id, old_products, new_products, source, reason)
SELECT
  a.id,
  a.old_products,
  (SELECT ARRAY(SELECT DISTINCT x FROM unnest(
    array_cat(
      ARRAY['pacote','aereo','hospedagem'],
      array_remove(a.old_products, 'Passagem Aérea e Hospedagem')
    )
  ) x)),
  'combo_expansion',
  'Label combo "Passagem Aérea e Hospedagem" expandido em 3 slugs'
FROM affected a;

UPDATE public.sales
SET products = (
  SELECT ARRAY(SELECT DISTINCT x FROM unnest(
    array_cat(
      ARRAY['pacote','aereo','hospedagem'],
      array_remove(products, 'Passagem Aérea e Hospedagem')
    )
  ) x)
)
WHERE 'Passagem Aérea e Hospedagem' = ANY(products);

-- ============================================================
-- PASSO 2b: Split string concatenada
-- ============================================================
WITH affected AS (
  SELECT id, products AS old_products
  FROM public.sales
  WHERE 'Passagem Aérea Serviços Extras Seguro Viagem' = ANY(products)
)
INSERT INTO public.products_migration_log (sale_id, old_products, new_products, source, reason)
SELECT
  a.id,
  a.old_products,
  (SELECT ARRAY(SELECT DISTINCT x FROM unnest(
    array_cat(
      ARRAY['aereo','servicos-extras','seguro-viagem'],
      array_remove(a.old_products, 'Passagem Aérea Serviços Extras Seguro Viagem')
    )
  ) x)),
  'concat_split',
  'String concatenada dividida em 3 slugs separados'
FROM affected a;

UPDATE public.sales
SET products = (
  SELECT ARRAY(SELECT DISTINCT x FROM unnest(
    array_cat(
      ARRAY['aereo','servicos-extras','seguro-viagem'],
      array_remove(products, 'Passagem Aérea Serviços Extras Seguro Viagem')
    )
  ) x)
)
WHERE 'Passagem Aérea Serviços Extras Seguro Viagem' = ANY(products);

-- ============================================================
-- PASSO 2c: Mapeamento 1:1
-- ============================================================
UPDATE public.sales
SET products = (
  SELECT ARRAY_AGG(DISTINCT
    CASE p
      WHEN 'Passagem Aérea'             THEN 'aereo'
      WHEN 'Aéreo'                      THEN 'aereo'
      WHEN 'Hospedagem'                 THEN 'hospedagem'
      WHEN 'Hotel'                      THEN 'hospedagem'
      WHEN 'Seguro Viagem'              THEN 'seguro-viagem'
      WHEN 'Transfer'                   THEN 'transfer'
      WHEN 'Serviços Extras'            THEN 'servicos-extras'
      WHEN 'Passeios e Tours'           THEN 'passeios'
      WHEN 'Aluguel de Carro'           THEN 'aluguel-carro'
      WHEN 'Ingressos'                  THEN 'ingressos'
      WHEN 'Passagem de Trem'           THEN 'trem'
      WHEN 'Assento Conforto'           THEN 'assento-conforto'
      WHEN 'Bagagem'                    THEN 'bagagem'
      WHEN 'Remarcação Passagem Aérea'  THEN 'remarcacao-aereo'
      WHEN 'Passagem de Ônibus'         THEN 'onibus'
      WHEN 'Outros'                     THEN 'outros'
      WHEN 'Cruzeiro'                   THEN 'cruzeiro'
      ELSE p
    END
  )
  FROM unnest(products) AS p
)
WHERE products IS NOT NULL
  AND array_length(products, 1) > 0;

-- ============================================================
-- PASSO 3a: Inferência aereo (rota/voos)
-- ============================================================
WITH affected AS (
  SELECT s.id, s.products AS old_products
  FROM public.sales s
  WHERE (products IS NULL OR array_length(products,1) IS NULL OR array_length(products,1) = 0)
    AND (
      (s.origin_iata IS NOT NULL AND s.origin_iata != '' AND s.destination_iata IS NOT NULL AND s.destination_iata != '')
      OR EXISTS (SELECT 1 FROM public.flight_segments fs WHERE fs.sale_id = s.id)
    )
)
INSERT INTO public.products_migration_log (sale_id, old_products, new_products, source, reason)
SELECT id, old_products, ARRAY['aereo'], 'inferred_data', 'Inferido aereo por origem/destino ou flight_segments'
FROM affected;

UPDATE public.sales s
SET products = ARRAY['aereo']
WHERE (products IS NULL OR array_length(products,1) IS NULL OR array_length(products,1) = 0)
  AND (
    (s.origin_iata IS NOT NULL AND s.origin_iata != '' AND s.destination_iata IS NOT NULL AND s.destination_iata != '')
    OR EXISTS (SELECT 1 FROM public.flight_segments fs WHERE fs.sale_id = s.id)
  );

-- ============================================================
-- PASSO 3b: Inferência hospedagem (hotel_name)
-- ============================================================
WITH affected AS (
  SELECT id, products AS old_products
  FROM public.sales
  WHERE (products IS NULL OR array_length(products,1) IS NULL OR array_length(products,1) = 0)
    AND hotel_name IS NOT NULL AND hotel_name != ''
)
INSERT INTO public.products_migration_log (sale_id, old_products, new_products, source, reason)
SELECT id, old_products, ARRAY['hospedagem'], 'inferred_hotel', 'Inferido hospedagem por hotel_name preenchido'
FROM affected;

UPDATE public.sales
SET products = ARRAY['hospedagem']
WHERE (products IS NULL OR array_length(products,1) IS NULL OR array_length(products,1) = 0)
  AND hotel_name IS NOT NULL AND hotel_name != '';

-- ============================================================
-- PASSO 3c: Inferência assento-conforto (keyword)
-- ============================================================
WITH affected AS (
  SELECT id, products AS old_products, name
  FROM public.sales
  WHERE (products IS NULL OR array_length(products,1) IS NULL OR array_length(products,1) = 0)
    AND name ILIKE '%assento%'
)
INSERT INTO public.products_migration_log (sale_id, old_products, new_products, source, reason)
SELECT id, old_products, ARRAY['assento-conforto'], 'inferred_keyword', 'Inferido assento-conforto por keyword "assento" em name: ' || name
FROM affected;

UPDATE public.sales
SET products = ARRAY['assento-conforto']
WHERE (products IS NULL OR array_length(products,1) IS NULL OR array_length(products,1) = 0)
  AND name ILIKE '%assento%';
