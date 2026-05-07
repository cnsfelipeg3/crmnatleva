import { Fragment } from "react";
import type { Message, MsgType, MsgStatus, Stage } from "./types";
import { STAGES } from "./types";

// ─── Timestamp helpers ───

export function normalizeTimestamp(dateStr: string | number): Date {
  if (!dateStr && dateStr !== 0) return new Date(0);
  try {
    const num = typeof dateStr === "number" ? dateStr : Number(dateStr);
    if (Number.isFinite(num) && num > 1_000_000_000) {
      const ms = num > 1_000_000_000_000 ? num : num * 1000;
      const d = new Date(ms);
      if (!isNaN(d.getTime()) && d.getTime() > 0) return d;
    }
    const str = String(dateStr);
    const direct = new Date(str);
    if (!isNaN(direct.getTime()) && direct.getTime() > 0) return direct;
    let normalized = str;
    if (normalized.includes(" ") && !normalized.includes("T")) normalized = normalized.replace(" ", "T");
    if (/[+-]\d{2}$/.test(normalized)) normalized += ":00";
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? new Date(0) : date;
  } catch { return new Date(0); }
}

export function toIsoTimestamp(value: any): string {
  if (!value && value !== 0) return new Date(0).toISOString();
  const num = Number(value);
  if (Number.isFinite(num) && num > 1_000_000_000) {
    const ms = num > 1_000_000_000_000 ? num : num * 1000;
    return new Date(ms).toISOString();
  }
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

export function getMessageTimestamp(message: any): string {
  return toIsoTimestamp(message?.timestamp ?? message?.created_at);
}

export function compareMessagesChronologically(a: any, b: any): number {
  return new Date(getMessageTimestamp(a)).getTime() - new Date(getMessageTimestamp(b)).getTime();
}

export function getMessageStableKey(message: any): string {
  return message.external_message_id || message.id || `${getMessageTimestamp(message)}_${message.sender_type}_${message.message_type}_${message.text}`;
}

export function dedupeUiMessages(messages: Message[]): Message[] {
  const deduped = new Map<string, Message>();
  for (const message of messages) {
    const key = getMessageStableKey(message);
    const existing = deduped.get(key);
    if (!existing) { deduped.set(key, message); continue; }
    const existingHasDbId = !existing.id.startsWith("temp_");
    const nextHasDbId = !message.id.startsWith("temp_");
    if (nextHasDbId && !existingHasDbId) { deduped.set(key, message); continue; }
    if (compareMessagesChronologically(message, existing) >= 0) deduped.set(key, message);
  }
  return Array.from(deduped.values()).sort(compareMessagesChronologically);
}

export function formatTimestamp(dateStr: string): string {
  if (!dateStr) return "";
  const date = normalizeTimestamp(dateStr);
  if (date.getTime() === 0) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][date.getDay()];
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

export function formatMsgTime(dateStr: string): string {
  const date = normalizeTimestamp(dateStr);
  if (date.getTime() === 0) return "";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateSeparator(dateStr: string): string {
  const date = normalizeTimestamp(dateStr);
  if (date.getTime() === 0) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function shouldShowDateSeparator(msgs: Message[], index: number): boolean {
  if (index === 0) return true;
  const prev = normalizeTimestamp(msgs[index - 1].created_at);
  const curr = normalizeTimestamp(msgs[index].created_at);
  return prev.getDate() !== curr.getDate() || prev.getMonth() !== curr.getMonth() || prev.getFullYear() !== curr.getFullYear();
}

export function stripQuotes(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export { formatPhoneDisplay, formatPhoneNational, cleanPhoneForSearch } from "@/lib/phone";


export function getStageInfo(stage: Stage) {
  return STAGES.find(s => s.key === stage) || STAGES[0];
}

export function mapZapiStatus(zapiStatus: string | null | undefined, fromMe: boolean): MsgStatus {
  if (!fromMe) return "delivered";
  const s = (zapiStatus || "").toUpperCase();
  if (s === "READ" || s === "PLAYED") return "read";
  if (s === "RECEIVED" || s === "DELIVERED" || s === "DELIVERY_ACK") return "delivered";
  return "sent";
}

export function normalizeDbMessageType(value: string | null | undefined): MsgType {
  const raw = (value || "text").toLowerCase();
  if (raw === "ptt") return "audio";
  if (raw === "sticker") return "sticker";
  if (raw === "location") return "location";
  if (raw === "image" || raw === "audio" || raw === "video" || raw === "document") return raw as MsgType;
  return "text";
}

export function normalizeDbStatus(value: string | null | undefined): MsgStatus {
  const raw = (value || "sent").toLowerCase();
  if (["read", "lido", "seen", "played"].includes(raw)) return "read";
  if (["delivered", "entregue", "received", "delivery_ack"].includes(raw)) return "delivered";
  return "sent";
}

// ─── Numeric safety: defends against postgres bigint-as-string in realtime payloads ───
// Without this, "23" + 1 = "231" and the badge explodes to "230000000…".
export function safeUnreadCount(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  // Hard cap to absorb any past corruption already persisted.
  return Math.min(Math.floor(num), 999);
}
