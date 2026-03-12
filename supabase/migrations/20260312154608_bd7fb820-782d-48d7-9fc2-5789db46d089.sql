
-- Fix ordering: remove trailing numbers BEFORE destination matching
CREATE OR REPLACE FUNCTION public.extract_person_name(raw_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  cleaned text;
  i integer;
BEGIN
  IF raw_name IS NULL OR LENGTH(TRIM(raw_name)) < 2 THEN
    RETURN raw_name;
  END IF;

  cleaned := TRIM(raw_name);

  -- Remove parenthetical IATA codes and notes
  cleaned := REGEXP_REPLACE(cleaned, '\s*\([^)]*[A-Za-z]{3}\s*[-xX]\s*[A-Za-z]{3}[^)]*\)', '', 'g');
  cleaned := REGEXP_REPLACE(cleaned, '\s*\([^)]*\)', '', 'g');

  -- Remove common prefixes
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Kk]iwify\s*-?\s*', '');
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Aa]migos\s*-\s*', '');
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Aa]ltera.{1,4}o\s*-?\s*', '');
  cleaned := REGEXP_REPLACE(cleaned, '^\s*-\s*', '');

  -- Remove "Volta Cancelada"
  cleaned := REGEXP_REPLACE(cleaned, '\s*-?\s*[Vv]olta\s+[Cc]ancelada\s*-?\s*', ' ', 'g');

  -- Remove trailing numbers FIRST (before destination matching)
  cleaned := REGEXP_REPLACE(cleaned, '\s+\d+(\.\d+)?\s*$', '');
  -- Remove trailing percentage
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+\d+%.*$', '');

  -- Remove trailing destination/service suffixes (loop for chained ones)
  FOR i IN 1..5 LOOP
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+(Dubai|Paris|Europa|Orlando|Disney|Miami|Lisboa|Roma|Londres|Madrid|Cairo|Bali|Maldivas|Espanha|Alemanha|Holanda|Portugal|Chile|Peru|Israel|Cuba|Stuttgart|Nordeste|Salvador|Recife|Natal|Bahia|Gramado|Bonito|Fortaleza|Floripa|Rio|Cancun|Santiago|Bariloche|Marrocos|Turquia|Egito|Caribe|Croacia|Suica|Austria|Franca|Colombia|Mexico|Pantanal|Amazonia|Florianopolis|Maceio|Ida|Volta)\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+It.lia(\s+e\s+M.naco)?\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+M.naco\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Tail.ndia\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Gr.cia\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Jap.o\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Jord.nia\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Cro.cia\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Col.mbia\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Ida\s+Emirates\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Punta\s+Cana\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Buenos\s+Aires\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Nova\s+York\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Costa\s+Rica\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Caldas\s+Novas\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+(Seguro\s+Viagem|Aereo\s+Hotel|Aereo|Hotel|Assentos|Check.?in|Hospedagem|Transfer|Passeio|Voos?\s+Internos?|Aluguel\s+Barco|Aluguel\s+Carro|Cliente)\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Org.nico\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+A.reo(\s+Hotel)?\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+F.rmula\s+1\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+Passeio\s+Deserto\s*$', '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+3\s+Di.rias.*$', '', 'i');
  END LOOP;

  -- Remove trailing IATA-like
  cleaned := REGEXP_REPLACE(cleaned, '(\s+-\s+[A-Z][a-z]{2})+\s*$', '');
  cleaned := REGEXP_REPLACE(cleaned, '(\s+-\s+[A-Z]{3})+\s*$', '');

  -- Collapse, trim
  cleaned := TRIM(REGEXP_REPLACE(cleaned, '\s+', ' ', 'g'));
  cleaned := TRIM(BOTH '-' FROM cleaned);
  cleaned := TRIM(cleaned);

  IF cleaned IS NULL OR LENGTH(cleaned) < 2 THEN RETURN NULL; END IF;

  IF LOWER(cleaned) IN ('kiwify','amigos','hospedagem','hotel','aereo','voos internos',
                          'aluguel barco','passeio deserto','administrativo','seguro viagem',
                          'passeio','transfer','assentos','aluguel carro','cliente',
                          '3 diárias rolls royce','rolls royce') THEN
    RETURN NULL;
  END IF;

  RETURN public.smart_capitalize_name(cleaned);
END;
$function$;
