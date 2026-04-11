

# Plano: Unificação Timeline + Monitor

## Problema

Duas views separadas com toggle manual. O Monitor tem KPIs e progress rings úteis que ficam escondidos. O usuário precisa alternar constantemente.

## Solução

Fundir tudo numa view única: KPIs do Monitor ficam sempre visíveis no topo, cada card da Timeline ganha um mini progress ring de extração, e o toggle desaparece.

## Mudanças

### 1. `src/pages/CotacoesPropostasPipeline.tsx`

- **Remover** o estado `view`, o toggle Timeline/Monitor, o import lazy do `CotacoesMonitorView`
- **Adicionar** KPIs inline no topo (Extraindo, Campos, Completude, Completos) calculados a partir dos briefings já carregados via `useQuery`
- **Adicionar** badge "LIVE" no header indicando realtime ativo
- Manter filtros de temperatura, busca, timeline e detail panel intactos

### 2. `src/components/pipeline/NegotiationCard.tsx`

- **Adicionar mini progress ring** (SVG 32x32) no canto superior direito do card quando o item tem briefing — mostra % de campos preenchidos
- **Adicionar badge "EXTRAINDO"** animado (pulse) quando o briefing está em status de extração
- Importar `countFilledFields` e `MONITOR_TOTAL_FIELDS` de `@/lib/quotationMonitor`
- O ring usa as mesmas cores do Monitor: accent (extraindo), emerald (completo), amber (pendente)

### 3. `src/components/pipeline/NegotiationTimeline.tsx`

- Ajuste menor: adicionar contagem de briefings com extração ativa no header de cada grupo

## Resultado visual

```text
┌─────────────────────────────────────────────┐
│ Central de Cotações & Propostas  [+ Nova]   │
│ Timeline unificada · 🟢 LIVE                │
├────────┬────────┬──────────┬────────────────┤
│ ⚡ 3    │ 📊 142 │ 🎯 68%   │ ✅ 5 completos │
├─────────┴────────┴──────────┴───────────────┤
│ 🔍 Buscar...    [Todas][Quentes][Mornas]... │
├─────────────────────────────────────────────┤
│ 🔴 AGORA — 2 negociações                   │
│ ┌──────────────────┐ ┌──────────────────┐   │
│ │ GRU→LIS  [72%◎]  │ │ GRU→CDG [EXTR.] │   │
│ │ 👑 Visão da Nath  │ │ 👑 Visão da Nath  │   │
│ └──────────────────┘ └──────────────────┘   │
└─────────────────────────────────────────────┘
```

## Arquivos impactados

| Arquivo | Ação |
|---|---|
| `src/pages/CotacoesPropostasPipeline.tsx` | Remover toggle, adicionar KPIs + LIVE badge |
| `src/components/pipeline/NegotiationCard.tsx` | Adicionar mini progress ring + badge EXTRAINDO |
| `src/components/pipeline/NegotiationTimeline.tsx` | Ajuste menor no header |

**Zero alterações no banco de dados.** O `CotacoesMonitorView.tsx` permanece no projeto mas não será mais importado pela página principal.

