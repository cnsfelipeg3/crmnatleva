
-- Fix: add Dubai as standalone destination match and more patterns
CREATE OR REPLACE FUNCTION public.extract_person_name(raw_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
BEGIN
  IF raw_name IS NULL OR LENGTH(TRIM(raw_name)) < 2 THEN
    RETURN raw_name;
  END IF;

  cleaned := TRIM(raw_name);

  -- Remove parenthetical IATA codes: (GRU X BOG), (fco X Bos), (gru-Cai)
  cleaned := REGEXP_REPLACE(cleaned, '\s*\([^)]*[A-Za-z]{3}\s*[-xX]\s*[A-Za-z]{3}[^)]*\)', '', 'g');
  
  -- Remove parenthetical notes: (nat), (joanes), (25% Comissão), (hotel Dubai), etc.
  cleaned := REGEXP_REPLACE(cleaned, '\s*\([^)]*\)', '', 'g');

  -- Remove "Kiwify - " prefix
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Kk]iwify\s*-?\s*', '');

  -- Remove "Amigos - " prefix
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Aa]migos\s*-\s*', '');

  -- Remove "Alteração - " prefix
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Aa]ltera[çc][ãa]o\s*-?\s*', '');

  -- Remove leading "- "
  cleaned := REGEXP_REPLACE(cleaned, '^\s*-\s*', '');

  -- Remove "Volta Cancelada" anywhere
  cleaned := REGEXP_REPLACE(cleaned, '\s*-?\s*[Vv]olta\s+[Cc]ancelada\s*-?\s*', ' ', 'g');

  -- Remove trailing destination/service suffixes after " - "
  -- Loop to handle chained suffixes like "Name - Dubai - Ida"
  FOR i IN 1..3 LOOP
    cleaned := REGEXP_REPLACE(cleaned, 
      E'\\s+-\\s+(?:It[aá]lia(?:\\s+e\\s+M[oô]naco)?|Paris|Dubai|Stuttgart|M[oô]naco|Tail[aâ]ndia|Caldas\\s+Novas|Europa|Orlando|Disney|M[eé]xico|Canc[uú]n|Santiago|Buenos\\s+Aires|Miami|Lisboa|Portugal|Roma|Londres|Madrid|Gr[eé]cia|Turquia|Egito|Jap[aã]o|Nova\\s+York|Caribe|Punta\\s+Cana|Bariloche|Gramado|Fernando\\s+de\\s+Noronha|Bahia|Nordeste|Macei[oó]|Natal|Recife|Salvador|Floripa|Florian[oó]polis|Rio|S[aã]o\\s+Paulo|Fortaleza|Bonito|Pantanal|Amaz[oô]nia|[AÁ]frica|Marrocos|Bali|Maldivas|Cro[aá]cia|Espanha|Fran[cç]a|Alemanha|Su[ií][çc]a|[AÁ]ustria|Holanda|Cairo|Israel|Jord[aâ]nia|Peru|Chile|Col[oô]mbia|Costa\\s+Rica|Cuba|Seguro\\s+Viagem|A[eé]reo\\s+Hotel|A[eé]reo|Hotel|Assentos|Org[aâ]nico|Check-?in|Ida|Volta|Ida\\s+Emirates|Hospedagem|Transfer|Passeio\\s+Deserto|Passeio|F[oó]rmula\\s+1|Voos?\\s+Internos?|Aluguel\\s+Barco|Aluguel\\s+Carro|Cliente)\\s*$',
      '', 'i');
  END LOOP;

  -- Remove trailing IATA-like suffixes: " - Sdu - Nvt", " - Vix - Gig"
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+[A-Z][a-z]{2}(\s+-\s+[A-Z][a-z]{2})*\s*$', '');
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+[A-Z]{3}(\s+-\s+[A-Z]{3})*\s*$', '');

  -- Remove trailing percentage annotations "- 20%"
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+\d+%.*$', '');

  -- Remove trailing numbers "2.0", "2" 
  cleaned := REGEXP_REPLACE(cleaned, '\s+\d+(\.\d+)?\s*$', '');

  -- Remove 3-letter IATA-like standalone suffixes " - Gru", " - Nvt"
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+[A-Z][a-z]{2}\s*$', '');

  -- Remove emojis and special unicode
  cleaned := REGEXP_REPLACE(cleaned, E'[\\x{1F300}-\\x{1F9FF}\\x{2600}-\\x{26FF}\\x{2700}-\\x{27BF}\\x{FE00}-\\x{FE0F}\\x{200D}\\x{20E3}\\x{E0020}-\\x{E007F}]+', '', 'g');

  -- Collapse spaces and trim
  cleaned := TRIM(REGEXP_REPLACE(cleaned, '\s+', ' ', 'g'));
  cleaned := TRIM(BOTH '-' FROM cleaned);
  cleaned := TRIM(cleaned);

  -- If result is empty or too short, return NULL
  IF cleaned IS NULL OR LENGTH(cleaned) < 2 THEN
    RETURN NULL;
  END IF;

  -- If result is just a common non-name word, return NULL
  IF LOWER(cleaned) IN ('kiwify', 'amigos', 'alteração', 'alteracao', 'hospedagem', 'hotel', 
                          'aereo', 'aéreo', 'voos internos', 'aluguel barco', 'passeio deserto',
                          'administrativo', 'seguro viagem', 'orgânico', 'organico',
                          '3 diárias rolls royce') THEN
    RETURN NULL;
  END IF;

  RETURN public.smart_capitalize_name(cleaned);
END;
$$;
