

## Correção: Maya — Transfer check + Storytelling patterns

### Bug 1: Transfer check usa texto errado
- **Manual** (linha 362): checa `agentText` (original) por `[TRANSFERIR]`, mas o pivot detector injeta a tag no `compliantText` (pós-compliance). A transferência nunca dispara.
- **Chameleon** (linha 276): checa `agentResponse` (original) antes do compliance pipeline. Mesmo problema.

**Fix**: Mover o check `[TRANSFERIR]` para DEPOIS do compliance pipeline, usando o texto já processado.

### Bug 2: Storytelling patterns incompletos
Patterns atuais não cobrem frases que a Maya está usando, como "águas cristalinas", "de outro mundo", "destino incrível", "cenário deslumbrante".

**Fix**: Adicionar ~8 novos regex patterns ao detector em `complianceEngine.ts`.

### Arquivos alterados
| Arquivo | Mudança |
|---|---|
| `SimuladorManualMode.tsx` | Mover transfer check para após compliance pipeline |
| `SimuladorChameleonMode.tsx` | Mover transfer check para após compliance pipeline |
| `complianceEngine.ts` | Adicionar novos storytelling patterns |

