-- Índices de performance · idempotentes (CREATE INDEX IF NOT EXISTS)
-- Apenas tabelas/colunas confirmadas no schema atual.

-- Mensagens de conversation_messages: histórico de uma conversa
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_created
  ON public.conversation_messages(conversation_id, created_at DESC);

-- Mensagens de messages: histórico de uma conversa
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at DESC);

-- Conversas: filtrar por status e ordenar por última atualização
CREATE INDEX IF NOT EXISTS idx_conversations_status_updated
  ON public.conversations(status, updated_at DESC);

-- Conversas por cliente
CREATE INDEX IF NOT EXISTS idx_conversations_client
  ON public.conversations(client_id) WHERE client_id IS NOT NULL;

-- Propostas: filtrar por cliente + status
CREATE INDEX IF NOT EXISTS idx_proposals_client_status
  ON public.proposals(client_id, status);

-- Propostas vinculadas a sale
CREATE INDEX IF NOT EXISTS idx_proposals_sale
  ON public.proposals(sale_id) WHERE sale_id IS NOT NULL;

-- Passengers: listar por data de criação
CREATE INDEX IF NOT EXISTS idx_passengers_created
  ON public.passengers(created_at DESC);
