-- Limpa contatos contaminados com nome da agência (bug antigo do webhook)
UPDATE public.conversations
SET contact_name = NULL
WHERE LOWER(TRIM(contact_name)) IN (
  'natleva','natleva viagens','natleva wings',
  'atendente','operador','agencia','agência'
);

UPDATE public.zapi_contacts
SET name = NULL
WHERE LOWER(TRIM(name)) IN (
  'natleva','natleva viagens','natleva wings',
  'atendente','operador','agencia','agência'
);