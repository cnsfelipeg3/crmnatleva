

# Plano: Melhorias Visuais na Central de Cotações & Propostas

## Problemas identificados na tela atual

1. **Cards visualmente idênticos** — Todos têm os mesmos badges "Briefing IA" + "Morno", mesma cor, mesma estrutura. Não há diferenciação visual rápida.
2. **Score é só texto** — "Score 89" como texto não comunica urgência. Precisa de uma barra ou indicador visual.
3. **Barra de progresso sem contexto** — A barrinha verde no final do card não diz em qual etapa está (Nova? Proposta criada? Enviada?).
4. **Orçamento aparece duplicado** — "$ alta" nos insights E "$ alto" no rodapé.
5. **Sem indicador de etapa** — Impossível saber se a negociação está aguardando proposta, já foi enviada, etc.
6. **Layout monótono** — Grid de 3 colunas com tudo igual. Cards quentes deveriam se destacar mais.
7. **Narrativa cortada** — O texto em itálico fica truncado e perde informação útil.

## Melhorias propostas

### 1. Lead Score visual (mini barra colorida)
Substituir o "Score 89" por uma mini barra de progresso colorida (verde >70, amarelo 40-70, vermelho <40) dentro do card, com o número ao lado.

### 2. Badge de etapa do pipeline
Adicionar um badge discreto que mostra a etapa: "Aguardando proposta", "Proposta criada", "Enviada", "Visualizada". Isso elimina a ambiguidade.

### 3. Cards quentes com destaque mais forte
Cards "hot" devem ter borda esquerda colorida (vermelha) ou fundo mais diferenciado. Cards "cold" devem ser mais discretos (opacity reduzida, sem borda).

### 4. Remover duplicação de orçamento
Manter "$ alta" apenas uma vez (na linha de insights do briefing), remover do rodapé meta.

### 5. Etapa + progresso combinados
Substituir a barra de progresso genérica por um stepper de 4 pontos inline (●—○—○—○) que mostra visualmente onde está no funil: Nova → Proposta → Enviada → Fechada.

### 6. Ação rápida contextual visível
O botão "Gerar Proposta IA" ou "Revisar & Enviar" deve ser mais visível — atualmente quase some no card. Dar destaque com cor accent quando a ação é urgente.

### 7. Narrativa expandível
Ao invés de `line-clamp-2`, mostrar 3 linhas e permitir expandir com "ver mais" inline.

## Arquivos impactados

| Arquivo | Ação |
|---|---|
| `src/components/pipeline/NegotiationCard.tsx` | Redesign do card com score visual, stepper, badges de etapa, destaque por temperatura |
| `src/components/pipeline/NegotiationTimeline.tsx` | Ajustar espaçamento e destacar grupo "now" com mais ênfase |

**Zero alterações no banco de dados.** Apenas ajustes visuais em componentes existentes.

