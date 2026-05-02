import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WhatsAppConnEvent =
  | "connected"
  | "disconnected"
  | "heartbeat_ok"
  | "heartbeat_fail";

export interface WhatsAppConnectionState {
  isConnected: boolean;
  lastEvent: WhatsAppConnEvent | null;
  lastEventAt: string | null;
  secondsSince: number;
  errorMessage: string | null;
  /** True se último evento > 10 min sem heartbeat_ok */
  isStale: boolean;
}

const OK_EVENTS: WhatsAppConnEvent[] = ["connected", "heartbeat_ok"];

export function useWhatsAppConnection() {
  const [state, setState] = useState<WhatsAppConnectionState>({
    isConnected: true, // assume conectado por default · evita flash de erro
    lastEvent: null,
    lastEventAt: null,
    secondsSince: 0,
    errorMessage: null,
    isStale: false,
  });

  // Fetch inicial
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("whatsapp_connection_events")
        .select("event_type, created_at, error_message")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      const ageSec = (Date.now() - new Date(data.created_at).getTime()) / 1000;
      const evt = data.event_type as WhatsAppConnEvent;
      setState({
        isConnected: OK_EVENTS.includes(evt),
        lastEvent: evt,
        lastEventAt: data.created_at,
        secondsSince: Math.floor(ageSec),
        errorMessage: data.error_message,
        isStale: ageSec > 600,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-connection-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_connection_events" },
        (payload) => {
          const n = payload.new as any;
          if (!n) return;
          const evt = n.event_type as WhatsAppConnEvent;
          setState({
            isConnected: OK_EVENTS.includes(evt),
            lastEvent: evt,
            lastEventAt: n.created_at,
            secondsSince: 0,
            errorMessage: n.error_message ?? null,
            isStale: false,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Tick a cada 30s
  useEffect(() => {
    if (!state.lastEventAt) return;
    const interval = setInterval(() => {
      setState((prev) => {
        if (!prev.lastEventAt) return prev;
        const age = (Date.now() - new Date(prev.lastEventAt).getTime()) / 1000;
        return { ...prev, secondsSince: Math.floor(age), isStale: age > 600 };
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [state.lastEventAt]);

  return state;
}

/** Helper · formata tempo decorrido em PT-BR */
export function formatTimeSince(seconds: number): string {
  if (seconds < 60) return "agora";
  const min = Math.floor(seconds / 60);
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}
