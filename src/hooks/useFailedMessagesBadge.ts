// ════════════════════════════════════════════════════════════════
// useFailedMessagesBadge · contador + lista de mensagens failed unack
// ════════════════════════════════════════════════════════════════
// Estado: Map<id, FailedMsgRow> (mantém ordem de inserção)
//   · Bootstrap: SELECT inicial das tabelas (limit 50 por tabela)
//   · Stream: INSERT adiciona; UPDATE com failure_acknowledged_at != null remove
//   · Acknowledge: UPDATE otimista no DB + remove local
// ────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  subscribeFailedStream,
  type FailedMsgRow,
} from "./failedMessages/failedMessagesStream";

const BOOTSTRAP_LIMIT = 50;
const RECENT_WINDOW_HOURS = 24;

export function useFailedMessagesBadge() {
  const [map, setMap] = useState<Map<string, FailedMsgRow>>(() => new Map());

  // Bootstrap: 1 SELECT por tabela
  useEffect(() => {
    let cancelled = false;
    const cutoffIso = new Date(
      Date.now() - RECENT_WINDOW_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const fetchTable = async (
      table: "conversation_messages" | "messages",
    ): Promise<FailedMsgRow[]> => {
      const { data, error } = await supabase
        .from(table)
        .select(
          "id, conversation_id, failure_reason, created_at, sender_type, status, failure_acknowledged_at",
        )
        .eq("status", "failed")
        .eq("sender_type", "atendente")
        .is("failure_acknowledged_at", null)
        .gt("created_at", cutoffIso)
        .order("created_at", { ascending: false })
        .limit(BOOTSTRAP_LIMIT);
      if (error) {
        console.error(`[useFailedMessagesBadge] bootstrap ${table}:`, error);
        return [];
      }
      return (data ?? []).map((r: any) => ({
        id: String(r.id),
        conversation_id: r.conversation_id ?? null,
        failure_reason: r.failure_reason ?? null,
        created_at: r.created_at,
        sender_type: r.sender_type,
        status: r.status,
        failure_acknowledged_at: r.failure_acknowledged_at ?? null,
        source_table: table,
      }));
    };

    (async () => {
      const a = await fetchTable("conversation_messages");
      if (cancelled) return;
      setMap(() => {
        const next = new Map<string, FailedMsgRow>();
        a.sort(
          (x, y) =>
            new Date(y.created_at).getTime() - new Date(x.created_at).getTime(),
        ).forEach((r) => next.set(r.id, r));
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Stream
  useEffect(() => {
    const unsubscribe = subscribeFailedStream((row) => {
      setMap((prev) => {
        const next = new Map(prev);
        if (row.failure_acknowledged_at) {
          if (next.has(row.id)) next.delete(row.id);
          return next.size === prev.size ? prev : next;
        }
        // INSERT/UPDATE failed unack → garante presença (re-insere para topo)
        next.delete(row.id);
        const reordered = new Map<string, FailedMsgRow>();
        reordered.set(row.id, row);
        next.forEach((v, k) => reordered.set(k, v));
        return reordered;
      });
    });
    return unsubscribe;
  }, []);

  const items = useMemo(() => Array.from(map.values()), [map]);
  const count = items.length;

  const acknowledgeOne = useCallback(
    async (id: string, sourceTable: "conversation_messages" | "messages") => {
      // Otimista
      setMap((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      const { error } = await supabase
        .from(sourceTable)
        .update({ failure_acknowledged_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        console.error("[useFailedMessagesBadge] acknowledgeOne:", error);
      }
    },
    [],
  );

  const acknowledgeAll = useCallback(async () => {
    const snapshot = Array.from(map.values());
    if (snapshot.length === 0) return;
    setMap(new Map());
    const byTable = {
      conversation_messages: snapshot
        .filter((r) => r.source_table === "conversation_messages")
        .map((r) => r.id),
      messages: snapshot
        .filter((r) => r.source_table === "messages")
        .map((r) => r.id),
    };
    const nowIso = new Date().toISOString();
    await Promise.all(
      (Object.keys(byTable) as Array<keyof typeof byTable>).map(async (t) => {
        if (byTable[t].length === 0) return;
        const { error } = await supabase
          .from(t)
          .update({ failure_acknowledged_at: nowIso })
          .in("id", byTable[t]);
        if (error) {
          console.error(`[useFailedMessagesBadge] acknowledgeAll ${t}:`, error);
        }
      }),
    );
  }, [map]);

  return { count, items, acknowledgeOne, acknowledgeAll };
}
