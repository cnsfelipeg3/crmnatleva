

# Plano: Eliminar Frases Forçadas — Tom Natural para Nath

## Diagnóstico Raiz

O problema vem de **duas camadas de prompt** que empurram a IA a "reagir e validar" de forma exagerada:

1. **`NATLEVA_BEHAVIOR_CORE`** (edge function) — Regra #1 diz *"Sempre reaja ao que o lead disse ANTES de fazer qualquer pergunta. Comente, valide, demonstre interesse genuíno"*. Isso faz a IA abrir TODA mensagem com uma frase de validação forçada tipo "Que linda ideia viajar com..."

2. **`NATH_UNIVERSAL_RULES`** (agentTeamContext.ts) — Linha 340 proíbe "que fofo" mas sugere alternativas que ainda soam artificiais ("Nossaa, que legal!", "Adorei!"), e a regra de "celebrar conquistas" reforça o exagero.

## O Que Muda

### 1. `NATLEVA_BEHAVIOR_CORE` (edge function `simulator-ai/index.ts`)

Reescrever a regra #1 de rapport:

**Antes:** "Sempre reaja ao que o lead disse ANTES de fazer qualquer pergunta. Comente, valide, demonstre interesse genuíno."

**Depois:** "Reconheça brevemente o que o lead disse, mas SEM frases de validação artificiais. NÃO comece com 'Que linda ideia', 'Adorei saber disso', 'Que incrível'. Apenas demonstre que leu e entendeu, e siga a conversa com naturalidade. Se não há nada genuíno para comentar, vá direto ao ponto."

Adicionar regra nova #9:
```
9. PROIBIDO FRASES DE VALIDAÇÃO FORÇADA:
   · NUNCA abra mensagem com: "Que linda ideia", "Adorei isso",
     "Que demais saber que", "Que incrível", "Adorei essa cena"
   · Se quiser reagir, use frases curtas e naturais como:
     "Boa!", "Faz total sentido", "Entendi", "Show, então..."
   · Na dúvida, NÃO reaja. Vá direto ao assunto.
```

### 2. `NATH_UNIVERSAL_RULES` (agentTeamContext.ts)

Atualizar linha 340 para incluir as novas proibições:

**Antes:** Proíbe "que fofo" e sugere "Nossaa, que legal!", "Adorei!"

**Depois:** Proíbe TAMBÉM "Adorei!", "Que linda ideia", "Adorei saber disso", "Que demais!". Sugere alternativas mais secas e reais: "Boa!", "Faz sentido", "Entendi", "Ah, legal". Reforça que a maioria das mensagens NÃO precisa de reação, pode ir direto ao ponto.

Atualizar linha 344 (celebrar conquistas): trocar "de forma genuína" por "apenas se for natural no fluxo, sem forçar".

### 3. Compliance Engine (`complianceEngine.ts`)

Adicionar detecção de frases forçadas no pipeline determinístico — se a resposta começar com padrões como "Que linda", "Adorei saber", "Adorei essa", aplicar sanitização automática removendo a frase de abertura.

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| "Que linda ideia viajar com sua mãe e filha pra Barcelona!" | "Barcelona em janeiro é uma ótima escolha. Quantos dias vocês estão pensando?" |
| "Adorei essa cena de vocês na Sagrada Família!" | "A Sagrada Família é imperdível. Vocês já definiram as datas?" |
| "Adorei saber disso! Que incrível!" | "Entendi. E sobre o orçamento, vocês já têm uma faixa em mente?" |

## Arquivos Editados
- `supabase/functions/simulator-ai/index.ts` — BEHAVIOR_CORE
- `src/components/ai-team/agentTeamContext.ts` — NATH_UNIVERSAL_RULES
- `src/components/ai-team/complianceEngine.ts` — sanitização de frases forçadas

