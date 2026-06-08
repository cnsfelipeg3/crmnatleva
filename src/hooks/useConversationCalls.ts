import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WhatsAppCall = {
  id: string;
  conversation_id: string | null;
  phone: string;
  call_type: "voice" | "video";
  call_status: "offered" | "accepted" | "missed" | "rejected" | "terminated";
  is_video: boolean;
  duration_seconds: number;
  caller_name: string | null;
  started_at: string;
  ended_at: string | null;
  raw_payload?: Record<string, unknown> | null;
};

function isRealCall(row: WhatsAppCall) {
  const payload = row.raw_payload || {};
  return Boolean(
    payload.callId ||
    payload.callStatus ||
    payload.callType === "video" ||
    payload.callType === "audio" ||
    payload.callType === "voice" ||
    payload.isVideo === true,
  );
}

/**
 * Carrega o histórico de chamadas (voz/vídeo) de uma conversa
 * e mantém sincronizado em tempo real via Supabase Realtime.
 */
export function useConversationCalls(conversationId: string | null | undefined, phone?: string | null) {
  const [calls, setCalls] = useState<WhatsAppCall[]>([]);

  useEffect(() => {
    if (!conversationId && !phone) {
      setCalls([]);
      return;
    }

    let active = true;

    const load = async () => {
      const cleanPhone = phone ? String(phone).replace(/\D/g, "") : "";

      let query = supabase
        .from("whatsapp_calls" as any)
        .select("*")
        .order("started_at", { ascending: true })
        .limit(200);

      if (conversationId && cleanPhone) {
        query = query.or(`conversation_id.eq.${conversationId},phone.eq.${cleanPhone}`);
      } else if (conversationId) {
        query = query.eq("conversation_id", conversationId);
      } else if (cleanPhone) {
        query = query.eq("phone", cleanPhone);
      }

      const { data } = await query;
      if (active && data) setCalls((data as unknown as WhatsAppCall[]).filter(isRealCall));
    };

    load();

    const channel = supabase
      .channel(`calls-${conversationId || phone}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_calls" },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, phone]);

  return calls;
}
