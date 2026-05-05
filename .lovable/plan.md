## Objetivo

Separar visibilidade de vendas em duas categorias **sem mexer nas permissões já configuradas** de cada colaborador:

- **Acesso total às vendas**: Nathalia, Tiago, Arthur, Laura, Nikoly · veem TODAS as vendas do sistema.
- **Acesso restrito**: Tassia e demais vendedores · veem apenas vendas onde são `seller_id`.

## Como vai funcionar (sem promover ninguém a admin)

Em vez de mexer em `user_roles`, vou criar uma **flag específica de visibilidade de vendas** que convive com as permissões personalizadas que você já configurou para cada um.

### 1. Nova permissão: `sales.view_all`

Adicionar uma nova entrada `menu_key = 'sales.view_all'` na tabela `employee_permissions`. Funciona assim:

- Se o colaborador tem `sales.view_all` com `can_view = true` → vê todas as vendas.
- Se não tem (ou tem `false`) → vê só as vendas onde `seller_id = user.id`.
- Admins (Nathalia e Tiago) continuam vendo tudo automaticamente, como hoje.

Isso é totalmente isolado das outras permissões deles · não toca em `sales`, `sales.new`, `financeiro.*`, nada. É um interruptor à parte só pra escopo de visualização.

### 2. Ativação inicial via insert tool

Vou marcar `sales.view_all = true` para os 3 vendedores que precisam de acesso total:

| Nome | Email | Role atual | sales.view_all |
|---|---|---|---|
| Nathalia | nathalia@natleva.com | admin | (admin já vê tudo) |
| Tiago | tiago@natleva.com | admin | (admin já vê tudo) |
| Arthur | arthur@natleva.com | vendedor | ✅ ativar |
| Laura | laura@natleva.com | vendedor | ✅ ativar |
| Nikoly | nikoly@natleva.com | vendedor | ✅ ativar |
| Tassia | tassia@natleva.com | vendedor | ❌ fica só com as próprias |

### 3. Filtro no frontend

- Criar hook `useSalesScope()` que retorna `{ canViewAll, sellerId }` (combina `isAdmin` + `can("sales.view_all", "view")`).
- Aplicar nas listagens: `Sales.tsx`, `TorreDeControle.tsx`, `Itinerary.tsx`, `financeiro/ContasReceber.tsx`, `financeiro/ContasPagar.tsx`, `Checkin.tsx`, `Lodging.tsx`, `TripAlterations.tsx`.
- Quando `canViewAll === false`, o `fetchAllRows("sales", ...)` recebe filtro `seller_id = user.id` (vou estender `fetchAll.ts` para aceitar `eqFilters`, hoje só tem `isFilters`).
- Telas de detalhe (`SaleDetail`, `TripDetail`, `NewSale` em modo edição): guard que devolve "Sem permissão" se `!canViewAll && sale.seller_id !== user.id`.

### 4. UI no painel de permissões

Na tela `/admin/users` (ou onde você edita permissões do colaborador), aparecerá um novo toggle:

```text
[ ] Ver todas as vendas (não só as próprias)
```

Assim, no futuro, você mesma liga/desliga essa flag pra qualquer colaborador sem precisar pedir.

## Detalhes técnicos

- Nenhuma mudança de schema · `employee_permissions` já suporta qualquer `menu_key`.
- Nenhuma mudança em `user_roles` · ninguém vira admin.
- `usePermissions` já carrega todas as permissões do colaborador, então `can("sales.view_all", "view")` funciona de imediato.
- Sem mudança em RLS (que está desligado conforme memória de segurança v4).

## Fora de escopo

- Reativar RLS no banco para blindagem servidor-side · proposta separada se quiser.
- Criar a mesma flag para outros módulos (clientes, propostas) · faço quando você pedir.

Pode aprovar que executo.
