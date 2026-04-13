

## Plano: Enriquecer a tabela de vendas com mais informações visíveis

### Problema atual

A tabela de vendas mostra poucos dados. Faltam datas de ida/volta, tipo de lead, detalhes de hotel, e colunas financeiras importantes como valor da venda, valor recebido e lucro separados.

### Alterações no arquivo `src/pages/Sales.tsx`

**1. Dados**: Adicionar `return_date` e `hotel_name` ao fetch e à interface `SaleRow`.

**2. Colunas da tabela desktop** (nova estrutura):

| Coluna | Conteúdo |
|--------|----------|
| **Venda** | Nome + ID + data fechamento |
| **Datas** | Ida e volta formatadas (ex: "01/mar → 08/mar"), ou só ida |
| **Rota** | IATA origem → destino |
| **PAX** | Quantidade |
| **Produtos** | Ícones: logo cia aérea, avião, hotel (tooltip com nome do hotel) |
| **Valor Venda** | `received_value` formatado (o que o cliente pagou) |
| **Custo** | `total_cost` formatado |
| **Lucro** | `profit` formatado, com cor verde/vermelho |
| **Margem** | Percentual com cor |
| **Lead** | Badge "Org" ou "Agência" |
| **Status** | Badge colorido |

**3. Cards mobile**: Adicionar datas ida/volta, badge de lead, e exibir valor da venda + lucro separados.

**4. Busca**: Adicionar `return_date` e `hotel_name` nos campos de busca do SmartFilter.

---

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Sales.tsx` | Adicionar campos ao fetch, novas colunas financeiras (valor, custo, lucro), coluna "Datas", coluna "Lead", tooltip de hotel, layout mobile enriquecido |

Nenhuma migração de banco necessária — os campos já existem.

