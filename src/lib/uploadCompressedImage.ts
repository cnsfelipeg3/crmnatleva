import { supabase } from "@/integrations/supabase/client";
import { compressImage, type CompressOptions } from "./imageCompression";

export interface UploadedImage {
  url: string;
  path: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Comprime uma imagem no cliente e faz upload para um bucket público de Storage.
 * Retorna a URL pública leve — NUNCA um data URL.
 */
export async function uploadCompressedImage(
  file: File,
  bucket: string = "media",
  folder: string = "uploads",
  compressOpts?: CompressOptions,
): Promise<UploadedImage> {
  const result = await compressImage(file, compressOpts);

  const ext = result.mimeType === "image/webp" ? "webp" : result.mimeType === "image/png" ? "png" : "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${folder.replace(/\/+$/, "")}/${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, result.blob, {
    cacheControl: "31536000",
    contentType: result.mimeType,
    upsert: false,
  });
  if (error) throw error;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    url: pub.publicUrl,
    path,
    size: result.size,
    width: result.width,
    height: result.height,
  };
}
