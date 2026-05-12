## Padrão único de pagamento na Prateleira Natleva

Substituir os múltiplos modelos de pagamento (PIX, cartão, entrada+saldo, condições livres) por **um único modelo padrão** aplicado a todos os produtos da Prateleira: **30% de entrada à vista + saldo parcelado no boleto sem juros, quitação até 20 dias antes do check-in**.

### 1. Cálculo dinâmico do parcelamento

Para cada produto, calcular automaticamente:

- **Entrada (30%)**: `price_from × 0.30` (ou `price_promo` se houver)
- **Saldo (70%)**: `price_from × 0.70`
- **Data limite de quitação**: `departure_date - 20 dias`
- **Parcelas disponíveis**: meses inteiros entre hoje e a data limite (mínimo 1, máximo 12)
- **Valor da parcela**: `saldo / nº de parcelas`

Quando não houver `departure_date` (datas flexíveis), exibir simulação assumindo embarque em 6 meses + nota "varia conforme a data escolhida".

### 2. Componente novo · `PaymentPlanCard`

Bloco visual destacado na página pública do produto (`PrateleiraVendaPublica.tsx`) substituindo o atual "Formas de pagamento". Estrutura:

```text
┌──────────────────────────────────────────────────┐
│  Como você paga essa viagem                      │
│                                                  │
│  1) Entrada de 30%  →  R$ X.XXX                  │
│     PIX, cartão ou link de pagamento             │
│                                                  │
│  2) Saldo de 70%    →  R$ Y.YYY em até Nx        │
│     Boleto sem juros · R$ Z/mês                  │
│                                                  │
│  Quitação até DD/MM/AAAA (20 dias antes)         │
└──────────────────────────────────────────────────┘
```

Inclui um **bloco de copy de venda** (texto persuasivo, sem emojis, tom Natleva):

> "Viajar sem cartão de crédito é possível. Você dá só 30% de entrada (PIX, cartão ou link de pagamento) e divide os 70% restantes em parcelas mensais no boleto, sem nenhum juro. Quanto antes você reservar, mais parcelas a gente consegue encaixar e menor fica o valor que cabe no seu mês. A única regra é uma só: a viagem precisa estar quitada 20 dias antes do embarque, pra você viajar tranquilo, sem boleto na mala."

Texto adaptado dinamicamente quando o número de parcelas é alto (>=8) reforçando "olha que parcela cabendo no bolso".

### 3. Editor do produto · simplificação

Em `ProdutoEditor.tsx`, na aba de pagamento:

- **Remover** os campos: `installments_max`, `installments_no_interest`, `pix_discount_percent`, `payment_special` e qualquer toggle de PIX/cartão/entrada+saldo.
- **Manter apenas**:
  - Switch "Aplicar plano padrão Natleva (30% + boleto sem juros)" · default `true`
  - Campo numérico opcional "% de entrada" (default 30, editável caso queira 25 ou 40 em produto específico)
  - Campo opcional "Dias mínimos antes do check-in para quitação" (default 20)
- Exibir um **preview ao vivo** do plano calculado dentro do editor, igual ao que o cliente verá.

### 4. Migração de dados

Migration SQL para normalizar todos os produtos existentes:

- `UPDATE experience_products SET payment_terms = '{"plan":"natleva_default","entry_percent":30,"min_days_before_checkin":20}'::jsonb`
- Zerar `installments_max`, `installments_no_interest`, `pix_discount_percent` (manter colunas para histórico, mas não usar mais)

### 5. Arquivos afetados

- **Novo**: `src/components/prateleira/PaymentPlanCard.tsx` (cálculo + render + copy)
- **Novo**: `src/lib/prateleira/payment-plan.ts` (função pura `computeNatlevaPlan(price, departureDate, opts)`)
- **Editar**: `src/pages/prateleira/PrateleiraVendaPublica.tsx` (trocar bloco "Formas de pagamento" pelo novo card; remover lógica boleto/pix/cartao/entrada_saldo)
- **Editar**: `src/pages/produtos/ProdutoEditor.tsx` (simplificar aba pagamento)
- **Nova migration**: `supabase/migrations/<ts>_natleva_payment_standard.sql`

### Fora de escopo (próximos passos)

- Geração real de boletos/links de pagamento (apenas exibição informativa por enquanto)
- Calculadora interativa onde o cliente escolhe nº de parcelas (versão 2)
- Aplicar o mesmo padrão em propostas individuais do CRM

Posso seguir e implementar?