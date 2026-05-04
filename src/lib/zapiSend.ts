// ════════════════════════════════════════════════════════════════
// Z-API Send + Finalize Helpers (table-aware)
// ════════════════════════════════════════════════════════════════
// MANTER SINCRONIZADO COM:
//   · src/lib/zapiFailureClassifier.ts (FAILURE_REASONS / classifier · fonte única)
//   · supabase/functions/zapi-proxy/index.ts (Deno runtime · constantes duplicadas)
//
// ─── TECH DEBT ───────────────────────────────────────────────────
// Hoje convivemos com 2 tabelas de mensagens:
//   · conversation_messages → usado por OperacaoInbox (inbox unificado)
//   · messages              → usado por LiveChat (legado)
//
// Mensagens criadas via LiveChat NÃO têm fluxo otimístico completo:
// não gravam `original_payload` no INSERT, então o retry inline pelo
// MessageBubble não funciona pra elas. O global watcher ainda mostra
// toast com a mensagem humanizada e a action "Ver" leva o usuário até
// a conversa, mas o reenvio tem que ser manual (digitar de novo).
//
// Consolidação prevista quando unificarmos as 2 tabelas (sem tracker
// formal ainda · ver memória "AI Stack Orchestration" / inbox phases).
// ────────────────────────────────────────────────────────────────

import { FAILURE_REASONS, classifySendOutcome, type SendOutcome } from "./zapiFailureClassifier";

export type MessagesTable = "conversation_messages" | "messages";

export interface SendResult extends SendOutcome {
  data: any;
}

/**
 * Wrapper unificado: dispara via supabase.functions.invoke("zapi-proxy", ...).
 * Caller decide o que fazer (toast, persist, retry).
 */
export async function sendViaZapiProxy(
  supabaseClient: { functions: { invoke: (name: string, opts: any) => Promise<{ data: any; error: any }> } },
  action: string,
  payload: any
): Promise<SendResult> {
  try {
    const { data, error } = await supabaseClient.functions.invoke("zapi-proxy", {
      body: { action, payload },
    });
    return { ...classifySendOutcome(error, data), data };
  } catch (err: any) {
    return {
      ok: false,
      reason: FAILURE_REASONS.TEMPORARY,
      detail: err?.message || "exception",
      data: null,
    };
  }
}

/**
 * Atualiza status da mensagem no banco após resposta da Z-API.
 * Table-aware: aceita conversation_messages OU messages.
 */
export async function finalizeMessageStatus(
  supabaseClient: any,
  table: MessagesTable,
  messageDbId: string,
  outcome: SendOutcome,
  realExternalId?: string | null,
): Promise<void> {
  const updateRow: Record<string, any> = {
    status: outcome.ok ? "sent" : "failed",
    failure_reason: outcome.ok ? null : (outcome.reason || "unknown"),
    failure_detail: outcome.ok ? null : (outcome.detail || null),
  };
  if (outcome.ok && realExternalId) updateRow.external_message_id = realExternalId;
  try {
    await supabaseClient.from(table).update(updateRow).eq("id", messageDbId);
  } catch (err) {
    console.error(`[FINALIZE:${table}] failed to update message status:`, err);
  }
}
