-- Performance indexes for critical query paths

-- Conversations: fast lookup by phone (inbox sidebar, message linking)
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.conversations (phone);

-- Conversations: ordering by last_message_at for sidebar
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations (last_message_at DESC NULLS LAST);

-- Conversation messages: fast load by conversation + time (chat history)
CREATE INDEX IF NOT EXISTS idx_conv_messages_conv_ts ON public.conversation_messages (conversation_id, timestamp DESC NULLS LAST);

-- Conversation messages: dedup by external_message_id
CREATE INDEX IF NOT EXISTS idx_conv_messages_ext_id ON public.conversation_messages (external_message_id) WHERE external_message_id IS NOT NULL;

-- Sales: dashboard filters by seller + created_at
CREATE INDEX IF NOT EXISTS idx_sales_seller_created ON public.sales (seller_id, created_at DESC);

-- Sales: dashboard filters by status
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales (status);

-- Proposals: lookup by client
CREATE INDEX IF NOT EXISTS idx_proposals_client ON public.proposals (client_id) WHERE client_id IS NOT NULL;

-- Accounts receivable: financial dashboard
CREATE INDEX IF NOT EXISTS idx_ar_status_due ON public.accounts_receivable (status, due_date);

-- Accounts payable: financial dashboard
CREATE INDEX IF NOT EXISTS idx_ap_status_due ON public.accounts_payable (status, due_date);