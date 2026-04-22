

# Construtor de Proposta WYSIWYG · Split + Inline

Transformar o `ProposalEditor` num ambiente de duas colunas: **formulários compactos à esquerda**, **preview público ao vivo à direita**, com **edição inline** (clica num bloco do preview e o campo correspondente entra em foco/scroll na esquerda).

## Layout final

```text
┌──────────────────────────────────────────────────────────────────┐
│ Top bar: ← Voltar  ·  Título  ·  Status  ·  [Salvar] [Publicar] │
├───────────────────────────┬──────────────────────────────────────┤
│ FORM (esq · 42%)          │ PREVIEW AO VIVO (dir · 58%)          │
│                           │                                      │
│ ▸ Hero (capa, título)     │  ┌────────────────────────────────┐ │
│ ▸ Cliente & datas         │  │  HERO (clicável → foca form)   │ │
│ ▸ Destinos                 │  ├────────────────────────────────┤ │
│ ▸ Voos (já refeito)        │  │  Destinos · cards              │ │
│ ▸ Hotéis                   │  │  Voos · UnifiedLegCard         │ │
│ ▸ Experiências            │  │  Hotéis · galeria              │ │
│ ▸ Transfers                │  │  Investimento                  │ │
│ ▸ Investimento            │  └────────────────────────────────┘ │
│ ▸ Pagamento                │  [💻 desktop] [📱 mobile]            │
│                           │                                      │
│ ←—— handle redimensionável ——→                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Em telas <1280px: cai pro modo de **abas atual** (Editar / Preview / Analytics) automaticamente, sem perder nada.
- Botão flutuante "Esconder preview" pra foco total no form.
- Handle de redimensionamento (`react-resizable-panels`, já instalado em `src/components/ui/resizable.tsx`).

## Edição inline (híbrido)

Cada bloco do preview ganha um wrapper clicável (`data-edit-target="hero" | "destinations" | "flight-{id}" | "hotel-{id}" | ...`). Ao clicar:
1. Aparece um anel `ring-primary` no bloco (já existe o helper `clickableClass` no editor de templates).
2. Dispara um evento custom `proposal:focus-section` com o target.
3. O painel da esquerda escuta, **expande o card correspondente** (Collapsible), faz **scroll suave** até ele e dá **focus** no primeiro input.

Sem reescrever a lógica de edição: o form continua sendo a fonte da verdade. O preview vira um "atalho visual" pros campos.

## Escopo dos blocos no formato preview

Aplicar o mesmo padrão visual já feito em **Voos** (formulário compacto + miniatura `UnifiedLegCard` em cima, atualizando em tempo real) nos demais itens:

| Bloco | Formulário compacto | Mini-preview embutido |
|---|---|---|
| **Hero** | título, subtítulo, capa, cliente, datas, pax | Card hero do template (1:1 do público) |
| **Destinos** | nome, foto, descrição curta, dias | Cards estilo "Seu(s) Destino(s)" |
| **Voos** | já feito ✓ | `UnifiedLegCard` ✓ |
| **Hotéis** | nome, cidade, check-in/out, categoria, fotos | Card hotel com galeria + rating |
| **Experiências** | título, data, descrição, fotos | Card timeline |
| **Transfers** | tipo, origem→destino, data/hora | Linha compacta com ícone |
| **Investimento** | valor total, por pessoa, condições | Card "investimento" idêntico ao público |

Todos reaproveitam **componentes já existentes** de `ProposalPreviewRenderer` (vou exportar mais subcomponentes além do `UnifiedLegCard`).

## Preservação obrigatória

- ✅ **Upload de print + extração IA** (`AIBookingExtractor`) continua no topo de cada item
- ✅ **Múltiplos trechos / conexões** (lógica atual de `ProposalFlightSearch`)
- ✅ **Preenchimento manual completo** de todos os campos atuais
- ✅ **Aba Analytics** intacta
- ✅ **Salvar / Publicar / Exportar PDF** sem mudança
- ✅ Templates (`selectedTemplate`) continuam controlando estilo do preview

## Arquivos a editar/criar

**Editar:**
- `src/pages/ProposalEditor.tsx` · troca `Tabs` pelo `ResizablePanelGroup` em ≥1280px, mantém Tabs em <1280px. Adiciona listener do evento `proposal:focus-section`.
- `src/components/proposal/ProposalPreviewRenderer.tsx` · adiciona prop opcional `editable?: boolean` que envolve cada bloco num `<button data-edit-target>` que dispara o evento. Exporta subcomponentes (`HeroBlock`, `DestinationCard`, `HotelCard`, `InvestmentBlock`).

**Criar (mini-previews dos forms, espelhando Voos):**
- `src/components/proposal/editor/HeroEditor.tsx`
- `src/components/proposal/editor/DestinationItemEditor.tsx`
- `src/components/proposal/editor/HotelItemEditor.tsx`
- `src/components/proposal/editor/ExperienceItemEditor.tsx`
- `src/components/proposal/editor/TransferItemEditor.tsx`
- `src/components/proposal/editor/InvestmentEditor.tsx`
- `src/components/proposal/editor/SplitLayout.tsx` · wrapper do split + toggle + breakpoint guard
- `src/hooks/useProposalSectionFocus.ts` · emite/escuta o evento de foco

**Não tocar:**
- Lógica de save (`useMutation`), Amadeus, IA Extractor, Analytics, ProposalPublicView, templates.

## Detalhes técnicos

- **Sincronização**: o preview já recebe `proposal` e `items` por props no estado do form → continua reativo, zero novo state global.
- **Performance**: o preview re-renderiza a cada keystroke. Vou envolver `ProposalPreviewRenderer` num `useDeferredValue` pros campos de texto longos, evitando travar o input.
- **Foco**: usar `scrollIntoView({ behavior: "smooth", block: "center" })` + `requestAnimationFrame` pra dar focus depois do scroll.
- **Mobile**: <1280px cai pras Tabs atuais; o `editable` no preview dispara o mesmo evento, que em modo Tabs muda pra aba "Editar" + scroll.
- **Estado do split**: largura persiste em `localStorage` (`proposal-editor-split-size`).
- **Visibilidade do preview**: toggle persiste em `localStorage` (`proposal-editor-preview-visible`).

## Entregas faseadas (pra reduzir risco)

1. **Fase 1** · Split layout + preview ao vivo (sem inline), reaproveitando os forms atuais. Testável de imediato.
2. **Fase 2** · Edição inline (clicar no preview foca o campo).
3. **Fase 3** · Mini-previews embutidos nos forms (Hero, Hotéis, Destinos, Investimento, Experiências, Transfers).

Cada fase é commitada separadamente e o editor continua 100% funcional entre elas.

