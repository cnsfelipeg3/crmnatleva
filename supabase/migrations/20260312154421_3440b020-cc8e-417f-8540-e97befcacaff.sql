
-- Rebuild with proper escaping
CREATE OR REPLACE FUNCTION public.extract_person_name(raw_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  cleaned text;
  i integer;
  dest_pattern text;
  svc_pattern text;
BEGIN
  IF raw_name IS NULL OR LENGTH(TRIM(raw_name)) < 2 THEN
    RETURN raw_name;
  END IF;

  cleaned := TRIM(raw_name);

  -- Remove parenthetical IATA codes: (GRU X BOG), (fco X Bos), (gru-Cai)
  cleaned := REGEXP_REPLACE(cleaned, '\s*\([^)]*[A-Za-z]{3}\s*[-xX]\s*[A-Za-z]{3}[^)]*\)', '', 'g');
  
  -- Remove all remaining parenthetical notes
  cleaned := REGEXP_REPLACE(cleaned, '\s*\([^)]*\)', '', 'g');

  -- Remove common prefixes
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Kk]iwify\s*-?\s*', '');
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Aa]migos\s*-\s*', '');
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Aa]ltera.{1,3}o\s*-?\s*', '');
  cleaned := REGEXP_REPLACE(cleaned, '^\s*-\s*', '');

  -- Remove "Volta Cancelada"
  cleaned := REGEXP_REPLACE(cleaned, '\s*-?\s*[Vv]olta\s+[Cc]ancelada\s*-?\s*', ' ', 'g');

  -- Build destination pattern - remove trailing " - Destination"
  dest_pattern := '\s+-\s+(Dubai|Paris|Europa|Orlando|Disney|Miami|Lisboa|Roma|Londres|Madrid|Cairo|Bali|Maldivas|Espanha|Alemanha|Holanda|Portugal|Chile|Peru|Israel|Cuba|Stuttgart|Nordeste|Salvador|Recife|Natal|Bahia|Gramado|Bonito|Fortaleza|Floripa|Rio|Cancun|Santiago|Bariloche|Marrocos|Turquia|Egito|Japao|Caribe|Africa|Croacia|Suica|Austria|Franca|Colombia|Mexico|Punta Cana|Buenos Aires|Nova York|Sao Paulo|Costa Rica|Caldas Novas|Fernando de Noronha|Amazonia|Pantanal|Florianopolis|Maceio|Ida|Volta|Ida Emirates)';
  -- Also match accented versions
  dest_pattern := dest_pattern || '|(It.lia(\s+e\s+M.naco)?|M.naco|Tail.ndia|M.xico|Canc.n|Gr.cia|Jap.o|Amaz.nia|Cro.cia|Su..a|.ustria|Fran.a|Col.mbia|Jord.nia|Macei.|Florian.polis)';
  dest_pattern := dest_pattern || ')\s*$';

  -- Service/product suffixes
  svc_pattern := '\s+-\s+(Seguro Viagem|Aereo Hotel|A.reo Hotel|Aereo|A.reo|Hotel|Assentos|Org.nico|Organico|Check.?in|Hospedagem|Transfer|Passeio Deserto|Passeio|F.rmula 1|Voos? Internos?|Aluguel Barco|Aluguel Carro|Cliente|3 Di.rias.*)\s*$';

  -- Apply destination and service removal in loop (handles chained suffixes)
  FOR i IN 1..4 LOOP
    cleaned := REGEXP_REPLACE(cleaned, dest_pattern, '', 'i');
    cleaned := REGEXP_REPLACE(cleaned, svc_pattern, '', 'i');
  END LOOP;

  -- Remove trailing IATA-like suffixes: " - Sdu - Nvt"
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+[A-Z][a-z]{2}(\s+-\s+[A-Z][a-z]{2})*\s*$', '');
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+[A-Z]{3}(\s+-\s+[A-Z]{3})*\s*$', '');

  -- Remove trailing percentage: "- 20%"
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+\d+%.*$', '');

  -- Remove trailing numbers: "2.0"
  cleaned := REGEXP_REPLACE(cleaned, '\s+\d+(\.\d+)?\s*$', '');

  -- Remove 3-letter standalone suffix
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+[A-Z][a-z]{2}\s*$', '');

  -- Collapse spaces, trim dashes
  cleaned := TRIM(REGEXP_REPLACE(cleaned, '\s+', ' ', 'g'));
  cleaned := TRIM(BOTH '-' FROM cleaned);
  cleaned := TRIM(cleaned);

  IF cleaned IS NULL OR LENGTH(cleaned) < 2 THEN
    RETURN NULL;
  END IF;

  IF LOWER(cleaned) IN ('kiwify', 'amigos', 'hospedagem', 'hotel', 'aereo', 'voos internos', 
                          'aluguel barco', 'passeio deserto', 'administrativo', 'seguro viagem') THEN
    RETURN NULL;
  END IF;

  RETURN public.smart_capitalize_name(cleaned);
END;
$function$;
