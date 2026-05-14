export type FormatId = "feed" | "story" | "vertical" | "horizontal";

export interface FormatDef {
  id: FormatId;
  label: string;
  description: string;
  aspect: string; // for prompt
  width: number;
  height: number;
}

export const FORMATS: FormatDef[] = [
  { id: "feed", label: "Feed quadrado", description: "1080 × 1080 · Instagram feed", aspect: "1:1", width: 1080, height: 1080 },
  { id: "story", label: "Stories / Reels capa", description: "1080 × 1920 · vertical full", aspect: "9:16", width: 1080, height: 1920 },
  { id: "vertical", label: "Feed vertical", description: "1080 × 1350 · Instagram retrato", aspect: "4:5", width: 1080, height: 1350 },
  { id: "horizontal", label: "Banner horizontal", description: "1920 × 1080 · web e WhatsApp", aspect: "16:9", width: 1920, height: 1080 },
];

export function findFormat(id: FormatId): FormatDef {
  return FORMATS.find((f) => f.id === id)!;
}
