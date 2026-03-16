CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_created
ON conversation_messages (conversation_id, created_at DESC);