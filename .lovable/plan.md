## Função Arquivar/Desarquivar Conversas

Vamos adicionar arquivamento manual com retorno automático ao receber mensagem do lead.

### 1. Banco de dados (migration)
Adicionar 2 colunas em `conversations`:
- `is_archived` boolean default false
- `archived_at` timestamptz nullable

Criar trigger em `conversation_messages` (e `messages`, pra cobrir as duas tabelas usadas) que, quando `sender_type = 'cliente'`, faz:
```sql
UPDATE conversations SET is_archived = false, archived_at = null
WHERE id = NEW.conversation_id AND is_archived = true;
```

Assim, qualquer mensagem nova do lead desarquiva automaticamente, sem depender do frontend estar aberto.

### 2. UI no Inbox (`OperacaoInbox.tsx`)

**Ação manual de arquivar/desarquivar:**
- Adicionar botão no menu de ações da conversa (mesmo lugar do "fixar" e "marcar não lida"), com ícone Archive/ArchiveRestore.
- Handler `handleToggleArchive` espelhando o `handleTogglePin` (optimistic update + persistência por `db_id` ou `phone`).
- Swipe/atalho: opcional, deixo só o botão pra manter elegante.

**Filtro de visualização:**
- Por padrão a caixa de entrada esconde arquivadas (filtro `archived = false` no `useMemo` de filtragem).
- Adicionar nova chip de filtro "Arquivadas" na barra superior (junto de Todos / Não lidas / VIP / Grupos). Quando ativa, mostra somente arquivadas.
- Contador na chip mostrando quantas arquivadas existem.

**Indicador visual:**
- Conversas arquivadas (quando vistas no filtro) recebem badge sutil "Arquivada" e ícone Archive ao lado do nome.

### 3. Carregamento e realtime
- Incluir `is_archived, archived_at` no `select` inicial e no fetch incremental.
- No realtime de novas mensagens incoming, se a conversa local estiver `is_archived = true`, atualizar localmente para `false` (o trigger já cuida do banco, isso é só pra UI refletir na hora).

### Detalhes técnicos

```text
conversations
  + is_archived boolean default false
  + archived_at timestamptz

trigger after insert on conversation_messages / messages
  when NEW.sender_type = 'cliente'
  -> unarchive conversation
```

Arquivos a editar:
- `supabase/migrations/*` (nova migration: 2 colunas + 2 triggers)
- `src/pages/operacao/OperacaoInbox.tsx` (tipo Conversation, selects, filtro, handler, botão, chip "Arquivadas", realtime unarchive local)

### Resposta à pergunta
Sim, dá pra fazer exatamente como você descreveu, e o desarquivamento automático fica no banco (trigger), então funciona mesmo com o CRM fechado · sem risco de perder mensagem.