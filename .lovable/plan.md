

# Plano: Menu Viagens Unificado + Torre de Controle

## Garantia de segurança dos dados

**ZERO alterações no banco de dados.** Este plano é 100% frontend — apenas reorganiza o menu e cria uma nova página que **lê** dados existentes. Nenhuma tabela, coluna, ou registro será tocado.

## Mudanças

### 1. Sidebar (`src/components/AppSidebar.tsx`)
- Remover "Viagens", "Fazer Check-in", "Confirmar Hospedagens" e "Alterações de Viagem" do array `navItems`
- Adicionar estado `viagensOpen` (como já existe `financeOpen`, `rhOpen`, etc.)
- Criar grupo colapsável "Viagens" com subitens:
  - Torre de Controle → `/viagens` (nova página)
  - Monitor de Voos → `/viagens/monitor` (página atual)
  - Fazer Check-in → `/checkin`
  - Confirmar Hospedagens → `/hospedagem`
  - Alterações de Viagem → `/alteracoes`
- Auto-expandir quando rota ativa for qualquer uma dessas

### 2. Nova página Torre de Controle (`src/pages/TorreDeControle.tsx`)
- Dashboard operacional somente-leitura com KPIs:
  - Viagens ativas (lê `sales` com status ativo)
  - Check-ins pendentes (lê `sales` sem check-in)
  - Hospedagens a confirmar (lê `sales` sem confirmação)
  - Alterações em aberto (lê `trip_alterations` pendentes)
- 4 cards clicáveis que navegam para cada sub-área
- Lista "Atenção Agora" com itens urgentes consolidados

### 3. Rotas (`src/App.tsx`)
- `/viagens` → `TorreDeControle` (nova)
- `/viagens/monitor` → `Viagens` (página atual, apenas nova rota)
- `/viagens/:id` → mantido como está
- `/checkin`, `/hospedagem`, `/alteracoes` → mantidos como estão

### Arquivos impactados

| Arquivo | Ação |
|---|---|
| `src/components/AppSidebar.tsx` | Editar — reorganizar menu |
| `src/pages/TorreDeControle.tsx` | Criar — dashboard somente-leitura |
| `src/App.tsx` | Editar — adicionar rota Torre, remapear Viagens |

Nenhuma migration, nenhuma alteração de dados.

