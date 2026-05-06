// React Query hooks para feature de Status do WhatsApp
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppStatus {
  id: string;
  phone: string;
  contact_name: string | null;
  is_mine: boolean;
  status_type: "text" | "image" | "video";
  text_content: string | null;
  media_url: string | null;
  media_thumbnail_url: string | null;
  media_mimetype: string | null;
  caption: string | null;
  background_color: string | null;
  font: string | null;
  posted_at: string;
  expires_at: string;
  external_status_id: string | null;
  external_zaap_id: string | null;
  view_count: number;
  created_at: string;
}

export interface StatusViewer {
  id: string;
  status_id: string;
  viewer_phone: string;
  viewer_name: string | null;
  viewed_at: string;
}

const STALE = 60_000;

export function useMyStatuses() {
  return useQuery({
    queryKey: ["whatsapp-statuses", "mine"],
    staleTime: STALE,
    queryFn: async (): Promise<WhatsAppStatus[]> => {
      const { data, error } = await supabase
        .from("whatsapp_statuses" as any)
        .select("*")
        .eq("is_mine", true)
        .gt("expires_at", new Date().toISOString())
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
  });
}

export function useContactStatuses() {
  return useQuery({
    queryKey: ["whatsapp-statuses", "contacts"],
    staleTime: STALE,
    queryFn: async (): Promise<WhatsAppStatus[]> => {
      const { data, error } = await supabase
        .from("whatsapp_statuses" as any)
        .select("*")
        .eq("is_mine", false)
        .gt("expires_at", new Date().toISOString())
        .not("phone", "in", '("unknown","status@broadcast","")')
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
  });
}

export function useSeenStatusIds() {
  return useQuery({
    queryKey: ["whatsapp-statuses", "seen-ids"],
    staleTime: STALE,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("whatsapp_status_seen_by_me" as any)
        .select("status_id");
      if (error) throw error;
      return new Set(((data as any) || []).map((r: any) => r.status_id as string));
    },
  });
}

export function useStatusViewers(statusId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-status-viewers", statusId],
    enabled: !!statusId,
    staleTime: 30_000,
    queryFn: async (): Promise<StatusViewer[]> => {
      const { data, error } = await supabase
        .from("whatsapp_status_views" as any)
        .select("*")
        .eq("status_id", statusId!)
        .order("viewed_at", { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
  });
}

export function usePostStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input:
      | { kind: "text"; text: string; backgroundColor: string; font: string }
      | { kind: "image"; imageUrl: string; caption?: string }
      | { kind: "video"; videoUrl: string; caption?: string }
    ) => {
      const action =
        input.kind === "text" ? "send-text-status" :
        input.kind === "image" ? "send-image-status" : "send-video-status";
      const payload =
        input.kind === "text"
          ? { text: input.text, backgroundColor: input.backgroundColor, font: input.font }
          : input.kind === "image"
          ? { imageUrl: input.imageUrl, caption: input.caption }
          : { videoUrl: input.videoUrl, caption: input.caption };
      const { data, error } = await supabase.functions.invoke("zapi-proxy", { body: { action, payload } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-statuses"] });
    },
  });
}

export function useMarkStatusViewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: string) => {
      const { error } = await supabase.functions.invoke("zapi-proxy", {
        body: { action: "mark-status-as-viewed", payload: { statusId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-statuses", "seen-ids"] });
    },
  });
}

/** Realtime: invalida queries quando há inserts em qualquer tabela de status */
export function useStatusRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-statuses-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_statuses" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-statuses"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_status_seen_by_me" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-statuses", "seen-ids"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_status_views" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-status-viewers"] });
        qc.invalidateQueries({ queryKey: ["whatsapp-statuses", "mine"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}
