-- Normaliza capitalização de display_name na tabela clients
-- Primeiras letras maiúsculas, preposições minúsculas no meio
-- Preserva o nome literal, só ajusta caixa

WITH normalized AS (
  SELECT id, display_name,
    trim(regexp_replace(
      (
        SELECT string_agg(
          CASE 
            WHEN lower(w) IN ('de','da','do','das','dos','e','di','du') AND idx > 1 THEN lower(w)
            ELSE (
              SELECT string_agg(
                upper(substring(p from 1 for 1)) || lower(substring(p from 2)),
                '-'
              )
              FROM unnest(string_to_array(w, '-')) p
            )
          END, ' ' ORDER BY idx
        )
        FROM unnest(regexp_split_to_array(trim(display_name), '\s+')) WITH ORDINALITY AS t(w, idx)
      ), '\s+', ' ', 'g'
    )) AS fixed
  FROM clients
  WHERE display_name IS NOT NULL AND length(trim(display_name)) > 0
)
UPDATE clients c
SET display_name = n.fixed
FROM normalized n
WHERE c.id = n.id AND n.fixed IS DISTINCT FROM c.display_name;