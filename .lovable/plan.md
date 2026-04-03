

## Perfis de Lead Coerentes no Simulador Camaleão

### Problema
O `generateRandomProfile()` escolhe destino, orçamento e composição de forma 100% aleatória e independente. Resultado: combinações absurdas como "Bali + família de 4 + R$5.000" — totalmente fora da realidade.

### Solução: Tabela de Coerência Destino → Orçamento Mínimo

Criar um mapa de faixas realistas por destino e composição, e filtrar orçamentos incompatíveis.

**Arquivo:** `src/components/ai-team/chameleonUtils.ts`

#### 1. Adicionar mapa de custo mínimo por destino (por pessoa)

Categorizar destinos em faixas:
- **Econômico** (Buenos Aires, Santiago): orçamento baixo OK para qualquer composição
- **Médio** (Cancún, Orlando, Lisboa): mínimo "médio" para famílias/grupos
- **Premium** (Paris, Londres, Tóquio, Roma, Dubai): mínimo "alto" para famílias
- **Luxury** (Maldivas, Bali): mínimo "alto" para casal, "ilimitado" para família

#### 2. Ajustar `generateRandomProfile()` 

Lógica:
1. Escolher destino e composição primeiro
2. Consultar a faixa mínima de orçamento para essa combinação
3. Filtrar os orçamentos disponíveis para incluir apenas os compatíveis
4. Se "baixo" é incompatível com o destino, removê-lo das opções

#### 3. Adicionar coerência motivação ↔ composição

Regras simples:
- "lua de mel" / "aniversário de casamento" → composição = "casal"
- "viagem solo" → composição = "solo"
- "férias em família" / "férias escolares" → composição com filhos
- "despedida de solteira" → grupo de amigos

#### 4. Coerência experiência ↔ destino

- "nunca viajou internacional" → destinos mais acessíveis (Buenos Aires, Santiago, Cancún, Orlando)
- Destinos como Maldivas, Bali, Tóquio → mínimo "viajou 1-2 vezes"

### Resultado esperado
Perfis gerados serão sempre plausíveis: um lead que quer Bali com família nunca terá orçamento de R$5k. Um solo traveler para Buenos Aires pode ter orçamento baixo normalmente.

### Escopo
- 1 arquivo alterado: `src/components/ai-team/chameleonUtils.ts`
- Apenas a função `generateRandomProfile()` e dados auxiliares

