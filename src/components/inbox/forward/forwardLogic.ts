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
      return { ok: true, externalMessageId: data?.messageId || data?.zaapId, sentAction: "send-text", sentPayload: payload };
    }

    const mediaUrl = msg.media_storage_url || msg.media_url;
    if (!mediaUrl) return { ok: false, error: "Mensagem sem URL de mídia válida" };

    if (msg.message_type === "image") {
      const payload: any = { phone, image: mediaUrl };
      if (finalCaption || msg.text) payload.caption = finalCaption || msg.text;
      const data = await callZapiProxy("send-image", payload);
      return { ok: true, externalMessageId: data?.messageId || data?.zaapId, sentAction: "send-image", sentPayload: payload };
    }
    if (msg.message_type === "video") {
      const payload: any = { phone, video: mediaUrl };
      if (finalCaption || msg.text) payload.caption = finalCaption || msg.text;
      const data = await callZapiProxy("send-video", payload);
      return { ok: true, externalMessageId: data?.messageId || data?.zaapId, sentAction: "send-video", sentPayload: payload };
    }
    if (msg.message_type === "audio") {
      const payload = { phone, audio: mediaUrl };
      const data = await callZapiProxy("send-audio", payload);
      return { ok: true, externalMessageId: data?.messageId || data?.zaapId, sentAction: "send-audio", sentPayload: payload };
    }
    if (msg.message_type === "document") {
      const ext = (msg.media_filename?.split(".").pop() || "pdf").toLowerCase();
      const payload: any = { phone, document: mediaUrl, extension: ext, fileName: msg.media_filename || "documento" };
      if (finalCaption) payload.caption = finalCaption;
      const data = await callZapiProxy("send-document", payload);
      return { ok: true, externalMessageId: data?.messageId || data?.zaapId, sentAction: "send-document", sentPayload: payload };
    }
    if (msg.message_type === "sticker") {
      const payload = { phone, image: mediaUrl };
      const data = await callZapiProxy("send-image", payload);
      return { ok: true, externalMessageId: data?.messageId || data?.zaapId, sentAction: "send-image", sentPayload: payload };
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
 * Status por job (uma mensagem × um destino).
 */
export type JobStatus = "pending" | "sending" | "sent" | "failed";
export interface JobState {
  msgId: string;
  phone: string;
  status: JobStatus;
  error?: string;
  externalMessageId?: string;
}
export const jobKey = (msgId: string, phone: string) => `${msgId}::${phone}`;

/**
 * Pré-aquece URLs de mídia em paralelo (HEAD) para validar disponibilidade
 * antes do Z-API tentar baixar · evita falhas/lentidão no envio.
 */
async function preloadMediaUrls(messages: Message[]): Promise<void> {
  const urls = Array.from(new Set(
    messages
      .filter(m => m.message_type !== "text")
      .map(m => m.media_storage_url || m.media_url)
      .filter(Boolean) as string[]
  ));
  if (urls.length === 0) return;
  await Promise.allSettled(
    urls.map(u =>
      fetch(u, { method: "HEAD", mode: "cors", cache: "force-cache" }).catch(() => null)
    )
  );
}

/**
 * Encaminha uma lista de mensagens para uma lista de destinos.
 * Pré-carrega anexos · executa em paralelo controlado · emite estado por job.
 */
export async function forwardMessages(
  messages: Message[],
  targets: ForwardTarget[],
  caption?: string,
  onProgress?: (done: number, total: number, jobs?: JobState[]) => void,
): Promise<ForwardResult[]> {
  const results: ForwardResult[] = [];
  const total = messages.length * targets.length;
  let done = 0;

  // Estado vivo de cada job
  const jobs = new Map<string, JobState>();
  for (const target of targets) {
    for (const msg of messages) {
      jobs.set(jobKey(msg.id, target.phone), { msgId: msg.id, phone: target.phone, status: "pending" });
    }
  }
  const emit = () => onProgress?.(done, total, Array.from(jobs.values()));
  emit();

  // Pré-aquece mídias em paralelo (best-effort, não bloqueia em erro)
  await preloadMediaUrls(messages);

  // Concorrência: 4 envios em paralelo (Z-API throttle friendly), serializa por destino.
  const queues: Array<Array<() => Promise<void>>> = targets.map(target =>
    messages.map(msg => async () => {
      const k = jobKey(msg.id, target.phone);
      jobs.set(k, { ...jobs.get(k)!, status: "sending" });
      emit();

      const send = await sendOneForward(msg, target, caption);
      if (send.ok) {
        try {
          await persistForwardedMessage(msg, target, caption, send.externalMessageId, send.sentAction, send.sentPayload);
        } catch {
          // best-effort persist; envio já confirmado
        }
        jobs.set(k, { ...jobs.get(k)!, status: "sent", externalMessageId: send.externalMessageId });
      } else {
        jobs.set(k, { ...jobs.get(k)!, status: "failed", error: send.error });
      }
      results.push({
        target,
        msgId: msg.id,
        ok: send.ok,
        error: send.error,
        externalMessageId: send.externalMessageId,
      });
      done++;
      emit();
    })
  );

  // Roda os destinos em paralelo, mensagens dentro de cada destino em série (ordem garantida)
  const TARGET_CONCURRENCY = 4;
  let cursor = 0;
  const runTarget = async () => {
    while (cursor < queues.length) {
      const idx = cursor++;
      const q = queues[idx];
      for (const job of q) {
        try { await job(); } catch { /* já capturado em sendOneForward */ }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(TARGET_CONCURRENCY, queues.length) }, runTarget));
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
