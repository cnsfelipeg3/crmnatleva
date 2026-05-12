# Pulso Comercial 24h · Painel de Propostas no Dashboard

Adicionar uma seção de destaque no topo do Dashboard principal (`/`) que, toda vez que você abrir o sistema, mostre o "raio-X" das últimas 24h em propostas: quantas saíram, quanto valem, lucro estimado, quantos clientes abriram, tempo médio na proposta e quantos compartilharam.

## O que aparece na tela

Bloco fixo logo acima dos KPIs atuais, com 6 cards compactos + uma faixa secundária:

```text
┌─ Pulso Comercial · Últimas 24h ──────────────────────── [24h ▾] ┐
│  Propostas    │  Valor total   │  Lucro estimado │  Clientes   │
│  enviadas     │  R$ 218.400    │  ~ R$ 31.200    │  que abriram│
│      12       │  ticket médio  │   margem ~14%   │   8 de 12   │
│               │  R$ 18.200     │                 │   (66%)     │
├───────────────┴────────────────┴─────────────────┴─────────────┤
│  Tempo médio na proposta: 2m 47s · Engajamento alto (>60s): 5  │
│  Compartilhamentos: 3 · Cliques no WhatsApp: 4 · CTA: 2        │
└────────────────────────────────────────────────────────────────┘
        [ Ver propostas das últimas 24h →  /propostas ]
```

Detalhes:
- Toggle de janela: **24h · 7d · 30d** (default 24h, persistido em localStorage).
- Cada card clicável abre `/propostas` já filtrado pela janela selecionada.
- Lista expansível "Top propostas com mais engajamento nas últimas 24h" (até 5 itens), com nome do cliente, valor, segundos ativos e badge de status (Visualizada · Engajou · Compartilhou · CTA).
- Skeleton durante carregamento. Mensagem amigável quando não houver propostas no período (sem emojis, ícone Lucide).

## Métricas e como cada uma é calculada

Tudo das tabelas já existentes (`proposals`, `proposal_viewers`, `proposal_shares`), filtrando `is_fictional = false` e `created_at >= now() - interval '24h'`.

| Indicador | Fonte | Cálculo |
|---|---|---|
| Propostas enviadas | `proposals` | count onde `status` ∈ ('sent','viewed','accepted','rejected') OU `created_at` na janela. Vamos usar `created_at na janela AND status != 'draft'` para refletir "saíram pro cliente". |
| Valor total | `proposals.total_value` | sum |
| Ticket médio | derivado | total / count |
| Lucro estimado | derivado | aplica margem média histórica das vendas dos últimos 90 dias (`avg(profit/received_value)`). Exibido com prefixo "~" para deixar claro que é estimativa. |
| Clientes que abriram | `proposal_viewers` | count distinct `proposal_id` com `first_viewed_at` na janela, restrito a propostas criadas na janela. |
| Tempo médio na proposta | `proposal_viewers.active_seconds` | avg dos viewers com `active_seconds > 5` |
| Engajamento alto | `proposal_viewers` | count com `active_seconds >= 60` |
| Compartilhamentos | `proposal_shares` | count com `created_at` na janela |
| Cliques WhatsApp / CTA | `proposal_viewers` | count `whatsapp_clicked = true` / `cta_clicked = true` |

## Implementação técnica

### 1. RPC dedicada (performance, evita N queries do front)
Migration criando função `public.proposals_pulse(p_hours int default 24)` retornando `jsonb` com todos os campos acima + array `top_engaged` (limit 5). `STABLE SECURITY DEFINER`, `search_path = public`. Margem histórica calculada na própria RPC numa CTE.

### 2. Hook
`src/hooks/useProposalsPulse.ts` usando `@tanstack/react-query` (já presente no projeto), `staleTime: 60s`, `refetchOnWindowFocus: true` (assim atualiza ao voltar pra aba).

### 3. Componente
`src/components/dashboard/ProposalsPulseSection.tsx`:
- Usa `Card`, `CardHeader`, `CardContent`, `Badge`, `Button`, `Skeleton` do shadcn.
- Ícones Lucide: `Send`, `DollarSign`, `TrendingUp`, `Eye`, `Clock`, `Share2`, `MessageCircle`, `MousePointerClick`. Sem emojis.
- Tokens semânticos (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`). Suporte a tema claro/escuro automático.
- Grid: `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4` para os cards principais, faixa secundária em `flex flex-wrap gap-3`. Mobile-first conforme diretrizes.
- Linha "Top engajadas" colapsável (`Collapsible` shadcn).

### 4. Integração no Dashboard
Em `src/pages/Dashboard.tsx`, inserir `<ProposalsPulseSection />` logo após `<DashboardFilters />` e antes de `<KpiCards />`. Carregamento independente — não bloqueia o resto.

### 5. Formatação
- Valores em BRL via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Tempo via util `formatDuration(seconds)` (ex.: `2m 47s`).
- Mid-dots (·) nos separadores, sem hífens · sem emojis (regra do projeto).

## Arquivos

**Novos**
- `supabase/migrations/<timestamp>_proposals_pulse_rpc.sql`
- `src/hooks/useProposalsPulse.ts`
- `src/components/dashboard/ProposalsPulseSection.tsx`

**Editados**
- `src/pages/Dashboard.tsx` (1 import + 1 linha de render)

## Fora de escopo (posso entregar depois se quiser)
- Notificação push/WhatsApp diária com o resumo às 8h.
- Comparativo "vs ontem" / "vs média 7d" com setinhas de variação.
- Drill-down clicando num card abrindo modal com a lista completa.

Posso seguir e implementar?