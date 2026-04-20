import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Camera, Wand2, Check } from "lucide-react";

interface CoverImage {
  url: string;
  source: "wikimedia" | "ai";
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
  const [images, setImages] = useState<CoverImage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSearch = async () => {
    const q = destination.trim();
    if (q.length < 2) {
      toast.error("Informe um destino (ex: Santiago, Chile)");
      return;
    }
    setLoading(true);
    setImages([]);
    setSelected(null);
    try {
      const { data, error } = await supabase.functions.invoke("cover-image-search", {
        body: { destination: q },
      });
      if (error) throw error;
      const imgs = (data?.images ?? []) as CoverImage[];
      if (imgs.length === 0) {
        toast.warning("Nenhuma imagem encontrada. Tente outro termo.");
      }
      setImages(imgs);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao buscar imagens");
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!selected) {
      toast.error("Selecione uma imagem");
      return;
    }
    onSelect(selected);
    onOpenChange(false);
    setImages([]);
    setSelected(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-accent" />
            Sugerir capa do destino
          </DialogTitle>
          <DialogDescription>
            Digite o destino da viagem para buscar fotos reais e geradas por IA.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="sr-only">Destino</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ex: Santiago, Chile · Vale Nevado · Paris..."
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={loading}
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="ml-2">Buscar</span>
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Buscando fotos reais e gerando opções com IA...
          </div>
        )}

        {!loading && images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {images.map((img, i) => {
              const isSelected = selected === img.url;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(img.url)}
                  className={`relative group rounded-xl overflow-hidden border-2 transition-all aspect-[16/10] ${
                    isSelected ? "border-accent ring-2 ring-accent/30" : "border-border/30 hover:border-accent/50"
                  }`}
                >
                  <img src={img.url} alt={img.title || "Sugestão"} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md bg-black/50 text-white flex items-center gap-1">
                    {img.source === "ai" ? (
                      <><Wand2 className="w-3 h-3" /> Gerada por IA</>
                    ) : (
                      <><Camera className="w-3 h-3" /> Foto real</>
                    )}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
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
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} disabled={!selected}>
            <Check className="w-4 h-4 mr-2" /> Usar esta capa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
