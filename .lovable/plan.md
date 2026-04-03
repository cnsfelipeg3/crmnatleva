

## Diagnóstico: Maya AINDA verbosa no Camaleão

### O que está acontecendo nas screenshots

A Maya continua produzindo mensagens com 100-150+ palavras (deveria ser ~60), com info dumping de serviços e parágrafos longos. O `fullCompliancePipeline` e `enforceAgentFormatting` **já foram adicionados** no código, mas **não estão funcionando** na prática.

### Causa raiz: 3 falhas no pipeline de compliance

| Problema | Onde | Por que falha |
|---|---|---|
| **Safety check rejeita reescritas curtas** | `complianceEngine.ts` linha 289 | Se a reescrita tem menos de 20% do tamanho original, é descartada. Uma resposta de 150 palavras cortada para 60 seria rejeitada (60 < 150 × 0.2 = 30... ok, mas se for mais agressivo, falha) |
| **Compliance prompt instrui "mantenha o mesmo comprimento"** | `complianceEngine.ts` linha 195 | Contradiz diretamente o objetivo de encurtar respostas verbosas |
| **Sem enforcement determinístico de limite de palavras** | `enforceHardRules()` | Remove travessões e emojis, mas NÃO verifica limite de palavras. Respostas longas passam intactas |

### Em resumo
O compliance engine foca em violações de regras (bullets, linguagem formal, etc.), mas **não enxerga "resposta longa" como violação**. E mesmo quando reescreve mais curto, o safety check pode rejeitar por diferença de tamanho.

---

### Plano de correção (3 alterações)

#### 1. Adicionar truncamento inteligente por palavras em `enforceHardRules`
**Arquivo:** `src/components/ai-team/complianceEngine.ts`

- Adicionar lógica: se agentId é `maya`, limite = 60 palavras; outros agentes = 120 palavras
- Truncar na última frase completa dentro do limite
- Isso é determinístico (100% garantido, sem depender de IA)

#### 2. Corrigir o compliance prompt para permitir encurtamento
**Arquivo:** `src/components/ai-team/complianceEngine.ts`

- Linha 195: trocar "Mantenha o mesmo comprimento aproximado" por "Se a resposta excede os limites de palavras definidos, ENCURTE mantendo o essencial"
- Linha 289: relaxar o safety check de `0.2` para `0.1` (permitir reescritas até 90% menores)

#### 3. Adicionar word-count enforcer no Camaleão como camada final
**Arquivo:** `src/components/ai-team/SimuladorChameleonMode.tsx`

- Após o compliance pipeline, adicionar um check final: contar palavras da resposta
- Se Maya e > 70 palavras: truncar na última frase completa
- Log de debug quando truncamento é aplicado

### Resultado esperado
Maya no Camaleão vai responder com no máximo ~60-70 palavras, idêntico ao manual. O enforcement é determinístico (código), não depende da IA "obedecer".

### Arquivos alterados
- `src/components/ai-team/complianceEngine.ts` — word limit em `enforceHardRules` + fix no prompt + safety check
- `src/components/ai-team/SimuladorChameleonMode.tsx` — word-count enforcer final

