// ─── Lógica central de encaminhamento de mensagens ───
// Reutilizado por OperacaoInbox e LiveChat.
import { supabase } from "@/integrations/supabase/client";
import type { Message, MsgType } from "../types";

async function callZapiProxy(action: string, payload?: any) {
  const { data, error } = await supabase.functions.invoke("zapi-proxy", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || "Erro Z-API");
  return data;
}

export interface ForwardTarget {
  /** UUID da conversa no banco. */
  conversationId: string;
  /** Telefone E.164 sem +. */
  phone: string;
  /** Nome amigável (toast/log). */
  name?: string;
}

export interface ForwardResult {
  target: ForwardTarget;
  msgId: string;
  ok: boolean;
  error?: string;
  externalMessageId?: string;
}

/**
 * Encaminha uma mensagem para um destinatário via Z-API.
 * Retorna o externalMessageId (zaapId) quando disponível.
 */
async function sendOneForward(
  msg: Message,
  target: ForwardTarget,
  caption: string | undefined,
): Promise<{ ok: boolean; error?: string; externalMessageId?: string; sentAction?: string; sentPayload?: any }> {
  const phone = target.phone;
  const finalCaption = (caption || "").trim();

  try {
    if (msg.message_type === "text") {
      const body = finalCaption ? `${finalCaption}\n\n${msg.text}` : msg.text;
      const payload = { phone, message: body };
      const data = await callZapiProxy("send-text", payload);
      return { ok: true, externalMessageId: data?.zaapId || data?.messageId, sentAction: "send-text", sentPayload: payload };
    }

    const mediaUrl = msg.media_storage_url || msg.media_url;
    if (!mediaUrl) return { ok: false, error: "Mensagem sem URL de mídia válida" };

    if (msg.message_type === "image") {
      const payload: any = { phone, image: mediaUrl };
      if (finalCaption || msg.text) payload.caption = finalCaption || msg.text;
      const data = await callZapiProxy("send-image", payload);
      return { ok: true, externalMessageId: data?.zaapId || data?.messageId, sentAction: "send-image", sentPayload: payload };
    }
    if (msg.message_type === "video") {
      const payload: any = { phone, video: mediaUrl };
      if (finalCaption || msg.text) payload.caption = finalCaption || msg.text;
      const data = await callZapiProxy("send-video", payload);
      return { ok: true, externalMessageId: data?.zaapId || data?.messageId, sentAction: "send-video", sentPayload: payload };
    }
    if (msg.message_type === "audio") {
      const payload = { phone, audio: mediaUrl };
      const data = await callZapiProxy("send-audio", payload);
      return { ok: true, externalMessageId: data?.zaapId || data?.messageId, sentAction: "send-audio", sentPayload: payload };
    }
    if (msg.message_type === "document") {
      const ext = (msg.media_filename?.split(".").pop() || "pdf").toLowerCase();
      const payload: any = { phone, document: mediaUrl, extension: ext, fileName: msg.media_filename || "documento" };
      if (finalCaption) payload.caption = finalCaption;
      const data = await callZapiProxy("send-document", payload);
      return { ok: true, externalMessageId: data?.zaapId || data?.messageId, sentAction: "send-document", sentPayload: payload };
    }
    if (msg.message_type === "sticker") {
      const payload = { phone, image: mediaUrl };
      const data = await callZapiProxy("send-image", payload);
      return { ok: true, externalMessageId: data?.zaapId || data?.messageId, sentAction: "send-image", sentPayload: payload };
    }
    return { ok: false, error: `Tipo não suportado: ${msg.message_type}` };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Falha desconhecida no envio" };
  }
}

/**
 * Persiste no banco o registro de uma mensagem encaminhada (já enviada com sucesso).
 * Marca is_forwarded=true e copia toda a metadata de mídia da mensagem original.
 */
async function persistForwardedMessage(
  msg: Message,
  target: ForwardTarget,
  caption: string | undefined,
  externalMessageId: string | undefined,
  originalAction: string | undefined,
  originalPayload: any,
): Promise<void> {
  const createdAt = new Date().toISOString();
  const finalCaption = (caption || "").trim();
  const textForRow =
    msg.message_type === "text"
      ? (finalCaption ? `${finalCaption}\n\n${msg.text}` : msg.text)
      : (finalCaption || msg.text || "");

  const row: Record<string, any> = {
    conversation_id: target.conversationId,
    external_message_id: externalMessageId || `fwd_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    direction: "outgoing",
    sender_type: "atendente",
    content: textForRow,
    message_type: msg.message_type,
    media_url: msg.media_url || null,
    media_storage_url: msg.media_storage_url || msg.media_url || null,
    media_mimetype: msg.media_mimetype || null,
    media_filename: msg.media_filename || null,
    media_size_bytes: msg.media_size_bytes ?? null,
    media_status: msg.message_type !== "text" ? "downloaded" : null,
    status: "sent",
    is_forwarded: true,
    timestamp: createdAt,
    created_at: createdAt,
    original_payload: originalAction ? { action: originalAction, payload: originalPayload } : null,
  };

  // Tenta tabela unificada; ignora silenciosamente se falhar (envio Z-API já ocorreu)
  const { error } = await (supabase.from("conversation_messages" as any).insert(row) as any);
  if (error) {
    // Fallback legacy
    await supabase.from("chat_messages").insert({
      conversation_id: target.conversationId,
      external_message_id: row.external_message_id,
      sender_type: "atendente",
      message_type: msg.message_type,
      content: textForRow,
      media_url: row.media_storage_url,
      read_status: "sent",
    } as any);
  }

  // Atualiza preview da conversa
  const preview =
    msg.message_type === "text"
      ? textForRow.slice(0, 200)
      : `📎 ${msg.message_type}`;
  await supabase
    .from("conversations")
    .update({ last_message_preview: preview, last_message_at: createdAt })
    .eq("id", target.conversationId);
}

/**
 * Encaminha uma lista de mensagens para uma lista de destinos.
 * Executa em paralelo controlado para velocidade sem flood.
 */
export async function forwardMessages(
  messages: Message[],
  targets: ForwardTarget[],
  caption?: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ForwardResult[]> {
  const results: ForwardResult[] = [];
  const total = messages.length * targets.length;
  let done = 0;

  // Concorrência: 3 envios em paralelo (Z-API throttle friendly)
  const queue: Array<() => Promise<void>> = [];
  for (const target of targets) {
    for (const msg of messages) {
      queue.push(async () => {
        const send = await sendOneForward(msg, target, caption);
        if (send.ok) {
          try {
            await persistForwardedMessage(msg, target, caption, send.externalMessageId, send.sentAction, send.sentPayload);
          } catch {
            // best-effort persist; envio já confirmado
          }
        }
        results.push({
          target,
          msgId: msg.id,
          ok: send.ok,
          error: send.error,
          externalMessageId: send.externalMessageId,
        });
        done++;
        onProgress?.(done, total);
      });
    }
  }

  const CONCURRENCY = 3;
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const job = queue.shift();
      if (job) await job();
    }
  });
  await Promise.all(workers);
  return results;
}

export function summarizeMessageForPreview(msg: Message): string {
  if (msg.message_type === "text") return msg.text.slice(0, 80);
  const map: Record<MsgType, string> = {
    text: "Texto", image: "📷 Foto", video: "🎬 Vídeo",
    audio: "🎤 Áudio", document: "📄 Documento", sticker: "🌟 Figurinha",
  };
  return map[msg.message_type] || "Mídia";
}
