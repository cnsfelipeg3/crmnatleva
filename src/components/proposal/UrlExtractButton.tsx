import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ExtractedAccommodation {
  name?: string;
  room_type?: string;
  description?: string;
  amenities?: string[];
  size_sqm?: string;
  capacity?: string;
  bed_type?: string;
  view?: string;
  location?: string;
  stars?: string;
  meal_plan?: string;
  photos?: { url: string; description?: string; category?: string; source?: string }[];
}

interface Props {
  /** "hotel" applies all fields; "room" focuses on room_photos + room_type/description */
  mode: "hotel" | "room";
  onExtracted: (data: ExtractedAccommodation) => void;
  label?: string;
  size?: "sm" | "default";
}

export default function UrlExtractButton({ mode, onExtracted, label, size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExtract = async () => {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error("Cole uma URL válida (https://...)");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-from-url", {
        body: { url: trimmed },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha na extração");

      const extracted = data.data as ExtractedAccommodation;
      onExtracted(extracted);

      const photoCount = extracted.photos?.length ?? 0;
      toast.success(
        mode === "room"
          ? `🛏️ Quarto extraído · ${photoCount} fotos`
          : `🏨 Hotel extraído · ${photoCount} fotos`
      );
      setOpen(false);
      setUrl("");
    } catch (err: any) {
      console.error("[UrlExtractButton]", err);
      toast.error(err?.message || "Erro ao extrair da URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size={size} className="gap-1.5">
          <Link2 className="w-3.5 h-3.5" />
          {label || (mode === "room" ? "Extrair quarto via URL" : "Extrair via URL")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3" align="end">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {mode === "room" ? "Extração inteligente do quarto" : "Extração inteligente do hotel"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Cole a URL (Booking, Decolar, Hoteis.com, Expedia, Azul Viagens, site oficial...) e a IA extrai nome, descrição, comodidades, tamanho, fotos e mais.
          </p>
          <Input
            placeholder="https://www.booking.com/hotel/.../room..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleExtract(); }}
            autoFocus
          />
          <Button onClick={handleExtract} disabled={loading || !url.trim()} size="sm" className="w-full">
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Extraindo...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Extrair agora</>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
