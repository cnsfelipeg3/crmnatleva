-- Limpa contatos gravados com o nome da agência por bug antigo do webhook.
-- Substitui por NULL pra que o front exiba phone como fallback até a próxima
-- mensagem inbound do cliente atualizar com o nome real (auto-correção via
-- isAgencyOrGenericName em upsertConversation).

-- 1. conversations.contact_name
UPDATE public.conversations
SET contact_name = NULL
WHERE LOWER(TRIM(contact_name)) IN (
  'natleva',
  'natleva viagens',
  'natleva wings',
  'atendente',
  'operador',
  'agencia',
  'agência'
);

-- 2. zapi_contacts.name
UPDATE public.zapi_contacts
SET name = NULL
WHERE LOWER(TRIM(name)) IN (
  'natleva',
  'natleva viagens',
  'natleva wings',
  'atendente',
  'operador',
  'agencia',
  'agência'
);

-- NOTA: zapi_messages.sender_name PODE legitimamente ser "NatLeva Viagens"
-- quando from_me=true (a agência enviou). Não limpamos essa coluna.