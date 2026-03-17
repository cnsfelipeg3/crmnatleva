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
