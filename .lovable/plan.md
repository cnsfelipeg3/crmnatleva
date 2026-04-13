

# Plano: Visualizar e Editar o Fluxo NatLeva no Flow Builder (SEM tocar no atendimento)

## Princípio Zero: NENHUM risco ao atendimento

O atendimento atual via WhatsApp funciona assim:
- `zapi-webhook` recebe mensagem → chama `execute-flow` → lê tabelas `flows` / `flow_nodes` / `flow_edges`
- O Flow Builder principal (que tem o template NatLeva) salva em tabelas **DIFERENTES**: `automation_flows` / `automation_nodes` / `automation_edges`

Essas tabelas são completamente separadas. **Nenhuma mudança no Flow Builder afeta o atendimento.** Vamos manter essa separação.

## O que será feito

Carregar o template "New Flow - NatLeva" no Flow Builder como um fluxo visual editável, salvo nas tabelas `automation_*`. O atendimento real continua 100% intacto.

### Passo 1: Criar o fluxo a partir do template

Quando o usuário selecionar o template "New Flow - NatLeva", o sistema já insere os 38 nós e 42 edges nas tabelas `automation_flows`, `automation_nodes`, `automation_edges`. Isso já funciona hoje — é só selecionar o template na UI.

### Passo 2: Verificar e corrigir o carregamento dos nós

Garantir que o `FlowBuilder.tsx` carrega corretamente os nós do tipo `ai_agent` com os dados de `system_prompt` e `natleva_agent` no painel de configuração, para que o usuário possa visualizar e editar as regras operacionais de cada agente diretamente no canvas.

### Passo 3: Melhorar o painel de configuração do nó `ai_agent`

No `FlowBlockConfig` (painel lateral que abre ao clicar num nó), adicionar:
- Campo "Agente NatLeva" mostrando qual agente está vinculado (maya, atlas, habibi, etc.)
- Área de texto para visualizar/editar o `system_prompt` com as regras operacionais
- Indicadores visuais: mín. de trocas, campos obrigatórios, versão do Behavior Core (LITE/COMPLETO)

### Passo 4: Adicionar badge "Apenas Visualização"

Adicionar um indicador claro na UI de que este fluxo é um **blueprint visual** — ele NÃO controla o atendimento automaticamente. Isso evita confusão.

## O que NÃO será feito (para proteger o atendimento)

- NÃO alterar o `execute-flow` edge function
- NÃO alterar o `zapi-webhook`
- NÃO mexer nas tabelas `flows`, `flow_nodes`, `flow_edges`
- NÃO conectar o Flow Builder ao motor de execução real
- NÃO alterar o `simulator-ai` ou `agent-chat`

## Arquivos editados

1. **`src/pages/FlowBuilder.tsx`** — Ajustar o template para garantir que os nós carreguem corretamente com todas as configurações
2. **`src/components/flowbuilder/FlowBlockConfig.tsx`** — Melhorar painel para exibir config de agentes NatLeva (system_prompt, min_exchanges, campos obrigatórios)

## Resultado

O usuário poderá:
- Abrir o template "New Flow - NatLeva" no canvas visual
- Ver toda a jornada mapeada (Maya → Atlas → Especialistas → Luna → Nero → Iris/Aegis/Nurture)
- Clicar em cada nó para ver/editar as regras operacionais
- Reorganizar visualmente o fluxo
- Salvar alterações (nas tabelas `automation_*`, sem afetar nada no WhatsApp)

O atendimento real continua **exatamente como está**, sem nenhum risco.

