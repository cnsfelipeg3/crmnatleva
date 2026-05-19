import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MessageReaction {
  id: string;
  conversation_message_id: string | null;
  external_message_id: string | null;
  emoji: string;
  reactor_type: "atendente" | "cliente" | string;
  reactor_id: string | null;
  reactor_phone: string | null;
  reactor_name: string | null;
  created_at: string;
}

/**
 * Loads reactions for the visible message ids and subscribes to realtime changes.
 * Keyed by conversation_message_id (the DB row id used everywhere in the inbox).
 */
export function useMessageReactions(messageIds: string[], conversationKey: string | null) {
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({});

  // Stable signature so we don't reload on every render
  const idsKey = useMemo(() => messageIds.slice().sort().join("|"), [messageIds]);

  useEffect(() => {
    if (!conversationKey || messageIds.length === 0) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await (supabase as any)
        .from("message_reactions")
        .select("*")
        .in("conversation_message_id", messageIds);
      if (cancelled || error || !data) return;
      const map: Record<string, MessageReaction[]> = {};
      for (const r of data as MessageReaction[]) {
        const k = r.conversation_message_id || "";
        if (!k) continue;
        (map[k] ||= []).push(r);
      }
      setReactions(map);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, conversationKey]);

  // Realtime subscription scoped to the current conversation
  useEffect(() => {
    if (!conversationKey) return;
    const channel = supabase
      .channel(`message_reactions:${conversationKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        (payload: any) => {
          const row = (payload.new || payload.old) as MessageReaction;
          const key = row?.conversation_message_id;
          if (!key) return;
          setReactions(prev => {
            const next = { ...prev };
            const list = (next[key] || []).slice();
            if (payload.eventType === "DELETE") {
              next[key] = list.filter(r => r.id !== row.id);
            } else if (payload.eventType === "INSERT") {
              if (!list.some(r => r.id === row.id)) list.push(payload.new as MessageReaction);
              next[key] = list;
            } else if (payload.eventType === "UPDATE") {
              const idx = list.findIndex(r => r.id === row.id);
              if (idx >= 0) list[idx] = payload.new as MessageReaction;
              else list.push(payload.new as MessageReaction);
              next[key] = list;
            }
            return next;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationKey]);

  const addReaction = useCallback(async (params: {
    messageId: string;
    externalMessageId?: string | null;
    emoji: string;
    reactorId?: string | null;
    reactorName?: string | null;
    conversationPhone?: string | null;
  }) => {
    const { messageId, externalMessageId, emoji, reactorId, reactorName, conversationPhone } = params;

    // Optimistic: remove any existing reaction by this agent on this message, then insert
    const tempId = `temp-${Date.now()}`;
    const optimistic: MessageReaction = {
      id: tempId,
      conversation_message_id: messageId,
      external_message_id: externalMessageId || null,
      emoji,
      reactor_type: "atendente",
      reactor_id: reactorId || null,
      reactor_phone: null,
      reactor_name: reactorName || null,
      created_at: new Date().toISOString(),
    };
    setReactions(prev => {
      const list = (prev[messageId] || []).filter(r => !(r.reactor_type === "atendente" && r.reactor_id === (reactorId || null)));
      return { ...prev, [messageId]: [...list, optimistic] };
    });

    // Remove existing for same agent (DB)
    await (supabase as any)
      .from("message_reactions")
      .delete()
      .eq("conversation_message_id", messageId)
      .eq("reactor_type", "atendente")
      .eq("reactor_id", reactorId || null as any);

    const { data, error } = await (supabase as any)
      .from("message_reactions")
      .insert({
        conversation_message_id: messageId,
        external_message_id: externalMessageId || null,
        emoji,
        reactor_type: "atendente",
        reactor_id: reactorId || null,
        reactor_name: reactorName || null,
      })
      .select()
      .single();

    if (!error && data) {
      setReactions(prev => {
        const list = (prev[messageId] || []).map(r => r.id === tempId ? (data as MessageReaction) : r);
        return { ...prev, [messageId]: list };
      });
    }

    // Send to WhatsApp via Z-API (best effort, never blocks UI)
    if (externalMessageId && conversationPhone && conversationPhone.trim().length > 0) {
      try {
        await supabase.functions.invoke("zapi-proxy", {
          body: {
            action: "send-message-reaction",
            phone: conversationPhone,
            messageId: externalMessageId,
            value: emoji,
          },
        });
      } catch (e) {
        console.warn("[reactions] zapi send failed", e);
      }
    }
  }, []);

  const removeReaction = useCallback(async (params: {
    messageId: string;
    externalMessageId?: string | null;
    reactorId?: string | null;
    conversationPhone?: string | null;
  }) => {
    const { messageId, externalMessageId, reactorId, conversationPhone } = params;

    setReactions(prev => ({
      ...prev,
      [messageId]: (prev[messageId] || []).filter(r => !(r.reactor_type === "atendente" && r.reactor_id === (reactorId || null))),
    }));

    await (supabase as any)
      .from("message_reactions")
      .delete()
      .eq("conversation_message_id", messageId)
      .eq("reactor_type", "atendente")
      .eq("reactor_id", reactorId || null as any);

    if (externalMessageId && conversationPhone) {
      try {
        await supabase.functions.invoke("zapi-proxy", {
          body: {
            action: "send-remove-reaction",
            phone: conversationPhone,
            messageId: externalMessageId,
          },
        });
      } catch (e) {
        console.warn("[reactions] zapi remove failed", e);
      }
    }
  }, []);

  return { reactions, addReaction, removeReaction };
}
