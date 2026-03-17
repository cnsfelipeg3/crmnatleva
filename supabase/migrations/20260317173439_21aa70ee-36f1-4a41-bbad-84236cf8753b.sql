
-- ═══ PERFORMANCE INDEXES ═══
-- conversations: phone lookup (used heavily in inbox, webhook, dedup)
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.conversations USING btree (phone);

-- conversations: sort by last_message_at (inbox sidebar ordering)
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations USING btree (last_message_at DESC NULLS LAST);

-- conversations: stage filter (pipeline view)
CREATE INDEX IF NOT EXISTS idx_conversations_stage ON public.conversations USING btree (stage);

-- conversations: client_id lookup
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations USING btree (client_id) WHERE client_id IS NOT NULL;

-- chat_messages: conversation_id (656k rows, no index!)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);

-- conversation_messages: timestamp ordering (main sort column)
CREATE INDEX IF NOT EXISTS idx_cm_conversation_timestamp ON public.conversation_messages USING btree (conversation_id, timestamp DESC NULLS LAST);

-- clients: phone lookup (dedup, linking)
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients USING btree (phone) WHERE phone IS NOT NULL AND phone != '';

-- clients: display_name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_clients_display_name ON public.clients USING btree (lower(display_name));

-- sales: created_at for dashboard ordering
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales USING btree (created_at DESC);

-- sales: status filter
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales USING btree (status);

-- sales: seller_id for ranking/filtering
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON public.sales USING btree (seller_id) WHERE seller_id IS NOT NULL;
