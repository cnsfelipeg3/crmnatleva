
# Converter Proposta em Venda

## Objetivo

Permitir que uma proposta vire um rascunho de venda com 1 clique, herdando todos os dados que já existem (cliente, datas, destino, passageiros, valores, voos, hospedagem) e deixando para o operador apenas o que falta (fornecedor, localizadores, custos reais, forma de pagamento).

## Princípios para evitar bugs

1. Operação idempotente: se a proposta já tem `sale_id` preenchido, o botão NÃO cria outra venda · ele abre a venda existente (com aviso).
2. Conversão dentro de 1 transação no servidor (Edge Function com service role), não no cliente · evita venda criada pela metade se a aba fechar.
3. Venda nasce com `status = 'Rascunho'` (já é o default da tabela `sales`) e nada vira receita/comissão até o operador salvar como concluída.
4. Link bidirecional: `proposals.sale_id` aponta para a venda · `sales` recebe `source_proposal_id` (nova coluna) para auditoria reversa.
5. Nada de apagar/alterar a proposta original. A proposta continua viva e navegável.

## Fluxo do usuário

```text
[Proposta aberta]
       |
       v
  Botão "Converter em Venda"
       |
       v
  Modal de confirmação
   - mostra resumo do que será copiado
   - avisa "Vai criar um rascunho · você revisa antes de concluir"
   - se já existe venda vinculada: botão vira "Abrir venda vinculada"
       |
       v
  Edge Function: proposal-to-sale
   - valida proposta
   - cria sale (Rascunho)
   - copia voos -> flight_segments
   - copia hotel -> campos hotel_* + cost_items (hotel)
   - copia passageiros (se já existirem no briefing)
   - grava proposals.sale_id e sales.source_proposal_id
       |
       v
  Redireciona para /vendas/{id}/editar
   - banner no topo: "Rascunho gerado a partir da proposta X · Complete os dados em aberto"
   - lista de campos pendentes destacados (fornecedor, localizador, custo real, forma de pgto)
```

## O que será copiado (mapeamento)

| Proposta (origem)                          | Venda (destino)                                  |
|--------------------------------------------|--------------------------------------------------|
| `client_id`                                | `sales.client_id`                                |
| `client_name`                              | `sales.name`                                     |
| `origin`                                   | `sales.origin_city` / `origin_iata` (via lookup) |
| `destinations[0]`                          | `sales.destination_city` / `destination_iata`    |
| `travel_start_date` / `travel_end_date`    | `sales.departure_date` / `return_date`           |
| `passengers_adults` / `_children` / `ages` | `sales.adults` / `children` / `children_ages`    |
| `total_value`                              | `sales.received_value` (provisório, editável)    |
| `proposal_items` tipo `flight`             | `flight_segments` (1 linha por trecho)           |
| `proposal_items` tipo `hotel`              | `sales.hotel_*` + `cost_items` (category=hotel)  |
| `proposal_items` tipo `service` / `extra`  | `cost_items` (category derivada do tipo)         |
| `created_by` (consultor)                   | `sales.seller_id`                                |

Campos NÃO copiados (entram vazios para o operador preencher):
- `payment_method`, `airline` final, `locators`, `total_cost`, `profit`, `margin`, `emission_status`, `supplier_id` nos `cost_items`, `card_info`.

## Regras de segurança e dados

- Se a proposta tiver `status = 'lost'` ou `proposal_outcome = 'rejected'`: bloquear conversão com mensagem clara.
- Se faltar dado mínimo (sem destino OU sem data de ida): exigir preenchimento na proposta antes de converter, em vez de criar venda quebrada.
- Conversão registra evento em `audit_log` com `sale_id` e referência à proposta · facilita rastrear origem de cada venda no futuro.
- Edge function valida JWT em código (padrão do projeto) e roda com service role só para o passo de inserts encadeados.

## Mudanças técnicas

Banco (migration):
- `ALTER TABLE sales ADD COLUMN source_proposal_id uuid REFERENCES proposals(id) ON DELETE SET NULL;`
- Índice `idx_sales_source_proposal_id`.

Edge Function nova:
- `supabase/functions/proposal-to-sale/index.ts`
- Input: `{ proposal_id }`. Output: `{ sale_id, already_existed: boolean }`.
- Faz tudo em ordem: sale -> flight_segments -> cost_items -> update proposal.sale_id -> audit_log.
- Em qualquer erro intermediário, deleta o `sale` recém criado (compensação) para não deixar lixo.

Frontend:
- Botão "Converter em Venda" em:
  - `src/pages/ProposalEditor.tsx` (header da proposta)
  - Card da proposta em `src/pages/Proposals.tsx` e no painel detalhe do pipeline (`NegotiationDetailPanel`)
- Modal de confirmação compartilhado: `src/components/proposal/ConvertToSaleDialog.tsx`
- Após sucesso: `navigate('/vendas/' + sale_id + '/editar')` + toast.
- Hook utilitário: `src/lib/proposalToSaleBridge.ts` (chama a edge function, trata erros, devolve `sale_id`).
- Banner "Rascunho a partir da proposta" no editor de venda quando `sales.source_proposal_id` estiver preenchido, com link para abrir a proposta de origem em nova aba.

## Pontos a confirmar antes de eu construir

1. Quando a proposta já tem `sale_id`, o botão deve mesmo só "abrir venda existente", ou você quer permitir gerar uma nova venda mesmo assim (caso a primeira tenha sido descartada)?
2. O valor que entra como `received_value` no rascunho deve ser o `total_value` cheio da proposta, ou zero (pra forçar o operador a digitar o valor realmente recebido)?
3. Os `cost_items` herdados da proposta entram com custo provisório igual ao valor mostrado no item, ou entram zerados (pra forçar lançamento do custo real do fornecedor)?

Se você responder essas três e estiver de acordo com o restante, eu sigo direto para a implementação.
