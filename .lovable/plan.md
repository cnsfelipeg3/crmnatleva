# Piloto controlado: agentes IA respondendo no LiveChat

Vamos colocar Maya e Atlas para responder DE VERDADE no WhatsApp, mas com **três camadas de segurança** para garantir que NENHUMA outra conversa seja afetada por engano. O teste começa exclusivamente com o chat do Bryan Souza (+55 11 97304 5950).

## Princípio central · "Default OFF, opt-in explícito"

Por padrão, NENHUMA conversa terá agente respondendo. Só conversas que você ativar manualmente, uma a uma, recebem resposta automática. E ainda existe uma trava global "kill switch" que desliga TUDO instantaneamente.

## As 3 camadas de segurança

```text
Camada 1 · Kill switch global (ai_config: ai_autopilot_global = on/off)
Camada 2 · Allowlist de telefones (ai_autopilot_allowlist) · só Bryan no início
Camada 3 · Toggle por conversa (conversations.ai_autopilot_enabled + active_agent)
```

A IA só responde se **as 3 camadas estiverem verdes**. Basta uma estar OFF e a resposta automática não acontece.

## O que o usuário vê no chat (UI)

No header da conversa (ao lado do botão "Opinião da Nath"), aparece um novo controle discreto:

```text
[ 🤖 Piloto IA: Desligado ▾ ]
   ├─ Desligado (padrão)
   ├─ Ativar Maya · Acolhimento
   └─ Ativar Atlas · Qualificação SDR
```

Quando ativo, vira um chip verde pulsante:
```text
[ ● Maya respondendo · Pausar ]
```

Cada mensagem enviada pelo agente aparece no chat com um badge discreto **"via Nath · Maya"** para você diferenciar do que é humano.

Existe ainda um botão **"Pausar 1h"** rápido (auto-religa depois) para casos em que você quer assumir o controle pontualmente sem desativar de vez.

## Fluxo técnico (o que acontece quando chega mensagem)

```text
WhatsApp (Bryan) → Z-API webhook → zapi-webhook (já existe)
                                         ↓
                           grava mensagem em messages
                                         ↓
                           NOVO: trigger autopilot-dispatcher
                                         ↓
                       Verifica as 3 camadas de segurança
                                         ↓ (todas OK)
                           Chama agent-chat (Maya OU Atlas)
                                         ↓
                       Envia via zapi-proxy (send-text)
                                         ↓
                       Grava resposta em messages com flag
                                         ↓
                       Atualiza badge "via Nath" no LiveChat
```

## Mudanças no banco (migration)

1. **`conversations`** ganha 3 colunas:
   - `ai_autopilot_enabled boolean default false`
   - `ai_autopilot_agent text` ('maya' | 'atlas' | null)
   - `ai_autopilot_paused_until timestamptz` (para pausa temporária)

2. **`ai_config`** ganha 2 chaves:
   - `ai_autopilot_global` ('on' | 'off') · padrão **'off'**
   - `ai_autopilot_allowlist` (texto, lista de telefones) · começa com `5511973045950`

3. **`messages`** ganha 1 coluna (se não existir):
   - `sent_by_agent text` ('maya' | 'atlas' | null) para identificar visualmente

## Mudanças no código

**Edge Functions:**
- `autopilot-dispatcher` (NOVO) · função invocada após cada mensagem recebida. Faz toda a verificação das 3 camadas, monta o histórico, chama `agent-chat`, envia via Z-API e grava com `sent_by_agent`.
- `zapi-webhook` · adicionar **uma única chamada** ao final do bloco que processa mensagens recebidas: `supabase.functions.invoke('autopilot-dispatcher', { conversation_id, message_id })`. Não bloqueia nem altera o fluxo atual.

**Frontend:**
- `src/components/livechat/AutopilotControl.tsx` (NOVO) · o dropdown/chip do header.
- `src/components/livechat/ConversationHeader.tsx` (existente) · injetar o `AutopilotControl`.
- `src/components/livechat/MessageBubble.tsx` (existente) · mostrar badge "via Nath · Maya/Atlas" quando `sent_by_agent` estiver setado.
- `src/pages/AdminAutopilot.tsx` (NOVO, opcional v2) · página em /admin para você ver/gerir kill switch global + allowlist sem mexer no banco.

## Garantias contra "vazamento" para outras conversas

1. **Default OFF no banco**: a coluna `ai_autopilot_enabled` nasce `false` para TODAS as conversas existentes (a migration NÃO faz mass-update).
2. **Allowlist de telefones**: mesmo se alguém ativar o toggle por engano em outra conversa, o dispatcher rejeita porque o telefone não está na lista.
3. **Kill switch global**: em caso de qualquer comportamento estranho, você roda 1 update no `ai_config` e todos os agentes param em segundos.
4. **Logs detalhados**: cada decisão do dispatcher (acionado / rejeitado / motivo) fica em log do edge function · você consegue auditar tudo.
5. **Cooldown anti-loop**: o dispatcher ignora mensagens com `fromMe = true` e respeita um cooldown de 8s entre respostas da IA por conversa.
6. **Não responde a mídia complexa**: se a mensagem do cliente for áudio/imagem/documento, o dispatcher pula (v1) e deixa para o humano · evita que a IA responda algo sem ter "ouvido" o áudio.

## Rollout em fases

**Fase 1 (este plano):** Maya OU Atlas, escolhido manualmente, somente Bryan, allowlist 1 número.
**Fase 2 (depois de validar):** transferência automática Maya → Atlas quando qualificação atingir critério.
**Fase 3:** ampliar allowlist para mais números teste.
**Fase 4:** liberar para todas as conversas com flag por usuário.

## Critérios de aceite (Fase 1)

- [ ] Toggle no header do chat funciona e persiste por conversa.
- [ ] Bryan envia mensagem → Maya/Atlas responde no WhatsApp em < 15s.
- [ ] Outras conversas (qualquer outro número) NÃO recebem resposta automática mesmo com toggle errado.
- [ ] Desligar o toggle interrompe imediatamente (próxima msg do cliente não tem resposta IA).
- [ ] Kill switch global desliga tudo em qualquer cenário.
- [ ] Mensagens da IA aparecem no LiveChat com badge "via Nath · Maya/Atlas".
- [ ] Logs do `autopilot-dispatcher` mostram cada decisão.

## Tempo estimado de implementação

~45 min de build (migration + dispatcher + UI + 1 ajuste no webhook).

Quer que eu siga com a implementação?
