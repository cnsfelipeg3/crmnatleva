import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Stage, MsgType, MsgStatus, Conversation, Message } from "./types";
import { toIsoTimestamp, stripQuotes, dedupeUiMessages } from "./helpers";

/**
 * Hook: manages a single stable Supabase realtime subscription for both
 * conversation_messages (INSERT) and conversations (INSERT/UPDATE/DELETE).
 */
export function useInboxRealtime(
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>,
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>,
  lastMsgIdsRef: React.MutableRefObject<Set<string>>,
  selectedIdRef: React.MutableRefObject<string | null>,
  conversationsRef: React.MutableRefObject<Conversation[]>,
) {
  useEffect(() => {
    const channel = supabase
      .channel('livechat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, (payload) => {
        const n = payload.new as any;
        if (!n.conversation_id) return;

        const conv = conversationsRef.current.find(c => c.db_id === n.conversation_id || c.id === n.conversation_id);
        const waKey = conv?.id || n.conversation_id;
        const msgId = n.id;

        if (lastMsgIdsRef.current.has(msgId)) return;
        if (n.external_message_id && lastMsgIdsRef.current.has(n.external_message_id)) return;
        lastMsgIdsRef.current.add(msgId);
        if (n.external_message_id) lastMsgIdsRef.current.add(n.external_message_id);

        const msg: Message = {
          id: msgId,
          conversation_id: waKey,
          sender_type: (n.sender_type || (n.direction === "outgoing" ? "atendente" : "cliente")) as "cliente" | "atendente" | "sistema",
          message_type: (n.message_type || "text") as MsgType,
          text: stripQuotes(n.content || ""),
          media_url: n.media_url || undefined,
          status: (n.status || "sent") as MsgStatus,
          created_at: toIsoTimestamp(n.timestamp || n.created_at),
          external_message_id: n.external_message_id || undefined,
        };

        setMessages(prev => {
          const existing = prev[waKey] || [];
          if (existing.find(m => m.id === msgId)) return prev;
          if (n.direction === "outgoing" && n.external_message_id) {
            const tempIdx = existing.findIndex(m => m.id.startsWith("temp_") && m.text === msg.text && m.sender_type === "atendente");
            if (tempIdx >= 0) {
              const updated = [...existing];
              updated[tempIdx] = { ...updated[tempIdx], id: msgId, media_url: msg.media_url || updated[tempIdx].media_url };
              return { ...prev, [waKey]: updated };
            }
          }
          return { ...prev, [waKey]: dedupeUiMessages([...existing, msg]) };
        });

        if (n.direction === "incoming") {
          setConversations(prev => prev.map(c => {
            if (c.id !== waKey && c.db_id !== n.conversation_id) return c;
            const isOpen = waKey === selectedIdRef.current;
            return {
              ...c,
              last_message_preview: n.content || `📎 ${n.message_type || "media"}`,
              last_message_at: toIsoTimestamp(n.timestamp || n.created_at),
              unread_count: isOpen ? 0 : c.unread_count + 1,
            };
          }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as any;
          if (!old?.id) return;
          const cleanPhone = old.phone ? String(old.phone).replace(/\D/g, "") : "";
          const waKey = cleanPhone ? `wa_${cleanPhone}` : old.id;
          setConversations(prev => prev.filter(c => c.id !== waKey && c.id !== old.id));
          setMessages(prev => { const next = { ...prev }; delete next[waKey]; delete next[old.id]; return next; });
          if (selectedIdRef.current === waKey || selectedIdRef.current === old.id) setSelectedId(null);
          return;
        }
        const u = payload.new as any;
        if (!u?.id || !u?.phone) return;
        const cleanPhone = String(u.phone).replace(/\D/g, "");
        const waKey = cleanPhone ? `wa_${cleanPhone}` : u.id;

        if (u.last_message_preview === "__CONTACT_EXCLUDED__" || u.unread_count === -1) {
          setConversations(prev => prev.filter(c => c.id !== waKey && c.id !== u.id));
          setMessages(prev => { const next = { ...prev }; delete next[waKey]; delete next[u.id]; return next; });
          if (selectedIdRef.current === waKey || selectedIdRef.current === u.id) setSelectedId(null);
          return;
        }

        setConversations(prev => {
          const existsWa = prev.find(c => c.id === waKey);
          const existsUuid = prev.find(c => c.id === u.id);
          const target = existsWa || existsUuid;
          if (target) {
            const isOpen = target.id === selectedIdRef.current || waKey === selectedIdRef.current;
            const existingTime = new Date(target.last_message_at).getTime();
            const incomingTime = new Date(u.last_message_at || 0).getTime();
            const bestTime = incomingTime > existingTime ? u.last_message_at : target.last_message_at;
            const bestPreview = (incomingTime > existingTime && u.last_message_preview) ? u.last_message_preview : (target.last_message_preview || u.last_message_preview);
            const updated = prev.map(c => (c.id === target.id) ? {
              ...c,
              id: waKey,
              db_id: c.db_id || u.id,
              phone: cleanPhone || c.phone,
              last_message_preview: bestPreview,
              last_message_at: bestTime,
              unread_count: isOpen ? 0 : Math.max(c.unread_count, u.unread_count ?? 0),
              stage: (u.stage as Stage) || c.stage,
              tags: u.tags || c.tags,
              contact_name: c.contact_name || u.contact_name,
              source: u.source || c.source,
            } : c).filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
            return updated.sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
            });
          }
          return [{
            id: waKey,
            db_id: u.id,
            phone: cleanPhone || u.phone,
            contact_name: u.contact_name || u.display_name || u.phone || "Sem nome",
            stage: (u.stage || u.funnel_stage || "novo_lead") as Stage,
            tags: u.tags || [],
            source: u.source || "",
            last_message_at: u.last_message_at || "",
            last_message_preview: u.last_message_preview || "",
            unread_count: u.unread_count || 0,
            is_vip: u.is_vip || false,
            assigned_to: u.assigned_to || "",
            score_potential: u.score_potential || 0,
            score_risk: u.score_risk || 0,
          }, ...prev];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // Stable — no deps that change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
