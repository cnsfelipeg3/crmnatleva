import type { HotelPhoto } from "@/components/HotelPhotosScraper";

export type { HotelPhoto };

export interface SectionDetail {
  description: string;
  details: Record<string, string>;
  amenities: string[];
}

export interface RoomBlock {
  room_name: string;
  description: string;
  amenities: string[];
  photos: HotelPhoto[];
  source: "official" | "booking" | "google";
}

export interface ExpressSlot {
  id: string;
  role: "cover" | "room" | "area";
  label: string;
  category: string;
  photo: HotelPhoto;
  roomName?: string;
}

export interface CoverageState {
  level: "full" | "partial" | "low" | "error";
  message: string;
  officialPercent: number;
}

export type ConfidenceLevel = "alta" | "media" | "revisar";

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return "alta";
  if (confidence >= 0.5) return "media";
  return "revisar";
}

export function getConfidenceBadgeVariant(level: ConfidenceLevel): "default" | "secondary" | "destructive" {
  if (level === "alta") return "default";
  if (level === "media") return "secondary";
  return "destructive";
}

// ── Commercial helpers ──

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
}

export function isPhotoFaithfulToRoom(photo: HotelPhoto, roomName: string): boolean {
  const normRoom = normalize(roomName);
  if (!normRoom || normRoom.length < 3) return false;
  // Check environment_name / section_name
  const normEnv = normalize(photo.environment_name || "");
  if (normEnv && (normEnv.includes(normRoom) || normRoom.includes(normEnv))) return true;
  const normRoomName = normalize(photo.room_name || "");
  if (normRoomName && (normRoomName.includes(normRoom) || normRoom.includes(normRoomName))) return true;
  // Check html_context evidence
  const ctx = (photo.html_context || "").toLowerCase();
  if (ctx && ctx.includes(roomName.toLowerCase().slice(0, Math.max(6, roomName.length * 0.6)))) return true;
  return false;
}

export type PhotoTag = "capa_recomendada" | "destaque" | "fiel_ao_quarto";

export const PHOTO_TAG_CONFIG: Record<PhotoTag, { label: string; className: string }> = {
  capa_recomendada: { label: "Capa recomendada", className: "bg-warning/90 text-warning-foreground" },
  destaque: { label: "Destaque", className: "bg-primary/90 text-primary-foreground" },
  fiel_ao_quarto: { label: "Fiel ao quarto", className: "bg-success/90 text-success-foreground" },
};

export function getPhotoTag(photo: HotelPhoto, allPhotos: HotelPhoto[], roomName?: string): PhotoTag | null {
  // Priority 1: Capa recomendada
  if (["fachada", "vista"].includes(photo.category) && photo.source === "official" && (photo.confidence || 0) >= 0.8) {
    return "capa_recomendada";
  }
  // Priority 2: Destaque (top confidence + official)
  if ((photo.confidence || 0) >= 0.9 && photo.source === "official") {
    return "destaque";
  }
  // Priority 3: Fiel ao quarto — only tag photos that have strong textual evidence
  // (html_context match or source=official), to avoid tagging every photo in the group
  if (roomName && photo.source === "official" && (photo.confidence || 0) >= 0.7) {
    const ctx = (photo.html_context || "").toLowerCase();
    const roomLower = roomName.toLowerCase();
    const matchLen = Math.max(6, Math.floor(roomLower.length * 0.6));
    if (ctx && ctx.includes(roomLower.slice(0, matchLen))) {
      return "fiel_ao_quarto";
    }
  }
  return null;
}

const HIGHLIGHT_KEYWORDS = ["terraço", "varanda", "sala separada", "banheira", "jacuzzi", "vista mar", "piscina privativa", "hidromassagem", "lareira", "sacada"];

export function getHighlightAmenity(amenities: string[]): string | null {
  for (const a of amenities) {
    const lower = a.toLowerCase();
    if (HIGHLIGHT_KEYWORDS.some(k => lower.includes(k))) return a;
  }
  return null;
}

export function buildCommercialSummary(detail?: SectionDetail): { line1: string; line2: string } {
  if (!detail) return { line1: "", line2: "" };
  const parts: string[] = [];
  if (detail.details["Tamanho"]) parts.push(detail.details["Tamanho"]);
  if (detail.details["Cama"]) parts.push(detail.details["Cama"]);
  if (detail.details["Capacidade"]) parts.push(detail.details["Capacidade"]);
  const line1 = parts.join(" · ").slice(0, 60);

  const highlight = getHighlightAmenity(detail.amenities);
  const vista = detail.details["Vista"];
  const line2Parts: string[] = [];
  if (highlight) line2Parts.push(highlight);
  if (vista && !line2Parts.some(p => p.toLowerCase().includes("vista"))) line2Parts.push(vista);
  const line2 = line2Parts.join(" · ").slice(0, 55);

  return { line1, line2 };
}

