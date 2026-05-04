// ════════════════════════════════════════════════════════════════
// useFailedMessagesWatcher · toast global ao detectar falha de envio
// ════════════════════════════════════════════════════════════════
// Escuta INSERT/UPDATE em ambas as tabelas (conversation_messages + messages)
// e mostra toast persistente quando uma mensagem do atendente falha.
//
// Filtros aplicados client-side:
//   · sender_type = 'atendente' (só mensagens enviadas por humano)
//   · status = 'failed'
//   · created_at nas últimas 24h (evita ressuscitar falhas antigas)
//
// Ação "Ver" → navega pra /operacao/inbox?conversation=<id>&highlight=<msgId>
// (LiveChat e Inbox interpretam highlight pra dar ring 2s na bubble)
// ────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { humanizeFailureReason } from "@/lib/zapiFailureClassifier";

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function useFailedMessagesWatcher() {
  const navigate = useNavigate();
  const shownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleRow = (row: any) => {
      if (!row || row.id == null) return;
      if (row.status !== "failed") return;
      if (row.sender_type !== "atendente") return;
      const createdAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();
      if (Date.now() - createdAt > RECENT_WINDOW_MS) return;
      if (shownRef.current.has(row.id)) return;
      shownRef.current.add(row.id);

      const reason = humanizeFailureReason(row.failure_reason);
      const description = `${reason}\nToque em Ver para abrir a conversa.`;

      toast.error("Mensagem não enviada", {
        description,
        duration: Infinity,
        action: {
          label: "Ver",
          onClick: () => {
            const convId = row.conversation_id;
            navigate(`/operacao/inbox?conversation=${convId}&highlight=${row.id}`);
          },
        },
      });
    };

    const channel = supabase
      .channel("failed-messages-watcher")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_messages" }, (p) => handleRow(p.new))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_messages" }, (p) => handleRow(p.new))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => handleRow(p.new))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (p) => handleRow(p.new))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);
}
