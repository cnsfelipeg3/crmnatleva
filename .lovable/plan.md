

## Plano: Sistema de Comissões com Tipo de Lead (Orgânico vs Agência)

### Resumo

Adicionar campo "Origem do Lead" nas vendas (agência = 15% do lucro, orgânico = 40% do lucro) e reformular a página de Comissões para calcular automaticamente com base nessa lógica.

---

### 1. Banco de dados — nova coluna na tabela `sales`

Adicionar coluna `lead_type` (TEXT, default `'agencia'`) na tabela `sales` com valores possíveis: `agencia` ou `organico`.

```sql
ALTER TABLE public.sales ADD COLUMN lead_type text NOT NULL DEFAULT 'agencia';
```

---

### 2. Formulário de cadastro de venda (`src/pages/NewSale.tsx`)

Na seção de dados gerais (perto do campo vendedor/status), adicionar um seletor visual com duas opções:
- **Lead da Agência** (default) — ícone de prédio
- **Lead Orgânico** (do vendedor) — ícone de usuário

O campo será salvo como `lead_type` no insert da venda.

---

### 3. Tela de detalhes/edição da venda

Exibir e permitir editar o tipo de lead na tela de detalhes da venda, para correções posteriores.

---

### 4. Reformular a página de Comissões (`src/pages/financeiro/Comissoes.tsx`)

A página já existe e já está no menu. Vou reformulá-la para usar a lógica fixa:

- **Lead Agência**: 15% sobre o lucro (received_value - total_cost)
- **Lead Orgânico**: 40% sobre o lucro

A página mostrará:
- **KPIs no topo**: Total de comissões do período, comissões agência vs orgânico
- **Tabela por vendedor**: nome, qtd vendas agência, qtd vendas orgânico, lucro total, comissão agência, comissão orgânico, comissão total
- **Filtro por período** para analisar meses específicos
- Possibilidade de expandir e ver as vendas individuais de cada vendedor com o valor da comissão

As regras genéricas da tabela `commission_rules` serão mantidas como backup, mas a lógica principal usará os percentuais fixos (15% e 40%).

---

### 5. Resumo financeiro no rodapé de vendas

O rodapé de vendas (que já mostra faturamento/lucro) ganhará uma coluna adicional "Comissões estimadas" baseada no lead_type de cada venda.

---

### Arquivos que serão modificados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Adicionar coluna `lead_type` em `sales` |
| `src/pages/NewSale.tsx` | Adicionar seletor de tipo de lead |
| `src/pages/SaleDetails.tsx` (ou similar) | Exibir/editar tipo de lead |
| `src/pages/financeiro/Comissoes.tsx` | Reformular com lógica 15%/40% |
| `src/pages/Sales.tsx` | Adicionar comissão estimada no rodapé |

