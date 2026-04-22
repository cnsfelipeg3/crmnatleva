/**
 * Compressão de imagens no cliente.
 *
 * Usado em todos os uploads de imagem para evitar:
 *  - Salvar data URLs gigantes (>2MB) que travam o navegador.
 *  - Subir originais de 8MP de celular quando a UI mostra a 1600px.
 *
 * Funciona 100% no browser (Canvas API), sem dependências externas.
 */

export interface CompressOptions {
  /** Largura máxima em px. Mantém proporção. Default 1920. */
  maxWidth?: number;
  /** Altura máxima em px. Mantém proporção. Default 1920. */
  maxHeight?: number;
  /** Qualidade JPEG/WebP entre 0 e 1. Default 0.82. */
  quality?: number;
  /** Formato de saída. Default 'image/webp' (melhor compressão). */
  mimeType?: "image/webp" | "image/jpeg" | "image/png";
  /** Tamanho máximo em bytes do arquivo de entrada. Default 20MB. */
  maxInputBytes?: number;
}

export interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  /** Tamanho final em bytes. */
  size: number;
  /** Razão de compressão (originalSize / size). */
  ratio: number;
  mimeType: string;
}

const DEFAULT_OPTS: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.82,
  mimeType: "image/webp",
  maxInputBytes: 20 * 1024 * 1024,
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"];

export function isImageFile(file: File): boolean {
  if (!file?.type) return false;
  return ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type.startsWith("image/");
}

export async function compressImage(file: File, options?: CompressOptions): Promise<CompressResult> {
  const opts = { ...DEFAULT_OPTS, ...options };

  if (!isImageFile(file)) {
    throw new Error(`Formato não suportado: ${file.type || "desconhecido"}. Use JPG, PNG ou WebP.`);
  }
  if (file.size > opts.maxInputBytes) {
    const mb = (opts.maxInputBytes / (1024 * 1024)).toFixed(0);
    throw new Error(`Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(1)}MB). Máximo: ${mb}MB.`);
  }

  const bitmap = await loadBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, opts.maxWidth, opts.maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não disponível neste navegador.");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem comprimida"))),
      opts.mimeType,
      opts.quality,
    );
  });

  // Cleanup
  if ("close" in bitmap && typeof (bitmap as any).close === "function") {
    try { (bitmap as ImageBitmap).close(); } catch { /* ignore */ }
  }

  return {
    blob,
    width,
    height,
    size: blob.size,
    ratio: file.size > 0 ? file.size / blob.size : 1,
    mimeType: opts.mimeType,
  };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap é muito mais rápido que <img> + Image.onload
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fallback abaixo (HEIC, browsers antigos)
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Falha ao decodificar imagem")); };
    img.src = url;
  });
}

function fitWithin(srcW: number, srcH: number, maxW: number, maxH: number) {
  if (srcW <= maxW && srcH <= maxH) return { width: srcW, height: srcH };
  const ratio = Math.min(maxW / srcW, maxH / srcH);
  return {
    width: Math.round(srcW * ratio),
    height: Math.round(srcH * ratio),
  };
}
