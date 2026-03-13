

# Redesign dos Botoes do Rateio de Despesas — Identidade NatLeva Premium

## Problema
Os botoes do modulo de Rateio estao sem cor, sem personalidade visual e sem a elegancia premium da identidade NatLeva. Isso inclui: botoes de acao principal (Criar Grupo, Adicionar Despesa), botoes de selecao de participantes, botoes de sugestao de divisao, e botoes de navegacao do wizard.

## Plano

### Arquivo: `src/components/portal/PortalExpenseSplit.tsx`

Redesign completo de todos os botoes e elementos interativos para seguir a estetica premium NatLeva (verde institucional, gradientes, glow effects, backdrop-blur):

**1. Botoes de Acao Principal** (Criar Grupo, Adicionar Despesa, Confirmar)
- Gradiente verde NatLeva: `bg-gradient-to-r from-[#0D9668] to-[#0A7B54]`
- Texto branco, font-bold, sombra com glow verde
- Hover com brilho intensificado e scale sutil
- Icone com animacao de pulse no hover

**2. EmptyState — CTA "Criar Grupo de Despesas"**
- Botao grande com gradiente verde, icone animado
- Borda com glow verde sutil
- Fundo do card com efeito glassmorphism

**3. Botoes de Selecao de Participantes** (quem pagou, quem participa)
- Estado inativo: borda sutil, fundo transparente com backdrop-blur
- Estado ativo: fundo verde com opacidade, borda verde, badge com check animado
- Avatar com ring colorido quando selecionado

**4. Botoes de Sugestao Inteligente** (step 2 do wizard)
- Cards de sugestao com borda gradiente quando ativo
- Icone de radio/check animado
- Fundo com glassmorphism sutil
- Badge "Recomendado" com cor accent no default

**5. Botoes de Navegacao do Wizard** (Proximo, Voltar, Editar)
- "Proximo/Confirmar": gradiente verde, icone com seta animada
- "Voltar/Editar": outline com borda verde sutil, hover com fundo verde/5%

**6. Botao "Marcar como Pago"**
- Gradiente verde -> verde escuro
- Icone de check com animacao de success

**7. Botao de Escanear Recibo**
- Borda dashed com gradiente verde
- Icone de camera com pulse
- Fundo com pattern sutil

**8. Group Selector Tabs**
- Tab ativa: gradiente verde com texto branco
- Tab inativa: glassmorphism com hover verde sutil

**9. Botao "+ Adicionar nome" e "+ Adicionar" (membros)**
- Outline com cor accent, hover com fill accent

### Mudancas Especificas

Todos os `<Button>` e `<button>` do componente serao atualizados com classes Tailwind que usam:
- `bg-gradient-to-r from-emerald-600 to-emerald-700` para CTAs
- `hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]` para glow
- `hover:scale-[1.02] active:scale-[0.98]` para feedback tatil
- `transition-all duration-200` para suavidade
- Bordas e backgrounds consistentes com as CSS vars `--accent` do tema

Nenhum arquivo adicional sera criado. Apenas `PortalExpenseSplit.tsx` sera editado.

