

# Plano: Equalizar os 3 Modos do Simulador

## Problemas

1. **Camaleão usa Anthropic como provider** — linha 273 de `SimuladorChameleonMode.tsx` faz fallback para `agencyConfig.default_provider || "anthropic"`, e o banco tem `default_provider = "anthropic"`
2. **Auto Mode expõe nomes internos** — linha 452 usa `agent.name` diretamente nas mensagens
3. **Chameleon expõe nomes internos** — linha 323 usa `agent.name` e linha 737 exibe na UI

## Mudanças

### 1. `SimuladorChameleonMode.tsx`
- Linha 273: trocar fallback para `"lovable"` em vez de `agencyConfig.default_provider || "anthropic"`
- Linha 323: forçar `agentName: "Nath"` em vez de `agent.name`
- Linha 737: exibir "Nath" em vez de `msg.agentName` (manter emoji do agente interno para referência visual interna)

### 2. `SimuladorAutoMode.tsx`
- Linhas 452, 464, 582: trocar `agent.name` por `"Nath"` no `agentName` das mensagens enviadas
- Manter `agent.id` interno para lógica de transferência

### 3. Banco de dados `ai_config`
- Atualizar `default_provider` de `"anthropic"` para `"lovable"` via migration (previne que qualquer outro componente que leia essa config também use o provider correto)

## O que NÃO muda
- IDs internos (maya, atlas, etc.) continuam para lógica de pipeline
- O Auto Mode e Camaleão podem mostrar o emoji do agente interno como indicador visual (ex: 🌙 Nath) para diferenciar qual agente está respondendo internamente, mas o nome é sempre "Nath"

