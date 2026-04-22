

# Editor Visual Avançado da Proposta · Drag · Resize · Group

Transformar o preview num **canvas de edição livre**, mantendo o renderer público intacto. O usuário manipula em modo "rascunho visual"; só quando clica em **Salvar** os overrides viram parte da proposta no banco.

## Persistência — modelo "draft → save"

- Estado vive em React (`overrides` em `ProposalEditor`), inicializado a partir de `proposal.visual_overrides` (novo campo JSONB na tabela `proposals`).
- Cada mudança no canvas atualiza o estado local + marca `isDirty = true`.
- O botão **Salvar** existente passa a incluir `visual_overrides` no `update`.
- Enquanto não salva, fica um snapshot em `localStorage` (`proposal-visual-draft-<id>`) pra não perder se fechar a aba.
- Ao publicar/visualizar, o `ProposalPreviewRenderer` recebe `overrides` e aplica via mesmo mecanismo de signature já feito no `InlineEditOverlay`.

**Migração:**
```sql
ALTER TABLE proposals ADD COLUMN visual_overrides JSONB DEFAULT '{}'::jsonb;
```

## Modelo de dados (estende o atual)

```ts
type OverrideStyle = {
  // já existentes
  fontFamily?: string; fontSize?: string; color?: string;
  fontWeight?: string; fontStyle?: string;
  textDecoration?: string; textAlign?: string; text?: string;
  // novos
  width?: string; height?: string;          // resize
  position?: { x: number; y: number };       // drag (translate relativo ao bounding original)
  padding?: string; margin?: string;
  background?: string; borderColor?: string;
  borderWidth?: string; borderRadius?: string;
  boxShadow?: string;
  zIndex?: number;
  hidden?: boolean;                          // excluir = ocultar (não muda o renderer)
  duplicateOf?: string;                      // referência ao elemento original
};

type Group = { id: string; members: string[]; label?: string };
type VisualOverrides = {
  styles: Record<string /* signature */, OverrideStyle>;
  groups: Group[];
  duplicates: { id: string; sourceSig: string; style: OverrideStyle }[];
};
```

## Interações

### 1. Seleção
- Clique simples → seleciona um elemento (ring primary).
- **Shift+clique** → adiciona à seleção múltipla.
- **Ctrl/Cmd+G** ou botão "Agrupar" na toolbar → cria um `Group`. Ações de drag/resize aplicadas ao grupo afetam todos os membros simultaneamente (delta compartilhado).
- **Ctrl/Cmd+Shift+G** ou "Desagrupar".
- **Esc** ou clique fora → desseleciona.

### 2. Resize (8 handles)
- Wrapper invisível em volta do elemento ativo com 8 quadradinhos: `nw, n, ne, e, se, s, sw, w`.
- Cada handle muda o cursor (`nwse-resize`, `ns-resize`, etc.) e ajusta `width`/`height` em pixels durante o drag, mantendo proporção se Shift estiver pressionado.
- `min-width: 24px`, `min-height: 24px`. Sem `max` (usuário decide).

### 3. Drag livre
- Arrasta o **corpo** do elemento ativo (cursor `grab`/`grabbing`).
- Aplica `transform: translate(x, y)` para não quebrar o fluxo do layout original — fácil de resetar.
- Snap a guides quando alinha com outro elemento (linha rosa de 1px) — implementação simples comparando bounding boxes, com tolerância de 4px.

### 4. Toolbar expandida (acima do elemento)

```
[Fonte ▾] [T 16px ▾] | B I U | ◀ ▬ ▶ | 🎨 cores |  ← já existe
─────────────────────────────────────────────────
[Padding ▾] [Margin ▾] [BG] [Borda ▾] [Raio ▾] [Sombra ▾] [Z ↑↓]
[📋 Duplicar] [👁 Ocultar] [🔗 Agrupar] [↺ Reset] [✕]
```

- **Padding/Margin**: popover com 4 inputs (T/R/B/L) + sliders.
- **Borda**: cor + espessura + raio.
- **Sombra**: presets (none, sm, md, lg, xl) + custom.
- **Z-index**: setas para "trazer p/ frente", "enviar p/ trás".
- **Duplicar**: cria entrada em `duplicates` com mesmo conteúdo + offset `+20,+20`.
- **Ocultar**: aplica `display:none` via override (recuperável via painel "Elementos ocultos").

