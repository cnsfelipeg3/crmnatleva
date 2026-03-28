import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debugMode";

// Map: wa_<phone> → DB conversation UUID
const waToDbId = new Map<string, string>();
// Set of already-persisted WA message IDs
const persistedMsgIds = new Set<string>();
let initialized = false;

export async function initPersistence() {
  if (initialized) return;
  initialized = true;

  // Load existing WA conversation mappings
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, external_conversation_id")
    .not("external_conversation_id", "is", null);

  if (convs) {
    for (const c of convs) {
      if (c.external_conversation_id) {
        waToDbId.set(c.external_conversation_id, c.id);
      }
    }
  }

  // Load existing persisted message external IDs
  const { data: msgs } = await supabase
    .from("messages")
    .select("external_message_id")
    .not("external_message_id", "is", null)
    .limit(1000);

  if (msgs) {
    for (const m of msgs) {
      if (m.external_message_id) {
        persistedMsgIds.add(m.external_message_id);
      }
    }
  }

  debugLog(`Persistence init: ${waToDbId.size} convs, ${persistedMsgIds.size} msgs tracked`);
}

export async function persistConversation(conv: {
  id: string; phone: string; contact_name: string;
  last_message_at: string; last_message_preview: string;
  unread_count: number;
}) {
  try {
    const cleanPhone = conv.phone.replace(/@.*$/, "").split(":")[0];
    const existingDbId = waToDbId.get(conv.id);

    if (existingDbId) {
      const updateData: Record<string, any> = {
        contact_name: conv.contact_name,
        phone: cleanPhone,
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count,
      };
      // Only update preview if we have a non-empty value — never overwrite with empty
      if (conv.last_message_preview && conv.last_message_preview.trim() !== "") {
        updateData.last_message_preview = conv.last_message_preview;
      }
      await supabase.from("conversations").update(updateData).eq("id", existingDbId);
    } else {
      const { data, error } = await supabase.from("conversations").insert({
        contact_name: conv.contact_name,
        phone: cleanPhone,
        external_conversation_id: conv.id,
        source: "whatsapp_api" as any,
        stage: "novo_lead" as any,
        last_message_at: conv.last_message_at,
        last_message_preview: conv.last_message_preview,
        unread_count: conv.unread_count,
      }).select("id").single();

      if (data) {
        waToDbId.set(conv.id, data.id);
      }
      if (error) console.error("Error persisting conversation:", error);
    }
  } catch (err) {
    console.error("Error in persistConversation:", err);
  }
}

export async function persistMessages(msgs: Array<{
  id: string; sender_type: string; message_type: string;
  text: string; media_url?: string; status: string; created_at: string;
}>, waConvId: string) {
  const dbConvId = waToDbId.get(waConvId);
  if (!dbConvId) return;

  const newMsgs = msgs.filter(m => !persistedMsgIds.has(m.id) && !m.id.startsWith("temp_"));
  if (newMsgs.length === 0) return;

  for (const msg of newMsgs) {
    try {
      let mediaUrl: string | null = null;

      // Upload base64 media to storage
      if (msg.media_url && msg.media_url.startsWith("data:")) {
        const uploaded = await uploadMediaToStorage(msg.media_url, msg.id);
        mediaUrl = uploaded;
      } else if (msg.media_url && !msg.media_url.startsWith("data:")) {
        mediaUrl = msg.media_url;
      }

      const { error } = await supabase.from("messages").insert({
        conversation_id: dbConvId,
        external_message_id: msg.id,
        sender_type: msg.sender_type as any,
        message_type: msg.message_type as any,
        text: msg.text || null,
        media_url: mediaUrl,
        status: msg.status as any,
        created_at: msg.created_at,
      });

      if (!error) {
        persistedMsgIds.add(msg.id);
      }
    } catch {
      // Likely duplicate — ignore
    }
  }
}

async function uploadMediaToStorage(dataUri: string, msgId: string): Promise<string | null> {
  try {
    const commaIdx = dataUri.indexOf(",");
    if (commaIdx === -1) return null;
    const header = dataUri.slice(0, commaIdx);
    const base64 = dataUri.slice(commaIdx + 1);
    if (!base64) return null;

    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch?.[1] || "application/octet-stream";
    const ext = mime.split("/")[1]?.split(";")[0] || "bin";

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });

    const path = `${Date.now()}_${msgId.slice(0, 12)}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, blob, { contentType: mime });
    if (error) { console.error("Media upload error:", error); return null; }

    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error("Error uploading chat media:", err);
    return null;
  }
}

export async function loadPersistedMessages(waConvId: string): Promise<Array<{
  id: string; conversation_id: string; sender_type: string;
  message_type: string; text: string; media_url?: string;
  status: string; created_at: string;
}>> {
  const dbConvId = waToDbId.get(waConvId);
  if (!dbConvId) return [];

  const { data } = await supabase.from("messages")
    .select("*")
    .eq("conversation_id", dbConvId)
    .order("created_at")
    .limit(200);

  return (data || []).map(m => ({
    id: m.external_message_id || m.id,
    conversation_id: waConvId,
    sender_type: m.sender_type,
    message_type: m.message_type,
    text: m.text || "",
    media_url: m.media_url || undefined,
    status: m.status,
    created_at: m.created_at,
  }));
}

export function getWaToDbId(waConvId: string): string | undefined {
  return waToDbId.get(waConvId);
}
