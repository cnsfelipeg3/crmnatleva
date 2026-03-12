
-- Function to extract a clean person name from a messy sale name
CREATE OR REPLACE FUNCTION public.extract_person_name(raw_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  parts text[];
  candidate text;
BEGIN
  IF raw_name IS NULL OR LENGTH(TRIM(raw_name)) < 2 THEN
    RETURN raw_name;
  END IF;

  cleaned := TRIM(raw_name);

  -- Remove parenthetical IATA codes: (GRU X BOG), (fco X Bos), (gru-Cai), (bos x GRU)
  cleaned := REGEXP_REPLACE(cleaned, '\s*\([^)]*[A-Za-z]{3}\s*[-xX]\s*[A-Za-z]{3}[^)]*\)', '', 'g');
  
  -- Remove parenthetical notes: (nat), (joanes), (kiwicast), (pv Tiago), (hotel Dubai), (hospedagem), (25% Comissão)
  cleaned := REGEXP_REPLACE(cleaned, '\s*\([^)]*\)', '', 'g');

  -- Remove "Kiwify - " prefix (and variants)
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Kk]iwify\s*-?\s*', '');

  -- Remove "Amigos - " prefix
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Aa]migos\s*-\s*', '');

  -- Remove "Alteração - " or "Alteração " prefix
  cleaned := REGEXP_REPLACE(cleaned, '^\s*[Aa]ltera[çc][ãa]o\s*-?\s*', '');

  -- Remove leading "- "
  cleaned := REGEXP_REPLACE(cleaned, '^\s*-\s*', '');

  -- Remove "Volta Cancelada" anywhere
  cleaned := REGEXP_REPLACE(cleaned, '\s*-?\s*[Vv]olta\s+[Cc]ancelada\s*-?\s*', ' ', 'g');

  -- Known destination/city suffixes after " - "
  -- Build a massive alternation of known destinations
  cleaned := REGEXP_REPLACE(cleaned, 
    '\s+-\s+(Itália|Italia|Paris|Dubai|Stuttgart|Mônaco|Monaco|Tailândia|Tailandia|Caldas\s+Novas|Europa|Orlando|Disney|México|Mexico|Cancún|Cancun|Santiago|Buenos\s+Aires|Miami|Lisboa|Portugal|Roma|Londres|Madrid|Grécia|Grecia|Turquia|Egito|Japão|Japao|Nova\s+York|Caribe|Punta\s+Cana|Bariloche|Gramado|Fernando\s+de\s+Noronha|Bahia|Nordeste|Maceió|Maceio|Natal|Recife|Salvador|Floripa|Florianópolis|Rio|São\s+Paulo|Sao\s+Paulo|Fortaleza|Bonito|Pantanal|Amazônia|Amazonia|Africa|África|Marrocos|Bali|Maldivas|Croácia|Croacia|Espanha|França|Franca|Alemanha|Suíça|Suica|Áustria|Austria|Holanda|Cairo|Egito|Israel|Jordânia|Jordania|Peru|Chile|Colômbia|Colombia|Costa\s+Rica|Cuba|Itália\s+e\s+Mônaco|Ida|Volta)\s*$',
    '', 'i');

  -- Known service/product suffixes after " - "
  cleaned := REGEXP_REPLACE(cleaned,
    '\s+-\s+(Seguro\s+Viagem|Aereo\s+Hotel|Aéreo\s+Hotel|Aereo|Aéreo|Hotel|Assentos|Orgânico|Organico|Check-?in|Ida|Volta|Ida\s+Emirates|Hospedagem|Transfer|Passeio|Passeio\s+Deserto|Fórmula\s+1|Formula\s+1|Voos?\s+Internos?|Aluguel\s+Barco|Aluguel\s+Carro|3\s+Diárias.*|Cliente\s*🟢?)\s*$',
    '', 'gi');

  -- Remove remaining IATA-like suffixes: " - Sdu - Nvt", " - Vix - Gig"
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+[A-Z][a-z]{2}(\s+-\s+[A-Z][a-z]{2})*\s*$', '', 'g');
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+[A-Z]{3}(\s+-\s+[A-Z]{3})*\s*$', '', 'g');

  -- Remove trailing percentage annotations "- 20%", "- 25%"
  cleaned := REGEXP_REPLACE(cleaned, '\s+-\s+\d+%.*$', '');

  -- Remove numeric-only suffixes "2.0", "2"
  cleaned := REGEXP_REPLACE(cleaned, '\s+\d+(\.\d+)?\s*$', '');

  -- Remove emojis and special unicode
  cleaned := REGEXP_REPLACE(cleaned, '[🟢🩵☘️☃✨🌟💫⭐🔥💯🎯🏆👑💎🌹🌺🦋🐝🌊🏖️✈️🗺️🌍🌎🌏📍🏠🏡💒🎉🎊🎁🎂🍰🎈🎀💌💕💗💖💘💝❤️🧡💛💚💙💜🖤🤍🤎❣️💟♥️🩷]+', '', 'g');

  -- Remove remaining special unicode characters (decorative text)
  cleaned := REGEXP_REPLACE(cleaned, '[^\x20-\x7EÀ-ÿ\-'']', '', 'g');

  -- Remove "Administrativo" and following words like "Renan"
  -- Keep only if it looks like a person name (has at least 2 alpha words)
  
  -- Collapse spaces and trim
  cleaned := TRIM(REGEXP_REPLACE(cleaned, '\s+', ' ', 'g'));
  
  -- Remove trailing " -" or leading "- "
  cleaned := TRIM(BOTH '-' FROM cleaned);
  cleaned := TRIM(cleaned);

  -- If result is empty or too short, return NULL
  IF cleaned IS NULL OR LENGTH(cleaned) < 2 THEN
    RETURN NULL;
  END IF;

  -- If result is just a common non-name word, return NULL
  IF LOWER(cleaned) IN ('kiwify', 'amigos', 'alteração', 'alteracao', 'hospedagem', 'hotel', 
                          'aereo', 'aéreo', 'voos internos', 'aluguel barco', 'passeio deserto',
                          'administrativo', 'seguro viagem', 'orgânico', 'organico') THEN
    RETURN NULL;
  END IF;

  -- Apply smart capitalize
  RETURN public.smart_capitalize_name(cleaned);
END;
$$;
