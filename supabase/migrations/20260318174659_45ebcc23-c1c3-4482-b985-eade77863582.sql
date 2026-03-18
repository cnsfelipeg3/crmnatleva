
-- TEMPORARY: Full anonymous access to ALL tables
-- Tables that already have temp_anon_read policies are skipped with IF NOT EXISTS equivalent

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'accounts_payable','accounts_receivable','ai_chat_history','ai_chat_suggestions','ai_config',
    'ai_execution_logs','ai_integrations','ai_knowledge_base','ai_learned_patterns','ai_learning_events',
    'ai_strategy_knowledge','ai_suggestions','airline_checkin_rules','airline_logos','attachments',
    'audit_log','automation_edges','automation_executions','automation_flows','automation_nodes',
    'chart_of_accounts','chat_messages','chatbot_sessions','client_contacts','client_notes',
    'client_travel_preferences','client_trip_memory','commission_rules','conversation_messages',
    'conversation_reconciliation_log','conversation_transfers','conversations','cost_items',
    'credit_card_items','credit_cards','employee_documents','employees','extraction_runs',
    'feedbacks','flight_segments','flow_edges','flow_execution_logs','flow_nodes',
    'flow_router_rules','flow_versions','flows','goals','hotel_contact_directory',
    'hotel_media_cache','hr_access_log','import_jobs','livechat_users','lodging_confirmation_tasks',
    'media_items','media_places','message_queue','messages','natleva_brain_insights',
    'passengers','payment_fee_rules','payroll','performance_scores','pipeline_rebuild_log',
    'portal_access','portal_assistant_logs','portal_budget_categories','portal_cash_tracking',
    'portal_checklist_items','portal_expense_group_members','portal_expense_groups',
    'portal_expense_settlements','portal_expense_splits','portal_expenses','portal_group_expenses',
    'portal_notifications','portal_published_sales','portal_quote_requests','portal_travel_budgets',
    'portal_travel_cards','profiles','proposal_interactions','proposal_items','proposal_viewers',
    'proposal_views','proposals','receiving_accounts','sale_passengers','sale_payments','sales',
    'supplier_miles_programs','supplier_settlement_items','supplier_settlements','suppliers',
    'tariff_conditions','team_checkins','time_adjustment_requests','time_entries',
    'trip_alteration_attachments','trip_alteration_history','trip_alterations','user_locations',
    'user_roles','warnings','webhook_logs','whatsapp_cloud_config','whatsapp_config',
    'whatsapp_dispatch_logs','whatsapp_events_raw','whatsapp_qr_sessions','whatsapp_templates',
    'zapi_contacts','zapi_messages','checkin_tasks','clients'
  ];
BEGIN
  FOR i IN 1..array_length(tables, 1) LOOP
    t := tables[i];
    -- Drop existing temp policies if any
    EXECUTE format('DROP POLICY IF EXISTS "temp_anon_read_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "temp_anon_full_%s" ON public.%I', t, t);
    -- Create full access policy for anon
    EXECUTE format('CREATE POLICY "temp_anon_full_%s" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END;
$$;
