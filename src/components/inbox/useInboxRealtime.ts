import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Stage, MsgType, MsgStatus, Conversation, Message } from "./types";
import { toIsoTimestamp, stripQuotes, dedupeUiMessages, safeUnreadCount } from "./helpers";

// Fix 1+2: cache phone-by-conversationId to resolve waKey when conv not in local state yet.
// Avoid re-querying for the same UUID. Also throttles refetch dispatches.
const phoneByConvIdCache = new Map<string, string>();
const lastRefetchAt = new Map<string, number>();
const REFETCH_THROTTLE_MS = 800;

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, async (payload) => {
        const n = payload.new as any;
        if (!n.conversation_id) return;

        // Fix 1: resolve waKey robustamente · prioriza conv local; se não achar, busca phone no banco e monta wa_<phone>; fallback final = UUID.
        let conv = conversationsRef.current.find(c => c.db_id === n.conversation_id || c.id === n.conversation_id);
        let waKey: string;
        if (conv) {
          waKey = conv.id;
        } else {
          let phone = phoneByConvIdCache.get(n.conversation_id);
          if (!phone) {
            const { data: cRow } = await supabase
              .from("conversations")
              .select("phone")
              .eq("id", n.conversation_id)
              .maybeSingle();
            const cleanPhone = cRow?.phone ? String(cRow.phone).replace(/\D/g, "") : "";
            if (cleanPhone) {
              phone = cleanPhone;
              phoneByConvIdCache.set(n.conversation_id, cleanPhone);
            }
          }
          waKey = phone ? `wa_${phone}` : n.conversation_id;
        }

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
          media_storage_url: n.media_storage_url || undefined,
          media_status: n.media_status || undefined,
          media_mimetype: n.media_mimetype || undefined,
          media_filename: n.media_filename || undefined,
          media_size_bytes: typeof n.media_size_bytes === "number" ? n.media_size_bytes : (n.media_size_bytes ? Number(n.media_size_bytes) : undefined),
          media_failure_reason: n.media_failure_reason || undefined,
          status: (n.status || "sent") as MsgStatus,
          created_at: toIsoTimestamp(n.timestamp || n.created_at),
          external_message_id: n.external_message_id || undefined,
        };

        // Fix 2: dual-write em ambas as keys (waKey calculada e UUID raw) pra blindar contra mismatch.
        const writeKeys = waKey !== n.conversation_id ? [waKey, n.conversation_id] : [waKey];

        setMessages(prev => {
          const next = { ...prev };
          for (const k of writeKeys) {
            const existing = next[k] || [];
            if (existing.find(m => m.id === msgId)) continue;
            if (n.direction === "outgoing" && n.external_message_id) {
              const tempIdx = existing.findIndex(m => m.id.startsWith("temp_") && m.text === msg.text && m.sender_type === "atendente");
              if (tempIdx >= 0) {
                const updated = [...existing];
                updated[tempIdx] = { ...updated[tempIdx], id: msgId, media_url: msg.media_url || updated[tempIdx].media_url };
                next[k] = updated;
                continue;
              }
            }
            next[k] = dedupeUiMessages([...existing, { ...msg, conversation_id: k }]);
          }
          return next;
        });

        // Fix 2: se a conversa aberta corresponde ao INSERT mas a key calculada não bate com selectedIdRef,
        // dispara refetch throttled da conversa selecionada pra garantir que apareça.
        const sel = selectedIdRef.current;
        if (sel && sel !== waKey) {
          const selConv = conversationsRef.current.find(c => c.id === sel);
          if (selConv && (selConv.db_id === n.conversation_id || selConv.id === n.conversation_id)) {
            const last = lastRefetchAt.get(sel) || 0;
            if (Date.now() - last > REFETCH_THROTTLE_MS) {
              lastRefetchAt.set(sel, Date.now());
              // Spread msg into selectedId state too as safety net
              setMessages(prev => {
                const existing = prev[sel] || [];
                if (existing.find(m => m.id === msgId)) return prev;
                return { ...prev, [sel]: dedupeUiMessages([...existing, { ...msg, conversation_id: sel }]) };
              });
            }
          }
        }

        if (n.direction === "incoming") {
          setConversations(prev => prev.map(c => {
            if (c.id !== waKey && c.db_id !== n.conversation_id) return c;
            const isOpen = (c.id === selectedIdRef.current) || (waKey === selectedIdRef.current);
            return {
              ...c,
              last_message_preview: n.content || `📎 ${n.message_type || "media"}`,
              last_message_at: toIsoTimestamp(n.timestamp || n.created_at),
              unread_count: isOpen ? 0 : safeUnreadCount(c.unread_count) + 1,
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
              unread_count: isOpen ? 0 : Math.max(safeUnreadCount(c.unread_count), safeUnreadCount(u.unread_count)),
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
            unread_count: safeUnreadCount(u.unread_count),
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
