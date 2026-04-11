

# Plano: Ponte Cotações ↔ Propostas

## Contexto

Hoje os módulos **Cotações** (`portal_quote_requests`) e **Propostas** (`proposals`) vivem isolados. O objetivo é que toda cotação gere automaticamente um rascunho de proposta vinculada, e que o consultor consiga navegar entre os dois de forma fluida.

## O que será feito

### 1. Schema — Vincular cotação à proposta

- Adicionar coluna `quote_request_id` (uuid, FK → `portal_quote_requests.id`) na tabela `proposals`
- Adicionar coluna `proposal_id` (uuid, FK → `proposals.id`) na tabela `portal_quote_requests` para referência bidirecional rápida

### 2. Bridge — `quoteToProposalBridge.ts`

Nova lib que converte uma cotação em proposta rascunho:

- Mapeia campos da cotação → proposta: `origin_city` → `origin`, `destination_city` → `destinations`, `departure_date` → `travel_start_date`, `return_date` → `travel_end_date`, passageiros → `passenger_count`, `cabin_class`, `budget_range`
- Reutiliza `pickBestTemplate` existente para selecionar o template visual automaticamente
- Reutiliza `buildSuggestedItems` para popular `proposal_items` com voos, hotel e experiências sugeridas
- Gera slug único e título automático (ex: "Proposta Orlando — Ana Silva")
- Salva `quote_request_id` na proposta e `proposal_id` na cotação

### 3. UI — Botão "Gerar Proposta" na tela de Cotações

Na área expandida de cada cotação (`QuoteRequests.tsx`):

- Novo botão **"Gerar Proposta"** (aparece nos status `pending`, `reviewing`, `quoted`)
- Ao clicar: chama a bridge, cria a proposta, atualiza status da cotação para `quoted`, e exibe toast com link direto para o editor da proposta
- Se a cotação já possui `proposal_id`, mostra botão **"Ver Proposta"** que navega direto ao editor

### 4. UI — Badge de origem na tela de Propostas

Em `Proposals.tsx`:

- Se a proposta tem `quote_request_id`, exibir badge "Portal" ao lado do status para identificar visualmente que veio de uma cotação do portal

### 5. Navegação cruzada

- Na proposta (editor), se houver `quote_request_id`, mostrar link "Ver cotação original" que leva à aba de cotações
- Na cotação expandida, se houver `proposal_id`, mostrar link "Ver proposta" que navega ao editor

---

## Arquivos impactados

| Arquivo | Ação |
|---|---|
| `supabase/migrations/...` | Colunas `quote_request_id` e `proposal_id` |
| `src/lib/quoteToProposalBridge.ts` | Nova lib (reutiliza lógica do briefingProposalBridge) |
| `src/pages/QuoteRequests.tsx` | Botões "Gerar Proposta" / "Ver Proposta" |
| `src/pages/Proposals.tsx` | Badge "Portal" |
| `src/pages/ProposalEditor.tsx` | Link "Ver cotação original" |

