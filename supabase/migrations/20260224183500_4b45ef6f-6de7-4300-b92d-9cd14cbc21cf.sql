
CREATE OR REPLACE FUNCTION deduplicate_passengers() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_count integer := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    WITH ranked AS (
      SELECT id,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(full_name))
          ORDER BY
            (CASE WHEN cpf IS NOT NULL AND cpf != '' THEN 1 ELSE 0 END) +
            (CASE WHEN birth_date IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN phone IS NOT NULL AND phone != '' AND phone != 'atualizar campo' THEN 1 ELSE 0 END) +
            (CASE WHEN passport_number IS NOT NULL AND passport_number != '' THEN 1 ELSE 0 END) +
            (CASE WHEN rg IS NOT NULL AND rg != '' THEN 1 ELSE 0 END)
          DESC, created_at ASC
        ) as rn,
        FIRST_VALUE(id) OVER (
          PARTITION BY LOWER(TRIM(full_name))
          ORDER BY
            (CASE WHEN cpf IS NOT NULL AND cpf != '' THEN 1 ELSE 0 END) +
            (CASE WHEN birth_date IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN phone IS NOT NULL AND phone != '' AND phone != 'atualizar campo' THEN 1 ELSE 0 END) +
            (CASE WHEN passport_number IS NOT NULL AND passport_number != '' THEN 1 ELSE 0 END) +
            (CASE WHEN rg IS NOT NULL AND rg != '' THEN 1 ELSE 0 END)
          DESC, created_at ASC
        ) as master_id
      FROM passengers
    )
    SELECT id as dup_id, master_id FROM ranked WHERE rn > 1
  LOOP
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
$$;

CREATE OR REPLACE FUNCTION deduplicate_sales() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_count integer := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    WITH ranked AS (
      SELECT id,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(name)), close_date, received_value
          ORDER BY
            (CASE WHEN origin_iata IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN destination_iata IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN payment_method IS NOT NULL AND payment_method != 'atualizar campo' THEN 1 ELSE 0 END) +
            (CASE WHEN airline IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN seller_id IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN client_id IS NOT NULL THEN 1 ELSE 0 END)
          DESC, created_at ASC
        ) as rn,
        FIRST_VALUE(id) OVER (
          PARTITION BY LOWER(TRIM(name)), close_date, received_value
          ORDER BY
            (CASE WHEN origin_iata IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN destination_iata IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN payment_method IS NOT NULL AND payment_method != 'atualizar campo' THEN 1 ELSE 0 END) +
            (CASE WHEN airline IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN seller_id IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN client_id IS NOT NULL THEN 1 ELSE 0 END)
          DESC, created_at ASC
        ) as master_id
      FROM sales
    )
    SELECT id as dup_id, master_id FROM ranked WHERE rn > 1
  LOOP
    UPDATE sale_passengers SET sale_id = rec.master_id
    WHERE sale_id = rec.dup_id
      AND NOT EXISTS (
        SELECT 1 FROM sale_passengers sp2
        WHERE sp2.sale_id = rec.master_id AND sp2.passenger_id = sale_passengers.passenger_id
      );
    DELETE FROM sale_passengers WHERE sale_id = rec.dup_id;
    DELETE FROM attachments WHERE sale_id = rec.dup_id;
    DELETE FROM cost_items WHERE sale_id = rec.dup_id;
    DELETE FROM flight_segments WHERE sale_id = rec.dup_id;
    DELETE FROM checkin_tasks WHERE sale_id = rec.dup_id;
    DELETE FROM lodging_confirmation_tasks WHERE sale_id = rec.dup_id;
    DELETE FROM extraction_runs WHERE sale_id = rec.dup_id;
    DELETE FROM audit_log WHERE sale_id = rec.dup_id;
    DELETE FROM sales WHERE id = rec.dup_id;
    deleted_count := deleted_count + 1;
  END LOOP;
  RETURN jsonb_build_object('sales_deleted', deleted_count);
END;
$$;
