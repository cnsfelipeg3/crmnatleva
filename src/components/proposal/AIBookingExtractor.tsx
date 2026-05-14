import { useState, useRef } from "react";
import { Upload, Sparkles, Loader2, X, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ExtractItemType =
  | "flight"
  | "hotel"
  | "experience"
  | "cruise"
  | "insurance"
  | "transfer"
  | "train"
  | "car"
  | "tour"
  | "ticket"
  | "itinerary"
  | "other";

interface Props {
  itemType: ExtractItemType;
  onExtracted: (data: { title?: string; description?: string; data?: Record<string, any> }) => void;
}

const LABELS: Record<ExtractItemType, { title: string; helper: string }> = {
  flight: {
    title: "Extrair voo de imagem/PDF",
    helper: "Cole até 20 prints do site da companhia, Google Flights, Decolar ou PDFs.",
  },
  hotel: {
    title: "Extrair hotel de imagem/PDF",
    helper: "Cole até 20 prints do Booking, site do hotel, e-mails de confirmação ou PDFs.",
  },
  experience: {
    title: "Extrair experiência de imagem/PDF",
    helper: "Cole até 20 prints de passeio, ingresso, voucher ou PDFs do fornecedor.",
  },
  cruise: {
    title: "Extrair cruzeiro de imagem/PDF",
    helper: "Cole prints do roteiro, mapa de itinerário, cabine, voucher MSC/Costa/NCL/Royal ou PDFs · até 20 arquivos.",
  },
  insurance: {
    title: "Extrair seguro viagem de imagem/PDF",
    helper: "Cole prints da apólice ou cotação (Assist Card, Coris, GTA, Universal, Allianz, Travel Ace) · até 20 arquivos.",
  },
  transfer: {
    title: "Extrair transfer de imagem/PDF",
    helper: "Cole prints do voucher de transfer (aeroporto, hotel, privativo, compartilhado) ou PDFs · até 20 arquivos.",
  },
  train: {
    title: "Extrair trem de imagem/PDF",
    helper: "Cole prints da reserva (Trenitalia, SNCF, Renfe, Eurostar, Eurail, JR Pass) ou PDFs · até 20 arquivos.",
  },
  car: {
    title: "Extrair aluguel de carro de imagem/PDF",
    helper: "Cole prints da reserva (Localiza, Movida, Hertz, Avis, Sixt, RentCars) ou PDFs · até 20 arquivos.",
  },
  tour: {
    title: "Extrair passeio de imagem/PDF",
    helper: "Cole prints de city tour, excursão, passeio (GetYourGuide, Civitatis, Viator) ou PDFs · até 20 arquivos.",
  },
  ticket: {
    title: "Extrair ingresso de imagem/PDF",
    helper: "Cole prints de ingressos (parques, shows, atrações, museus) ou PDFs · até 20 arquivos.",
  },
  itinerary: {
    title: "Extrair roteiro de imagem/PDF",
    helper: "Cole prints/PDFs do roteiro personalizado dia a dia · até 20 arquivos.",
  },
  other: {
    title: "Extrair item de imagem/PDF",
    helper: "Cole prints ou PDFs do voucher/comprovante e a IA preenche o que conseguir · até 20 arquivos.",
  },
};

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];

type PickedFile = {
  id: string;
  file: File;
  preview: string | null;
};

export function AIBookingExtractor({ itemType, onExtracted }: Props) {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = (fileList: FileList | File[] | null | undefined) => {
    if (!fileList) return;
    const arr = Array.from(fileList as ArrayLike<File>);
    if (arr.length === 0) return;

    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      toast.error(`Limite de ${MAX_FILES} arquivos atingido.`);
      return;
    }

    const accepted: PickedFile[] = [];
    let rejectedType = 0;
    let rejectedSize = 0;

    for (const f of arr.slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        rejectedType++;
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        rejectedSize++;
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        preview: null,
      });
    }

    if (rejectedType > 0) toast.error(`${rejectedType} arquivo(s) com formato inválido. Use PNG, JPG, WEBP ou PDF.`);
    if (rejectedSize > 0) toast.error(`${rejectedSize} arquivo(s) excederam 10MB e foram ignorados.`);
    if (arr.length > remaining) toast.warning(`Apenas ${remaining} arquivo(s) foram adicionados (limite ${MAX_FILES}).`);

    if (accepted.length === 0) return;

    setFiles((prev) => [...prev, ...accepted]);

    // Carrega previews em paralelo
    accepted.forEach((pf) => {
      if (!pf.file.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = (e) => {
        const url = (e.target?.result as string) || null;
        setFiles((prev) => prev.map((x) => (x.id === pf.id ? { ...x, preview: url } : x)));
      };
      r.readAsDataURL(pf.file);
    });

    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleExtract = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const images = await Promise.all(
        files.map(async (pf) => {
          const base64 = await fileToBase64(pf.file);
          const ext = pf.file.name.split(".").pop()?.toLowerCase() || (pf.file.type.includes("pdf") ? "pdf" : "png");
          return { base64, file_type: ext };
        })
      );

      const { data, error } = await supabase.functions.invoke("extract-booking-data", {
        body: { images, item_type: itemType },
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
      toast.success(
        files.length > 1
          ? `Dados consolidados de ${files.length} arquivos! Revise os campos.`
          : "Dados extraídos! Revise os campos preenchidos."
      );
      clearAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao extrair. Tente uma imagem mais nítida.");
    } finally {
      setLoading(false);
    }
  };

  const labels = LABELS[itemType];
  const canAddMore = files.length < MAX_FILES;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">{labels.title}</p>
          <p className="text-[10.5px] text-muted-foreground leading-tight">{labels.helper}</p>
        </div>
        {files.length > 0 && (
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
            {files.length}/{MAX_FILES}
          </span>
        )}
      </div>

      {files.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handlePick(e.dataTransfer.files);
          }}
          className={cn(
            "w-full rounded-lg border-2 border-dashed border-primary/25 bg-background/50",
            "px-3 py-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <Upload className="w-5 h-5 mx-auto text-primary/70 mb-1" />
          <p className="text-[11px] font-semibold text-foreground">Clique ou arraste arquivos</p>
          <p className="text-[10px] text-muted-foreground">
            PNG, JPG, WEBP ou PDF · até {MAX_FILES} arquivos · máx. 10MB cada
          </p>
        </button>
      ) : (
        <div className="space-y-2">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handlePick(e.dataTransfer.files);
            }}
            className="grid grid-cols-3 sm:grid-cols-4 gap-2"
          >
            {files.map((pf) => (
              <div
                key={pf.id}
                className="relative group rounded-lg overflow-hidden border border-border bg-background aspect-square"
              >
                {pf.preview ? (
                  <img src={pf.preview} alt={pf.file.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 bg-muted/30">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-[9px] text-center text-muted-foreground line-clamp-2 break-all">
                      {pf.file.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(pf.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-80 group-hover:opacity-100"
                  aria-label="Remover"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {canAddMore && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-primary/30 bg-background/50 hover:border-primary/60 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4 text-primary/70" />
                <span className="text-[10px] font-semibold text-primary/80">Adicionar</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleExtract}
              disabled={loading}
              size="sm"
              className="flex-1 gap-1.5 h-8"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Extraindo dados com IA…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {files.length > 1 ? `Extrair dados de ${files.length} arquivos` : "Extrair dados desta imagem"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={loading}
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              Limpar
            </Button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => handlePick(e.target.files)}
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
