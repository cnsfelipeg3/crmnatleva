// ════════════════════════════════════════════════════════════════
// failedMessagesStream · singleton realtime stream (1 channel só)
// ════════════════════════════════════════════════════════════════
// Subscribe lazy: ativa o channel Supabase no 1º consumer, remove
// quando o último consumer desmontar (refcount).
//
// Garante:
//   · 1 channel realtime só (economia)
//   · ordem idêntica de eventos para todos os consumers
//   · filtros centralizados (failed + atendente + janela 24h)
// ────────────────────────────────────────────────────────────────

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type FailedMsgRow = {
  id: string;
  conversation_id: string | null;
  failure_reason: string | null;
  created_at: string;
  sender_type: string;
  status: string;
  failure_acknowledged_at: string | null;
  source_table: "conversation_messages" | "messages";
};

export type FailedEventType = "INSERT" | "UPDATE";
export type FailedListener = (row: FailedMsgRow, eventType: FailedEventType) => void;

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

const listeners = new Set<FailedListener>();
let channel: RealtimeChannel | null = null;
let refcount = 0;

function emit(
  raw: any,
  sourceTable: "conversation_messages" | "messages",
  eventType: FailedEventType,
) {
  if (!raw || raw.id == null) return;
  if (raw.status !== "failed") return;
  if (raw.sender_type !== "atendente") return;
  const createdAt = raw.created_at ? new Date(raw.created_at).getTime() : Date.now();
  if (Date.now() - createdAt > RECENT_WINDOW_MS) return;

  const enriched: FailedMsgRow = {
    id: String(raw.id),
    conversation_id: raw.conversation_id ?? null,
    failure_reason: raw.failure_reason ?? null,
    created_at: raw.created_at,
    sender_type: raw.sender_type,
    status: raw.status,
    failure_acknowledged_at: raw.failure_acknowledged_at ?? null,
    source_table: sourceTable,
  };

  // Snapshot defensivo (evita mutação do Set durante iteração)
  Array.from(listeners).forEach((l) => {
    try {
      l(enriched, eventType);
    } catch (err) {
      console.error("[failedMessagesStream] listener threw:", err);
    }
  });
}

function ensureChannel() {
  if (channel) return;
  channel = supabase
    .channel("failed-messages-stream")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "conversation_messages" },
      (p) => emit(p.new, "conversation_messages", "INSERT"),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversation_messages" },
      (p) => emit(p.new, "conversation_messages", "UPDATE"),
    )
    .subscribe();
}

function teardownChannel() {
  if (!channel) return;
  supabase.removeChannel(channel);
  channel = null;
}

export function subscribeFailedStream(listener: FailedListener): () => void {
  listeners.add(listener);
  refcount += 1;
  ensureChannel();
  return () => {
    listeners.delete(listener);
    refcount -= 1;
    if (refcount <= 0) {
      refcount = 0;
      teardownChannel();
    }
  };
}
