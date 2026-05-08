import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Camera, Wand2, Check, Upload, RefreshCw, Image as ImageIcon, Link2 } from "lucide-react";
import { uploadCompressedImage } from "@/lib/uploadCompressedImage";

interface CoverImage {
  url: string;
  source: "wikimedia" | "ai" | "upload" | "url";
  title?: string;
  attribution?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDestination?: string;
  onSelect: (url: string) => void;
}

export default function CoverImageSuggestDialog({ open, onOpenChange, initialDestination = "", onSelect }: Props) {
  const [destination, setDestination] = useState(initialDestination);
  const [loading, setLoading] = useState(false);
  const [aiDoneCount, setAiDoneCount] = useState(0);
  const aiTotalRef = useRef(4);
  const [images, setImages] = useState<CoverImage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setDestination(initialDestination);
  }, [open, initialDestination]);

  const handleSearch = async () => {
    const q = destination.trim();
    if (q.length < 2) {
      toast.error("Descreva o destino, hotel ou cruzeiro (ex: Santiago, Chile)");
      return;
    }
    setLoading(true);
    setImages([]);
    setSelected(null);
    setAiDoneCount(0);
    aiTotalRef.current = 4;
    try {
      const { data, error } = await supabase.functions.invoke("cover-image-search", {
        body: { destination: q, count: 4 },
      });
      if (error) throw error;
      const imgs = (data?.images ?? []) as CoverImage[];
      if (imgs.length === 0) {
        toast.warning("Nenhuma imagem encontrada. Tente reformular o termo, colar uma URL ou enviar do seu computador.");
      }
      setImages(imgs);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao buscar imagens. Tente novamente em alguns segundos.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo inválido. Envie uma imagem (JPG, PNG ou WEBP).");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadCompressedImage(file, "media", "proposal-covers", {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
      });
      const next: CoverImage = { url: uploaded.url, source: "upload", title: file.name };
      setImages((prev) => [next, ...prev]);
      setSelected(uploaded.url);
      toast.success("Imagem enviada · clique em Usar esta capa");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar a imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      toast.error("Cole uma URL válida (https://...)");
      return;
    }
    const next: CoverImage = { url: u, source: "url", title: "URL personalizada" };
    setImages((prev) => [next, ...prev]);
    setSelected(u);
    setUrlInput("");
  };

  const confirm = () => {
    if (!selected) {
      toast.error("Selecione uma imagem ou envie a sua");
      return;
    }
    onSelect(selected);
    onOpenChange(false);
    setImages([]);
    setSelected(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-accent" />
            Capa da proposta
          </DialogTitle>
          <DialogDescription>
            Buscamos fotos reais e geramos opções com IA. Você também pode enviar uma imagem do seu computador ou colar uma URL.
          </DialogDescription>
        </DialogHeader>

        {/* Buscar com IA */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Gerar com IA · buscar fotos reais
          </Label>
          <div className="flex gap-2">
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ex: MSC World America · Santiago, Chile · Hotel Belmond Copacabana..."
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSearch()}
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading} className="shrink-0 gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Gerando..." : images.length > 0 ? "Buscar de novo" : "Buscar"}
            </Button>
          </div>
        </div>

        {/* Upload + URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Enviar do computador
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2 h-10"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Enviando..." : "Selecionar arquivo"}
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Colar URL de imagem
            </Label>
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
              />
              <Button type="button" variant="outline" onClick={handleAddUrl} className="shrink-0 gap-1.5">
                <Link2 className="w-4 h-4" /> Usar
              </Button>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-center text-muted-foreground text-xs gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Gerando 4 variações com IA e buscando fotos reais... pode levar até 30s
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[16/10] rounded-xl bg-muted/50 animate-pulse flex items-center justify-center"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resultados */}
        {!loading && images.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {images.length} opção(ões) · clique para selecionar
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearch}
                className="h-7 gap-1.5 text-[11px]"
                disabled={loading}
              >
                <RefreshCw className="w-3 h-3" /> Gerar novas variações
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {images.map((img, i) => {
                const isSelected = selected === img.url;
                return (
                  <button
                    key={`${img.url}-${i}`}
                    type="button"
                    onClick={() => setSelected(img.url)}
                    className={`relative group rounded-xl overflow-hidden border-2 transition-all aspect-[16/10] bg-muted/30 ${
                      isSelected
                        ? "border-accent ring-2 ring-accent/30 shadow-lg"
                        : "border-border/30 hover:border-accent/50"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.title || "Sugestão de capa"}
                      className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                      }}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md bg-black/55 text-white flex items-center gap-1">
                      {img.source === "ai" && (<><Wand2 className="w-3 h-3" /> Gerada por IA</>)}
                      {img.source === "wikimedia" && (<><Camera className="w-3 h-3" /> Foto real</>)}
                      {img.source === "upload" && (<><Upload className="w-3 h-3" /> Enviada</>)}
                      {img.source === "url" && (<><Link2 className="w-3 h-3" /> URL</>)}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    {img.attribution && (
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[9px] text-white/80 bg-gradient-to-t from-black/70 to-transparent truncate">
                        {img.attribution}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!loading && images.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            Digite um termo e clique em <strong>Buscar</strong> para gerar opções com IA, ou envie uma imagem do seu computador.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} disabled={!selected} className="gap-2">
            <Check className="w-4 h-4" /> Usar esta capa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
