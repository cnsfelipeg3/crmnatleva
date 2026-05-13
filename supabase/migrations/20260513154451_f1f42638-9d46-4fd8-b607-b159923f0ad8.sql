ALTER TABLE public.hotel_payment_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel_payment_cache_select" ON public.hotel_payment_cache;
DROP POLICY IF EXISTS "hotel_payment_cache_insert" ON public.hotel_payment_cache;
DROP POLICY IF EXISTS "hotel_payment_cache_update" ON public.hotel_payment_cache;

CREATE POLICY "hotel_payment_cache_select"
  ON public.hotel_payment_cache FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "hotel_payment_cache_insert"
  ON public.hotel_payment_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "hotel_payment_cache_update"
  ON public.hotel_payment_cache FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);