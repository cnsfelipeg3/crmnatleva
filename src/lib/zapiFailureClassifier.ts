// ════════════════════════════════════════════════════════════════
// Z-API Failure Classifier (FRONTEND)
// ════════════════════════════════════════════════════════════════
// MANTER SINCRONIZADO COM: supabase/functions/zapi-proxy/index.ts
// (Deno runtime · não pode importar de src/lib/, então as constantes
//  e regex de classificação são duplicadas intencionalmente.)
// ────────────────────────────────────────────────────────────────

export const FAILURE_REASONS = {
  TEMPORARY: "temporary",
  INVALID_NUMBER: "invalid_number",
  WHATSAPP_DISCONNECTED: "whatsapp_disconnected",
  MEDIA_EXPIRED: "media_expired",
  SILENT_TIMEOUT: "silent_timeout",
  UNKNOWN: "unknown",
} as const;

export type FailureReason = typeof FAILURE_REASONS[keyof typeof FAILURE_REASONS];

export interface SendOutcome {
  ok: boolean;
  reason: FailureReason | null;
  detail?: string;
}

/**
 * Classifica resposta de supabase.functions.invoke("zapi-proxy", ...).
 * Sucesso: sem invokeError E data existe E data.success !== false E !data.error.
 */
export function classifySendOutcome(invokeError: any, data: any): SendOutcome {
  if (!invokeError && data && data.success !== false && !data.error) {
    return { ok: true, reason: null };
  }
  const detail = String(
    invokeError?.message || data?.error || data?.message || "unknown"
  ).toLowerCase();

  if (/disconnect|not.connected|instance.*off|instancia.*desconect/i.test(detail)) {
    return { ok: false, reason: FAILURE_REASONS.WHATSAPP_DISCONNECTED, detail };
  }
  if (/not.*exist|invalid.*number|nao.*existe|number.*not.*found|phone.*not.*registered/i.test(detail)) {
    return { ok: false, reason: FAILURE_REASONS.INVALID_NUMBER, detail };
  }
  if (/media.*expir|url.*expir|file.*not.*found|expired.*media/i.test(detail)) {
    return { ok: false, reason: FAILURE_REASONS.MEDIA_EXPIRED, detail };
  }
  return { ok: false, reason: FAILURE_REASONS.TEMPORARY, detail };
}

/**
 * Mensagem amigável em PT-BR para cada reason.
 * Tom: claro, direto, sem jargão técnico, com call-to-action quando aplicável.
 */
export function humanizeFailureReason(reason: FailureReason | string | null | undefined): string {
  switch (reason) {
    case FAILURE_REASONS.TEMPORARY:
      return "Falha temporária. Toque para tentar novamente.";
    case FAILURE_REASONS.INVALID_NUMBER:
      return "Esse número não tem WhatsApp.";
    case FAILURE_REASONS.WHATSAPP_DISCONNECTED:
      return "WhatsApp desconectado. Reconecte e tente novamente.";
    case FAILURE_REASONS.MEDIA_EXPIRED:
      return "Mídia expirou. Reenvie o arquivo.";
    case FAILURE_REASONS.SILENT_TIMEOUT:
      return "Mensagem não confirmada. Pode ter falhado · verifique se o cliente recebeu.";
    case FAILURE_REASONS.UNKNOWN:
    default:
      return "Falha no envio. Toque para tentar novamente.";
  }
}

/**
 * Wrapper unificado: dispara via supabase.functions.invoke e devolve outcome + data.
 * Caller decide o que fazer (toast, persist, retry).
 */
export async function sendViaZapiProxy(
  supabaseClient: { functions: { invoke: (name: string, opts: any) => Promise<{ data: any; error: any }> } },
  action: string,
  payload: any
): Promise<SendOutcome & { data: any }> {
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
