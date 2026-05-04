// ════════════════════════════════════════════════════════════════
// useMessageRetry · reenvio inline de mensagens com status='failed'
// ════════════════════════════════════════════════════════════════
// Uso: const { handleRetry } = useMessageRetry({ table: "conversation_messages" });
//      <MessageBubble ... onRetry={handleRetry} />
//
// Pré-condições para retry funcionar:
//   · msg.id existe e é UUID do banco (não temp_)
//   · row tem `original_payload` (somente conversation_messages hoje · ver zapiSend.ts)
//   · retry_count < MAX_RETRIES (3)
//   · WhatsApp conectado (quick check via tabela whatsapp_connection_events)
// ────────────────────────────────────────────────────────────────

import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendViaZapiProxy, finalizeMessageStatus, type MessagesTable } from "@/lib/zapiSend";
import { humanizeFailureReason, FAILURE_REASONS } from "@/lib/zapiFailureClassifier";
import type { Message } from "@/components/inbox/types";

const MAX_RETRIES = 3;
const DEBOUNCE_MS = 1000;

interface UseMessageRetryOpts {
  table: MessagesTable;
  /** Callback opcional para atualizar UI local (otimístico). */
  onStatusChange?: (msgId: string, status: "retrying" | "sent" | "failed") => void;
}

async function isWhatsAppConnected(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("whatsapp_connection_events")
      .select("event_type, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return true; // optimistic
    const ok = data.event_type === "connected" || data.event_type === "heartbeat_ok";
    const ageMin = (Date.now() - new Date(data.created_at).getTime()) / 60000;
    return ok && ageMin < 15;
  } catch {
    return true; // não bloqueia em erro de leitura
  }
}

export function useMessageRetry({ table, onStatusChange }: UseMessageRetryOpts) {
  const lastClickRef = useRef<Record<string, number>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  const handleRetry = useCallback(async (msg: Message) => {
    if (!msg.id || msg.id.startsWith("temp_") || msg.id.startsWith("local_")) {
      toast.error("Mensagem ainda não foi sincronizada. Aguarde um instante.");
      return;
    }

    // Debounce
    const now = Date.now();
    const last = lastClickRef.current[msg.id] || 0;
    if (now - last < DEBOUNCE_MS) return;
    lastClickRef.current[msg.id] = now;

    if (inFlightRef.current.has(msg.id)) return;

    // Quick check: WhatsApp conectado?
    const connected = await isWhatsAppConnected();
    if (!connected) {
      toast.error("WhatsApp desconectado", {
        description: "Reconecte o WhatsApp e tente novamente.",
      });
      return;
    }

    // Lê row do banco pra pegar original_payload + retry_count atualizado
    const { data: row, error: fetchErr } = await (supabase
      .from(table as any)
      .select("id, status, retry_count, original_payload")
      .eq("id", msg.id)
      .maybeSingle() as any);

    if (fetchErr || !row) {
      toast.error("Não foi possível carregar a mensagem para reenvio.");
      return;
    }
    if (row.status === "retrying") {
      toast.info("Reenvio em andamento…");
      return;
    }
    if ((row.retry_count || 0) >= MAX_RETRIES) {
      toast.error("Limite de tentativas atingido", {
        description: "Esta mensagem já foi reenviada 3 vezes. Envie manualmente.",
      });
      return;
    }
    if (!row.original_payload?.action) {
      toast.error("Mensagem não pode ser reenviada automaticamente", {
        description: "Reescreva e envie manualmente.",
      });
      return;
    }

    inFlightRef.current.add(msg.id);

    // Marca retrying otimisticamente
    onStatusChange?.(msg.id, "retrying");
    try {
      await (supabase.from(table as any).update({
        status: "retrying",
        retry_count: (row.retry_count || 0) + 1,
        last_retry_at: new Date().toISOString(),
      }).eq("id", msg.id) as any);
    } catch (err) {
      console.error("[RETRY] failed to mark retrying:", err);
    }

    // Dispara
    const { action, payload } = row.original_payload;
    const outcome = await sendViaZapiProxy(supabase, action, payload);
    const realId = outcome.data?.messageId || outcome.data?.id || null;
    await finalizeMessageStatus(supabase, table, msg.id, outcome, realId);

    onStatusChange?.(msg.id, outcome.ok ? "sent" : "failed");

    if (outcome.ok) {
      toast.success("Mensagem reenviada");
    } else {
      toast.error("Falha no reenvio", {
        description: humanizeFailureReason(outcome.reason || FAILURE_REASONS.UNKNOWN),
      });
    }

    inFlightRef.current.delete(msg.id);
  }, [table, onStatusChange]);

  return { handleRetry };
}
