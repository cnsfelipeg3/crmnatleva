
-- TEMPORARY: Allow anonymous read access to dashboard tables
-- Remove these policies when re-enabling auth

CREATE POLICY "temp_anon_read_sales" ON public.sales FOR SELECT TO anon USING (true);
CREATE POLICY "temp_anon_read_profiles" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "temp_anon_read_clients" ON public.clients FOR SELECT TO anon USING (true);
CREATE POLICY "temp_anon_read_flight_segments" ON public.flight_segments FOR SELECT TO anon USING (true);
CREATE POLICY "temp_anon_read_cost_items" ON public.cost_items FOR SELECT TO anon USING (true);
CREATE POLICY "temp_anon_read_checkin_tasks" ON public.checkin_tasks FOR SELECT TO anon USING (true);
CREATE POLICY "temp_anon_read_lodging_tasks" ON public.lodging_confirmation_tasks FOR SELECT TO anon USING (true);