### 5. Painel lateral "Camadas" (opcional, fase 2)
Lista todos os elementos editados/agrupados/duplicados com toggle de visibilidade e seleção. Por ora só botão de "ver elementos modificados".

## Arquitetura de componentes

**Refatoração do `InlineEditOverlay.tsx`:**
- Renomear pra `VisualCanvasOverlay.tsx` mantendo retrocompatibilidade.
- Quebrar em sub-componentes:
  - `useCanvasSelection.ts` — lógica de seleção single/multi/group.
  - `useElementResize.ts` — handles + drag de resize.
  - `useElementDrag.ts` — drag livre + snap guides.
  - `SelectionFrame.tsx` — wrapper visual com 8 handles + drag area.
  - `EditToolbar.tsx` — toolbar flutuante (delegada).
  - `StylePopovers.tsx` — popovers de padding, sombra etc.

**Novos arquivos:**
```
src/components/proposal/editor/
  VisualCanvasOverlay.tsx        (substitui InlineEditOverlay)
  SelectionFrame.tsx
  EditToolbar.tsx
  StylePopovers.tsx
  hooks/
    useCanvasSelection.ts
    useElementResize.ts
    useElementDrag.ts
    useVisualOverrides.ts        (sync com form.visual_overrides + dirty)
src/lib/proposalVisualOverrides.ts  (apply/serialize utilities)
```

**Editar:**
- `src/pages/ProposalEditor.tsx` — adicionar `visual_overrides` ao `form`, ao `useQuery` (carregar) e ao `mutation` (salvar). Trocar `InlineEditOverlay` por `VisualCanvasOverlay`. Marcar `isDirty` ao receber `onChange`.
- `src/components/proposal/ProposalPreviewRenderer.tsx` — aceitar prop opcional `visualOverrides` e aplicar no `useEffect` (mesmo signature lookup).

**Migração SQL:** adicionar `visual_overrides JSONB DEFAULT '{}'`.

## Comportamento de "Salvar"

1. Usuário edita → `setOverrides(...)` atualiza estado + grava draft em `localStorage`.
2. Aparece badge "Alterações não salvas" perto do botão Salvar (já tem padrão no app, vou reusar).
3. Ao clicar **Salvar**, mutation envia `{ ...form, visual_overrides: overrides }` pro Supabase.
4. Após salvar, limpa o draft local (`localStorage.removeItem`).
5. Ao reabrir a proposta, `useQuery` traz `visual_overrides` do banco e hidrata o canvas.

## Preservação obrigatória

- ✅ `ProposalPreviewRenderer` continua sendo a fonte da verdade do layout (overrides são aplicados *em cima*).
- ✅ Tabs, formulários, AI extractor, Amadeus, Analytics, PDF export — nada disso muda.
- ✅ `SplitLayout` segue igual.
- ✅ Edição inline de texto/cor/fonte (já feita) continua funcionando — vira parte do mesmo sistema.
- ✅ Botão "Editar visual" agora ativa o canvas completo (drag/resize/etc).

## Detalhes técnicos críticos

- **Signatures sobrevivem a re-render**: já usamos path baseado em `tagName:index`. Continua igual.
- **Drag/resize não pode brigar com cliques internos**: enquanto canvas ativo, intercepto eventos em capture phase no overlay (`pointerdown`).
- **Performance**: o reposicionamento da `SelectionFrame` usa `requestAnimationFrame` + `getBoundingClientRect` em vez de re-render.
- **Mobile**: handles ficam visíveis mas a operação principal continua sendo desktop (já estamos em ≥1280px no split).

## Entregas faseadas (commit por fase, editor sempre funcional)

1. **Fase A** · Migração SQL + persistência draft/save de overrides existentes (sem novas features).
2. **Fase B** · Resize com 8 handles + toolbar atual extendida (padding/margin/bg/borda/raio/sombra/z-index/duplicar/ocultar).
3. **Fase C** · Drag livre com snap guides.
4. **Fase D** · Seleção múltipla + agrupar/desagrupar.

