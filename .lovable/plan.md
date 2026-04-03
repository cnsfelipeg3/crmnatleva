

## Diagnóstico: Maya ainda com problemas comportamentais (não é mais word-count)

### O que a screenshot mostra

O limite de palavras (~60) **está funcionando** — as mensagens da Maya estão dentro do limite. O problema agora é **comportamental**:

| Problema | Exemplo na screenshot | Regra violada |
|---|---|---|
| **2 perguntas numa mensagem** | "como posso te chamar? E me conta, o que mais te chama atenção em Buenos Aires?" | "Máximo 1 pergunta por mensagem" |
| **Storytelling/marketing** | "A cidade tem uma energia única, aquela mistura de Europa com América Latina que é impossível de resistir" | Maya deve criar conexão rápida, sem fazer turismo |
| **Não transfere quando lead pede preço/hotel** | Lead: "Me mostra 2-3 opções de hotel" → Maya continua respondendo | "Se questionada sobre dicas ou logística, admitir incerteza e disparar [TRANSFERIR]" |
| **Não transfere com dados completos** | Na mensagem 2 já tinha Nome + Destino + Período + Composição → Maya continua | "Quando tiver dados mínimos + 5 trocas, TRANSFIRA IMEDIATAMENTE" |

### Causa raiz: 3 problemas

1. **Enrichment dilui o prompt da Maya** — Após `buildUnifiedAgentPrompt` retornar o prompt compacto da Maya (~500 palavras), o Chameleon **apenda Skills + Workflows** (linha 258-259), adicionando contexto desnecessário que dilui as instruções.

2. **Sem enforcement determinístico de regras comportamentais** — `enforceHardRules` valida word-count e formatação, mas NÃO detecta:
   - Múltiplas interrogações (2+ "?" = violação)
   - Padrões de storytelling/turismo
   - Lead pedindo preço/hotel/logística (deveria forçar transfer)

3. **Compliance Engine é genérico** — O AI compliance valida "contra todas as regras", mas a Maya tem regras muito específicas (1 pergunta, pivot em logística) que o validador generalista não enforça consistentemente.

---

### Plano de correção

#### 1. Bloquear enrichment para Maya
**Arquivo:** `src/components/ai-team/SimuladorChameleonMode.tsx`

- Na linha 257-260: adicionar `if (agentId !== "maya")` antes de aplicar enrichment
- Maya não precisa de skills/workflows — seu prompt é auto-contido

#### 2. Adicionar enforcement determinístico de comportamento em `enforceHardRules`
**Arquivo:** `src/components/ai-team/complianceEngine.ts`

Novas regras codificadas (sem depender de IA):
- **Multi-pergunta**: contar "?" na resposta; se Maya e 2+, remover tudo após o primeiro "?"+ frase
- **Storytelling detector**: regex para padrões como "uma energia única", "impossível de resistir", "foi feita pra", "capítulo à parte" → cortar a frase inteira
- **Pivot detector**: se a última mensagem do lead contém "hotel", "preço", "opção", "valor", "desconto" → injetar "[TRANSFERIR]" no final da resposta

#### 3. Também bloquear enrichment no Manual Mode para Maya
**Arquivo:** `src/components/ai-team/SimuladorManualMode.tsx`

- Mesma lógica: pular enrichment layer para Maya (consistência entre modos)

### Resultado esperado
- Maya: 1 pergunta por mensagem, sem storytelling, transfere imediatamente ao detectar pedido de logística/preço
- Enrichment preservado para todos os outros agentes

### Arquivos alterados
- `src/components/ai-team/complianceEngine.ts` — regras comportamentais determinísticas
- `src/components/ai-team/SimuladorChameleonMode.tsx` — skip enrichment para Maya
- `src/components/ai-team/SimuladorManualMode.tsx` — skip enrichment para Maya

