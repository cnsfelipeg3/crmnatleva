
CREATE OR REPLACE FUNCTION public.cleanup_client_names()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  sales_cleaned integer := 0;
  clients_cleaned integer := 0;
  clients_deduped integer := 0;
  clients_linked integer := 0;
  rec RECORD;
  found_client_id uuid;
BEGIN
  -- STEP 1: Clean sales.name
  UPDATE sales
  SET name = public.extract_person_name(name)
  WHERE public.extract_person_name(name) IS NOT NULL
    AND public.extract_person_name(name) != name;
  GET DIAGNOSTICS sales_cleaned = ROW_COUNT;

  -- STEP 2: Clean clients.display_name
  UPDATE clients
  SET display_name = public.smart_capitalize_name(
    TRIM(BOTH '-' FROM TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(display_name, '^\s*[-\.?…]+\s*', ''),
            '\s*[-]\s*Cliente.*$', '', 'i'
          ),
          '\s*🟢.*$', ''
        ),
        '\s+', ' ', 'g'
      )
    ))
  )
  WHERE display_name IS NOT NULL
    AND LENGTH(TRIM(display_name)) >= 3
    AND display_name !~ '^\.$'
    AND display_name !~ '^\?$'
    AND display_name !~ '^\…$';
  GET DIAGNOSTICS clients_cleaned = ROW_COUNT;

  -- STEP 3: Deduplicate clients by phone (renamed column alias to avoid ambiguity)
  FOR rec IN
    WITH ranked AS (
      SELECT id as cid, phone, display_name,
        ROW_NUMBER() OVER (
          PARTITION BY phone
          ORDER BY
            CASE WHEN display_name ~ '^[A-ZÀ-Ú]' THEN 1 ELSE 0 END DESC,
            LENGTH(COALESCE(display_name, '')) DESC,
            CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END DESC,
            created_at ASC
        ) as rn,
        FIRST_VALUE(id) OVER (
          PARTITION BY phone
          ORDER BY
            CASE WHEN display_name ~ '^[A-ZÀ-Ú]' THEN 1 ELSE 0 END DESC,
            LENGTH(COALESCE(display_name, '')) DESC,
            CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END DESC,
            created_at ASC
        ) as kept_id
      FROM clients
      WHERE phone IS NOT NULL AND phone != ''
    )
    SELECT cid as dup_id, kept_id
    FROM ranked
    WHERE rn > 1 AND cid != kept_id
  LOOP
    -- Move references from dup to master
    UPDATE conversations SET client_id = rec.kept_id WHERE client_id = rec.dup_id;
    UPDATE sales SET client_id = rec.kept_id WHERE client_id = rec.dup_id;
    UPDATE accounts_receivable SET client_id = rec.kept_id WHERE client_id = rec.dup_id;
    
    -- Move contacts/notes (ignore conflicts)
    UPDATE client_contacts SET client_id = rec.kept_id WHERE client_id = rec.dup_id;
    DELETE FROM client_notes WHERE client_id = rec.dup_id;

    -- Merge fields
    UPDATE clients m SET
      email = COALESCE(NULLIF(m.email, ''), (SELECT email FROM clients WHERE id = rec.dup_id)),
      city = COALESCE(m.city, (SELECT city FROM clients WHERE id = rec.dup_id)),
      state = COALESCE(m.state, (SELECT state FROM clients WHERE id = rec.dup_id)),
      country = COALESCE(m.country, (SELECT country FROM clients WHERE id = rec.dup_id))
    WHERE m.id = rec.kept_id;

    DELETE FROM clients WHERE id = rec.dup_id;
    clients_deduped := clients_deduped + 1;
  END LOOP;

  -- STEP 4: Link sales to clients by name
  FOR rec IN
    SELECT s.id as sale_id,
           LOWER(TRIM(s.name)) as sale_name
    FROM sales s
    WHERE s.client_id IS NULL
      AND s.name IS NOT NULL
      AND LENGTH(TRIM(s.name)) > 3
  LOOP
    SELECT c.id INTO found_client_id
    FROM clients c
    WHERE LOWER(TRIM(c.display_name)) = rec.sale_name
    LIMIT 1;

    IF found_client_id IS NOT NULL THEN
      UPDATE sales SET client_id = found_client_id WHERE id = rec.sale_id;
      clients_linked := clients_linked + 1;
      found_client_id := NULL;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'sales_names_cleaned', sales_cleaned,
    'clients_names_cleaned', clients_cleaned,
    'clients_deduplicated', clients_deduped,
    'sales_linked_to_clients', clients_linked
  );
END;
$function$;

-- Execute the cleanup
SELECT public.cleanup_client_names();
