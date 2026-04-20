import { useState, useRef } from "react";
import { Upload, Sparkles, Loader2, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ExtractItemType = "flight" | "hotel" | "experience";

interface Props {
  itemType: ExtractItemType;
  onExtracted: (data: { title?: string; description?: string; data?: Record<string, any> }) => void;
}

const LABELS: Record<ExtractItemType, { title: string; helper: string }> = {
  flight: {
    title: "Extrair voo de imagem/PDF",
    helper: "Cole um print do site da companhia, Google Flights, Decolar ou um PDF de reserva.",
  },
  hotel: {
    title: "Extrair hotel de imagem/PDF",
    helper: "Cole um print do Booking, site do hotel, e-mail de confirmação ou PDF.",
  },
  experience: {
    title: "Extrair experiência de imagem/PDF",
    helper: "Cole um print de passeio, ingresso, voucher ou PDF do fornecedor.",
  },
};

export function AIBookingExtractor({ itemType, onExtracted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = (f: File | undefined) => {
    if (!f) return;
    const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (!ok.includes(f.type)) {
      toast.error("Formato não suportado. Use PNG, JPG, WEBP ou PDF.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = (e) => setPreview((e.target?.result as string) || null);
      r.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const ext = file.name.split(".").pop()?.toLowerCase() || (file.type.includes("pdf") ? "pdf" : "png");

      const { data, error } = await supabase.functions.invoke("extract-booking-data", {
        body: { image_base64: base64, file_type: ext, item_type: itemType },
      });

      if (error) throw error;
      if ((data as any)?.error) {
        toast.error((data as any).error);
        return;
      }
      const extracted = (data as any)?.extracted;
      if (!extracted) {
        toast.error("Não foi possível extrair dados.");
        return;
      }
      onExtracted(extracted);
      toast.success("Dados extraídos! Revise os campos preenchidos.");
      clear();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao extrair. Tente uma imagem mais nítida.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const labels = LABELS[itemType];

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">{labels.title}</p>
          <p className="text-[10.5px] text-muted-foreground leading-tight">{labels.helper}</p>
        </div>
      </div>

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handlePick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "w-full rounded-lg border-2 border-dashed border-primary/25 bg-background/50",
            "px-3 py-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <Upload className="w-5 h-5 mx-auto text-primary/70 mb-1" />
          <p className="text-[11px] font-semibold text-foreground">Clique ou arraste um arquivo</p>
          <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP ou PDF · máx. 10MB</p>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-border bg-background">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full max-h-48 object-contain bg-muted/20" />
            ) : (
              <div className="flex items-center gap-2 p-3">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <span className="text-xs font-medium truncate flex-1">{file.name}</span>
              </div>
            )}
            <button
              type="button"
              onClick={clear}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <Button
            type="button"
            onClick={handleExtract}
            disabled={loading}
            size="sm"
            className="w-full gap-1.5 h-8"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Extraindo dados com IA…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Extrair dados desta imagem
              </>
            )}
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => handlePick(e.target.files?.[0])}
      />
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      resolve(result.split(",")[1] || "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default AIBookingExtractor;
