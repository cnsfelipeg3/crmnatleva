-- PASSO 1: Coluna customer_since em clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS customer_since TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS customer_since_source TEXT NULL;

COMMENT ON COLUMN public.clients.customer_since IS
  'Data em que se tornou cliente NatLeva. Pode ser anterior ao created_at do sistema (importação retroativa do Monday).';
COMMENT ON COLUMN public.clients.customer_since_source IS
  'Origem do customer_since (monday_phone | monday_email | monday_name | manual).';

CREATE INDEX IF NOT EXISTS idx_clients_customer_since
  ON public.clients (customer_since DESC) WHERE customer_since IS NOT NULL;

-- PASSO 2: tabela staging (INSERTs vão por insert tool numa segunda etapa,
-- já que migration de schema não deve carregar 1870 linhas de dado)
DROP TABLE IF EXISTS public.clients_monday_staging;
CREATE TABLE public.clients_monday_staging (
  id_monday TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone_digits TEXT NULL,
  email TEXT NULL,
  criado_em TIMESTAMPTZ NOT NULL,
  categoria TEXT NULL
);

CREATE INDEX idx_staging_phone ON public.clients_monday_staging (telefone_digits) WHERE telefone_digits IS NOT NULL;
CREATE INDEX idx_staging_email ON public.clients_monday_staging (LOWER(email)) WHERE email IS NOT NULL AND email <> '' AND LOWER(email) <> 'atualizar@gmail.com';
CREATE INDEX idx_staging_name ON public.clients_monday_staging (LOWER(nome));