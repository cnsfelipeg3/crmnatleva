/**
 * Message Queue for offline/disconnected WhatsApp sending.
 * Persists queued messages in localStorage so they survive page reloads.
 * Processes queue automatically when WhatsApp reconnects.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { debugLog } from "@/lib/debugMode";

export interface QueuedMessage {
  id: string;               // temp ID
  conversationId: string;    // e.g. "wa_5511..."
  phone: string;
  text: string;
  messageType: "text" | "image" | "audio" | "video" | "document";
  mediaUrl?: string;
  createdAt: string;
  queuedAt: string;
  sendStatus: "queued" | "sending" | "sent" | "failed";
  errorMessage?: string;
  attemptCount: number;
  replyTo?: { id: string; text: string; sender_type: string; message_type: string; external_message_id?: string | null };
}

const STORAGE_KEY = "natleva_msg_queue";

function loadQueue(): QueuedMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQueue(queue: QueuedMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch { /* localStorage full - silent fail */ }
}

export function useMessageQueue() {
  const [queue, setQueue] = useState<QueuedMessage[]>(loadQueue);
  const processingRef = useRef(false);

  // Sync to localStorage on every change
  useEffect(() => { saveQueue(queue); }, [queue]);

  const enqueue = useCallback((msg: Omit<QueuedMessage, "queuedAt" | "sendStatus" | "attemptCount">): QueuedMessage => {
    const queued: QueuedMessage = {
      ...msg,
      queuedAt: new Date().toISOString(),
      sendStatus: "queued",
      attemptCount: 0,
    };
    setQueue(prev => [...prev, queued]);
    debugLog(`[QUEUE] Mensagem enfileirada: ${queued.id} para ${queued.phone}`);
    return queued;
  }, []);

  const updateStatus = useCallback((id: string, status: QueuedMessage["sendStatus"], errorMessage?: string) => {
    setQueue(prev => prev.map(m => m.id === id ? { ...m, sendStatus: status, errorMessage, attemptCount: m.attemptCount + (status === "sending" ? 1 : 0) } : m));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(m => m.id !== id));
  }, []);

  const getQueuedForConversation = useCallback((conversationId: string): QueuedMessage[] => {
    return queue.filter(m => m.conversationId === conversationId && (m.sendStatus === "queued" || m.sendStatus === "failed"));
  }, [queue]);

  const getPendingCount = useCallback((): number => {
    return queue.filter(m => m.sendStatus === "queued" || m.sendStatus === "sending").length;
  }, [queue]);

  const retryMessage = useCallback((id: string) => {
    setQueue(prev => prev.map(m => m.id === id ? { ...m, sendStatus: "queued", errorMessage: undefined } : m));
  }, []);

  /**
   * Process the queue — called when WhatsApp reconnects.
   * Takes a sender function as param to avoid tight coupling.
   */
  const processQueue = useCallback(async (
    sendFn: (msg: QueuedMessage) => Promise<{ success: boolean; realId?: string; error?: string }>,
    onStatusUpdate: (msg: QueuedMessage, status: "sending" | "sent" | "failed", realId?: string, error?: string) => void,
  ) => {
    if (processingRef.current) return;
    processingRef.current = true;

    const pending = queue
      .filter(m => m.sendStatus === "queued")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    debugLog(`[QUEUE] Processando ${pending.length} mensagens pendentes...`);

    for (const msg of pending) {
      // Mark as sending
      updateStatus(msg.id, "sending");
      onStatusUpdate(msg, "sending");

      try {
        const result = await sendFn(msg);
        if (result.success) {
          updateStatus(msg.id, "sent");
          onStatusUpdate(msg, "sent", result.realId);
          // Remove from queue after success
          setTimeout(() => removeFromQueue(msg.id), 2000);
          debugLog(`[QUEUE✓] Mensagem ${msg.id} enviada com sucesso`);
        } else {
          updateStatus(msg.id, "failed", result.error);
          onStatusUpdate(msg, "failed", undefined, result.error);
          console.error(`[QUEUE✗] Mensagem ${msg.id} falhou: ${result.error}`);
        }
      } catch (err: any) {
        updateStatus(msg.id, "failed", err?.message || "Erro desconhecido");
        onStatusUpdate(msg, "failed", undefined, err?.message);
        console.error(`[QUEUE✗] Mensagem ${msg.id} exception: ${err?.message}`);
      }

      // Small delay between sends to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    processingRef.current = false;
    debugLog(`[QUEUE] Processamento concluído.`);
  }, [queue, updateStatus, removeFromQueue]);

  return {
    queue,
    enqueue,
    updateStatus,
    removeFromQueue,
    getQueuedForConversation,
    getPendingCount,
    retryMessage,
    processQueue,
    isProcessing: processingRef.current,
  };
}
