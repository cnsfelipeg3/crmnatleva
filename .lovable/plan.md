

# Plano: Central de Cotações & Propostas — Redesign Inteligente

## Diagnóstico dos problemas atuais

1. **Briefings IA não aparecem no Pipeline** — A timeline só puxa `portal_quote_requests` e `proposals`. Os `quotation_briefings` (vindos das conversas com agentes IA) estão completamente ausentes.
2. **Cards são rasos** — Mostram apenas rota, data e uma frase genérica. Dados ricos do briefing (motivação, preferências de hotel, sensibilidade a preço, sentimento do lead, recomendação da IA) não são exibidos.
3. **Painel de detalhes é básico** — O sheet lateral mostra dados mínimos sem nenhuma interpretação inteligente da IA sobre o caso.
4. **Geração de proposta "cega"** — Quando o consultor clica "Gerar Proposta IA", não tem um resumo estratégico antes para contextualizar a decisão.
5. **Redundância de páginas** — `CotacoesUnified.tsx` (3 abas separadas) ainda existe mas não é mais a rota principal. Há fragmentação.

## O que será feito

### Etapa 1 — Integrar Briefings IA ao Pipeline unificado

Buscar `quotation_briefings` no `CotacoesPropostasPipeline` e mapeá-los como `NegotiationItem` com `source: "briefing"`. Usar os campos ricos (lead_name, destination, urgency, lead_score, budget_range, trip_motivation, etc.) para popular os cards. Evitar duplicatas quando briefing já tem `proposal_id`.

### Etapa 2 — Card enriquecido com insights da conversa

Expandir o `NegotiationCard` para exibir:
- **Lead Score** visual (barra ou badge colorido)
- **Urgência** detectada pela IA (badge)
- **Motivação da viagem** (ex: "Lua de mel", "Família com crianças")
- **Sentimento do lead** (positivo/neutro/hesitante)
- **Orçamento + sensibilidade** a preço
- Layout mais informativo, com seções colapsáveis para não poluir

### Etapa 3 — Painel de detalhes inteligente (Sheet lateral redesenhado)

Redesenhar o `NegotiationDetailPanel` com 3 seções:

1. **Resumo Estratégico IA** — Card de destaque no topo com: resumo da conversa, recomendação da IA (campo `ai_recommendation`), próximos passos sugeridos (`next_steps`), leitura comportamental do orçamento (`budget_behavioral_reading`).

2. **Perfil completo do pedido** — Todos os dados organizados por categoria:
   - Viagem (destino, datas, duração, flexibilidade)
   - Grupo (adultos, crianças, idades, detalhes)
   - Hospedagem (preferência, estrelas, localização, notas)
   - Voos (aeroporto, classe, companhia preferida)
   - Experiências (obrigatórias vs. desejadas, ritmo)
   - Logística (transfer, carro, seguro)

3. **Timeline de eventos** — Micro-timeline já existente, enriquecida com dados reais de timestamps.

### Etapa 4 — Score de temperatura melhorado

Atualizar `calculateTemperature` e `getUrgencyScore` para considerar:
- `lead_score` do briefing (0-100)
- `urgency` do briefing ("alta", "média", "baixa")
- `lead_sentiment` (positivo pesa mais)
- `lead_type` (comprador recorrente vs. primeiro contato)

### Etapa 5 — Narrativas mais inteligentes

Atualizar `generateNarrative` para usar campos do briefing:
- "Ana pediu Maldivas para lua de mel, 2 adultos, hotel 5★ beira-mar. Lead score 85 — urgência alta."
- Em vez de: "Pediu destino não informado para 2 pessoas."

### Etapa 6 — Eliminar redundância de menu

Remover a rota/página `CotacoesUnified.tsx` (que tinha 3 abas separadas). O Pipeline unificado já engloba tudo. Ajustar sidebar se necessário.

## Arquivos impactados

| Arquivo | Ação |
|---|---|
| `src/pages/CotacoesPropostasPipeline.tsx` | Adicionar fetch de briefings, merge no items |
| `src/lib/negotiationNarrative.ts` | Expandir `NegotiationItem` com campos do briefing, melhorar narrativas e scores |
| `src/components/pipeline/NegotiationCard.tsx` | Exibir lead score, urgência, motivação, sentimento |
| `src/components/pipeline/NegotiationDetailPanel.tsx` | Redesign completo com resumo IA + perfil completo |
| `src/hooks/useNegotiationPriority.ts` | Usar lead_score e urgency no cálculo |
| `src/pages/CotacoesUnified.tsx` | Remover (redundante) |
| `src/App.tsx` | Limpar rota antiga se existir |

## Resultado esperado

Uma central única onde o consultor vê **todas** as negociações (Portal + Briefing IA + Manuais), com interpretações estratégicas da IA visíveis diretamente nos cards e no painel lateral, permitindo decidir com mais contexto antes de agir.

