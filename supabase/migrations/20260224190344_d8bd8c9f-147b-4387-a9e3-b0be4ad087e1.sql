
CREATE OR REPLACE FUNCTION public.deduplicate_passengers()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count integer := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    WITH ranked AS (
      SELECT id,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(REGEXP_REPLACE(
            TRANSLATE(full_name, 
              'áàâãäåéèêëíìîïóòôõöúùûüýÿñçÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÝÑÇ',
              'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYNC'
            ), '\s+', ' ', 'g')))
          ORDER BY
            (CASE WHEN cpf IS NOT NULL AND cpf != '' THEN 1 ELSE 0 END) +
            (CASE WHEN birth_date IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN phone IS NOT NULL AND phone != '' AND phone != 'atualizar campo' THEN 1 ELSE 0 END) +
            (CASE WHEN passport_number IS NOT NULL AND passport_number != '' THEN 1 ELSE 0 END) +
            (CASE WHEN rg IS NOT NULL AND rg != '' THEN 1 ELSE 0 END) +
            (CASE WHEN address_city IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN address_cep IS NOT NULL THEN 1 ELSE 0 END)
          DESC, created_at ASC
        ) as rn,
        FIRST_VALUE(id) OVER (
          PARTITION BY LOWER(TRIM(REGEXP_REPLACE(
            TRANSLATE(full_name, 
              'áàâãäåéèêëíìîïóòôõöúùûüýÿñçÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÝÑÇ',
              'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYNC'
            ), '\s+', ' ', 'g')))
          ORDER BY
            (CASE WHEN cpf IS NOT NULL AND cpf != '' THEN 1 ELSE 0 END) +
            (CASE WHEN birth_date IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN phone IS NOT NULL AND phone != '' AND phone != 'atualizar campo' THEN 1 ELSE 0 END) +
            (CASE WHEN passport_number IS NOT NULL AND passport_number != '' THEN 1 ELSE 0 END) +
            (CASE WHEN rg IS NOT NULL AND rg != '' THEN 1 ELSE 0 END) +
            (CASE WHEN address_city IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN address_cep IS NOT NULL THEN 1 ELSE 0 END)
          DESC, created_at ASC
        ) as master_id
      FROM passengers
    )
    SELECT id as dup_id, master_id FROM ranked WHERE rn > 1
  LOOP
    -- Merge missing fields from duplicate into master
    UPDATE passengers m SET
      cpf = COALESCE(NULLIF(m.cpf, ''), (SELECT cpf FROM passengers WHERE id = rec.dup_id)),
      phone = COALESCE(NULLIF(m.phone, ''), NULLIF(m.phone, 'atualizar campo'), (SELECT phone FROM passengers WHERE id = rec.dup_id)),
      birth_date = COALESCE(m.birth_date, (SELECT birth_date FROM passengers WHERE id = rec.dup_id)),
      passport_number = COALESCE(NULLIF(m.passport_number, ''), (SELECT passport_number FROM passengers WHERE id = rec.dup_id)),
      passport_expiry = COALESCE(m.passport_expiry, (SELECT passport_expiry FROM passengers WHERE id = rec.dup_id)),
      rg = COALESCE(NULLIF(m.rg, ''), (SELECT rg FROM passengers WHERE id = rec.dup_id)),
      address_city = COALESCE(m.address_city, (SELECT address_city FROM passengers WHERE id = rec.dup_id)),
      address_state = COALESCE(m.address_state, (SELECT address_state FROM passengers WHERE id = rec.dup_id)),
      address_cep = COALESCE(m.address_cep, (SELECT address_cep FROM passengers WHERE id = rec.dup_id)),
      address_street = COALESCE(m.address_street, (SELECT address_street FROM passengers WHERE id = rec.dup_id)),
      address_number = COALESCE(m.address_number, (SELECT address_number FROM passengers WHERE id = rec.dup_id)),
      address_neighborhood = COALESCE(m.address_neighborhood, (SELECT address_neighborhood FROM passengers WHERE id = rec.dup_id)),
      address_complement = COALESCE(m.address_complement, (SELECT address_complement FROM passengers WHERE id = rec.dup_id))
    WHERE m.id = rec.master_id;

    -- Move sale_passengers links
    UPDATE sale_passengers SET passenger_id = rec.master_id
    WHERE passenger_id = rec.dup_id
      AND NOT EXISTS (
        SELECT 1 FROM sale_passengers sp2
        WHERE sp2.sale_id = sale_passengers.sale_id AND sp2.passenger_id = rec.master_id
      );
    DELETE FROM sale_passengers WHERE passenger_id = rec.dup_id;
    DELETE FROM passengers WHERE id = rec.dup_id;
    deleted_count := deleted_count + 1;
  END LOOP;
  RETURN jsonb_build_object('passengers_deleted', deleted_count);
END;
$function$;
