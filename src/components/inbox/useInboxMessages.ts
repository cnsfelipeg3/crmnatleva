import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Message, MsgType, MsgStatus, Conversation } from "./types";
import {
  toIsoTimestamp, stripQuotes, dedupeUiMessages,
  getMessageTimestamp, normalizeDbMessageType, normalizeDbStatus,
} from "./helpers";

const MESSAGE_PAGE_SIZE = 80;

/**
 * Hook: manages message loading, pagination and caching for the active conversation.
 */
export function useInboxMessages(
  selectedId: string | null,
  selected: Conversation | undefined,
  reloadVersion: number,
) {
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reloadingMessages, setReloadingMessages] = useState(false);
  const [oldestLoadedTimestamp, setOldestLoadedTimestamp] = useState<Record<string, string | null>>({});
  const [hasOlderMessages, setHasOlderMessages] = useState<Record<string, boolean>>({});
  const lastMsgIdsRef = useRef<Set<string>>(new Set());

  const currentMessages = selectedId ? (messages[selectedId] || []) : [];

  // Map unified DB rows → Message[]
  const mapUnifiedMessages = useCallback((rows: any[], conversationKey: string): Message[] => (
    (rows || []).map((m: any) => ({
      id: m.id,
      conversation_id: conversationKey,
      sender_type: (m.sender_type || (m.direction === "outgoing" ? "atendente" : m.direction === "system" ? "sistema" : "cliente")) as "cliente" | "atendente" | "sistema",
      message_type: normalizeDbMessageType(m.message_type),
      text: stripQuotes(m.content ?? ""),
      media_url: m.media_url || undefined,
      media_storage_url: m.media_storage_url || undefined,
      media_status: m.media_status || undefined,
      media_mimetype: m.media_mimetype || undefined,
      media_filename: m.media_filename || undefined,
      media_size_bytes: typeof m.media_size_bytes === "number" ? m.media_size_bytes : (m.media_size_bytes ? Number(m.media_size_bytes) : undefined),
      media_failure_reason: m.media_failure_reason || undefined,
      status: normalizeDbStatus(m.status),
      created_at: toIsoTimestamp(m.timestamp || m.created_at),
      external_message_id: m.external_message_id || undefined,
      sender_name: m.sender_name || null,
      sender_phone: m.sender_phone || null,
      sender_photo: m.sender_photo || null,
      is_pinned: !!m.is_pinned,
      pinned_at: m.pinned_at || null,
      is_deleted: !!m.is_deleted,
      deleted_at: m.deleted_at || null,
      edited: !!m.is_edited,
      edited_at: m.edited_at || null,
      metadata: m.metadata || null,
    }))
  ), []);

  // Resolve all DB conversation IDs for a given selectedId
  const resolveConversationIds = useCallback(async (id: string, dbId?: string): Promise<string[]> => {
    if (!id.startsWith("wa_")) return id.length > 10 ? [id] : [];

    const phone = id.replace("wa_", "").trim();
    const dbPhoneCandidates = Array.from(new Set([phone, `+${phone}`, `${phone}@c.us`, `${phone}@g.us`, `${phone}-group`]));

    const [byPhoneResp, byExternalResp] = await Promise.all([
      supabase.from("conversations").select("id").in("phone", dbPhoneCandidates),
      supabase.from("conversations").select("id").eq("external_conversation_id", id),
    ]);

    const candidates = [...(byPhoneResp.data || []), ...(byExternalResp.data || [])].map(c => c.id);
    return Array.from(new Set([...(dbId ? [dbId] : []), ...candidates]));
  }, []);

  // Load initial messages for selectedId
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    const hasCached = (messages[selectedId] || []).length > 0;
    if (!hasCached) setLoadingMessages(true);

    const load = async () => {
      try {
        const allConversationIds = await resolveConversationIds(selectedId, selected?.db_id);
        if (allConversationIds.length === 0 || cancelled) {
          if (!cancelled) setMessages(prev => ({ ...prev, [selectedId]: [] }));
          return;
        }

        const { data: unifiedRows, error } = await (supabase
          .from("conversation_messages" as any)
          .select("id, conversation_id, sender_type, direction, message_type, content, media_url, media_storage_url, media_status, media_mimetype, media_filename, media_size_bytes, media_failure_reason, status, timestamp, created_at, external_message_id, sender_name, sender_phone, sender_photo, is_pinned, pinned_at, is_deleted, deleted_at, is_edited, edited_at, metadata")
          .in("conversation_id", allConversationIds)
          .order("timestamp", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(MESSAGE_PAGE_SIZE) as any);

        if (cancelled) return;

        let allMsgs: Message[] = [];
        if (!error && unifiedRows) {
          allMsgs = dedupeUiMessages(mapUnifiedMessages(unifiedRows, selectedId));
          setHasOlderMessages(prev => ({ ...prev, [selectedId]: unifiedRows.length >= MESSAGE_PAGE_SIZE }));
          const oldestRow = unifiedRows[unifiedRows.length - 1];
          setOldestLoadedTimestamp(prev => ({ ...prev, [selectedId]: toIsoTimestamp(oldestRow?.timestamp || oldestRow?.created_at || null) }));
        }

        for (const m of allMsgs) {
          if (m.id) lastMsgIdsRef.current.add(m.id);
          if (m.external_message_id) lastMsgIdsRef.current.add(m.external_message_id);
        }

        setMessages(prev => ({ ...prev, [selectedId]: dedupeUiMessages(allMsgs) }));
      } catch (error) {
        console.error("Erro ao carregar histórico da conversa:", error);
      } finally {
        if (!cancelled) { setLoadingMessages(false); setReloadingMessages(false); }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedId, selected?.db_id, reloadVersion, resolveConversationIds, mapUnifiedMessages]);

  // Load older messages (cursor-based pagination)
  const loadOlderMessages = useCallback(async () => {
    if (!selectedId || !hasOlderMessages[selectedId]) return;
    const cursor = oldestLoadedTimestamp[selectedId];
    if (!cursor) return;

    const allConversationIds = await resolveConversationIds(selectedId, selected?.db_id);
    if (allConversationIds.length === 0) return;

    const { data: olderRows } = await (supabase
      .from("conversation_messages" as any)
      .select("id, conversation_id, sender_type, direction, message_type, content, media_url, media_storage_url, media_status, media_mimetype, media_filename, media_size_bytes, media_failure_reason, status, timestamp, created_at, external_message_id, sender_name, sender_phone, sender_photo, is_pinned, pinned_at, is_deleted, deleted_at, is_edited, edited_at, metadata")
      .in("conversation_id", allConversationIds)
      .lt("timestamp", cursor)
      .order("timestamp", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE) as any);

    if (!olderRows || olderRows.length === 0) {
      setHasOlderMessages(prev => ({ ...prev, [selectedId]: false }));
      return;
    }

    const olderMsgs = dedupeUiMessages(mapUnifiedMessages(olderRows, selectedId));

    setMessages(prev => ({
      ...prev,
      [selectedId]: dedupeUiMessages([...olderMsgs, ...(prev[selectedId] || [])]),
    }));

    const oldestRow = olderRows[olderRows.length - 1];
    setOldestLoadedTimestamp(prev => ({
      ...prev,
      [selectedId]: toIsoTimestamp(oldestRow?.timestamp || oldestRow?.created_at || cursor),
    }));
    setHasOlderMessages(prev => ({
      ...prev,
      [selectedId]: olderRows.length >= MESSAGE_PAGE_SIZE,
    }));
  }, [selectedId, hasOlderMessages, oldestLoadedTimestamp, selected?.db_id, resolveConversationIds, mapUnifiedMessages]);

  return {
    messages,
    setMessages,
    currentMessages,
    loadingMessages,
    setLoadingMessages,
    reloadingMessages,
    setReloadingMessages,
    loadOlderMessages,
    hasOlderMessages,
    lastMsgIdsRef,
  };
}
