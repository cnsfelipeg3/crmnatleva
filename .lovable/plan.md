

# Plano: "Opinião da Nath" em Cada Card de Cotação

## Conceito

Cada card de cotação no pipeline terá uma seção dedicada mostrando a análise da Nath sobre a conversa e o que precisa ser feito. Duas camadas:

1. **Dados já existentes** — Os briefings já têm `conversationSummary`, `aiRecommendation` e `nextSteps` que nunca são exibidos nos cards. Mostrar imediatamente.
2. **Opinião sob demanda** — Botão "Opinião da Nath" no card que chama a IA (via `agent-chat`, mesmo padrão do `NathOpinionButton`) para gerar uma análise personalizada. O resultado fica salvo no state local e exibido inline.

## Mudanças

### 1. `NegotiationCard.tsx` — Seção "Visão da Nath"

Logo após a narrativa, adicionar:

- **Se o briefing tem `aiRecommendation` ou `nextSteps`**: exibir card roxo com ícone Crown mostrando a recomendação IA + próximos passos (dados que já existem no banco, zero custo de IA)
- **Se não tem**: mostrar botão compacto "Pedir Opinião da Nath" (roxo, ícone Crown)
- Ao clicar: chama a edge function `agent-chat` com o system prompt da Nath + dados do briefing como contexto
- Streaming inline — a opinião aparece token por token direto no card
- Resultado fica salvo em state local enquanto o pipeline está aberto

### 2. `NegotiationCard.tsx` — Prompt contextualizado

O prompt enviado à Nath será enriquecido com todos os dados do briefing:
- Resumo da conversa (`conversationSummary`)
- Motivação da viagem, sentimento do lead, score, urgência
- Budget, destino, datas, PAX
- Recomendação IA existente

A Nath responderá com foco em: **o que cotar, riscos da negociação, e próximo passo concreto**.

### 3. Sem componente novo pesado

Reutilizar a lógica de streaming já existente no `NathOpinionButton` (mesmo endpoint, mesmo system prompt), mas renderizado inline no card ao invés de em um Dialog separado.

## Resultado visual

```text
┌──────────────────────────────────────┐
│ [Briefing IA] [Aguardando] 🔥 Hot   │
│ 📍 GRU → Lisboa                      │
│ Maria Silva                          │
│ ❤️ Lua de mel · Score 89 · Positivo   │
│ "Casal jovem buscando..."            │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 👑 Visão da Nath                 │ │
│ │ "Esse lead tá pronto! Casal     │ │
│ │ empolgado, budget ok. Precisa   │ │
│ │ cotar hotel boutique 4★ em      │ │
│ │ Alfama + transfer + passeio     │ │
│ │ de barco pelo Tejo. Prioridade  │ │
│ │ máxima — fechar antes que       │ │
│ │ esfriem."                       │ │
│ │ 📋 Próximos: Enviar proposta    │ │
│ │ em 24h com 2 opções de hotel    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [═══ Pipeline ═══]                   │
│ [Gerar Proposta IA]            [>]   │
└──────────────────────────────────────┘
```

## Arquivos impactados

| Arquivo | Ação |
|---|---|
| `src/components/pipeline/NegotiationCard.tsx` | Editar — adicionar seção "Visão da Nath" com dados do briefing + botão de opinião sob demanda |

**Zero alterações no banco de dados.** Usa dados já existentes no briefing + chamada à edge function existente (`agent-chat`).

