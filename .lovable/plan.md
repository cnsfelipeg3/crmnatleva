

# Plano: Contraste Total + Cores Vivas nos Cards de Negociação

## Problema atual

Olhando a screenshot: todos os cards são visualmente idênticos — mesma cor bege, textos com baixo contraste (muted-foreground em fundo claro), badges pálidas, sem diferenciação visual real entre quente/morno/frio. Tudo parece "lavado".

## Mudanças propostas

### 1. Cards com fundo branco puro + texto preto forte
- Card background: branco (`bg-white`) ao invés de `bg-card` bege
- Texto principal da rota: `text-gray-900 font-bold` (contraste máximo)
- Nome do cliente: `text-gray-700` ao invés de `text-muted-foreground`
- Narrativa: `text-gray-600` ao invés de `text-muted-foreground/80`
- Meta (datas, pax): `text-gray-600`

### 2. Temperatura com cores VIVAS nos cards
- **Quente**: borda esquerda `border-l-red-600` grossa (4px), fundo sutil `bg-red-50`, sombra vermelha
- **Morno**: borda `border-l-amber-500`, fundo `bg-amber-50`
- **Frio**: borda `border-l-blue-500`, fundo `bg-blue-50`
- **Fechada**: borda `border-l-emerald-500`, fundo `bg-emerald-50`

### 3. Badges com cores sólidas e contrastantes
- "Briefing IA": fundo amarelo forte (`bg-amber-400 text-black`)
- "Aguardando proposta": fundo cinza escuro (`bg-gray-800 text-white`)
- "Em análise": fundo azul (`bg-blue-500 text-white`)
- "Urgente": fundo vermelho (`bg-red-600 text-white`)
- "Fechada": fundo verde (`bg-emerald-600 text-white`)

### 4. TemperatureScore mais vivo
- Hot: `bg-red-600 text-white` (sólido, não transparente)
- Warm: `bg-amber-500 text-white`
- Cold: `bg-blue-500 text-white`
- Won: `bg-emerald-600 text-white`

### 5. LeadScoreBar maior e mais visível
- Barra mais larga (w-14 ao invés de w-10), mais alta (h-2 ao invés de h-1.5)
- Score em `font-extrabold text-[11px]`

### 6. PipelineStepper com pontos maiores e cores fortes
- Pontos feitos: `bg-emerald-500` (verde vivo) ao invés de `bg-primary`
- Ponto ativo: anel verde com pulso
- Conectores feitos: `bg-emerald-500`
- Label em `font-semibold text-gray-700`

### 7. Botão "Gerar Proposta IA" sempre destacado
- Verde escuro (`bg-emerald-700 hover:bg-emerald-800 text-white`) para cards normais
- Vermelho (`bg-red-600 text-white`) para cards quentes
- Tamanho maior: `h-8 text-xs` ao invés de `h-7 text-[10px]`

### 8. Hover interativo nos cards
- `hover:shadow-lg hover:scale-[1.01]` com transição suave
- Botão ChevronRight sempre visível (não só no hover)

## Arquivos impactados

| Arquivo | Ação |
|---|---|
| `src/components/pipeline/NegotiationCard.tsx` | Redesign cores, contraste, hover |
| `src/components/pipeline/TemperatureScore.tsx` | Cores sólidas |
| `src/components/pipeline/LeadScoreBar.tsx` | Barra maior e mais viva |
| `src/components/pipeline/PipelineStepper.tsx` | Pontos verdes, maiores |
| `src/components/ui/badge.tsx` | Variantes com cores sólidas |
| `src/components/pipeline/NegotiationTimeline.tsx` | Headers de grupo mais contrastantes |

**Zero alterações no banco de dados.** Apenas mudanças visuais de CSS/classes.

