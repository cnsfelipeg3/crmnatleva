
-- Create a smart capitalize function that handles prepositions
CREATE OR REPLACE FUNCTION public.smart_capitalize_name(input_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  words text[];
  result text[];
  word text;
  i integer;
  lower_word text;
  parts text[];
  part text;
  j integer;
  part_result text[];
BEGIN
  IF input_name IS NULL OR LENGTH(TRIM(input_name)) < 1 THEN
    RETURN input_name;
  END IF;
  
  -- Clean: trim, collapse spaces
  input_name := TRIM(REGEXP_REPLACE(input_name, '\s+', ' ', 'g'));
  
  -- Split into words
  words := STRING_TO_ARRAY(input_name, ' ');
  result := ARRAY[]::text[];
  
  FOR i IN 1..ARRAY_LENGTH(words, 1) LOOP
    word := words[i];
    lower_word := LOWER(word);
    
    -- Prepositions stay lowercase (except first word)
    IF i > 1 AND lower_word IN ('de', 'da', 'do', 'das', 'dos', 'e') THEN
      result := ARRAY_APPEND(result, lower_word);
    ELSE
      -- Handle hyphenated words
      IF POSITION('-' IN word) > 0 THEN
        parts := STRING_TO_ARRAY(word, '-');
        part_result := ARRAY[]::text[];
        FOR j IN 1..ARRAY_LENGTH(parts, 1) LOOP
          part := parts[j];
          IF LENGTH(part) > 0 THEN
            part_result := ARRAY_APPEND(part_result, UPPER(LEFT(LOWER(part), 1)) || SUBSTRING(LOWER(part) FROM 2));
          ELSE
            part_result := ARRAY_APPEND(part_result, part);
          END IF;
        END LOOP;
        result := ARRAY_APPEND(result, ARRAY_TO_STRING(part_result, '-'));
      ELSE
        -- Standard capitalize: first letter upper, rest lower
        IF LENGTH(word) > 0 THEN
          result := ARRAY_APPEND(result, UPPER(LEFT(LOWER(word), 1)) || SUBSTRING(LOWER(word) FROM 2));
        ELSE
          result := ARRAY_APPEND(result, word);
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN ARRAY_TO_STRING(result, ' ');
END;
$function$;
