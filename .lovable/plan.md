## Problema

1. **Badge incorreto**: o número de não lidas no card da conversa nem sempre bate com a quantidade real de mensagens recebidas que ainda não foram respondidas. O contador hoje é incremental (soma +1 a cada nova chegada) e pode dessincronizar.
2. **Marca como lida cedo demais**: hoje, no instante em que você clica numa conversa (`handleSelectConversation`), o sistema zera `unread_count` no banco. Se você sair sem responder, perde o sinal visual de "preciso responder isso".

## Comportamento desejado

- O badge na lista mostra o número **exato** de mensagens recebidas do cliente desde a última resposta sua (ou desde a última vez que você marcou manualmente como lida).
- Abrir a conversa **não** zera o contador. A conversa só sai do estado "não lida" quando:
  - você envia uma resposta para o cliente, **ou**
  - você clica no botão "marcar como lida" (já existe na UI).
- Se o cliente mandar mais mensagens enquanto a conversa está aberta, o badge continua subindo (ou aparece o indicador de "novas mensagens"), e só zera quando você responde.

## Plano de implementação

### 1. Fonte da verdade: contagem derivada das mensagens

Criar função SQL `recount_conversation_unread(conv_id uuid)` que recalcula `unread_count` contando mensagens em `conversation_messages` (e `messages`) do tipo `incoming`/`cliente` posteriores à última mensagem `outgoing`/`atendente` daquela conversa. Isso garante que o número sempre reflita a realidade.

Trigger leve: ao inserir mensagem nova ou ao marcar como lida, chamar essa função em vez de fazer aritmética incremental no frontend.

### 2. Remover o auto-zerar ao abrir conversa

Em `src/pages/operacao/OperacaoInbox.tsx`, função `handleSelectConversation` (linhas 1698-1707): remover o `update({ unread_count: 0 })`. Abrir só seleciona, não marca como lida.

### 3. Zerar somente após resposta enviada

No fluxo de envio de mensagem do atendente (linhas ~1209 e 1241), manter o `unread_count: 0` que já existe · esse é o ponto correto. Adicionar também limpeza de `manually_marked_unread = false` (já existe trigger `reset_manually_marked_unread`, validar que está ativo).

### 4. Botão "marcar como lida" explícito

Já existe `manually_marked_unread` e o handler de toggle (linha 1679). Garantir que:
- "marcar como lida" zera `unread_count` E `manually_marked_unread`
- "marcar como não lida" mantém `unread_count` real e seta `manually_marked_unread=true` (badge pontilhado já implementado em `ConversationItem`)

### 5. Realtime alinhado

Em `src/components/inbox/useInboxRealtime.ts` (linhas 133, 179): trocar `safeUnreadCount(c.unread_count) + 1` por leitura do valor vindo do banco (que já será correto pela função de recount). Remover o ramo `isOpen ? 0 : ...` · não zera mais só por estar aberto.

### 6. Reconciliação periódica

No polling de 30s da lista (já existe), incluir um recount em background das conversas visíveis para corrigir qualquer drift histórico.

### 7. Backfill único

Migration que roda `recount_conversation_unread` em todas as conversas existentes para corrigir os números atualmente errados.

## Indicador visual (UX)

- Badge azul (número) = mensagens não respondidas reais.
- Badge pontilhado dourado (sem número) = você marcou manualmente como não lida.
- Quando a conversa está aberta E há novas mensagens chegando, badge continua visível na lista lateral (não some).

## Arquivos afetados

- `supabase/migrations/...` (nova função SQL + triggers + backfill)
- `src/pages/operacao/OperacaoInbox.tsx` (handleSelectConversation, handlers de envio e toggle)
- `src/components/inbox/useInboxRealtime.ts` (parar de incrementar localmente)
- `src/components/inbox/ConversationItem.tsx` (ajuste mínimo se precisar, badge já está ok)

Posso aplicar?