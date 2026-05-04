import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresenceStatus = "composing" | "recording" | "available" | "unavailable" | string;

export interface PresenceEntry {
  status: PresenceStatus;
  updated_at: string;
}

export type PresenceMap = Record<string, PresenceEntry>;

/**
 * Single shared subscription to `chat_presence` realtime updates.
 * Indexed by digits-only phone. Auto-prunes entries older than 30s every 5s.
 *
 * Usage:
 *   const presenceByPhone = usePresenceByPhone();
 *   const entry = presenceByPhone[phone.replace(/\D/g, "")];
 *   if (entry?.status === "composing") ...
 */
export function usePresenceByPhone(): PresenceMap {
  const [presenceByPhone, setPresenceByPhone] = useState<PresenceMap>({});

  useEffect(() => {
    const channel = supabase
      .channel("chat-presence-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_presence" },
        (payload) => {
          const n: any = payload.new;
          if (!n?.phone) return;
          const key = String(n.phone).replace(/\D/g, "");
          if (!key) return;
          setPresenceByPhone((prev) => ({
            ...prev,
            [key]: { status: n.status, updated_at: n.updated_at },
          }));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe().finally(() => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  // Auto-cleanup stale entries (>30s)
  useEffect(() => {
    const interval = setInterval(() => {
      setPresenceByPhone((prev) => {
        const now = Date.now();
        let changed = false;
        const next: PresenceMap = {};
        for (const [phone, entry] of Object.entries(prev)) {
          if (now - new Date(entry.updated_at).getTime() < 30_000) {
            next[phone] = entry;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return presenceByPhone;
}

/** Returns the active presence (composing/recording) for a phone, or null if stale/absent. */
export function getActivePresence(
  presenceByPhone: PresenceMap,
  phone: string | null | undefined
): "composing" | "recording" | null {
  if (!phone) return null;
  const key = String(phone).replace(/\D/g, "");
  const entry = presenceByPhone[key];
  if (!entry) return null;
  const age = Date.now() - new Date(entry.updated_at).getTime();
  if (age > 30_000) return null;
  if (entry.status === "composing") return "composing";
  if (entry.status === "recording") return "recording";
  return null;
}
