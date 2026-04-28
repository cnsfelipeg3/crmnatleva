
-- ============================================================================
-- PERFORMANCE INDEXES · Auditoria de redundância feita antes (28-Apr-2026)
-- Todas operações são idempotentes (CREATE INDEX IF NOT EXISTS).
-- ============================================================================

-- sales (1.4k rows · cresce a cada venda)
-- Atende: dashboard BI filtrando por vendedor + status, ordenado por data.
-- Ex: SELECT ... FROM sales WHERE seller_id=? AND status=? ORDER BY created_at DESC.
-- NOTA: idx_sales_seller_created já existe (seller_id, created_at) mas NÃO cobre status no meio.
CREATE INDEX IF NOT EXISTS idx_sales_seller_status_created
  ON public.sales(seller_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

-- sales · KPIs temporais por close_date (Dashboard Reporting Standard)
-- Ex: SELECT SUM(received_value) FROM sales WHERE close_date >= ? AND close_date < ?
--      AND deleted_at IS NULL.
-- Não há índice em close_date hoje · scan completo nos KPIs mensais.
CREATE INDEX IF NOT EXISTS idx_sales_close_date
  ON public.sales(close_date DESC)
  WHERE deleted_at IS NULL AND close_date IS NOT NULL;

-- attachments (4k rows · cresce com upload de boarding passes)
-- Atende: página de detalhe da venda lista anexos · SELECT * FROM attachments WHERE sale_id=?.
-- Sem índice em sale_id hoje · seq scan a cada abertura de venda.
CREATE INDEX IF NOT EXISTS idx_attachments_sale
  ON public.attachments(sale_id)
  WHERE sale_id IS NOT NULL;

-- cost_items (2.3k rows · cresce com cada custo lançado)
-- Atende: cálculo de margem/total cost na página de detalhe da venda.
-- Ex: SELECT SUM(value) FROM cost_items WHERE sale_id=?.
-- Sem índice em sale_id hoje.
CREATE INDEX IF NOT EXISTS idx_cost_items_sale
  ON public.cost_items(sale_id)
  WHERE sale_id IS NOT NULL;

-- ============================================================================
-- SKIPPED (auditados · já cobertos ou tabela pequena demais):
--   conversation_messages · idx_conversation_messages_conv_created já existe
--   conversations · idx_conversations_status_updated já existe
--   sale_passengers · UNIQUE (sale_id, passenger_id) já prefixa sale_id lookups
--   proposals · 59 rows · index gera mais overhead que ganho
--   messages · 1.5k rows + idx_messages_conversation_created já existe
--   passengers · 1.9k rows · sem coluna FK direta para sale (vai via sale_passengers)
-- ============================================================================
