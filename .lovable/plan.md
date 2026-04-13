

# Plano: Corrigir Simulador — Migrar para Lovable AI + Identidade "Nath"

## Problemas Identificados

1. **NATLEVA_BEHAVIOR_CORE nunca é injetado**: A edge function `simulator-ai` define as diretivas comportamentais mas a linha 275 simplesmente faz `enrichedSystemPrompt = systemPrompt || ""` sem adicionar o bloco. O comentário diz "prompt arrives fully built from frontend" mas o frontend **não inclui** essas diretivas.

2. **Provider padrão é Anthropic**: O frontend envia `provider: "anthropic"` (linha 286 do SimuladorManualMode), causando overloads frequentes e fallback silencioso.

3. **Nome do agente exposto na UI**: O `SimulatorChatLayout` exibe `msg.agentName` (ex: "MAYA", "ATLAS") em vez de "Nath".

4. **Compliance pipeline ignorado**: O modo manual faz `enforceAgentFormatting` mas não passa pelo `fullCompliancePipeline`, permitindo info-dumps e comportamento mecânico.

## Mudanças Planejadas

### 1. Edge Function `simulator-ai/index.ts`
- **Injetar NATLEVA_BEHAVIOR_CORE** no `enrichedSystemPrompt` para todos os tipos de agente (exceto `price_image`)
- **Mudar provider padrão** de `"anthropic"` para `"lovable"` no default do destructuring
- Manter Anthropic como opção caso o frontend envie explicitamente, mas o padrão será Lovable AI (GPT-5/GPT-5-mini)

### 2. Frontend `SimuladorManualMode.tsx`
- Mudar `configuredProvider` fallback de `"anthropic"` para `"lovable"` (linha 286)
- No `commitAgentMessage`, forçar `agentName: "Nath"` em vez de `selectedAgent.name`

### 3. UI `SimulatorChatLayout.tsx`
- Substituir a exibição de `msg.agentName` por `"Nath"` para mensagens do agente (mantendo o `agentId` interno para lógica de transferência)

### 4. Mensagens de erro
- Trocar texto "Anthropic está temporariamente no limite" por mensagem genérica

## O Que NÃO Muda
- Maya continua sendo "maya" internamente (ID, lógica de transferência, pipeline)
- A estrutura de prompts em `buildAgentPrompt.ts` permanece igual
- O compliance engine determinístico continua ativo

## Resultado
- Respostas com rapport e storytelling (behavior core injetado)
- Sem overloads da Anthropic (GPT-5 via Lovable AI)
- Cliente sempre vê "Nath", nunca "MAYA" ou "ATLAS"

