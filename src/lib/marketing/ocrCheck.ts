// =====================================================================
// OCR utilities · detect text regions for click-to-edit and validate
// final artwork against forbidden words (style annotations leaked from prompt).
// =====================================================================

// Tesseract is heavy; lazy import only when needed.
type Word = {
  text: string;
  // bbox in % of image dimensions
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  // background color sampled around the bbox (hex)
  bg: string;
  confidence: number;
};

export const FORBIDDEN_TOKENS = [
  // Color names (style annotations)
  "Hunter", "Champagne", "Sand", "Linen", "Eucalyptus", "Rolex",
  // Font names / weights
  "Instrument Sans", "Playfair Display", "Regular", "Bold",
  // Internal markers
  "Uso Interno",
];

// Hex code regex (ex: #1E6B4A)
const HEX_RE = /#[0-9A-Fa-f]{3,8}\b/;

export interface ForbiddenHit {
  token: string;
  context: string;
}

async function loadTesseract() {
  const mod = await import("tesseract.js");
  return mod;
}

async function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = (e) => rej(e);
    img.src = url;
  });
}

function sampleBackgroundColor(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  imgW: number, imgH: number,
): string {
  // Sample a 3px band just above and below the bbox to estimate the bg under the text
  const samples: [number, number, number][] = [];
  const collect = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= imgW || py >= imgH) return;
    const d = ctx.getImageData(px, py, 1, 1).data;
    samples.push([d[0], d[1], d[2]]);
  };
  for (let dx = 0; dx < x1 - x0; dx += 4) {
    collect(x0 + dx, Math.max(0, y0 - 3));
    collect(x0 + dx, Math.min(imgH - 1, y1 + 3));
  }
  if (samples.length === 0) return "#000000";
  // median per channel
  const med = (arr: number[]) => arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  const r = med(samples.map((s) => s[0]));
  const g = med(samples.map((s) => s[1]));
  const b = med(samples.map((s) => s[2]));
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

export async function detectTextRegions(imgUrl: string): Promise<Word[]> {
  const { createWorker } = await loadTesseract();
  const img = await loadImage(imgUrl);
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);

  const worker = await createWorker("por");
  try {
    const { data }: any = await worker.recognize(cv, {}, { blocks: true });
    const words: Word[] = [];
    // Tesseract v6/v7 returns hierarchical blocks; flatten
    const flatten = (node: any) => {
      if (!node) return;
      if (Array.isArray(node.words)) {
        for (const w of node.words) {
          if (!w?.bbox || !w.text || !w.text.trim()) continue;
          const { x0, y0, x1, y1 } = w.bbox;
          const bg = sampleBackgroundColor(ctx, x0, y0, x1, y1, W, H);
          words.push({
            text: w.text,
            xPct: (x0 / W) * 100,
            yPct: (y0 / H) * 100,
            wPct: ((x1 - x0) / W) * 100,
            hPct: ((y1 - y0) / H) * 100,
            bg,
            confidence: w.confidence ?? 0,
          });
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(flatten);
      if (Array.isArray(node.paragraphs)) node.paragraphs.forEach(flatten);
      if (Array.isArray(node.lines)) node.lines.forEach(flatten);
      if (Array.isArray(node.blocks)) node.blocks.forEach(flatten);
    };
    flatten(data);
    return words.filter((w) => w.confidence > 30);
  } finally {
    await worker.terminate();
  }
}

export async function findForbiddenInBlob(blob: Blob): Promise<ForbiddenHit[]> {
  const { createWorker } = await loadTesseract();
  const img = await loadImage(blob);
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  cv.getContext("2d")!.drawImage(img, 0, 0);
  const worker = await createWorker("por");
  try {
    const { data }: any = await worker.recognize(cv);
    const text: string = data?.text || "";
    const hits: ForbiddenHit[] = [];
    for (const tok of FORBIDDEN_TOKENS) {
      const re = new RegExp(`\\b${tok.replace(/\s+/g, "\\s+")}\\b`, "i");
      const m = text.match(re);
      if (m) hits.push({ token: tok, context: extractContext(text, m.index ?? 0, tok.length) });
    }
    const hex = text.match(HEX_RE);
    if (hex) hits.push({ token: hex[0], context: extractContext(text, hex.index ?? 0, hex[0].length) });
    return hits;
  } finally {
    await worker.terminate();
  }
}

function extractContext(text: string, idx: number, len: number): string {
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + len + 20);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export type { Word as DetectedWord };
