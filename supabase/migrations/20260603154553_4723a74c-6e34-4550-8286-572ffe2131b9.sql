-- ============================================================
-- SECURITY HARDENING: revoke anon access to ultra-sensitive data
-- ============================================================

-- AI CONFIG
DROP POLICY IF EXISTS "temp_anon_full_ai_config" ON public.ai_config;
CREATE POLICY "authenticated_full_ai_config" ON public.ai_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.ai_config FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_config TO authenticated;

-- CHATBOT SESSIONS
DROP POLICY IF EXISTS "temp_anon_full_chatbot_sessions" ON public.chatbot_sessions;
DROP POLICY IF EXISTS "Public can manage chatbot_sessions" ON public.chatbot_sessions;
CREATE POLICY "authenticated_full_chatbot_sessions" ON public.chatbot_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.chatbot_sessions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_sessions TO authenticated;

-- CLIENT PII
DROP POLICY IF EXISTS "temp_anon_full_client_contacts" ON public.client_contacts;
CREATE POLICY "authenticated_full_client_contacts" ON public.client_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.client_contacts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contacts TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_client_notes" ON public.client_notes;
CREATE POLICY "authenticated_full_client_notes" ON public.client_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.client_notes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_client_travel_preferences" ON public.client_travel_preferences;
CREATE POLICY "authenticated_full_client_travel_preferences" ON public.client_travel_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.client_travel_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_travel_preferences TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_client_trip_memory" ON public.client_trip_memory;
CREATE POLICY "authenticated_full_client_trip_memory" ON public.client_trip_memory FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.client_trip_memory FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_trip_memory TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_whatsapp_dispatch_logs" ON public.whatsapp_dispatch_logs;
CREATE POLICY "authenticated_full_whatsapp_dispatch_logs" ON public.whatsapp_dispatch_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.whatsapp_dispatch_logs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_dispatch_logs TO authenticated;

-- EMPLOYEE HR
DROP POLICY IF EXISTS "temp_anon_full_employee_documents" ON public.employee_documents;
CREATE POLICY "authenticated_full_employee_documents" ON public.employee_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.employee_documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_documents TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_feedbacks" ON public.feedbacks;
CREATE POLICY "authenticated_full_feedbacks" ON public.feedbacks FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.feedbacks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedbacks TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_warnings" ON public.warnings;
CREATE POLICY "authenticated_full_warnings" ON public.warnings FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.warnings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warnings TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_time_entries" ON public.time_entries;
CREATE POLICY "authenticated_full_time_entries" ON public.time_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.time_entries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_time_adjustment_requests" ON public.time_adjustment_requests;
CREATE POLICY "authenticated_full_time_adjustment_requests" ON public.time_adjustment_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.time_adjustment_requests FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_adjustment_requests TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_performance_scores" ON public.performance_scores;
CREATE POLICY "authenticated_full_performance_scores" ON public.performance_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.performance_scores FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_scores TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_team_checkins" ON public.team_checkins;
CREATE POLICY "authenticated_full_team_checkins" ON public.team_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.team_checkins FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_checkins TO authenticated;

-- EXTRACTION RUNS (travel docs raw text)
DROP POLICY IF EXISTS "temp_anon_full_extraction_runs" ON public.extraction_runs;
CREATE POLICY "authenticated_full_extraction_runs" ON public.extraction_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.extraction_runs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extraction_runs TO authenticated;

-- FINANCIAL
DROP POLICY IF EXISTS "temp_anon_full_accounts_receivable" ON public.accounts_receivable;
CREATE POLICY "authenticated_full_accounts_receivable" ON public.accounts_receivable FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.accounts_receivable FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts_receivable TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_accounts_payable" ON public.accounts_payable;
CREATE POLICY "authenticated_full_accounts_payable" ON public.accounts_payable FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.accounts_payable FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts_payable TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_sale_payments" ON public.sale_payments;
CREATE POLICY "authenticated_full_sale_payments" ON public.sale_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.sale_payments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_cost_items" ON public.cost_items;
CREATE POLICY "authenticated_full_cost_items" ON public.cost_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.cost_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_items TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_supplier_settlements" ON public.supplier_settlements;
CREATE POLICY "authenticated_full_supplier_settlements" ON public.supplier_settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.supplier_settlements FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_settlements TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_supplier_settlement_items" ON public.supplier_settlement_items;
CREATE POLICY "authenticated_full_supplier_settlement_items" ON public.supplier_settlement_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.supplier_settlement_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_settlement_items TO authenticated;

DROP POLICY IF EXISTS "temp_anon_full_supplier_miles_programs" ON public.supplier_miles_programs;
CREATE POLICY "authenticated_full_supplier_miles_programs" ON public.supplier_miles_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.supplier_miles_programs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_miles_programs TO authenticated;

-- TRIP ALTERATIONS (PIX keys)
DROP POLICY IF EXISTS "temp_anon_full_trip_alterations" ON public.trip_alterations;
CREATE POLICY "authenticated_full_trip_alterations" ON public.trip_alterations FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.trip_alterations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_alterations TO authenticated;

-- WHATSAPP
DROP POLICY IF EXISTS "Public can manage zapi_messages" ON public.zapi_messages;
DROP POLICY IF EXISTS "temp_anon_full_zapi_messages" ON public.zapi_messages;
CREATE POLICY "authenticated_full_zapi_messages" ON public.zapi_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.zapi_messages FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zapi_messages TO authenticated;

DROP POLICY IF EXISTS "Allow all" ON public.message_recipient_status;
DROP POLICY IF EXISTS "Allow all operations" ON public.message_recipient_status;
DROP POLICY IF EXISTS "temp_anon_full_message_recipient_status" ON public.message_recipient_status;
CREATE POLICY "authenticated_full_message_recipient_status" ON public.message_recipient_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.message_recipient_status FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_recipient_status TO authenticated;

-- SALE PASSENGERS
DROP POLICY IF EXISTS "temp_anon_full_sale_passengers" ON public.sale_passengers;
CREATE POLICY "authenticated_full_sale_passengers" ON public.sale_passengers FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.sale_passengers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_passengers TO authenticated;