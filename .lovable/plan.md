
# Backup geral defensivo · NatLeva

> Pré-requisito do plano de migração. Saída final: **um único ZIP em `/mnt/documents/natleva_backup_<timestamp>.zip`** + checklist em Markdown para os secrets que não podem ser exportados pela plataforma.

---

## Escopo aprovado

| Camada | Estratégia |
|---|---|
| Banco · dados | CSV por tabela (todas as ~170 do `public`) via `COPY ... TO STDOUT CSV HEADER` |
| Banco · estrutura | SQL com schema, tabelas, índices, FKs, policies RLS, funções, triggers, views, `cron.job` |
| Storage | Download integral dos 20.012 arquivos em 14 buckets, preservando hierarquia `bucket/path` |
| Código (edge functions + frontend) | `git bundle --all` do repo + cópia direta da pasta `supabase/functions/` |
| Segredos / API keys | Checklist `.md` com origem, painel de cada serviço e procedimento de rotação (valores NÃO são exportáveis pela plataforma) |
| Vault / GUC | Nome do segredo + instrução de recuperação (valor não é legível por API) |

---

## Etapas de execução (todas em background, com log progressivo)

### 1 · Preparação (≈30s)
- Criar `/mnt/documents/natleva_backup_<ts>/` com subpastas `db/`, `db_schema/`, `storage/`, `code/`, `meta/`.
- Snapshot inicial: `row counts` por tabela + soma financeira de `sales/sale_payments/affiliate_commissions` → `meta/baseline.json`. Usado depois como prova de integridade.

### 2 · Banco · dados (≈10-20 min)
- Script Python que lista todas as tabelas do `public` (`information_schema.tables`) e exporta cada uma como `db/<tabela>.csv` via `psql COPY`.
- Tabelas pesadas (`chat_messages` 656k, `conversation_messages` 555k, `whatsapp_events_raw` 60k) saem em CSV puro · sem compactação intermediária pra evitar OOM.
- Inclui também `storage.objects` (metadados dos arquivos) e `cron.job`.

### 3 · Banco · estrutura (≈1 min)
- Query no `pg_dump` lógico via `information_schema` + `pg_catalog`:
  - `db_schema/tables.sql` (CREATE TABLE + índices + FKs)
  - `db_schema/policies.sql` (RLS de `pg_policies`)
  - `db_schema/functions.sql` (todas as funções de `pg_proc` no `public`)
  - `db_schema/triggers.sql`
  - `db_schema/views.sql`
  - `db_schema/cron_jobs.sql`
  - `db_schema/grants.sql`

### 4 · Storage (≈2-6 horas · etapa mais longa)
- Lista paginada de `storage.objects` por bucket.
- Para cada objeto, download via API REST `/storage/v1/object/<bucket>/<path>` salvando em `storage/<bucket>/<mesma_estrutura>`.
- Bucket privado (`chatguru-imports`, `ai-knowledge-base`, `employee-documents`) é baixado com `SERVICE_ROLE` apenas em runtime (chave nunca sai do sandbox).
- Progresso por bucket gravado em `meta/storage_progress.log` (linha por arquivo) para retomar em caso de falha.
- Distribuição esperada: `media` 11.200 · `whatsapp-media` 4.150 · `sale-attachments` 3.154 · `whatsapp-status` 856 · `chatguru-imports` 414 · `marketing-assets` 136 · `audios` 88 · `ai-knowledge-base` 13 · `stickers` 1.

### 5 · Código (≈1 min)
- `git bundle create code/natleva.bundle --all` → contém histórico completo do repo.
- Cópia espelho de `supabase/functions/` em `code/edge_functions/` (legível sem git).
- `meta/git_head.txt` com SHA, branch e data do último commit.

### 6 · Checklist de secrets (≈30s) — entregue em `meta/SECRETS_CHECKLIST.md`
Para cada secret abaixo: **onde achar o valor**, **como rotacionar** e **impacto se ficar fora do ar**.

