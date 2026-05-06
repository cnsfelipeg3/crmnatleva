// Modal para postar Status do WhatsApp (texto, imagem, vídeo)
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Type, Image as ImageIcon, Video, Eye } from "lucide-react";
import { toast } from "sonner";
import { uploadCompressedImage } from "@/lib/uploadCompressedImage";
import { supabase } from "@/integrations/supabase/client";
import { usePostStatus } from "@/hooks/useWhatsAppStatus";
import { StatusPreview } from "./StatusPreview";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const BG_COLORS = ["#075E54", "#128C7E", "#25D366", "#34B7F1", "#7E57C2", "#E91E63", "#FF7043", "#212121"];
const FONTS = [
  { label: "Sans", value: "sans-serif" },
  { label: "Serif", value: "serif" },
  { label: "Mono", value: "monospace" },
  { label: "Cursive", value: "cursive" },
];

export function PostStatusDialog({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"text" | "image" | "video">("text");
  const [text, setText] = useState("");
  const [bg, setBg] = useState(BG_COLORS[0]);
  const [font, setFont] = useState(FONTS[0].value);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const post = usePostStatus();

  function reset() {
    setText(""); setCaption(""); setImageFile(null); setVideoFile(null);
    setBg(BG_COLORS[0]); setFont(FONTS[0].value); setTab("text");
  }

  async function handleSubmit() {
    try {
      if (tab === "text") {
        if (!text.trim()) { toast.error("Digite o texto do status"); return; }
        await post.mutateAsync({ kind: "text", text: text.trim(), backgroundColor: bg, font });
        toast.success("Status publicado");
      } else if (tab === "image") {
        if (!imageFile) { toast.error("Selecione uma imagem"); return; }
        if (imageFile.size > 5 * 1024 * 1024) { toast.error("Imagem excede 5MB"); return; }
        setUploading(true);
        const up = await uploadCompressedImage(imageFile, "whatsapp-status", "outgoing");
        await post.mutateAsync({ kind: "image", imageUrl: up.url, caption: caption || undefined });
        toast.success("Status publicado");
      } else {
        if (!videoFile) { toast.error("Selecione um vídeo"); return; }
        if (videoFile.size > 10 * 1024 * 1024) { toast.error("Vídeo excede 10MB (limite Z-API)"); return; }
        setUploading(true);
        const path = `outgoing/${Date.now()}-${videoFile.name.replace(/\s+/g, "-")}`;
        const { error: upErr } = await supabase.storage.from("whatsapp-status").upload(path, videoFile, {
          contentType: videoFile.type, upsert: true,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("whatsapp-status").getPublicUrl(path);
        await post.mutateAsync({ kind: "video", videoUrl: pub.publicUrl, caption: caption || undefined });
        toast.success("Status publicado");
      }
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao publicar status");
    } finally {
      setUploading(false);
    }
  }

  const busy = post.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Publicar status</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="text"><Type className="h-4 w-4 mr-1" /> Texto</TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="h-4 w-4 mr-1" /> Imagem</TabsTrigger>
            <TabsTrigger value="video"><Video className="h-4 w-4 mr-1" /> Vídeo</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3">
            <div
              className="rounded-xl flex items-center justify-center px-6 aspect-[9/16] max-h-[360px] mx-auto w-full"
              style={{ backgroundColor: bg, fontFamily: font }}
            >
              <p className="text-white text-xl text-center font-semibold leading-snug whitespace-pre-wrap break-words">
                {text || "Digite seu status..."}
              </p>
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Texto do status" rows={3} maxLength={500} />
            <div className="flex flex-wrap gap-2">
              {BG_COLORS.map(c => (
                <button key={c} onClick={() => setBg(c)} aria-label={`Cor ${c}`}
                  className={`h-8 w-8 rounded-full border-2 ${bg === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {FONTS.map(f => (
                <Button key={f.value} type="button" size="sm"
                  variant={font === f.value ? "default" : "outline"}
                  onClick={() => setFont(f.value)}
                  style={{ fontFamily: f.value }}>
                  {f.label}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-3">
            <input type="file" accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="block w-full text-sm" />
            {imageFile && (
              <img src={URL.createObjectURL(imageFile)} alt="preview" className="rounded-lg max-h-72 mx-auto" />
            )}
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Legenda (opcional)" rows={2} maxLength={300} />
            <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP · até 5MB</p>
          </TabsContent>

          <TabsContent value="video" className="space-y-3">
            <input type="file" accept="video/mp4"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="block w-full text-sm" />
            {videoFile && (
              <video src={URL.createObjectURL(videoFile)} controls className="rounded-lg max-h-72 mx-auto" />
            )}
            {videoFile && (
              <p className="text-xs text-muted-foreground">
                {videoFile.name} · {(videoFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Legenda (opcional)" rows={2} maxLength={300} />
            <p className="text-xs text-muted-foreground">MP4 · até 10MB (limite Z-API)</p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Publicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PostStatusDialog;
