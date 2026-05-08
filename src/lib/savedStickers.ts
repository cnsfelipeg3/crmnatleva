import { supabase } from "@/integrations/supabase/client";

export interface SavedSticker {
  id: string;
  file_url: string;
  storage_path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  is_animated: boolean | null;
  source_message_id: string | null;
  created_by: string | null;
  last_used_at: string | null;
  created_at: string;
}

/** Fetch a remote sticker URL and persist it as a reusable sticker. */
export async function saveStickerFromUrl(opts: {
  url: string;
  sourceMessageId?: string | null;
}): Promise<SavedSticker> {
  if (!opts.url) throw new Error("URL da figurinha vazia");

  // Avoid duplicate saves by URL
  const { data: existing } = await supabase
    .from("saved_stickers" as any)
    .select("*")
    .eq("file_url", opts.url)
    .maybeSingle();
  if (existing) return existing as unknown as SavedSticker;

  // Download
  const res = await fetch(opts.url);
  if (!res.ok) throw new Error(`Não consegui baixar a figurinha (${res.status})`);
  const blob = await res.blob();
  const mime = blob.type || "image/webp";
  const ext = mime.includes("webp") ? "webp" : mime.split("/").pop() || "webp";

  const path = `saved/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("stickers")
    .upload(path, blob, { contentType: mime, upsert: false });
  if (upErr) throw new Error(`Falha ao salvar: ${upErr.message}`);

  const { data: pub } = supabase.storage.from("stickers").getPublicUrl(path);

  const { data: { user } } = await supabase.auth.getUser();

  const { data: inserted, error: insErr } = await supabase
    .from("saved_stickers" as any)
    .insert({
      file_url: pub.publicUrl,
      storage_path: path,
      mime_type: mime,
      is_animated: mime.includes("webp"),
      source_message_id: opts.sourceMessageId ?? null,
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();
  if (insErr) throw new Error(insErr.message);
  return inserted as unknown as SavedSticker;
}

export async function listSavedStickers(): Promise<SavedSticker[]> {
  const { data, error } = await supabase
    .from("saved_stickers" as any)
    .select("*")
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SavedSticker[];
}

export async function deleteSavedSticker(s: SavedSticker): Promise<void> {
  if (s.storage_path) {
    await supabase.storage.from("stickers").remove([s.storage_path]).catch(() => {});
  }
  await supabase.from("saved_stickers" as any).delete().eq("id", s.id);
}

export async function touchSavedSticker(id: string): Promise<void> {
  await supabase
    .from("saved_stickers" as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", id);
}
