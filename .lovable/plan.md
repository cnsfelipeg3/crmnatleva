## Objetivo

Adicionar um botãozinho de calendário ao lado do campo `DD / MM / AAAA` (componente `DatePartsInput`) para que o usuário possa escolher a data clicando, navegando entre dia/mês/ano · sem perder a digitação manual já existente.

Como esse componente é usado em todo o sistema (vendas, propostas, RH, financeiro, portal, etc.), uma única alteração propaga o botão para todos os lugares automaticamente.

## Mudança

Arquivo único: `src/components/ui/date-parts-input.tsx`

1. Adicionar um `Popover` com um `Button` ícone (`CalendarIcon` do `lucide-react`) à direita do input de ano.
2. Ao clicar, abre o `Calendar` (shadcn · `@/components/ui/calendar`) já usado no projeto.
3. Configurar:
   - `mode="single"`, `selected` = data atual do input (se válida).
   - `captionLayout="dropdown"` para permitir navegação rápida por mês e ano (anos respeitando `minYear` / `maxYear`).
   - `disabled` aplicando `disableFuture` / `disablePast` quando definidos.
   - `locale={ptBR}` (date-fns) seguindo o padrão do projeto.
4. Ao escolher uma data no calendário:
   - Atualiza os três campos (`d`, `m`, `y`) via `commit(...)`, mantendo a mesma validação já existente.
   - Fecha o popover.
5. Acessibilidade: `aria-label="Abrir calendário"` no botão, `type="button"` para não submeter forms.

## Estilo

- Botão `variant="ghost"` `size="icon"` com `h-11 w-11` para alinhar com a altura dos inputs (h-11) e manter o visual leve do design system (glass-card, border 0.75rem, sem hyphens).
- `shrink-0` para não comprimir em telas pequenas.

## Não muda

- Lógica de digitação, auto-tab, paste, back-tab e validação permanecem idênticas.
- Nenhum outro arquivo precisa ser editado · todos os lugares que usam `DatePartsInput` (NewSale, ProposalEditor, PassengerProfile, financeiro, RH, portal, etc.) ganham o botão automaticamente.
- API do componente (`value`, `onChange`, props) permanece a mesma · zero breaking change.

## Detalhes técnicos

- Reutiliza `@/components/ui/popover` e `@/components/ui/calendar` já presentes.
- Usa `date-fns` e `date-fns/locale` (ptBR) já instalados.
- `parseLocalDate` (regra de memória GMT-3) já é respeitada porque continuamos serializando como `YYYY-MM-DD` puro · sem `new Date(iso)` direto.