| Secret | Origem do valor | Risco se rotacionar mal |
|---|---|---|
| `ZAPI_INSTANCE_ID` · `ZAPI_TOKEN` · `ZAPI_CLIENT_TOKEN` | Painel Z-API → Instância → Tokens | Alto · WhatsApp para de enviar/receber |
| `WHATSAPP_ENCRYPTION_KEY` + GUC `app.whatsapp_encryption_key` | Lovable Project Settings → Secrets (anotar agora) | Crítico · perde acesso a tokens cifrados (hoje 0 linhas, baixo) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Médio · IA estratégica para |
| `AMADEUS_API_KEY` · `AMADEUS_API_SECRET` | developers.amadeus.com → Self-Service | Médio · busca de voo para |
| `RAPIDAPI_KEY` · `RAPIDAPI_GFLIGHTS_KEY` | rapidapi.com → dashboard | Médio · hotel/voo cache para |
| `INFINITEPAY_HANDLE` | Painel InfinitePay → Conta | Crítico financeiro · cobrança quebra |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → APIs | Baixo · mapa/concierge para |
| `FIRECRAWL_API_KEY` (connector) | Lovable Connectors → Firecrawl | Médio · scrape de URL para |
| `GOOGLE_MAIL_API_KEY` (connector) | Lovable Connectors → Google Mail | Baixo · só envio Gmail |
| `SUPADATA_API_KEY` | supadata.ai → dashboard | Baixo · YouTube extract |
| `OPEN_EXCHANGE_RATES_APP_ID` | openexchangerates.org | Baixo · cotação USD/BRL |
| `WEBHOOK_SHARED_SECRET` · `WATCHDOG_SHARED_SECRET` · `SCHEDULED_SHARED_SECRET` | Internos · Lovable Secrets | Crítico se rotacionado sem coordenação cron |
| `SUPABASE_*` (URL, ANON, SERVICE_ROLE, JWKS, PUBLISHABLE, DB_URL, SECRET_KEYS) | Gerenciado pelo Lovable Cloud · NÃO rotacionar manualmente | Quebra app inteiro |
| Vault `email_queue_service_role_key` | Igual ao `SERVICE_ROLE_KEY` atual | E-mail transacional para se desincronizar |

Documento traz, para cada item, o link direto do painel + ordem segura de rotação descrita no plano anterior.

### 7 · Empacotamento (≈5-15 min · depende do storage)
- `meta/MANIFEST.json` com: contagem de arquivos por pasta, MD5 de cada CSV, tamanho total, timestamp inicial/final.
- `zip -r natleva_backup_<ts>.zip natleva_backup_<ts>/` em `/mnt/documents/`.
- Resultado final exibido como artefato baixável.

---

## Validação pós-backup (antes de declarar pronto)

1. Confirmar que `len(db/*.csv)` == nº de tabelas listadas no `information_schema`.
2. Confirmar que `len(storage/<bucket>/**)` == `count(*) from storage.objects where bucket_id = ...` para cada bucket.
3. Abrir aleatoriamente 5 arquivos CSV e validar header + 1 linha.
4. Abrir 3 arquivos do storage (1 imagem, 1 áudio, 1 PDF) e validar tamanho > 0.
5. `git bundle verify code/natleva.bundle`.
6. Exibir resumo final com tamanho do ZIP e tempo total.

---

## O que este backup NÃO cobre (transparência total)

- **Valores reais dos secrets** · plataforma esconde. Solução: você abre cada painel listado no checklist e salva no seu cofre.
- **Configuração de Auth providers, redirect URLs, templates do Supabase Auth** · não exportáveis por API. Anotar manualmente nas configurações antes do transfer.
- **Histórico de logs de Edge Functions** · Lovable mantém retenção própria; não baixamos.
- **DNS de `adm.natleva.com`** · gerenciado no seu provedor de domínio (Registro.br / Cloudflare / o que for).

---

## Estimativas

- Tempo total: **2 a 6 horas** (dominado pelo storage de 20k arquivos).
- Tamanho final estimado: **3 a 8 GB** zipados (dependendo das mídias).
- Espaço temporário em `/mnt/documents`: **até 12 GB** durante a execução (limpo após zip).

---

## Decisão necessária antes de executar

Confirme só estes 3 pontos finais e eu inicio:

1. **Pode rodar agora mesmo, ou prefere horário de baixa atividade?** (o backup não interrompe nada, mas usa banda do storage por horas)
2. **OK gerar 1 ZIP único de até ~8 GB?** Se ficar pesado demais pro seu download, posso quebrar em volumes de 2 GB (`zip -s 2g`).
3. **Confirma que o backup é DEFENSIVO** (não substitui o transfer; é seguro extra) — só pra alinhar expectativa.

Aprovando, eu mudo pra build mode e executo as 7 etapas em sequência, com log progressivo no chat.
