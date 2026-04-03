

## Diagnóstico NatLeva — Problemas no Simulador Camaleão

### Problemas identificados nas screenshots

| # | Problema | Onde aparece |
|---|---|---|
| 1 | **`[TRANSFERIR]` visível no balão da Maya** | Screenshot 1-2 |
| 2 | **`[BRIEFING PARA ESPECIALISTA ÁSIA, HABIBI]:` visível no balão do Atlas** | Screenshot 5 |
| 3 | **Atlas diz "Minha colega vai te passar"** — viola regra de transição invisível | Screenshot 3 |
| 4 | **Atlas responde com texto enorme** (~130 palavras) — deveria ser mais curto para WhatsApp | Screenshots 3-5 |

### Causa raiz de cada bug

**Bug 1: `[TRANSFERIR]` visível**
Em `SimuladorChameleonMode.tsx`, o `cleanResponse` recebe `[TRANSFERIR]` de volta do compliance pipeline (linha 285-289). O conteúdo é salvo no state (linha 304-313) ANTES da remoção do tag (linha 318). Ou seja, o usuário vê a tag no balão.

**Bug 2: `[BRIEFING...]` visível**
Nenhum regex em `enforceAgentFormatting` ou `enforceHardRules` remove tags internas como `[BRIEFING PARA ...]`. A IA do Atlas gera essa tag e ela passa direto para o UI.

**Bug 3: "Minha colega"**
O regex em `enforceAgentFormatting` (linha 22) captura "meu colega" mas NÃO "minha colega". Falta a variação feminina.

**Bug 4: Atlas muito longo**
O `DEFAULT_WORD_LIMIT` é 120 palavras. Para WhatsApp, Atlas deveria ter ~80-90 palavras no máximo.

### Plano de correção

#### 1. `SimuladorChameleonMode.tsx` — Reordenar strip e setState
Mover a remoção de `[TRANSFERIR]` e tags internas para ANTES de criar o `agentMsg` e setMessages. Sequência correta:
1. Compliance pipeline → `cleanResponse`
2. Strip `[TRANSFERIR]` + detectar transfer
3. Strip `[BRIEFING...]` e outras tags internas
4. Word-count enforcer
5. Criar `agentMsg` com texto limpo
6. `setMessages`

#### 2. `agentFormatting.ts` — Expandir filtros
- Adicionar regex para "minha colega", "minha parceira", "nossa equipe vai"
- Adicionar strip de tags internas: `\[BRIEFING[^\]]*\]:?`, `\[TRANSFERIR\]`, `\[ESCALON[^\]]*\]`

#### 3. `complianceEngine.ts` — Reduzir word limit do Atlas
- Adicionar `atlas: 90` no `AGENT_WORD_LIMITS`
- Reduzir `DEFAULT_WORD_LIMIT` de 120 para 100

### Arquivos alterados
| Arquivo | Mudança |
|---|---|
| `SimuladorChameleonMode.tsx` | Reordenar: strip tags antes de setState |
| `agentFormatting.ts` | Novos regex para "minha colega" + strip `[BRIEFING...]` |
| `complianceEngine.ts` | Atlas word limit = 90, default = 100 |

