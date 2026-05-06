## Entendi o problema

Hoje, ao tentar selecionar texto de uma mensagem no chat (`OperacaoInbox`), dois comportamentos atrapalham:

1. **`onPointerDown` com long-press de 500ms** entra automaticamente no modo de seleção/encaminhamento ao segurar o mouse, o que acontece justamente quando você está arrastando para selecionar texto.
2. **`onClick` na linha** alterna seleção quando o modo está ativo, impedindo copiar/colar normal.

Resultado: dá pra ver "1 mensagem selecionada · Encaminhar" no topo em vez de copiar o texto.

## O que vou fazer

### 1. Liberar o clique esquerdo para seleção de texto nativa
- Remover o `onPointerDown`/`onPointerUp` de long-press do wrapper de mensagem em `OperacaoInbox.tsx` (linhas ~2772-2779).
- Remover o `onClick` que alterna seleção fora do modo de seleção. Quando o modo de seleção estiver ativo (via toolbar ou menu de contexto), o clique continua funcionando para marcar/desmarcar.
- Garantir `user-select: text` no balão da mensagem (hoje herda, mas vou reforçar com `select-text` no container do texto pra não ser inibido por nada).

### 2. Menu de contexto no botão direito (clique direito)
- Trocar o atual `onContextMenu` (que entra direto no modo de seleção) por um `<ContextMenu>` do shadcn (`src/components/ui/context-menu.tsx` já existe).
- Envolver cada balão de mensagem (exceto `sistema`) em `<ContextMenuTrigger>`.
- O menu terá duas opções:
  - **Encaminhar mensagem** · ícone `Forward` · abre o `ForwardDialog` direto com aquela mensagem (`setForwardSeed([msg]); setForwardOpen(true)`).
  - **Fixar mensagem** · ícone `Pin` · ver item 3.
- Importante: o menu de contexto do navegador não atrapalha o "selecionar + Ctrl+C", porque o usuário só clica direito quando quer ação; pra copiar usa esquerdo normal. Ainda assim mantenho um item "Copiar texto" no menu como conveniência.

### 3. Fixar mensagem (nova feature mínima)
- Hoje só existe `is_pinned` em **conversa**, não em mensagem. Vou adicionar:
  - Migration: `ALTER TABLE whatsapp_messages ADD COLUMN is_pinned boolean DEFAULT false, ADD COLUMN pinned_at timestamptz;`
  - Função `handleTogglePinMessage(msg)` que faz update na linha.
- UI: mensagens fixadas ganham um pequeno badge `Pin` no canto do balão. Sem listagem dedicada nessa primeira entrega (escopo do pedido foi só "fixar").
- Item do menu mostra "Fixar mensagem" ou "Desafixar mensagem" conforme estado.

### 4. Manter o modo de seleção múltipla (para encaminhar várias)
- O botão atual "Encaminhar mensagens" do header da conversa continua funcionando para entrar em modo seleção múltipla com checkboxes. Não removo esse fluxo, só removo o gatilho automático por long-press / clique acidental.

## Arquivos afetados

- `src/pages/operacao/OperacaoInbox.tsx` · remover long-press, trocar onContextMenu por `<ContextMenu>`, adicionar handler de pin de mensagem e badge visual.
- Nova migration SQL · colunas `is_pinned` e `pinned_at` em `whatsapp_messages`.

## Fora de escopo (posso fazer depois se quiser)

- Lista/aba dedicada de "mensagens fixadas" da conversa.
- Replicar o mesmo menu de contexto no `MessageBubble` genérico (`src/components/inbox/MessageBubble.tsx`), caso seja usado em outras telas.

Posso seguir?