

## Diagnóstico: Maya no Camaleão — Por que está diferente do Manual

### Problemas encontrados na screenshot

A Maya na simulação está:
1. **Mensagens longas demais** — bem acima do limite de 60 palavras definido no `behavior_prompt`
2. **Info dumping** — listando serviços ("passagens, hotéis, transfers, ingressos, visto e seguro") na primeira resposta
3. **Repetindo o info dump** — na segunda resposta ela lista tudo de novo
4. **Sem seguir a sequência** — deveria focar em "Nome → Destino → 1ª vez → Quem vai → Motivo", mas está despejando informação

---

### Causa raiz: 3 diferenças técnicas entre Camaleão e Manual

| Aspecto | Manual | Camaleão | Impacto |
|---|---|---|---|
| **Compliance Engine** | ✅ Aplica `fullCompliancePipeline()` + `enforceAgentFormatting()` após CADA resposta do agente | ❌ Nenhum pós-processamento | Maya não tem suas respostas corrigidas/filtradas |
| **Streaming** | ✅ Usa streaming SSE (resposta parcial visível) | ❌ Usa `callSimulatorAI` que retorna texto completo | Sem streaming, mas isso é cosmético |
| **Provider** | ✅ Usa `agencyConfig.default_provider` (ex: `anthropic`) | ❌ Força `provider: "lovable"` (Gemini) | **Modelo diferente** pode gerar respostas mais verbosas |

### O problema principal: `callSimulatorAI` no Camaleão

1. **Provider fixo "lovable" (Gemini)**: O modo manual usa o provider configurado pela agência (provavelmente Anthropic/Claude), enquanto o Camaleão força Gemini via `callSimulatorAI`. Gemini tende a ser mais verboso e ignora mais facilmente limites de palavras.

2. **Sem Compliance Engine**: O manual passa TODA resposta por `fullCompliancePipeline()` que detecta violações (texto longo, bullet points, repetições) e reescreve. O Camaleão pula isso completamente.

3. **Sem `enforceAgentFormatting()`**: O manual remove travessões, linguagem de transferência vazada, e metadados internos. O Camaleão não aplica nenhuma dessas correções.

---

### Plano de correção

#### 1. Aplicar `enforceAgentFormatting()` no Camaleão
- Importar a função do `SimuladorManualMode` (ou extraí-la para um util compartilhado)
- Aplicar no `cleanResponse` antes de adicionar à lista de mensagens

#### 2. Aplicar o Compliance Engine
- Chamar `fullCompliancePipeline()` após cada resposta do agente no Camaleão
- Idêntico ao que o manual faz nas linhas 374-382

#### 3. Usar o provider correto
- Trocar de `provider: "lovable"` para usar `agencyConfig.default_provider` no `callSimulatorAI` para chamadas tipo "agent"
- Ou fazer o Camaleão chamar diretamente o edge function como o manual faz, em vez de usar `callSimulatorAI`

#### 4. Validação pós-resposta para Maya
- Adicionar check de comprimento: se resposta da Maya > 80 palavras, truncar ou reprocessar
- Verificar se contém listas de serviços e remover

### Arquivos a alterar
- `src/components/ai-team/SimuladorChameleonMode.tsx` — aplicar compliance + formatting + provider correto
- Possivelmente extrair `enforceAgentFormatting` para um arquivo util compartilhado

