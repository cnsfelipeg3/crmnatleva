CREATE TABLE IF NOT EXISTS public.sales_backfill_backup_2026_04_24 AS
SELECT id, origin_iata, destination_iata, departure_date, return_date, airline
FROM public.sales;