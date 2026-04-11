

# Ideia: "Timeline Inteligente" — Substituir o Kanban por uma Linha do Tempo Viva

## O Problema Atual

O pipeline Kanban atual é estático e genérico — é o mesmo modelo que qualquer CRM usa. Ele mostra "caixinhas" organizadas por status, mas não conta a **história** de cada negociação. Você precisa clicar em cada card para entender o que está acontecendo.

## A Proposta: Uma Abordagem Completamente Diferente

Em vez de um Kanban com colunas fixas, criar uma **Timeline de Negociações** — uma interface que trata cada cotação/proposta como uma **linha narrativa viva**, inspirada em feeds de atividade (como GitHub ou Notion).

```text
┌─────────────────────────────────────────────────────────┐
│  🔍 Filtro inteligente    [Todas] [Quentes] [Frias]     │
│                           [Hoje] [Semana] [Aguardando]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ● AGORA — 2 negociações precisam de atenção            │
│  ├─ 🔴 Ana Silva · Orlando · 14 abr                    │
│  │   "Pediu orçamento há 3h, ainda sem proposta"        │
│  │   [Gerar Proposta IA] [Ver detalhes]                 │
│  │                                                      │
│  ├─ 🟡 Carlos Souza · Europa · 20 mai                  │
│  │   "Proposta enviada há 2 dias, sem visualização"     │
│  │   [Reenviar] [Ligar] [Ajustar proposta]              │
│  │                                                      │
│  ● HOJE — 3 atualizações                                │
│  ├─ 🟢 Maria Lima · Maldivas                           │
│  │   "Proposta visualizada 2x · Último acesso: 10min"   │
│  │   Progresso: ████████░░ 80% · Score: 🔥 Alto        │
│  │   [Ver proposta] [Enviar mensagem]                   │
│  │                                                      │
│  ● ONTEM                                                │
│  ├─ ✅ Pedro Ramos · Miami · ACEITA                     │
│  │   "Conversão em 4 dias · Valor: R$ 28.500"           │
│  │                                                      │
│  ● ESTA SEMANA                                          │
│  └─ ...                                                 │
│                                                         │
│ ─── Painel lateral (ao clicar) ──────────────────────── │
│  Timeline detalhada da negociação:                      │
│  09:00 — Cotação recebida via portal                    │
│  09:15 — IA extraiu: 2 adultos, executiva, hotel 5★     │
│  10:30 — Proposta gerada automaticamente                │
│  11:00 — Consultor ajustou hotel                        │
│  14:00 — Proposta enviada ao cliente                    │
│  15:22 — Cliente visualizou (3min de leitura)           │
│  16:45 — Cliente abriu novamente (seção "voos")         │
└─────────────────────────────────────────────────────────┘
```

## O que muda fundamentalmente

### 1. Priorização automática por urgência
Em vez de você procurar o que precisa de atenção, o sistema **empurra para cima** o que é urgente:
- Cotações sem proposta há mais de 2h
- Propostas enviadas sem visualização há 24h+
- Clientes que visualizaram mas não responderam
- Viagens com data próxima sem fechamento

### 2. Frases narrativas geradas pela IA
Cada card tem uma **frase contextual** que resume a situação em linguagem natural, como:
- "Pediu Orlando para 4 pessoas, classe executiva. Aguardando proposta há 3h"
- "Visualizou a proposta 4 vezes na última hora — momento quente para contato"
- "Proposta perdida após 12 dias sem resposta"

### 3. Score de temperatura + barra de progresso
Cada negociação ganha um indicador visual de "temperatura" (frio/morno/quente) calculado por:
- Tempo desde último contato
- Quantidade de visualizações da proposta
- Proximidade da data de viagem
- Valor do orçamento

### 4. Ações contextuais inteligentes
Os botões mudam conforme o momento:
- Sem proposta → "Gerar Proposta IA"
- Proposta criada → "Revisar e Enviar"
- Enviada sem visualizar → "Reenviar" / "Ligar"
- Visualizada → "Enviar mensagem de follow-up"

### 5. Painel lateral com micro-timeline
Ao clicar em qualquer negociação, abre um painel com toda a história: cada evento (cotação recebida, IA extraiu dados, proposta gerada, enviada, visualizada, aceita...) em formato de timeline vertical.

## Implementação técnica

| Arquivo | O que faz |
|---|---|
| `src/pages/CotacoesPropostasPipeline.tsx` | Reescrever completamente com a nova UI de Timeline |
| `src/components/pipeline/NegotiationTimeline.tsx` | Componente principal da timeline |
| `src/components/pipeline/NegotiationCard.tsx` | Card expandível com narrativa IA |
| `src/components/pipeline/NegotiationDetailPanel.tsx` | Painel lateral com micro-timeline |
| `src/components/pipeline/TemperatureScore.tsx` | Score visual de temperatura |
| `src/hooks/useNegotiationPriority.ts` | Hook que calcula urgência e ordena |
| `src/lib/negotiationNarrative.ts` | Gera frases contextuais para cada situação |

O Monitor de Cotações em tempo real continua acessível via toggle, como está hoje.

