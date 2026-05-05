-- 4.1) Match por TELEFONE
UPDATE public.clients c
SET customer_since = s.criado_em,
    customer_since_source = 'monday_phone'
FROM public.clients_monday_staging s
WHERE c.customer_since IS NULL
  AND regexp_replace(COALESCE(c.phone, ''), '\D', '', 'g') = s.telefone_digits
  AND s.telefone_digits IS NOT NULL
  AND length(s.telefone_digits) >= 8;

-- 4.2) Match por EMAIL
UPDATE public.clients c
SET customer_since = s.criado_em,
    customer_since_source = 'monday_email'
FROM public.clients_monday_staging s
WHERE c.customer_since IS NULL
  AND LOWER(c.email) = LOWER(s.email)
  AND s.email IS NOT NULL
  AND s.email <> ''
  AND LOWER(s.email) <> 'atualizar@gmail.com'
  AND LOWER(c.email) <> 'atualizar@gmail.com';

-- 4.3) Match por NOME único
UPDATE public.clients c
SET customer_since = matched.criado_em,
    customer_since_source = 'monday_name'
FROM (
  SELECT c.id AS client_id, MIN(s.criado_em) AS criado_em, COUNT(*) AS matches
  FROM public.clients c
  INNER JOIN public.clients_monday_staging s
    ON LOWER(TRIM(c.display_name)) = LOWER(TRIM(s.nome))
  WHERE c.customer_since IS NULL
  GROUP BY c.id
  HAVING COUNT(*) = 1
) matched
WHERE c.id = matched.client_id;