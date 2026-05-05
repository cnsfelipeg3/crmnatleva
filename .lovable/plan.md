## Objetivo
Garantir que a lista de clientes em `/portal-admin/clients` mostre **somente** a data real "Cliente desde" (vinda do Monday) · removendo a coluna "Cadastro" que confunde por mostrar 09/04/2026 pra todo mundo (data da importação técnica). Zero alteração em dados de cliente.

## Escopo

### Arquivo único: `src/pages/portal-admin/PortalAdminClients.tsx`
1. Remover o `<th>Cadastro</th>` do cabeçalho
2. Remover a `<td>` correspondente que renderiza `formatDateBR(client.created_at)`
3. Melhorar a célula "Cliente desde":
   - Se tem `customer_since` · mostra o `<CustomerSinceBadge />` (já com tooltip de data exata)
   - Se NÃO tem (76 clientes) · mostra "—" cinza claro

### Nada mais é tocado
- Banco: intacto (1.794/1.870 já populados na cascata anterior)
- Outros componentes: intactos
- `created_at`: continua existindo no banco, só não exibido nessa lista
- ClientDetail, dashboards, KPIs: sem alteração

## Resultado esperado
Lista com colunas: Cliente · E-mail · Telefone · Viagens · Última Viagem · **Cliente desde** · ações.
A coluna "Cliente desde" mostra a data real do Monday (badge "Cliente há 3 anos" etc + tooltip "Desde 12/03/2022 · via telefone").
