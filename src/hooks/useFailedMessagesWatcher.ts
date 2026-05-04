// ════════════════════════════════════════════════════════════════
// useFailedMessagesWatcher · toast agregado com debounce + cap 20
// ════════════════════════════════════════════════════════════════
// Consome failedMessagesStream (singleton).
// Buffer com flush em 2.5s OU ao atingir 20 itens (cap superior).
// ────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { humanizeFailureReason } from "@/lib/zapiFailureClassifier";
import {
  subscribeFailedStream,
  type FailedMsgRow,
} from "./failedMessages/failedMessagesStream";

// Resolve um conversation_id (UUID) para a chave esperada pelo OperacaoInbox (`wa_<phone>`),
// caindo no UUID como fallback caso o lookup falhe.
async function resolveConversationKey(conversationId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("conversations")
      .select("phone")
      .eq("id", conversationId)
      .maybeSingle();
    if (data?.phone) {
      const digits = String(data.phone).replace(/\D/g, "");
      if (digits) return `wa_${digits}`;
    }
  } catch { /* noop */ }
  return conversationId;
}

const FLUSH_DELAY_MS = 2500;
const FLUSH_CAP = 20;
const TOAST_AGGREGATE_THRESHOLD = 3;

export function useFailedMessagesWatcher() {
  const navigate = useNavigate();
  const shownRef = useRef<Set<string>>(new Set());
  const bufferRef = useRef<FailedMsgRow[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const flush = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const buf = bufferRef.current;
      if (buf.length === 0) return;
      const items = buf.splice(0, buf.length);

      if (items.length >= TOAST_AGGREGATE_THRESHOLD) {
        const first = items[0];
        toast.error(`${items.length} mensagens não enviadas`, {
          description: "Toque em Ver para abrir a primeira conversa afetada.",
          duration: 10000,
          action: first.conversation_id
            ? {
                label: "Ver",
                onClick: async () => {
                  const key = await resolveConversationKey(first.conversation_id!);
                  navigate(`/operacao/inbox?conversation=${key}&highlight=${first.id}`);
                },
              }
            : undefined,
        });
      } else {
        items.forEach((row) => {
          const reason = humanizeFailureReason(row.failure_reason);
          toast.error("Mensagem não enviada", {
            description: `${reason}\nToque em Ver para abrir a conversa.`,
            duration: 10000,
            action: row.conversation_id
              ? {
                  label: "Ver",
                  onClick: async () => {
                    const key = await resolveConversationKey(row.conversation_id!);
                    navigate(`/operacao/inbox?conversation=${key}&highlight=${row.id}`);
                  },
                }
              : undefined,
          });
        });
      }
    };

    const unsubscribe = subscribeFailedStream((row) => {
      // Marca como visto SEMPRE (mesmo se não dispara toast),
      // assim UPDATE subsequente (ex: ack) não re-dispara.
      if (shownRef.current.has(row.id)) return;
      shownRef.current.add(row.id);

      // Se a row já chega ack (caso raro · race), não enfileira.
      if (row.failure_acknowledged_at) return;

      bufferRef.current.push(row);

      if (bufferRef.current.length >= FLUSH_CAP) {
        flush();
      } else if (!timerRef.current) {
        timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [navigate]);
}
